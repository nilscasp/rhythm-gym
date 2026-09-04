// Shared types for the Rhythmus Fundament EN dubbing pipeline (scripts/dub).

export type Engine = 'qwen' | 'qwen_custom_voice' | 'luxtts' | 'chatterbox' | 'chatterbox_turbo' | 'tada' | 'kokoro'

export interface Config {
  voicebox: { url: string; clientId: string; version?: string }
  tts: {
    profileId: string
    engine: Engine
    modelSize: '1.7B' | '0.6B' | '1B' | '3B'
    seed: number
    language: string
    instruct: string
    maxChunkChars: number
    crossfadeMs: number
    normalize: boolean
    /**
     * Qwen3-TTS reproduces the acoustic background of the reference sample, so a clone made from a
     * room-noise recording generates room noise. `sampleChain` cleans a reference before cloning
     * (see `clean-sample`); `outputChain` takes the remainder off each generated clip.
     */
    denoise: { enabled: boolean; outputChain: string; sampleChain: string }
    /**
     * Qwen3-TTS occasionally runs away and produces a constant drone instead of speech, at the same
     * seed that works on the next attempt. These bounds catch that so an overnight batch does not
     * bake a broken line into a video.
     */
    quality: { minDynamicRangeDb: number; maxDurationFactor: number }
  }
  asr: {
    model: string
    device: 'mps' | 'cpu'
    input: 'vocals' | 'mix'
    pauseSplitSec: number
    maxUtteranceSec: number
    sentenceSplitMinSec: number
    /** Below this vocal energy there was no speech, whatever Whisper wrote. Phantom lines are dropped. */
    silenceFloorDb: number
    initialPrompt: string
  }
  script: { wordsPerSec: number }
  fit: { atempoCap: number; guardSec: number }
  bed: {
    musicRmsDb: number
    suspectVocalsRmsDb: number
    musicGain: number
    silenceGain: number
    rampMs: number
    /** Documentary-style: the original German voice stays audible under the English. */
    originalVoice: {
      enabled: boolean
      /** Linear gain of the German voice under the English. 0.12 ≈ -18 dB. */
      gain: number
      /** Low-pass on the German so it reads as "behind" the dry English voice. */
      lowpassHz: number
      /** Extra fade-out after the German ends, so the reverb tail is not cut off. */
      releaseMs: number
      reverb: { enabled: boolean; wet: number; decaySec: number; predelayMs: number }
    }
  }
  mux: { audioCodec: string; audioBitrate: string; includeGerman: boolean }
  bunny?: { cdnHost?: string; referer?: string }
}

export interface Word {
  w: string
  s: number
  e: number
  p: number
}

export interface Segment {
  id: string
  start: number
  end: number
  slotEnd: number
  slotSec: number
  spokenSec: number
  de: string
  deWords: number
  words: Word[]
  auto: {
    music: boolean
    suspect: boolean
    /** Repetitive text: Nils counting the beat while playing, or a Whisper loop. Defaults to keep-de. */
    repetitive: boolean
    musicRmsDb: number
    vocalsRmsDb: number
  }
  asrMeta: { noSpeechProb: number; avgLogprob: number }
}

export interface SegmentsFile {
  day: number
  source: string
  mediaDurationSec: number
  asr: { model: string; whisper: string; input: string; device: string }
  generatedAt: string
  segments: Segment[]
}

export type Flag = 'music' | 'silence' | 'keep-de' | 'skip' | 'tempo=1' | `seed=${number}`

export interface ScriptEntry {
  id: string
  en: string
  flags: string[]
  note: string
  enWords: number
  enHash: string
  seed?: number
}

export interface ScriptFile {
  day: number
  parsedAt: string
  entries: ScriptEntry[]
  orphaned: string[]
}

export type TtsStatus = 'ok' | 'missing' | 'skip' | 'failed'

export interface TtsEntry {
  id: string
  status: TtsStatus
  cacheKey?: string
  wav?: string
  durationSec?: number
  generationId?: string
  error?: string
}

export interface TtsFile {
  day: number
  profileId: string
  engine: string
  entries: TtsEntry[]
}

export type FitStatus = 'ok' | 'tempo' | 'overflow' | 'missing' | 'skip' | 'keep-de'
export type Bed = 'silence' | 'music' | 'keep-de'

export interface FitEntry {
  id: string
  start: number
  deEnd: number
  slotEnd: number
  deDur: number
  enDurRaw: number
  tempo: number
  enDur: number
  placedStart: number
  placedEnd: number
  clip?: string
  status: FitStatus
  overflowSec: number
  cutWords: number
  bed: Bed
}

export interface FitFile {
  day: number
  mediaDurationSec: number
  entries: FitEntry[]
}

export interface StepRecord {
  done: boolean
  at: string
  fingerprint: string
}

export interface DayState {
  day: number
  source?: string
  mediaDurationSec?: number
  videoCodec?: string
  audioStreams?: { index: number; codec: string; channels: number; sampleRate: number }[]
  steps: Record<string, StepRecord>
}
