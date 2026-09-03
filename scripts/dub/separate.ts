// Vocal/music separation with Demucs (htdemucs, two stems) via uvx. Runs on MPS, falls back to CPU.
import { existsSync } from 'node:fs'
import { ensureDayDirs, loadConfig, log, warn } from './config'
import { ffmpeg, run } from './ffmpeg'
import { fileFingerprint, isDone, loadState, markDone } from './state'

export async function separate(day: number, opts: { force?: boolean; model?: string; device?: 'mps' | 'cpu' } = {}): Promise<void> {
  const p = ensureDayDirs(day)
  const cfg = loadConfig()
  if (!existsSync(p.orig48)) throw new Error(`separate: run extract first (${p.orig48} missing)`)
  const model = opts.model ?? 'htdemucs'
  const state = loadState(day)
  const fp = `${fileFingerprint(p.orig48)}:${model}`
  if (!opts.force && existsSync(p.noVocals48) && existsSync(p.vocals16)) {
    if (!isDone(state, 'separate', fp)) markDone(state, 'separate', fp)
    log(`separate: day ${day} up to date`)
    return
  }
  const devices: ('mps' | 'cpu')[] = opts.device ? [opts.device] : [cfg.asr.device, 'cpu'].filter((d, i, a) => a.indexOf(d) === i) as ('mps' | 'cpu')[]
  let ok = false
  for (const device of devices) {
    const t0 = Date.now()
    log(`separate: demucs ${model} on ${device} (first run installs demucs via uv) …`)
    const r = await run(
      ['uvx', '--python', '3.11', '--from', 'demucs', '--with', 'numpy', '--with', 'soundfile', 'demucs', '-n', model, '--two-stems=vocals', '-d', device, '-o', p.sepDir, p.orig48],
      { env: { PYTORCH_ENABLE_MPS_FALLBACK: '1' }, quiet: true },
    )
    if (r.code === 0) {
      log(`separate: done on ${device} in ${((Date.now() - t0) / 1000).toFixed(0)} s`)
      ok = true
      break
    }
    warn(`demucs on ${device} failed: ${r.stderr.trim().split('\n').slice(-3).join(' | ')}`)
  }
  if (!ok) throw new Error('separate: demucs failed on all devices')
  const stemDir = `${p.sepDir}/${model}/orig.48k`
  const vocals = `${stemDir}/vocals.wav`
  const noVocals = `${stemDir}/no_vocals.wav`
  if (!existsSync(vocals) || !existsSync(noVocals)) throw new Error(`separate: expected stems missing under ${stemDir}`)
  await ffmpeg(['-y', '-i', noVocals, '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', p.noVocals48])
  await ffmpeg(['-y', '-i', vocals, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', p.vocals16])
  markDone(state, 'separate', fp)
  log(`separate: stems → ${p.noVocals48}, ${p.vocals16}`)
}
