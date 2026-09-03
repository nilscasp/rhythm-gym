// Resolves the source video for a day: sources.json → ${WORKDIR}/sources/tag-NN.* → Bunny 1080p MP4 fallback.
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { WORKDIR, loadConfig, log, pad2, readJson, readRepoEnv, saveConfig, warn } from './config'
import { durationSec as durationOf, run } from './ffmpeg'

const SOURCES_PATH = join(WORKDIR, 'sources.json')

export function loadSources(): Record<string, string> {
  return existsSync(SOURCES_PATH) ? readJson<Record<string, string>>(SOURCES_PATH) : {}
}

export function saveSources(map: Record<string, string>): void {
  const sorted = Object.fromEntries(Object.entries(map).sort((a, b) => Number(a[0]) - Number(b[0])))
  writeFileSync(SOURCES_PATH, JSON.stringify(sorted, null, 2) + '\n')
}

export function resolveSource(day: number): string {
  const map = loadSources()
  const explicit = map[String(day)]
  if (explicit) {
    if (!existsSync(explicit)) throw new Error(`sources.json entry for day ${day} does not exist: ${explicit}`)
    return explicit
  }
  const dir = join(WORKDIR, 'sources')
  if (existsSync(dir)) {
    const hit = readdirSync(dir).find((f) => f.startsWith(`tag-${pad2(day)}.`) && /\.(mp4|mov|m4v|mkv)$/i.test(f))
    if (hit) return join(dir, hit)
  }
  throw new Error(
    `no source for day ${day}. Add it to ${SOURCES_PATH} ("${day}": "/path/to/Tag ${day} - HD 1080p.mov"), ` +
      `run "sources --scan <dir>", or "sources --bunny --day ${day}" to download the 1080p fallback MP4.`,
  )
}

/** Scans a directory tree for files named "Tag N …" and records them in sources.json. */
export function scanSources(root: string): Record<string, string> {
  const found: Record<string, string> = {}
  const walk = (dir: string, depth: number) => {
    if (depth > 6) return
    let entries: string[] = []
    try {
      entries = readdirSync(dir)
    } catch {
      return
    }
    for (const name of entries) {
      const full = join(dir, name)
      let st
      try {
        st = statSync(full)
      } catch {
        continue
      }
      if (st.isDirectory()) {
        if (!name.endsWith('.fcpbundle') && !name.startsWith('.')) walk(full, depth + 1)
        continue
      }
      const m = name.match(/^Tag\s*(\d{1,2})\b.*\.(mov|mp4|m4v)$/i)
      if (m) {
        const day = String(Number(m[1]))
        if (!found[day] || name.includes('1080p')) found[day] = full
      }
    }
  }
  walk(root, 0)
  const map = { ...loadSources(), ...found }
  saveSources(map)
  log(`scan: found ${Object.keys(found).length} day files under ${root}; sources.json now has ${Object.keys(map).length} entries`)
  return found
}

interface BunnyVideo {
  guid: string
  title: string
  length: number
  hasMP4Fallback: boolean
  availableResolutions: string
}

async function bunnyEnv(): Promise<{ libraryId: string; apiKey: string }> {
  const env = readRepoEnv()
  const libraryId = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID ?? env.NEXT_PUBLIC_BUNNY_LIBRARY_ID
  const apiKey = process.env.BUNNY_STREAM_API_KEY ?? env.BUNNY_STREAM_API_KEY
  if (!libraryId || !apiKey) throw new Error('NEXT_PUBLIC_BUNNY_LIBRARY_ID / BUNNY_STREAM_API_KEY not found (env or repo .env.local)')
  return { libraryId, apiKey }
}

export async function bunnyVideoMap(): Promise<Map<number, BunnyVideo>> {
  const { libraryId, apiKey } = await bunnyEnv()
  const res = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos?page=1&itemsPerPage=200&orderBy=date`, {
    headers: { AccessKey: apiKey },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`Bunny list videos → ${res.status}`)
  const j = (await res.json()) as { items: BunnyVideo[] }
  const map = new Map<number, BunnyVideo>()
  for (const v of j.items) {
    const m = v.title.match(/^Tag\s*(\d{1,2})\b/i)
    if (m) map.set(Number(m[1]), v)
  }
  return map
}

async function bunnyCdnHost(libraryId: string, guid: string): Promise<string> {
  const cfg = loadConfig()
  if (cfg.bunny?.cdnHost) return cfg.bunny.cdnHost
  const res = await fetch(`https://iframe.mediadelivery.net/embed/${libraryId}/${guid}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(20000),
  })
  const html = await res.text()
  const m = html.match(/https:\/\/[a-z0-9.-]+\.b-cdn\.net/)
  if (!m) throw new Error('could not determine Bunny CDN host from embed page; set bunny.cdnHost in config.json')
  cfg.bunny = { ...(cfg.bunny ?? {}), cdnHost: m[0] }
  saveConfig(cfg)
  return m[0]
}

/** Downloads the 1080p MP4 fallback for a day into ${WORKDIR}/sources/tag-NN.play_1080p.mp4. */
export async function downloadFromBunny(day: number, force = false): Promise<string> {
  const dest = join(WORKDIR, 'sources', `tag-${pad2(day)}.play_1080p.mp4`)
  if (existsSync(dest) && !force) {
    log(`bunny: ${dest} already exists`)
    return dest
  }
  const { libraryId } = await bunnyEnv()
  const map = await bunnyVideoMap()
  const v = map.get(day)
  if (!v) throw new Error(`Bunny library has no video titled "Tag ${day} …"`)
  if (!v.hasMP4Fallback) throw new Error(`Bunny video ${v.guid} has no MP4 fallback; enable it in the library or provide the original file`)
  const host = await bunnyCdnHost(libraryId, v.guid)
  const referer = loadConfig().bunny?.referer ?? 'https://www.rhythmgym.io/'
  const res = Math.max(...v.availableResolutions.split(',').map((r) => Number(r.replace('p', ''))).filter(Number.isFinite))
  const url = `${host}/${v.guid}/play_${res}p.mp4`
  log(`bunny: downloading day ${day} (${v.title}, ${Math.round(v.length / 60)} min) from ${url}`)
  const tmp = `${dest}.part`
  const r = await run(['curl', '-sS', '-L', '--fail', '-e', referer, '-o', tmp, url], { quiet: true })
  if (r.code !== 0) throw new Error(`download failed: ${r.stderr.slice(-300)}`)
  await run(['mv', tmp, dest])
  const st = statSync(dest)
  if (st.size < 1_000_000) warn(`downloaded file is suspiciously small (${st.size} bytes)`)
  log(`bunny: saved ${dest} (${(st.size / 1e6).toFixed(0)} MB)`)
  return dest
}

interface Candidate {
  file: string
  path: string
  sizeBytes: number
  durationSec: number | null
  hd: boolean
}

async function candidatesFor(dir: string): Promise<Candidate[]> {
  const out: Candidate[] = []
  for (const f of readdirSync(dir).sort()) {
    // "._name" are AppleDouble resource forks, not media.
    if (f.startsWith('._') || !/\.(mov|mp4|m4v)$/i.test(f)) continue
    const full = join(dir, f)
    let durationSec: number | null = null
    try {
      durationSec = await durationOf(full)
    } catch {
      durationSec = null
    }
    out.push({ file: f, path: full, sizeBytes: statSync(full).size, durationSec, hd: /1080/.test(f) })
  }
  return out
}

/**
 * Matches the local master files against the videos published on Bunny BY DURATION rather than by
 * filename. The names on the drive do not survive a naive scan: day 1's master is called
 * "Tag 1 Clip 1 - HD 1080p.mov" with no plain "Tag 1 - HD" beside it, the Tag 19 folder also holds
 * "Tag 20 - HD 1080p.mov", and day 11 has an "Alternative" cut that runs 53 s longer. Duration is the
 * one property that ties a local file to the cut that is actually online.
 */
export async function matchBunnySources(root: string, opts: { toleranceSec?: number; write?: boolean } = {}): Promise<Record<string, string>> {
  const tolerance = opts.toleranceSec ?? 2
  const bunny = await bunnyVideoMap()
  const found: Record<string, string> = {}
  const problems: string[] = []

  for (const entry of readdirSync(root).sort()) {
    const dir = join(root, entry)
    if (!statSync(dir).isDirectory()) continue
    const m = entry.match(/^Tag\s*(\d{1,2})\s*$/)
    if (!m) continue
    const day = Number(m[1])
    const cands = await candidatesFor(dir)
    const hd = cands.filter((c) => c.hd)
    if (!hd.length) {
      problems.push(`day ${day}: no 1080p file in ${entry}`)
      continue
    }
    const published = bunny.get(day)
    if (!published) {
      // Not published yet (days 41-44). Accept a single unambiguous 1080p master.
      if (hd.length === 1) {
        found[String(day)] = hd[0].path
        log(`  day ${String(day).padStart(2)}  ${hd[0].file}  (not published yet, single 1080p master)`)
      } else {
        problems.push(`day ${day}: not on Bunny and ${hd.length} 1080p files to choose from`)
      }
      continue
    }
    const exact = hd.filter((c) => c.durationSec !== null && Math.abs(c.durationSec - published.length) < tolerance)
    if (exact.length === 1) {
      found[String(day)] = exact[0].path
      log(`  day ${String(day).padStart(2)}  ${exact[0].file}  (${(exact[0].sizeBytes / 1e9).toFixed(2)} GB, matches the published ${Math.floor(published.length / 60)}:${String(published.length % 60).padStart(2, '0')})`)
    } else if (exact.length === 0) {
      problems.push(`day ${day}: no 1080p file within ${tolerance}s of the published ${published.length}s — candidates: ${hd.map((c) => `${c.file} (${c.durationSec?.toFixed(0)}s)`).join(', ')}`)
    } else {
      problems.push(`day ${day}: ${exact.length} 1080p files match the published duration — ${exact.map((c) => c.file).join(', ')}`)
    }
  }

  if (opts.write !== false) {
    saveSources({ ...loadSources(), ...found })
  }
  log(`match: ${Object.keys(found).length} days resolved${problems.length ? `, ${problems.length} need a decision` : ''}`)
  for (const p of problems) warn(p)
  return found
}
