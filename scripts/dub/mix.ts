// Step E: build the English audio bed. Original audio outside the speech windows; inside them the
// Demucs music stem (or a quiet room-tone version of it) under the generated English voice.
// The mix stays stereo, matching the source: ffmpeg's stereo→mono downmix is energy-preserving
// ((L+R)/√2) and would push a correlated source above full scale.
import { existsSync, unlinkSync } from 'node:fs'
import { ensureDayDirs, loadConfig, log, readJson, sha256, warn, writeJson } from './config'
import { decodeF32, encodeF32, measureLoudness } from './ffmpeg'
import { renderVoiceUnder } from './reverb'
import { loadState, markDone } from './state'
import type { FitFile } from './types'

const SR = 48000
const CH = 2
const EDGE_PAD = 0.05

export async function mix(day: number, opts: { allowOverflow?: boolean } = {}): Promise<void> {
  const p = ensureDayDirs(day)
  const cfg = loadConfig()
  const fit = readJson<FitFile>(p.fitJson)
  const overflow = fit.entries.filter((e) => e.status === 'overflow')
  if (overflow.length && !opts.allowOverflow) {
    throw new Error(
      `mix: ${overflow.length} segment(s) still overflow their slot (${overflow.slice(0, 5).map((e) => e.id).join(', ')}…). ` +
        `Shorten the English in dub-script.md and re-run render, or pass --allow-overflow for a preview mix.`,
    )
  }
  if (!existsSync(p.orig48)) throw new Error(`mix: ${p.orig48} missing`)
  const haveStems = existsSync(p.noVocals48)
  if (!haveStems) warn('mix: no Demucs stem — speech windows will be silent instead of carrying room tone')

  const n = Math.round(fit.mediaDurationSec * SR)
  log(`mix: assembling ${(fit.mediaDurationSec / 60).toFixed(1)} min, ${SR} Hz stereo …`)

  // Per-sample envelopes (mono, applied to both channels) and the mono voice timeline.
  const envOrig = new Float32Array(n).fill(1)
  const envMusic = new Float32Array(n)
  const envVoiceDe = new Float32Array(n)
  const voice = new Float32Array(n)
  const ramp = Math.max(1, Math.round((cfg.bed.rampMs / 1000) * SR))
  const ov = cfg.bed.originalVoice
  const release = Math.max(ramp, Math.round((ov.releaseMs / 1000) * SR))

  const applyWindow = (startSec: number, endSec: number, musicGain: number) => {
    const a = Math.max(0, Math.round((startSec - EDGE_PAD) * SR))
    const b = Math.min(n, Math.round((endSec + EDGE_PAD) * SR))
    if (b <= a) return
    for (let i = a; i < b; i++) {
      const t = Math.min(1, Math.min(i - a, b - 1 - i) / ramp)
      envOrig[i] = Math.min(envOrig[i], 1 - t)
      envMusic[i] = Math.max(envMusic[i], musicGain * t)
    }
    // The German under-layer fades out slowly past the window so its reverb tail is not clipped.
    const c = Math.min(n, b + release)
    for (let i = a; i < c; i++) {
      const rise = Math.min(1, (i - a) / ramp)
      const fall = i < b ? 1 : Math.max(0, 1 - (i - b) / release)
      envVoiceDe[i] = Math.max(envVoiceDe[i], Math.min(rise, fall))
    }
  }

  let placed = 0
  for (const e of fit.entries) {
    if (e.status === 'keep-de' || e.status === 'skip' || e.status === 'missing') continue
    if (!e.clip || !existsSync(e.clip)) continue
    const gain = e.bed === 'music' ? cfg.bed.musicGain : cfg.bed.silenceGain
    applyWindow(e.start, Math.max(e.deEnd, e.placedEnd), haveStems ? gain : 0)
    const clip = await decodeF32(e.clip, SR, 1)
    const off = Math.round(e.placedStart * SR)
    for (let i = 0; i < clip.length && off + i < n; i++) voice[off + i] += clip[i]
    placed++
  }
  log(`mix: placed ${placed} English clips`)

  // Match the English voice to the level of the GERMAN VOICE (the Demucs vocals stem), not to the whole
  // original track — the original's integrated loudness includes the handpan playing and would push the
  // dub several dB too loud.
  let voiceGain = 1
  const reference = existsSync(p.demucsVocals) ? p.demucsVocals : p.orig48
  try {
    const refL = await measureLoudness(reference)
    const tmpVoice = `${p.mixDir}/voice.probe.wav`
    await encodeF32(voice, SR, 1, tmpVoice, 'pcm_s24le')
    const voiceL = await measureLoudness(tmpVoice)
    unlinkSync(tmpVoice)
    voiceGain = Math.min(4, Math.max(0.25, Math.pow(10, (refL.input_i - voiceL.input_i) / 20)))
    writeJson(p.loudness, { reference, referenceLoudness: refL, voiceRaw: voiceL, voiceGain })
    log(`mix: voice gain ${(20 * Math.log10(voiceGain)).toFixed(1)} dB (German voice ${refL.input_i.toFixed(1)} LUFS, English ${voiceL.input_i.toFixed(1)} LUFS)`)
  } catch (err) {
    warn(`mix: loudness match skipped (${err instanceof Error ? err.message.slice(0, 120) : String(err)})`)
  }

  const orig = await decodeF32(p.orig48, SR, CH)
  const music = haveStems ? await decodeF32(p.noVocals48, SR, CH) : null

  // Documentary layer: the original German voice stays audible under the English, low-passed and
  // reverberated so the two voices occupy different depths instead of fighting for the same space.
  let voiceDe: Float32Array | null = null
  let voiceDeGain = ov.gain
  if (ov.enabled && existsSync(p.demucsVocals)) {
    await renderVoiceUnder(p.demucsVocals, p.voiceUnder, p.reverbIr, cfg)
    voiceDe = await decodeF32(p.voiceUnder, SR, CH)
    // The low-pass and reverb cost several dB on their own. Compensate for that first, so that
    // `bed.originalVoice.gain` means what it says: how far the German sits below its original level.
    try {
      const rawL = await measureLoudness(p.demucsVocals)
      const underL = await measureLoudness(p.voiceUnder)
      const comp = Math.min(6, Math.max(1, Math.pow(10, (rawL.input_i - underL.input_i) / 20)))
      voiceDeGain = ov.gain * comp
      log(
        `mix: German voice under the English at ${(20 * Math.log10(ov.gain)).toFixed(0)} dB below its original ` +
          `(processing cost ${(20 * Math.log10(comp)).toFixed(1)} dB, compensated)`,
      )
    } catch {
      warn('mix: could not measure the processed German voice — using the raw gain')
    }
  } else if (ov.enabled) {
    warn('mix: no Demucs vocals stem — the original German voice cannot be layered under the English')
  }

  const total = n * CH
  const out = new Float32Array(total)
  let peak = 0
  for (let i = 0; i < n; i++) {
    const eo = envOrig[i]
    const em = envMusic[i]
    const ed = envVoiceDe[i] * voiceDeGain
    const v = voice[i] * voiceGain
    for (let c = 0; c < CH; c++) {
      const k = i * CH + c
      const s = (orig[k] ?? 0) * eo + (music ? (music[k] ?? 0) * em : 0) + (voiceDe ? (voiceDe[k] ?? 0) * ed : 0) + v
      out[k] = s
      const a = Math.abs(s)
      if (a > peak) peak = a
    }
  }
  if (peak > 0.999) {
    const g = 0.999 / peak
    for (let i = 0; i < total; i++) out[i] *= g
    warn(`mix: peak was ${(20 * Math.log10(peak)).toFixed(1)} dBFS — applied ${(20 * Math.log10(g)).toFixed(1)} dB of headroom gain`)
  }
  log(`mix: peak ${(20 * Math.log10(Math.min(peak, 0.999))).toFixed(1)} dBFS`)
  await encodeF32(out, SR, CH, p.mixWav, 'pcm_s24le')
  const state = loadState(day)
  markDone(state, 'mix', sha256(fit.entries.map((e) => `${e.id}:${e.status}:${e.bed}:${e.tempo}`).join('|') + JSON.stringify(cfg.bed)))
  log(`mix: wrote ${p.mixWav}`)
}
