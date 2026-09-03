// Stage 0: generate the same ~30 s English paragraph with 2-3 voice variants so the voice is approved
// before a whole video is dubbed. Also calibrates script.wordsPerSec from the measured result.
import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { WORKDIR, ensureWorkdir, loadConfig, log, readJson, saveConfig, warn, writeJson } from './config'
import { durationSec, trimAndResample } from './ffmpeg'
import { clientFromConfig } from './voicebox'
import type { Config, Engine } from './types'

const TEST_SCRIPT_PATH = () => join(WORKDIR, 'voice-test', 'script.en.txt')
const RESULTS_PATH = () => join(WORKDIR, 'voice-test', 'voice-test.json')

const DEFAULT_SCRIPT = `Welcome to the Rhythm Fundamentals course, and to this first video. I am really glad you are here.
Before we start playing, I want to share three things with you. Take your handpan, sit down comfortably,
and let your hands rest on the ding for a moment. Can you feel the pulse already? Good. Then let us begin.`

export interface VoiceTestResult {
  label: string
  profileId: string
  profileName: string
  engine: string
  wav: string
  durationSec: number
  words: number
  wordsPerSec: number
  generationId: string
  createdAt: string
}

export async function voiceTest(opts: { profile?: string; engine?: Engine; label?: string; seed?: number }): Promise<VoiceTestResult> {
  ensureWorkdir()
  const cfg = loadConfig()
  const client = clientFromConfig(cfg)
  const scriptPath = TEST_SCRIPT_PATH()
  if (!existsSync(scriptPath)) {
    writeFileSync(scriptPath, DEFAULT_SCRIPT.replace(/\s+/g, ' ').trim() + '\n')
    log(`voice-test: wrote a default English test paragraph to ${scriptPath} (edit it to use your own words)`)
  }
  const text = (await Bun.file(scriptPath).text()).replace(/\s+/g, ' ').trim()
  const words = text.split(/\s+/).filter(Boolean).length

  const profile = await client.profileByIdOrName(opts.profile ?? cfg.tts.profileId)
  const engine = opts.engine ?? cfg.tts.engine
  const label = opts.label ?? `${engine}-${profile.name.toLowerCase().replace(/\s+/g, '-')}`

  if (engine !== 'qwen') {
    const models = await client.modelsStatus()
    const needed = engine.startsWith('chatterbox') ? models.filter((m) => m.model_name.startsWith('chatterbox')) : []
    if (needed.length && !needed.some((m) => m.downloaded)) {
      throw new Error(`voice-test: engine "${engine}" is not downloaded in Voicebox — download it in the app first, or use --engine qwen`)
    }
  }

  const wav = join(WORKDIR, 'voice-test', `${label}.wav`)
  const tmp = `${wav}.raw.wav`
  log(`voice-test: generating "${label}" (profile ${profile.name}, engine ${engine}, ${words} words) …`)
  const g = await client.generateToFile(
    {
      profile_id: profile.id,
      text,
      language: 'en',
      engine,
      model_size: cfg.tts.modelSize,
      seed: opts.seed ?? cfg.tts.seed,
      instruct: cfg.tts.instruct || undefined,
      max_chunk_chars: cfg.tts.maxChunkChars,
      crossfade_ms: cfg.tts.crossfadeMs,
      normalize: cfg.tts.normalize,
    },
    tmp,
    words / cfg.script.wordsPerSec,
  )
  await trimAndResample(tmp, wav, cfg.tts.denoise.enabled ? cfg.tts.denoise.outputChain : undefined)
  const dur = await durationSec(wav)
  const result: VoiceTestResult = {
    label,
    profileId: profile.id,
    profileName: profile.name,
    engine,
    wav,
    durationSec: Math.round(dur * 100) / 100,
    words,
    wordsPerSec: Math.round((words / dur) * 100) / 100,
    generationId: g.id,
    createdAt: new Date().toISOString(),
  }
  const all: VoiceTestResult[] = existsSync(RESULTS_PATH()) ? readJson<VoiceTestResult[]>(RESULTS_PATH()) : []
  writeJson(RESULTS_PATH(), [...all.filter((r) => r.label !== label), result])
  log(`voice-test: ${wav} — ${dur.toFixed(1)} s, ${result.wordsPerSec} words/sec. Listen with: afplay "${wav}"`)
  return result
}

export function chooseVoice(label: string): Config {
  const cfg = loadConfig()
  if (!existsSync(RESULTS_PATH())) throw new Error('voice-test: no results yet — run "voice-test" first')
  const all = readJson<VoiceTestResult[]>(RESULTS_PATH())
  const r = all.find((x) => x.label === label)
  if (!r) throw new Error(`voice-test: no variant "${label}". Available: ${all.map((x) => x.label).join(', ')}`)
  cfg.tts.profileId = r.profileId
  cfg.tts.engine = r.engine as Engine
  cfg.script.wordsPerSec = r.wordsPerSec
  saveConfig(cfg)
  log(`voice-test: chose "${label}" (profile ${r.profileName}, engine ${r.engine}), calibrated wordsPerSec to ${r.wordsPerSec}`)
  return cfg
}

export function listVoiceTests(): VoiceTestResult[] {
  if (!existsSync(RESULTS_PATH())) return []
  const all = readJson<VoiceTestResult[]>(RESULTS_PATH())
  for (const r of all) log(`  ${r.label.padEnd(28)} ${r.durationSec.toFixed(1)}s  ${r.wordsPerSec} w/s  profile ${r.profileName}  engine ${r.engine}`)
  if (!all.length) warn('no voice tests yet')
  return all
}
