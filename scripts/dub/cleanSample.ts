// Cleans a reference recording and clones a fresh profile from it, leaving the original untouched.
//
// CAUTION, measured on Qwen3-TTS 1.7B: cloning from an aggressively denoised sample destabilised the
// model. The clone produced constant drones instead of speech (a 20 s output at 3 dB signal-to-noise
// where the same sentence from the untouched sample gave 14.6 s at 42 dB). Denoising the GENERATED
// output instead — see `tts.denoise.outputChain` — reaches 53 dB without that risk, and is what the
// pipeline uses by default. Reach for this only with gentle settings, and listen to the result before
// dubbing 36 videos with it. The quality gate in tts.ts catches the failure mode either way.
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { WORKDIR, loadConfig, log } from './config'
import { ffmpeg } from './ffmpeg'
import { clientFromConfig } from './voicebox'

export interface CleanSampleResult {
  profileId: string
  profileName: string
  cleanedSample: string
}

export async function cleanSample(sourceProfile: string, opts: { name?: string; file?: string } = {}): Promise<CleanSampleResult> {
  const cfg = loadConfig()
  const client = clientFromConfig(cfg)
  const src = await client.profileByIdOrName(sourceProfile)
  const samples = await client.profileSamples(src.id)
  if (!samples.length) throw new Error(`clean-sample: profile "${src.name}" has no reference sample`)
  const sample = samples[0]
  const raw = opts.file ?? join(client.dataDir(), sample.audio_path)
  if (!existsSync(raw)) throw new Error(`clean-sample: reference audio not found at ${raw} — pass --file <path>`)

  const cleaned = join(WORKDIR, 'voice-test', `reference-${src.id.slice(0, 8)}-clean.wav`)
  await ffmpeg(['-y', '-i', raw, '-af', cfg.tts.denoise.sampleChain, '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', cleaned])
  log(`clean-sample: cleaned ${raw} → ${cleaned}`)

  const name = opts.name ?? `${src.name.trim()} (denoised)`
  const profile = await client.createProfile({
    name,
    description: 'Reference sample denoised so the clone does not reproduce room noise',
    language: src.language,
    voice_type: 'cloned',
  })
  await client.addSample(profile.id, cleaned, sample.reference_text)
  log(`clean-sample: created profile "${name}" (${profile.id}) — test it with: voice-test --profile ${profile.id}`)
  return { profileId: profile.id, profileName: name, cleanedSample: cleaned }
}
