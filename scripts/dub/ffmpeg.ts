import { existsSync } from 'node:fs'

export interface RunResult {
  code: number
  stdout: string
  stderr: string
}

export async function run(cmd: string[], opts: { env?: Record<string, string>; cwd?: string; quiet?: boolean } = {}): Promise<RunResult> {
  const proc = Bun.spawn(cmd, {
    cwd: opts.cwd,
    env: { ...process.env, ...(opts.env ?? {}) },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  if (code !== 0 && !opts.quiet) {
    throw new Error(`command failed (${code}): ${cmd.slice(0, 3).join(' ')} …\n${stderr.slice(-2000)}`)
  }
  return { code, stdout, stderr }
}

export async function ffmpeg(args: string[], opts: { quiet?: boolean } = {}): Promise<RunResult> {
  return run(['ffmpeg', '-hide_banner', '-nostdin', '-loglevel', 'error', ...args], opts)
}

export interface ProbeStream {
  index: number
  codec_type: string
  codec_name: string
  width?: number
  height?: number
  r_frame_rate?: string
  sample_rate?: string
  channels?: number
  tags?: Record<string, string>
}

export interface ProbeResult {
  format: { duration: string; format_name: string; bit_rate?: string }
  streams: ProbeStream[]
}

export async function probe(path: string): Promise<ProbeResult> {
  if (!existsSync(path)) throw new Error(`probe: file not found: ${path}`)
  const r = await run(['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', path])
  return JSON.parse(r.stdout) as ProbeResult
}

export async function durationSec(path: string): Promise<number> {
  const p = await probe(path)
  return Number(p.format.duration)
}

export interface Loudness {
  input_i: number
  input_tp: number
  input_lra: number
  input_thresh: number
}

/** Measures integrated loudness etc. with loudnorm's analysis pass. */
export async function measureLoudness(path: string): Promise<Loudness> {
  const r = await run(['ffmpeg', '-hide_banner', '-nostdin', '-i', path, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], { quiet: true })
  // The JSON block is printed mid-stderr, followed by muxing/progress lines — take the last block containing input_i.
  const blocks = r.stderr.match(/\{[^{}]*"input_i"[^{}]*\}/g)
  if (!blocks?.length) throw new Error(`loudnorm output not found for ${path}`)
  const j = JSON.parse(blocks[blocks.length - 1]) as Record<string, string>
  const num = (k: string) => {
    const v = Number(j[k])
    return Number.isFinite(v) ? v : -70
  }
  return { input_i: num('input_i'), input_tp: num('input_tp'), input_lra: num('input_lra'), input_thresh: num('input_thresh') }
}

/** Decodes any audio file to raw float32 PCM (interleaved if channels > 1). */
export async function decodeF32(path: string, sampleRate: number, channels: number): Promise<Float32Array> {
  const proc = Bun.spawn(
    ['ffmpeg', '-hide_banner', '-nostdin', '-loglevel', 'error', '-i', path, '-f', 'f32le', '-acodec', 'pcm_f32le', '-ac', String(channels), '-ar', String(sampleRate), '-'],
    { stdout: 'pipe', stderr: 'pipe' },
  )
  const [buf, stderr, code] = await Promise.all([new Response(proc.stdout).arrayBuffer(), new Response(proc.stderr).text(), proc.exited])
  if (code !== 0) throw new Error(`decodeF32 failed for ${path}: ${stderr.slice(-500)}`)
  return new Float32Array(buf)
}

/** Encodes raw float32 PCM to a WAV file. */
export async function encodeF32(raw: Float32Array, sampleRate: number, channels: number, dest: string, codec = 'pcm_s24le'): Promise<void> {
  const proc = Bun.spawn(
    ['ffmpeg', '-hide_banner', '-nostdin', '-loglevel', 'error', '-y', '-f', 'f32le', '-ar', String(sampleRate), '-ac', String(channels), '-i', '-', '-c:a', codec, dest],
    { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' },
  )
  const CHUNK = 1 << 20
  const bytes = new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength)
  for (let i = 0; i < bytes.length; i += CHUNK) {
    proc.stdin.write(bytes.subarray(i, Math.min(i + CHUNK, bytes.length)))
    await proc.stdin.flush()
  }
  proc.stdin.end()
  const [stderr, code] = await Promise.all([new Response(proc.stderr).text(), proc.exited])
  if (code !== 0) throw new Error(`encodeF32 failed for ${dest}: ${stderr.slice(-500)}`)
}

/** RMS in dBFS of a mono float buffer slice [startSec, endSec). */
export function rmsDb(buf: Float32Array, sampleRate: number, startSec: number, endSec: number): number {
  const a = Math.max(0, Math.floor(startSec * sampleRate))
  const b = Math.min(buf.length, Math.ceil(endSec * sampleRate))
  if (b <= a) return -100
  let acc = 0
  for (let i = a; i < b; i++) acc += buf[i] * buf[i]
  const rms = Math.sqrt(acc / (b - a))
  return rms > 0 ? 20 * Math.log10(rms) : -100
}

/** Trims leading/trailing silence and resamples to 48 kHz mono PCM16. */
export async function trimAndResample(src: string, dest: string): Promise<void> {
  const af = [
    'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05',
    'areverse',
    'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.12',
    'areverse',
  ].join(',')
  await ffmpeg(['-y', '-i', src, '-af', af, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', dest])
}

export async function atempo(src: string, dest: string, factor: number): Promise<void> {
  await ffmpeg(['-y', '-i', src, '-af', `atempo=${factor.toFixed(4)}`, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', dest])
}

export async function which(bin: string): Promise<string | null> {
  const r = await run(['/bin/sh', '-c', `command -v ${bin}`], { quiet: true })
  return r.code === 0 ? r.stdout.trim() : null
}
