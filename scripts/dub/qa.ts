// Step G: English SRT, fit report, and A/B excerpts.
import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ensureDayDirs, loadConfig, log, readJson } from './config'
import { ffmpeg, run } from './ffmpeg'
import type { FitFile, ScriptFile, SegmentsFile } from './types'

function srtTime(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const ms = Math.round((sec - Math.floor(sec)) * 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`
}

function splitCue(text: string, start: number, end: number): { start: number; end: number; text: string }[] {
  const words = text.split(/\s+/).filter(Boolean)
  const dur = end - start
  if (dur <= 7 && text.length <= 84) return [{ start, end, text }]
  const parts = Math.ceil(Math.max(dur / 6, text.length / 84))
  const per = Math.ceil(words.length / parts)
  const out: { start: number; end: number; text: string }[] = []
  for (let i = 0; i < parts; i++) {
    const chunk = words.slice(i * per, (i + 1) * per)
    if (!chunk.length) continue
    const a = start + (dur * i) / parts
    const b = start + (dur * (i + 1)) / parts
    out.push({ start: a, end: b, text: chunk.join(' ') })
  }
  return out
}

export function qa(day: number): void {
  const p = ensureDayDirs(day)
  const cfg = loadConfig()
  const fit = readJson<FitFile>(p.fitJson)
  const script = readJson<ScriptFile>(p.scriptJson)
  const segs = readJson<SegmentsFile>(p.segments)
  const enById = new Map(script.entries.map((e) => [e.id, e]))
  const segById = new Map(segs.segments.map((s) => [s.id, s]))

  const cues: string[] = []
  let idx = 1
  for (const e of fit.entries) {
    const en = enById.get(e.id)?.en
    if (!en || e.status === 'skip' || e.status === 'keep-de' || e.status === 'missing') continue
    for (const c of splitCue(en, e.placedStart, Math.max(e.placedEnd, e.placedStart + 0.8))) {
      cues.push(`${idx++}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`)
    }
  }
  writeFileSync(p.outSrt, cues.join('\n'))

  const speech = fit.entries.reduce((a, e) => a + e.deDur, 0)
  const enTotal = fit.entries.reduce((a, e) => a + e.enDur, 0)
  const count = (s: string) => fit.entries.filter((e) => e.status === s).length
  const rows = fit.entries.map((e) => {
    const en = enById.get(e.id)
    const seg = segById.get(e.id)
    const ratio = e.deDur > 0 && e.enDur > 0 ? (e.enDur / e.deDur).toFixed(2) : '—'
    const action =
      e.status === 'overflow'
        ? `cut ~${e.cutWords} words`
        : e.status === 'missing'
          ? 'write the English'
          : seg?.auto.suspect
            ? 'check: no voice energy here (possible hallucination)'
            : ''
    return `| ${e.id} | ${e.start.toFixed(1)} | ${e.deDur.toFixed(1)} | ${e.enDur > 0 ? e.enDur.toFixed(1) : '—'} | ${ratio} | ${e.tempo > 1.001 ? e.tempo.toFixed(2) : '—'} | ${(e.slotEnd - e.start).toFixed(1)} | ${e.bed} | ${e.status} | ${action} |`
  })
  const md = [
    `# Tag ${String(day).padStart(2, '0')} · fit report`,
    '',
    `Generated ${new Date().toISOString()} · words/sec ${cfg.script.wordsPerSec} · atempo cap ${cfg.fit.atempoCap}`,
    '',
    `- segments: ${fit.entries.length}`,
    `- German speech: ${(speech / 60).toFixed(1)} min of ${(fit.mediaDurationSec / 60).toFixed(1)} min (${((speech / fit.mediaDurationSec) * 100).toFixed(0)} %)`,
    `- English audio: ${(enTotal / 60).toFixed(1)} min (gross ratio ${speech > 0 ? (enTotal / speech).toFixed(2) : '—'})`,
    `- ok ${count('ok')} · tempo ${count('tempo')} · overflow ${count('overflow')} · missing ${count('missing')} · skip ${count('skip')} · keep-de ${count('keep-de')}`,
    '',
    '| id | start s | DE s | EN s | ratio | tempo | slot s | bed | status | action |',
    '|---|---|---|---|---|---|---|---|---|---|',
    ...rows,
    '',
  ].join('\n')
  writeFileSync(p.fitReport, md)
  log(`qa: wrote ${p.outSrt} (${idx - 1} cues) and ${p.fitReport}`)
}

export async function ab(day: number, atSec: number, lenSec: number, play: boolean): Promise<void> {
  const p = ensureDayDirs(day)
  const video = existsSync(p.outMp4) ? p.outMp4 : p.outMp4.replace(/\.mp4$/, '.mov')
  if (!existsSync(video)) throw new Error(`ab: ${video} missing; run mux first`)
  const en = join(p.outDir, `tag-${String(day).padStart(2, '0')}.ab-en.wav`)
  const de = join(p.outDir, `tag-${String(day).padStart(2, '0')}.ab-de.wav`)
  await ffmpeg(['-y', '-ss', String(atSec), '-t', String(lenSec), '-i', video, '-map', '0:a:0', en])
  const cfg = loadConfig()
  if (cfg.mux.includeGerman) await ffmpeg(['-y', '-ss', String(atSec), '-t', String(lenSec), '-i', video, '-map', '0:a:1', de])
  log(`ab: ${de} (German) and ${en} (English) at ${atSec} s`)
  if (play) {
    if (cfg.mux.includeGerman) await run(['afplay', de], { quiet: true })
    await run(['afplay', en], { quiet: true })
  }
}
