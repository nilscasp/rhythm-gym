// German transcription with word timestamps (openai-whisper CLI on MPS, CPU fallback) and utterance merging.
import { existsSync, renameSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { ensureDayDirs, loadConfig, log, warn, writeJson } from './config'
import { decodeF32, durationSec, rmsDb, run, which } from './ffmpeg'
import { fileFingerprint, isDone, loadState, markDone } from './state'
import type { Config, Segment, SegmentsFile, Word } from './types'

interface WhisperWord {
  word: string
  start: number
  end: number
  probability: number
}
interface WhisperSegment {
  id: number
  start: number
  end: number
  text: string
  no_speech_prob: number
  avg_logprob: number
  compression_ratio: number
  words?: WhisperWord[]
}
interface WhisperJson {
  text: string
  language: string
  segments: WhisperSegment[]
}

const HALLUCINATION_PATTERNS = [
  /untertitel/i,
  /amara\.org/i,
  /vielen dank f(ü|ue)rs? (zuschauen|zuh(ö|oe)ren)/i,
  /copyright/i,
  /www\./i,
  /abonnier/i,
]

export async function whisperBin(): Promise<string> {
  const local = join(homedir(), 'Library', 'Python', '3.9', 'bin', 'whisper')
  if (existsSync(local)) return local
  const w = await which('whisper')
  if (w) return w
  throw new Error('whisper CLI not found (expected ~/Library/Python/3.9/bin/whisper or on PATH)')
}

const MLX_MODELS: Record<string, string> = {
  'large-v3-turbo': 'mlx-community/whisper-large-v3-turbo',
  'large-v3': 'mlx-community/whisper-large-v3-mlx',
  medium: 'mlx-community/whisper-medium-mlx',
  small: 'mlx-community/whisper-small-mlx',
  base: 'mlx-community/whisper-base-mlx',
}

/**
 * mlx-whisper (Metal) — ~8x realtime on Apple Silicon and the only GPU path that works here:
 * openai-whisper cannot move its sparse alignment-head buffer to MPS
 * ("aten::_sparse_coo_tensor_with_dims_and_tensors ... SparseMPS"), so torch MPS is not an option.
 */
function mlxArgs(cfg: Config, input: string, outDir: string): string[] {
  return [
    input,
    '--model', MLX_MODELS[cfg.asr.model] ?? cfg.asr.model,
    '--language', 'de',
    '--task', 'transcribe',
    '--word-timestamps', 'True',
    '--output-format', 'json',
    '--output-dir', outDir,
    '--output-name', 'whisper',
    '--condition-on-previous-text', 'False',
    '--no-speech-threshold', '0.6',
    '--logprob-threshold', '-1.0',
    '--compression-ratio-threshold', '2.4',
    '--hallucination-silence-threshold', '2',
    '--initial-prompt', cfg.asr.initialPrompt,
    '--verbose', 'False',
  ]
}

export function whisperArgs(cfg: Config, input: string, outDir: string, device: 'mps' | 'cpu', extra: string[] = []): string[] {
  return [
    input,
    '--model', cfg.asr.model,
    '--device', device,
    '--fp16', 'False',
    '--language', 'de',
    '--task', 'transcribe',
    '--word_timestamps', 'True',
    '--output_format', 'json',
    '--output_dir', outDir,
    '--condition_on_previous_text', 'False',
    '--no_speech_threshold', '0.6',
    '--logprob_threshold', '-1.0',
    '--compression_ratio_threshold', '2.4',
    '--hallucination_silence_threshold', '2',
    '--initial_prompt', cfg.asr.initialPrompt,
    '--verbose', 'False',
    ...extra,
  ]
}

export async function runWhisper(cfg: Config, input: string, outDir: string, device: 'mps' | 'cpu'): Promise<{ device: string; json: string }> {
  const base = input.split('/').pop()!.replace(/\.[^.]+$/, '')
  const out = join(outDir, `${base}.json`)
  if (device === 'mps') {
    const t0 = Date.now()
    const mlxOut = join(outDir, 'whisper.json')
    log(`whisper: mlx-whisper ${cfg.asr.model} on Metal …`)
    const r = await run(['uvx', '--python', '3.11', '--from', 'mlx-whisper', 'mlx_whisper', ...mlxArgs(cfg, input, outDir)], { quiet: true })
    if (r.code === 0 && existsSync(mlxOut)) {
      log(`whisper: done on Metal in ${((Date.now() - t0) / 1000).toFixed(0)} s`)
      return { device: 'mlx-metal', json: mlxOut }
    }
    warn(`mlx-whisper failed: ${r.stderr.trim().split('\n').slice(-2).join(' | ')} — falling back to CPU`)
  }
  const bin = await whisperBin()
  const t0 = Date.now()
  log(`whisper: openai-whisper ${cfg.asr.model} on cpu …`)
  const r = await run([bin, ...whisperArgs(cfg, input, outDir, 'cpu')], { env: { PYTORCH_ENABLE_MPS_FALLBACK: '1' }, quiet: true })
  if (r.code === 0 && existsSync(out)) {
    log(`whisper: done on cpu in ${((Date.now() - t0) / 1000).toFixed(0)} s`)
    return { device: 'cpu', json: out }
  }
  throw new Error(`whisper failed on cpu: ${r.stderr.trim().split('\n').slice(-3).join(' | ')}`)
}

function isHallucination(text: string): boolean {
  if (HALLUCINATION_PATTERNS.some((re) => re.test(text))) return true
  const toks = text.toLowerCase().split(/\s+/).filter(Boolean)
  if (toks.length >= 6) {
    const uniq = new Set(toks)
    if (uniq.size / toks.length < 0.35) return true
  }
  return false
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}

export function mergeUtterances(wj: WhisperJson, cfg: Config): Omit<Segment, 'slotEnd' | 'slotSec' | 'auto'>[] {
  const words: (Word & { seg: WhisperSegment })[] = []
  for (const s of wj.segments) {
    if (s.no_speech_prob > 0.6 && s.avg_logprob < -0.8) continue
    if (s.compression_ratio > 2.4) continue
    if (isHallucination(s.text)) continue
    for (const w of s.words ?? []) {
      const t = w.word.trim()
      if (!t) continue
      words.push({ w: t, s: w.start, e: w.end, p: w.probability, seg: s })
    }
  }
  const utts: (Word & { seg: WhisperSegment })[][] = []
  let cur: (Word & { seg: WhisperSegment })[] = []
  const flush = () => {
    if (cur.length) utts.push(cur)
    cur = []
  }
  for (const w of words) {
    if (cur.length) {
      const prev = cur[cur.length - 1]
      const gap = w.s - prev.e
      const dur = w.e - cur[0].s
      const sentenceEnd = /[.!?]$/.test(prev.w)
      if (gap > cfg.asr.pauseSplitSec) flush()
      else if (dur > cfg.asr.maxUtteranceSec) flush()
      else if (sentenceEnd && dur >= cfg.asr.sentenceSplitMinSec && gap > 0.15) flush()
    }
    cur.push(w)
  }
  flush()
  return utts.map((u, i) => {
    const start = u[0].s
    const end = u[u.length - 1].e
    const text = u.map((w) => w.w).join(' ').replace(/\s+([,.!?;:])/g, '$1')
    const segs = new Set(u.map((w) => w.seg))
    const nsp = Math.max(...[...segs].map((s) => s.no_speech_prob))
    const lp = Math.min(...[...segs].map((s) => s.avg_logprob))
    return {
      id: `s${String(i + 1).padStart(3, '0')}`,
      start: round3(start),
      end: round3(end),
      spokenSec: round3(end - start),
      de: text,
      deWords: u.length,
      words: u.map(({ w, s, e, p }) => ({ w, s: round3(s), e: round3(e), p: round3(p) })),
      asrMeta: { noSpeechProb: round3(nsp), avgLogprob: round3(lp) },
    }
  })
}

export async function transcribe(day: number, opts: { force?: boolean } = {}): Promise<void> {
  const p = ensureDayDirs(day)
  const cfg = loadConfig()
  const state = loadState(day)
  const input = cfg.asr.input === 'vocals' && existsSync(p.vocals16) ? p.vocals16 : p.orig48
  if (!existsSync(input)) throw new Error(`transcribe: input missing (${input}); run extract/separate first`)
  const fp = `${fileFingerprint(input)}:${cfg.asr.model}:${cfg.asr.pauseSplitSec}:${cfg.asr.maxUtteranceSec}`
  if (!opts.force && isDone(state, 'transcribe', fp) && existsSync(p.segments)) {
    log(`transcribe: day ${day} up to date`)
    return
  }
  let device: string = cfg.asr.device
  if (opts.force || !existsSync(p.whisperJson)) {
    const r = await runWhisper(cfg, input, p.asrDir, cfg.asr.device)
    device = r.device
    if (r.json !== p.whisperJson) renameSync(r.json, p.whisperJson)
  } else {
    log('transcribe: reusing existing whisper.json (use --force to re-run whisper)')
  }
  const wj = JSON.parse(await Bun.file(p.whisperJson).text()) as WhisperJson
  const merged = mergeUtterances(wj, cfg)
  const mediaDurationSec = state.mediaDurationSec ?? (await durationSec(p.orig48))

  const haveStems = existsSync(p.noVocals48) && existsSync(p.vocals16)
  const music = haveStems ? await decodeF32(p.noVocals48, 16000, 1) : null
  const vocals = haveStems ? await decodeF32(p.vocals16, 16000, 1) : null

  const segments: Segment[] = merged.map((m, i) => {
    const next = merged[i + 1]
    const slotEnd = round3(next ? Math.max(m.end, next.start - cfg.fit.guardSec) : mediaDurationSec)
    const musicRms = music ? rmsDb(music, 16000, m.start, m.end) : -100
    const vocRms = vocals ? rmsDb(vocals, 16000, m.start, m.end) : 0
    return {
      ...m,
      slotEnd,
      slotSec: round3(slotEnd - m.start),
      auto: {
        music: haveStems && musicRms > cfg.bed.musicRmsDb,
        suspect: haveStems && vocRms < cfg.bed.suspectVocalsRmsDb,
        musicRmsDb: round3(musicRms),
        vocalsRmsDb: round3(vocRms),
      },
    }
  })
  const file: SegmentsFile = {
    day,
    source: state.source ?? '',
    mediaDurationSec,
    asr: { model: cfg.asr.model, whisper: 'openai-whisper', input: cfg.asr.input, device },
    generatedAt: new Date().toISOString(),
    segments,
  }
  writeJson(p.segments, file)
  markDone(state, 'transcribe', fp)
  const speech = segments.reduce((a, s) => a + s.spokenSec, 0)
  log(
    `transcribe: ${segments.length} utterances, speech ${(speech / 60).toFixed(1)} min of ${(mediaDurationSec / 60).toFixed(1)} min (${((speech / mediaDurationSec) * 100).toFixed(0)} %), auto music ${segments.filter((s) => s.auto.music).length}, suspect ${segments.filter((s) => s.auto.suspect).length}`,
  )
}
