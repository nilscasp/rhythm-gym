// Step C: English speech per segment via the Voicebox REST API, sequential, content-addressed cache.
import { copyFileSync, existsSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { WORKDIR, ensureDayDirs, loadConfig, log, readJson, sha256, warn, writeJson } from './config'
import { durationSec, envelopeStats, trimAndResample } from './ffmpeg'
import { clientFromConfig, isConnectionRefused } from './voicebox'
import { ensureWordBank, isCountLine, placementsFor, wordsNeeded } from './countWords'
import { loadState, markDone } from './state'
import type { Config, ScriptFile, SegmentsFile, TtsEntry, TtsFile } from './types'

function cacheKey(cfg: Config, text: string, seed: number): string {
  return sha256(
    JSON.stringify({
      profileId: cfg.tts.profileId,
      engine: cfg.tts.engine,
      modelSize: cfg.tts.modelSize,
      language: cfg.tts.language,
      seed,
      instruct: cfg.tts.instruct,
      denoise: cfg.tts.denoise.enabled ? cfg.tts.denoise.outputChain : null,
      text: text.replace(/\s+/g, ' ').replace(/[""]/g, '"').replace(/['']/g, "'").trim(),
    }),
  )
}

function cachePath(key: string, ext: 'wav' | 'json'): string {
  return join(WORKDIR, 'tts-cache', `${key}.${ext}`)
}

export async function tts(day: number, opts: { force?: boolean; only?: string[] } = {}): Promise<TtsFile> {
  const p = ensureDayDirs(day)
  const cfg = loadConfig()
  if (!cfg.tts.profileId) throw new Error('tts: config.tts.profileId is empty — run "voice-test --choose <label>" or set it in config.json')
  if (!existsSync(p.scriptJson)) throw new Error(`tts: ${p.scriptJson} missing; run "script --day ${day}" after writing the English`)
  const script = readJson<ScriptFile>(p.scriptJson)
  const segs = readJson<SegmentsFile>(p.segments)
  const client = clientFromConfig(cfg)

  try {
    const h = await client.health()
    if (!h.model_loaded) warn(`Voicebox reports model_loaded=false (${h.model_size}, ${h.backend_type})`)
  } catch (err) {
    if (isConnectionRefused(err)) {
      throw new Error('tts: Voicebox is not reachable at ' + cfg.voicebox.url + ' — open the Voicebox app and re-run (nothing was lost)')
    }
    throw err
  }

  // Counting lines are voiced word by word from a shared bank, so each English word lands on the
  // stroke Nils actually plays instead of drifting through the line.
  const segById = new Map(segs.segments.map((sg) => [sg.id, sg]))
  const countable = segs.segments.filter((sg) => {
    const sc = script.entries.find((e) => e.id === sg.id)
    return isCountLine(sg) && !(sc?.flags ?? []).some((f) => f === 'keep-de' || f === 'skip')
  })
  const bank = countable.length ? await ensureWordBank(client, cfg, wordsNeeded(countable)) : new Map<string, string>()
  const countIds = new Set(countable.map((sg) => sg.id))

  const entries: TtsEntry[] = []
  let generated = 0
  let cached = 0
  let counted = 0
  for (const e of script.entries) {
    if (opts.only && !opts.only.includes(e.id)) {
      const prev = existsSync(p.ttsJson) ? readJson<TtsFile>(p.ttsJson).entries.find((x) => x.id === e.id) : undefined
      if (prev) {
        entries.push(prev)
        continue
      }
    }
    if (e.flags.includes('skip') || e.flags.includes('keep-de')) {
      entries.push({ id: e.id, status: 'skip' })
      continue
    }
    if (countIds.has(e.id)) {
      const seg = segById.get(e.id)!
      const words = placementsFor(seg, bank)
      entries.push({ id: e.id, status: 'words', words })
      counted++
      continue
    }
    if (!e.en) {
      entries.push({ id: e.id, status: 'missing' })
      continue
    }
    const seed = e.seed ?? cfg.tts.seed
    const key = cacheKey(cfg, e.en, seed)
    const wav = cachePath(key, 'wav')
    const dest = join(p.ttsDir, `${e.id}.wav`)
    if (existsSync(wav) && !opts.force) {
      copyFileSync(wav, dest)
      const meta = readJson<{ durationSec: number; generationId: string }>(cachePath(key, 'json'))
      entries.push({ id: e.id, status: 'ok', cacheKey: key, wav: dest, durationSec: meta.durationSec, generationId: meta.generationId })
      cached++
      continue
    }
    const estimated = Math.max(2, e.enWords / cfg.script.wordsPerSec)
    const tmp = `${wav}.raw.wav`
    let entry: TtsEntry = { id: e.id, status: 'failed' }
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // A re-roll after a degenerate generation needs a different seed; the same one tends to
        // reproduce the same failure.
        const attemptSeed = attempt === 1 ? seed : seed + attempt * 1013
        const g = await client.generateToFile(
          {
            profile_id: cfg.tts.profileId,
            text: e.en,
            language: cfg.tts.language,
            engine: cfg.tts.engine,
            model_size: cfg.tts.modelSize,
            seed: attemptSeed,
            instruct: cfg.tts.instruct || undefined,
            max_chunk_chars: cfg.tts.maxChunkChars,
            crossfade_ms: cfg.tts.crossfadeMs,
            normalize: cfg.tts.normalize,
          },
          tmp,
          estimated,
        )
        await trimAndResample(tmp, wav, cfg.tts.denoise.enabled ? cfg.tts.denoise.outputChain : undefined)
        unlinkSync(tmp)

        const env = await envelopeStats(wav)
        const tooFlat = env.dynamicRangeDb < cfg.tts.quality.minDynamicRangeDb
        const tooLong = env.durationSec > Math.max(4, estimated * cfg.tts.quality.maxDurationFactor)
        if ((tooFlat || tooLong) && attempt < 3) {
          warn(
            `${e.id}: rejected generation (${env.durationSec.toFixed(1)}s, dynamic range ${env.dynamicRangeDb.toFixed(1)} dB` +
              `${tooFlat ? ' — a constant drone, not speech' : ''}${tooLong ? ' — far longer than the text warrants' : ''}), re-rolling the seed`,
          )
          continue
        }
        if (tooFlat || tooLong) {
          warn(`${e.id}: still questionable after 3 attempts (${env.durationSec.toFixed(1)}s, dynamic range ${env.dynamicRangeDb.toFixed(1)} dB) — listen to it`)
        }
        const dur = await durationSec(wav)
        writeJson(cachePath(key, 'json'), {
          profileId: cfg.tts.profileId,
          engine: cfg.tts.engine,
          modelSize: cfg.tts.modelSize,
          seed: attemptSeed,
          instruct: cfg.tts.instruct,
          text: e.en,
          durationSec: dur,
          dynamicRangeDb: Math.round(env.dynamicRangeDb * 10) / 10,
          generationId: g.id,
          createdAt: new Date().toISOString(),
        })
        copyFileSync(wav, dest)
        entry = { id: e.id, status: 'ok', cacheKey: key, wav: dest, durationSec: dur, generationId: g.id }
        generated++
        const seg = segs.segments.find((s) => s.id === e.id)
        log(`tts: ${e.id} ${dur.toFixed(1)}s (slot ${seg ? seg.slotSec.toFixed(1) : '?'}s) "${e.en.slice(0, 48)}${e.en.length > 48 ? '…' : ''}"`)
        break
      } catch (err) {
        if (isConnectionRefused(err)) {
          writeJson(p.ttsJson, { day, profileId: cfg.tts.profileId, engine: cfg.tts.engine, entries } satisfies TtsFile)
          throw new Error('tts: lost the connection to Voicebox — open the app and re-run; finished segments are cached')
        }
        const msg = err instanceof Error ? err.message : String(err)
        warn(`${e.id} attempt ${attempt}/3 failed: ${msg.slice(0, 200)}`)
        entry = { id: e.id, status: 'failed', error: msg.slice(0, 300) }
        if (attempt < 3) await Bun.sleep([5000, 15000, 45000][attempt - 1])
      }
    }
    entries.push(entry)
  }
  const file: TtsFile = { day, profileId: cfg.tts.profileId, engine: cfg.tts.engine, entries }
  writeJson(p.ttsJson, file)
  const state = loadState(day)
  markDone(state, 'tts', sha256(entries.map((e) => `${e.id}:${e.cacheKey ?? e.status}`).join('|')))
  const failed = entries.filter((e) => e.status === 'failed').length
  log(`tts: ${generated} generated, ${cached} from cache, ${counted} counting line(s) placed word by word, ${entries.filter((e) => e.status === 'missing').length} missing, ${failed} failed`)
  if (failed) warn(`${failed} segment(s) failed — re-run "tts --day ${day}" to retry only those`)
  return file
}
