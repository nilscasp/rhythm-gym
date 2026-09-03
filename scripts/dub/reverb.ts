// Documentary-style treatment for the original German voice that stays audible under the English:
// a synthetic room reverb (decaying noise impulse response, decorrelated per channel for width)
// plus a gentle low-pass, so the German sits behind the English instead of competing with it.
import { existsSync } from 'node:fs'
import { log } from './config'
import { encodeF32, ffmpeg } from './ffmpeg'
import type { Config } from './types'

const SR = 48000

/**
 * Builds a stereo impulse response: a short early-reflection cluster followed by an
 * exponentially decaying noise tail. Left and right use independent noise, which is what
 * makes the reverb wide and the dry English voice read as "in front".
 */
export async function buildImpulseResponse(dest: string, decaySec: number, predelayMs: number, seed = 1337): Promise<void> {
  const pre = Math.round((predelayMs / 1000) * SR)
  const tail = Math.round(decaySec * SR)
  const n = pre + tail
  const ir = new Float32Array(n * 2)
  // Deterministic PRNG so the same settings always produce the same room.
  let s = seed >>> 0
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return (s / 0xffffffff) * 2 - 1
  }
  for (let i = 0; i < tail; i++) {
    const t = i / SR
    const env = Math.exp((-6.908 * t) / decaySec) // -60 dB at decaySec
    const k = (pre + i) * 2
    ir[k] = rand() * env
    ir[k + 1] = rand() * env
  }
  // Early reflections give the room a size; without them the tail sounds like a wash.
  for (const [ms, gain, pan] of [[11, 0.5, 0], [17, 0.42, 1], [23, 0.36, 0], [31, 0.3, 1], [43, 0.24, 0]] as const) {
    const k = (pre + Math.round((ms / 1000) * SR)) * 2
    if (k + 1 < ir.length) ir[k + pan] += gain
  }
  ir[0] = 0.0
  await encodeF32(ir, SR, 2, dest, 'pcm_f32le')
}

/**
 * Renders the German vocals stem as it should sit under the English: low-passed, reverberated,
 * and blended dry/wet. Cached — the result only depends on the stem and the reverb settings.
 */
export async function renderVoiceUnder(vocalsStem: string, dest: string, irPath: string, cfg: Config, force = false): Promise<string> {
  const ov = cfg.bed.originalVoice
  if (existsSync(dest) && !force) return dest
  if (!existsSync(irPath) || force) {
    await buildImpulseResponse(irPath, ov.reverb.decaySec, ov.reverb.predelayMs)
    log(`reverb: built impulse response (${ov.reverb.decaySec}s decay, ${ov.reverb.predelayMs}ms pre-delay)`)
  }
  const wet = Math.max(0, Math.min(1, ov.reverb.wet))
  const chain = ov.reverb.enabled
    ? `[0:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,lowpass=f=${ov.lowpassHz},highpass=f=110[v];` +
      `[v]asplit=2[vd][vw];` +
      `[vw][1:a]afir=dry=0:wet=1:irnorm=1[rev];` +
      `[vd]volume=${(1 - wet).toFixed(3)}[dry];[rev]volume=${wet.toFixed(3)}[w];` +
      `[dry][w]amix=inputs=2:normalize=0[out]`
    : `[0:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,lowpass=f=${ov.lowpassHz},highpass=f=110[out]`
  const args = ['-y', '-i', vocalsStem]
  if (ov.reverb.enabled) args.push('-i', irPath)
  args.push('-filter_complex', chain, '-map', '[out]', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s24le', dest)
  await ffmpeg(args)
  log(`reverb: rendered the German voice bed (low-pass ${ov.lowpassHz} Hz, ${ov.reverb.enabled ? `${Math.round(wet * 100)} % wet` : 'dry'}) → ${dest}`)
  return dest
}
