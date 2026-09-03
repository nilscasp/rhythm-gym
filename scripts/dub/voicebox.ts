// The only file that knows the Voicebox REST API (v0.5.0, http://127.0.0.1:17493, OpenAPI at /openapi.json).
// Observed behaviour: POST /generate returns immediately with status "generating"; GET /history/{id}
// reports "completed" | "error"; GET /audio/{id} serves the 24 kHz mono WAV of the default version.
import { writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import type { Config, Engine } from './types'

export const DONE_STATES = new Set(['completed'])
export const FAIL_STATES = new Set(['error', 'failed', 'cancelled'])

export interface VoiceProfile {
  id: string
  name: string
  language: string
  voice_type: string
  sample_count: number
  default_engine: string | null
}

export interface Generation {
  id: string
  status: string
  duration: number | null
  error: string | null
  audio_path: string | null
  seed: number | null
}

export interface GenerateBody {
  profile_id: string
  text: string
  language: string
  engine: Engine
  model_size: string
  seed?: number
  instruct?: string
  max_chunk_chars: number
  crossfade_ms: number
  normalize: boolean
}

export interface ProfileSample {
  id: string
  profile_id: string
  audio_path: string
  reference_text: string
}

export class VoiceboxClient {
  constructor(private readonly base: string, private readonly clientId: string) {}

  /** Where the desktop app keeps profiles/, generations/ and voicebox.db. */
  dataDir(): string {
    return `${process.env.HOME}/Library/Application Support/sh.voicebox.app`
  }

  async profileSamples(profileId: string): Promise<ProfileSample[]> {
    return this.get(`/profiles/${profileId}/samples`)
  }

  async createProfile(body: { name: string; description?: string; language: string; voice_type: string }): Promise<VoiceProfile> {
    const res = await fetch(`${this.base}/profiles`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) throw new Error(`Voicebox POST /profiles → ${res.status} ${await res.text()}`)
    return (await res.json()) as VoiceProfile
  }

  async addSample(profileId: string, filePath: string, referenceText: string): Promise<ProfileSample> {
    const form = new FormData()
    form.append('file', new Blob([await readFile(filePath)]), filePath.split('/').pop() ?? 'sample.wav')
    form.append('reference_text', referenceText)
    const res = await fetch(`${this.base}/profiles/${profileId}/samples`, {
      method: 'POST',
      headers: this.headers(),
      body: form,
      signal: AbortSignal.timeout(120000),
    })
    if (!res.ok) throw new Error(`Voicebox POST /profiles/${profileId}/samples → ${res.status} ${await res.text()}`)
    return (await res.json()) as ProfileSample
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return { 'X-Voicebox-Client-Id': this.clientId, ...extra }
  }

  private async get<T>(path: string, timeoutMs = 15000): Promise<T> {
    const res = await fetch(`${this.base}${path}`, { headers: this.headers(), signal: AbortSignal.timeout(timeoutMs) })
    if (!res.ok) throw new Error(`Voicebox GET ${path} → ${res.status} ${await res.text()}`)
    return (await res.json()) as T
  }

  async health(): Promise<{ status: string; model_loaded: boolean; backend_type: string; gpu_type: string; model_size: string }> {
    return this.get('/health')
  }

  async openapiVersion(): Promise<string> {
    const j = await this.get<{ info?: { version?: string } }>('/openapi.json')
    return j.info?.version ?? 'unknown'
  }

  async profiles(): Promise<VoiceProfile[]> {
    return this.get('/profiles')
  }

  async profileByIdOrName(idOrName: string): Promise<VoiceProfile> {
    const all = await this.profiles()
    const p = all.find((x) => x.id === idOrName) ?? all.find((x) => x.name.toLowerCase() === idOrName.toLowerCase())
    if (!p) throw new Error(`Voicebox profile not found: "${idOrName}". Available: ${all.map((x) => `${x.name} (${x.id})`).join(', ')}`)
    return p
  }

  async activeGenerations(): Promise<number> {
    const j = await this.get<{ generations?: unknown[] }>('/tasks/active')
    return j.generations?.length ?? 0
  }

  async modelsStatus(): Promise<{ model_name: string; downloaded: boolean; loaded: boolean }[]> {
    const j = await this.get<{ models: { model_name: string; downloaded: boolean; loaded: boolean }[] }>('/models/status')
    return j.models
  }

  async startGeneration(body: GenerateBody): Promise<Generation> {
    const res = await fetch(`${this.base}/generate`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    })
    if (!res.ok) throw new Error(`Voicebox POST /generate → ${res.status} ${await res.text()}`)
    return (await res.json()) as Generation
  }

  async getGeneration(id: string): Promise<Generation> {
    return this.get(`/history/${id}`)
  }

  async waitForGeneration(id: string, timeoutMs: number, pollMs = 1500): Promise<Generation> {
    const t0 = Date.now()
    for (;;) {
      const g = await this.getGeneration(id)
      if (DONE_STATES.has(g.status)) return g
      if (FAIL_STATES.has(g.status)) throw new Error(`generation ${id} ${g.status}: ${g.error ?? 'unknown error'}`)
      if (Date.now() - t0 > timeoutMs) throw new Error(`generation ${id} timed out after ${Math.round(timeoutMs / 1000)} s (status ${g.status})`)
      await Bun.sleep(pollMs)
    }
  }

  async downloadAudio(id: string, dest: string): Promise<void> {
    const res = await fetch(`${this.base}/audio/${id}`, { headers: this.headers(), signal: AbortSignal.timeout(60000) })
    if (!res.ok) throw new Error(`Voicebox GET /audio/${id} → ${res.status} ${await res.text()}`)
    writeFileSync(dest, new Uint8Array(await res.arrayBuffer()))
  }

  /** Full round trip: start, wait until the app is idle, poll, download. */
  async generateToFile(body: GenerateBody, dest: string, estimatedSec: number): Promise<Generation> {
    for (let i = 0; i < 600; i++) {
      if ((await this.activeGenerations()) === 0) break
      await Bun.sleep(2000)
    }
    const g = await this.startGeneration(body)
    const timeoutMs = Math.max(90, estimatedSec * 8) * 1000
    const done = await this.waitForGeneration(g.id, timeoutMs)
    await this.downloadAudio(g.id, dest)
    return done
  }
}

export function clientFromConfig(cfg: Config): VoiceboxClient {
  return new VoiceboxClient(cfg.voicebox.url, cfg.voicebox.clientId)
}

export function isConnectionRefused(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.message} ${(err as { code?: string }).code ?? ''} ${String((err as { cause?: unknown }).cause ?? '')}` : String(err)
  return /ECONNREFUSED|ConnectionRefused|Unable to connect|fetch failed/i.test(msg)
}
