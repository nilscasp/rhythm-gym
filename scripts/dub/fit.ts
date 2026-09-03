// Step D: fit each English clip into the German speech slot (atempo up to a cap, never overlap the next segment).
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { ensureDayDirs, loadConfig, log, readJson, sha256, warn, writeJson } from './config'
import { atempo, durationSec } from './ffmpeg'
import { loadState, markDone } from './state'
import type { Bed, FitEntry, FitFile, ScriptFile, SegmentsFile, TtsFile } from './types'

export async function fit(day: number): Promise<FitFile> {
  const p = ensureDayDirs(day)
  const cfg = loadConfig()
  const segs = readJson<SegmentsFile>(p.segments)
  const script = readJson<ScriptFile>(p.scriptJson)
  const tts = readJson<TtsFile>(p.ttsJson)
  const ttsById = new Map(tts.entries.map((e) => [e.id, e]))
  const scriptById = new Map(script.entries.map((e) => [e.id, e]))

  const entries: FitEntry[] = []
  for (const seg of segs.segments) {
    const t = ttsById.get(seg.id)
    const s = scriptById.get(seg.id)
    const flags = s?.flags ?? []
    const bed: Bed = flags.includes('keep-de') ? 'keep-de' : flags.includes('music') ? 'music' : flags.includes('silence') ? 'silence' : seg.auto.music ? 'music' : 'silence'
    const base: Omit<FitEntry, 'status' | 'enDurRaw' | 'tempo' | 'enDur' | 'placedEnd' | 'clip' | 'overflowSec' | 'cutWords'> = {
      id: seg.id,
      start: seg.start,
      deEnd: seg.end,
      slotEnd: seg.slotEnd,
      deDur: seg.spokenSec,
      placedStart: seg.start,
      bed,
    }
    if (flags.includes('keep-de')) {
      entries.push({ ...base, status: 'keep-de', enDurRaw: 0, tempo: 1, enDur: 0, placedEnd: seg.start, overflowSec: 0, cutWords: 0 })
      continue
    }
    if (!t || t.status === 'skip') {
      entries.push({ ...base, status: 'skip', enDurRaw: 0, tempo: 1, enDur: 0, placedEnd: seg.start, overflowSec: 0, cutWords: 0 })
      continue
    }
    if (t.status !== 'ok' || !t.wav) {
      entries.push({ ...base, status: 'missing', enDurRaw: 0, tempo: 1, enDur: 0, placedEnd: seg.start, overflowSec: 0, cutWords: 0 })
      continue
    }
    const raw = t.durationSec ?? (await durationSec(t.wav))
    const slot = Math.max(0.1, seg.slotEnd - seg.start)
    let tempo = 1
    let clip = t.wav
    let status: FitEntry['status'] = 'ok'
    let overflowSec = 0
    if (raw > slot) {
      const needed = raw / slot
      const noTempo = flags.includes('tempo=1')
      tempo = noTempo ? 1 : Math.min(needed, cfg.fit.atempoCap)
      if (tempo > 1.001) {
        clip = join(p.fitDir, `${seg.id}.fit.wav`)
        await atempo(t.wav, clip, tempo)
        status = 'tempo'
      }
      if (needed > tempo + 0.001) {
        status = 'overflow'
        overflowSec = raw / tempo - slot
      }
    }
    const enDur = raw / tempo
    entries.push({
      ...base,
      enDurRaw: round3(raw),
      tempo: round3(tempo),
      enDur: round3(enDur),
      placedEnd: round3(seg.start + enDur),
      clip,
      status,
      overflowSec: round3(overflowSec),
      cutWords: overflowSec > 0 ? Math.ceil(overflowSec * cfg.script.wordsPerSec) : 0,
    })
  }
  const file: FitFile = { day, mediaDurationSec: segs.mediaDurationSec, entries }
  writeJson(p.fitJson, file)
  const state = loadState(day)
  markDone(state, 'fit', sha256(entries.map((e) => `${e.id}:${e.status}:${e.tempo}`).join('|')))
  const by = (s: FitEntry['status']) => entries.filter((e) => e.status === s).length
  log(`fit: ok ${by('ok')}, tempo ${by('tempo')}, overflow ${by('overflow')}, skip ${by('skip')}, keep-de ${by('keep-de')}, missing ${by('missing')}`)
  if (by('overflow')) warn(`${by('overflow')} segment(s) overflow their slot — see the fit report and shorten the English`)
  return file
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}
