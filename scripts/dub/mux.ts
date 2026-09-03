// Step F: loudness-match the mix to the original track, then mux it as the default audio stream.
import { existsSync } from 'node:fs'
import { ensureDayDirs, loadConfig, log, readJson, warn } from './config'
import { ffmpeg, measureLoudness, probe } from './ffmpeg'
import { resolveSource } from './sources'
import { loadState, markDone } from './state'

export async function mux(day: number): Promise<string> {
  const p = ensureDayDirs(day)
  const cfg = loadConfig()
  if (!existsSync(p.mixWav)) throw new Error(`mux: ${p.mixWav} missing; run mix first`)
  const src = resolveSource(day)

  const origL = await measureLoudness(p.orig48)
  const mixL = await measureLoudness(p.mixWav)
  const filter =
    `loudnorm=I=${origL.input_i.toFixed(2)}:TP=-1.5:LRA=${Math.max(1, origL.input_lra).toFixed(2)}:` +
    `measured_I=${mixL.input_i.toFixed(2)}:measured_TP=${mixL.input_tp.toFixed(2)}:` +
    `measured_LRA=${Math.max(0.1, mixL.input_lra).toFixed(2)}:measured_thresh=${mixL.input_thresh.toFixed(2)}:linear=true:print_format=summary`
  await ffmpeg(['-y', '-i', p.mixWav, '-af', filter, '-ar', '48000', '-c:a', 'pcm_s24le', p.finalWav])
  const finalL = await measureLoudness(p.finalWav)
  log(`mux: loudness original ${origL.input_i.toFixed(1)} LUFS → English ${finalL.input_i.toFixed(1)} LUFS`)
  if (Math.abs(finalL.input_i - origL.input_i) > 1.5) warn(`mux: loudness differs by ${(finalL.input_i - origL.input_i).toFixed(1)} LU from the original`)

  const info = await probe(src)
  const vcodec = info.streams.find((s) => s.codec_type === 'video')?.codec_name ?? ''
  const container = ['h264', 'hevc', 'mpeg4', 'av1'].includes(vcodec) ? 'mp4' : 'mov'
  const dest = container === 'mp4' ? p.outMp4 : p.outMp4.replace(/\.mp4$/, '.mov')
  if (container !== 'mp4') warn(`mux: source video is ${vcodec}; writing .mov so the video stream can be copied`)

  const args = ['-y', '-i', src, '-i', p.finalWav, '-map', '0:v:0', '-map', '1:a:0']
  if (cfg.mux.includeGerman) args.push('-map', '0:a:0')
  args.push(
    '-dn', '-sn',
    '-c:v', 'copy',
    '-c:a', cfg.mux.audioCodec,
    '-b:a', cfg.mux.audioBitrate,
    '-ar', '48000',
    '-metadata:s:a:0', 'language=eng',
    '-metadata:s:a:0', 'title=English',
    '-disposition:a:0', 'default',
  )
  if (cfg.mux.includeGerman) {
    args.push('-metadata:s:a:1', 'language=deu', '-metadata:s:a:1', 'title=Deutsch', '-disposition:a:1', '0')
  }
  args.push('-movflags', '+faststart', dest)
  await ffmpeg(args)

  const outInfo = await probe(dest)
  const outDur = Number(outInfo.format.duration)
  const srcDur = Number(info.format.duration)
  if (Math.abs(outDur - srcDur) > 0.25) warn(`mux: output duration ${outDur.toFixed(2)} s differs from source ${srcDur.toFixed(2)} s`)
  const state = loadState(day)
  markDone(state, 'mux', `${dest}:${outDur.toFixed(2)}`)
  log(`mux: wrote ${dest} (${outInfo.streams.filter((s) => s.codec_type === 'audio').length} audio tracks, video ${vcodec} copied)`)
  return dest
}
