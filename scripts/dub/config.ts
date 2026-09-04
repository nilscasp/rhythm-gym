import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import type { Config } from './types'

export const WORKDIR = resolve(process.env.DUB_WORKDIR ?? join(homedir(), 'Movies', 'RhythmGym-Dub'))
export const REPO_ROOT = resolve(import.meta.dir, '..', '..')

export const DEFAULT_CONFIG: Config = {
  voicebox: { url: 'http://127.0.0.1:17493', clientId: 'rhythm-gym-dub' },
  tts: {
    profileId: '',
    engine: 'qwen',
    modelSize: '1.7B',
    seed: 4242,
    language: 'en',
    instruct: 'Calm, warm, clear teaching voice. Natural, unhurried pace. Friendly, no dramatization.',
    maxChunkChars: 800,
    crossfadeMs: 50,
    normalize: true,
    denoise: {
      enabled: true,
      outputChain: 'highpass=f=75,anlmdn=s=0.0004:p=0.003,afftdn=nr=12:nf=-70:tn=1',
      sampleChain: 'highpass=f=85,anlmdn=s=0.0008:p=0.004,afftdn=nr=20:nf=-60:tn=1',
    },
    quality: { minDynamicRangeDb: 14, maxDurationFactor: 2.5 },
  },
  asr: {
    model: 'large-v3-turbo',
    device: 'mps',
    input: 'vocals',
    pauseSplitSec: 0.7,
    maxUtteranceSec: 25,
    sentenceSplitMinSec: 8,
    silenceFloorDb: -70,
    initialPrompt: 'Handpan, Ding, Tonfeld, Slap, Ghostnote, Puls, Offbeat, Takt, Achtel, Sechzehntel.',
  },
  script: { wordsPerSec: 2.5 },
  fit: { atempoCap: 1.12, guardSec: 0.25 },
  bed: {
    musicRmsDb: -40,
    suspectVocalsRmsDb: -45,
    musicGain: 0.8,
    silenceGain: 0.25,
    rampMs: 25,
    originalVoice: {
      enabled: true,
      gain: 0.18,
      lowpassHz: 3200,
      releaseMs: 400,
      reverb: { enabled: true, wet: 0.55, decaySec: 1.5, predelayMs: 25 },
    },
  },
  mux: { audioCodec: 'aac', audioBitrate: '192k', includeGerman: true },
  bunny: { referer: 'https://www.rhythmgym.io/' },
}

export const CONFIG_PATH = join(WORKDIR, 'config.json')

function deepMerge<T>(base: T, over: Partial<T> | undefined): T {
  if (!over) return base
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
    const b = (base as Record<string, unknown>)[k]
    if (v && typeof v === 'object' && !Array.isArray(v) && b && typeof b === 'object' && !Array.isArray(b)) {
      out[k] = deepMerge(b, v as Record<string, unknown>)
    } else if (v !== undefined) {
      out[k] = v
    }
  }
  return out as T
}

export function ensureWorkdir(): void {
  for (const d of ['', 'sources', 'logs', 'tts-cache', 'voice-test']) mkdirSync(join(WORKDIR, d), { recursive: true })
  if (!existsSync(CONFIG_PATH)) writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2) + '\n')
}

export function loadConfig(): Config {
  ensureWorkdir()
  const raw = JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as Partial<Config>
  return deepMerge(DEFAULT_CONFIG, raw)
}

export function saveConfig(cfg: Config): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2) + '\n')
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function dayDir(day: number): string {
  return join(WORKDIR, `tag-${pad2(day)}`)
}

export interface DayPaths {
  dir: string
  state: string
  orig48: string
  sepDir: string
  demucsVocals: string
  demucsNoVocals: string
  voiceUnder: string
  reverbIr: string
  noVocals48: string
  vocals16: string
  asrDir: string
  whisperJson: string
  segments: string
  scriptDir: string
  scriptMd: string
  scriptJson: string
  ttsDir: string
  ttsJson: string
  fitDir: string
  fitJson: string
  mixDir: string
  mixF32: string
  mixWav: string
  finalWav: string
  loudness: string
  outDir: string
  outMp4: string
  outSrt: string
  fitReport: string
}

export function dayPaths(day: number): DayPaths {
  const dir = dayDir(day)
  const tag = `tag-${pad2(day)}`
  const sepDir = join(dir, '05-sep')
  return {
    dir,
    state: join(dir, 'state.json'),
    orig48: join(dir, '01-audio', 'orig.48k.wav'),
    sepDir,
    demucsVocals: join(sepDir, 'htdemucs', 'orig.48k', 'vocals.wav'),
    demucsNoVocals: join(sepDir, 'htdemucs', 'orig.48k', 'no_vocals.wav'),
    voiceUnder: join(sepDir, 'vocals.under.wav'),
    reverbIr: join(sepDir, 'reverb-ir.wav'),
    noVocals48: join(sepDir, 'no_vocals.48k.wav'),
    vocals16: join(sepDir, 'vocals.16k.wav'),
    asrDir: join(dir, '02-asr'),
    whisperJson: join(dir, '02-asr', 'whisper.json'),
    segments: join(dir, '02-asr', 'segments.json'),
    scriptDir: join(dir, '03-script'),
    scriptMd: join(dir, '03-script', 'dub-script.md'),
    scriptJson: join(dir, '03-script', 'script.json'),
    ttsDir: join(dir, '04-tts'),
    ttsJson: join(dir, '04-tts', 'tts.json'),
    fitDir: join(dir, '06-fit'),
    fitJson: join(dir, '06-fit', 'fit.json'),
    mixDir: join(dir, '07-mix'),
    mixF32: join(dir, '07-mix', 'en.mix.f32'),
    mixWav: join(dir, '07-mix', 'en.mix.wav'),
    finalWav: join(dir, '07-mix', 'en.final.wav'),
    loudness: join(dir, '07-mix', 'loudness.json'),
    outDir: join(dir, '08-out'),
    outMp4: join(dir, '08-out', `${tag}.en.mp4`),
    outSrt: join(dir, '08-out', `${tag}.en.srt`),
    fitReport: join(dir, '08-out', `${tag}.fit-report.md`),
  }
}

export function ensureDayDirs(day: number): DayPaths {
  const p = dayPaths(day)
  for (const d of [p.dir, join(p.dir, '01-audio'), p.sepDir, p.asrDir, p.scriptDir, p.ttsDir, p.fitDir, p.mixDir, p.outDir]) {
    mkdirSync(d, { recursive: true })
  }
  return p
}

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

export function writeJson(path: string, data: unknown): void {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n')
}

/** Reads KEY=VALUE pairs from the repo's .env.local (Bunny credentials) without printing them. */
export function readRepoEnv(): Record<string, string> {
  const p = join(REPO_ROOT, '.env.local')
  const out: Record<string, string> = {}
  if (!existsSync(p)) return out
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}

export function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec - m * 60
  return `${pad2(m)}:${s.toFixed(1).padStart(4, '0')}`
}

export function sha256(input: string): string {
  const h = new Bun.CryptoHasher('sha256')
  h.update(input)
  return h.digest('hex')
}

export function log(msg: string): void {
  const t = new Date().toISOString().slice(11, 19)
  console.log(`[${t}] ${msg}`)
}

export function warn(msg: string): void {
  const t = new Date().toISOString().slice(11, 19)
  console.warn(`[${t}] WARN ${msg}`)
}
