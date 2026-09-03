import { dirname } from 'node:path'
import { mkdirSync } from 'node:fs'
import { ensureDayDirs, log } from './config'
import { ffmpeg, probe } from './ffmpeg'
import { resolveSource } from './sources'
import { fileFingerprint, isDone, loadState, markDone, saveState } from './state'

export async function extract(day: number, opts: { force?: boolean; audioStream?: number } = {}): Promise<void> {
  const p = ensureDayDirs(day)
  const src = resolveSource(day)
  const state = loadState(day)
  const fp = `${fileFingerprint(src)}:a${opts.audioStream ?? 0}`
  if (!opts.force && isDone(state, 'extract', fp)) {
    log(`extract: day ${day} up to date`)
    return
  }
  const info = await probe(src)
  const audio = info.streams.filter((s) => s.codec_type === 'audio')
  const video = info.streams.find((s) => s.codec_type === 'video')
  if (audio.length === 0) throw new Error(`no audio stream in ${src}`)
  if (audio.length > 1) {
    log(`extract: ${audio.length} audio streams: ${audio.map((a, i) => `a:${i}=${a.codec_name}/${a.channels}ch`).join(', ')} (using a:${opts.audioStream ?? 0})`)
  }
  mkdirSync(dirname(p.orig48), { recursive: true })
  await ffmpeg(['-y', '-i', src, '-map', `0:a:${opts.audioStream ?? 0}`, '-vn', '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', p.orig48])
  state.source = src
  state.mediaDurationSec = Number(info.format.duration)
  state.videoCodec = video?.codec_name
  state.audioStreams = audio.map((a, i) => ({ index: i, codec: a.codec_name, channels: a.channels ?? 0, sampleRate: Number(a.sample_rate ?? 0) }))
  saveState(state)
  markDone(state, 'extract', fp)
  log(`extract: ${src} → ${p.orig48} (${state.mediaDurationSec.toFixed(1)} s, video ${state.videoCodec})`)
}
