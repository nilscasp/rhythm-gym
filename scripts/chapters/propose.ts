// Kapitel-Vorschläge für die Übe-Station unter den Tagesvideos.
//
//   bun scripts/chapters/propose.ts 1-5,26          → Vorschläge schreiben
//   bun scripts/chapters/propose.ts 1-5,26 --apply  → geprüfte Vorschläge eintragen
//   … --apply --replace                            → vorhandene Kapitel ersetzen
//
// Quelle sind die Whisper-Transkripte der Dubbing-Pipeline (DUB_WORKDIR, Standard
// ~/Movies/RhythmGym-Dub/tag-XX/02-asr/segments.json). Ein Sprachmodell markiert,
// mit welchem Satz jede Aufgabe beginnt; der Start ist immer der Beginn eines
// Whisper-Segments, also ein Satzanfang, nie mitten im Satz.
//
// Vorschläge landen in Plans/kapitel-vorschlaege/tag-XX.{md,json}. Nils liest das
// .md, korrigiert bei Bedarf das .json, danach trägt --apply die Kapitel in
// data/rhythmusfundament-days.ts ein.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { RHYTHMUS_DAYS, type VideoChapter } from '../../data/rhythmusfundament-days'

const ROOT = resolve(import.meta.dir, '../..')
const WORKDIR = resolve(process.env.DUB_WORKDIR ?? join(homedir(), 'Movies', 'RhythmGym-Dub'))
const OUT_DIR = join(ROOT, 'Plans', 'kapitel-vorschlaege')
const DATA_FILE = join(ROOT, 'data', 'rhythmusfundament-days.ts')
const INFERENCE = join(homedir(), '.claude', 'PAI', 'TOOLS', 'Inference.ts')

interface Segment {
  id: string
  start: number
  end: number
  de: string
}
interface SegmentsFile {
  mediaDurationSec: number
  segments: Segment[]
}
interface Proposal {
  day: number
  mediaDurationSec: number
  chapters: VideoChapter[]
}

const pad2 = (n: number) => String(n).padStart(2, '0')
const mmss = (s: number) => `${Math.floor(s / 60)}:${pad2(Math.floor(s % 60))}`

function parseDays(arg: string | undefined): number[] {
  if (!arg) throw new Error('Tage angeben, z. B. "1-5,26"')
  const out = new Set<number>()
  for (const part of arg.split(',')) {
    const [a, b] = part.split('-').map(Number)
    for (let d = a; d <= (b ?? a); d++) out.add(d)
  }
  return [...out].sort((x, y) => x - y)
}

function praxisSection(day: number): string {
  const path = join(ROOT, 'content', 'rhythmusfundament', `tag-${day}.md`)
  if (!existsSync(path)) return ''
  const md = readFileSync(path, 'utf8')
  const from = md.indexOf('DEINE PRAXIS')
  if (from < 0) return ''
  const to = md.indexOf('⸻', from)
  return md.slice(from, to < 0 ? undefined : to).trim()
}

const SYSTEM = `Du gliederst ein deutsches Handpan-Kursvideo in Übe-Kapitel.
Ein Kapitel beginnt dort, wo Nils eine neue Aufgabe/Stufe/Übung ankündigt oder vorspielt — nicht bei jedem Gedanken.
Zwei Ebenen: Übungen (Runde/Stufe/Handsatz) und darunter Unterübungen (z. B. „Bass dazu", „alles zur Wiederholung", Tempo steigt, Variante). Setze jede Übung UND jede Unterübung, die Nils ansagt.
Das erste Kapitel ist die Einführung ab Segment 1. Markierte Sprechpausen zeigen, wo gespielt wird; eine neue Ansage nach einer Pause ist meist eine neue (Unter-)Übung.
Spielt Nils mehrere Handsätze/Varianten nacheinander durch (meist eine je Preset), bekommt JEDE ein eigenes Kapitel — keine auslassen.
Whisper verhört sich bei Zähl- und Handsatz-Ansagen („Link, stretch" = „links, rechts"); achte auf solche Ansagen als Kapitelgrenze.
Antworte NUR mit JSON: {"chapters":[{"segmentId":"s001","label":"…","presetId":"…"|null,"sub":false}]}
- segmentId: das Segment, mit dessen erstem Wort die Aufgabe beginnt
- label: max. 40 Zeichen, deutsch, sachlich, z. B. "Stufe 2 · zwei Töne im Fill" oder "Handsatz 2 · L – R" (Handsätze im Format der Preset-Labels)
- presetId: nur wenn die Aufgabe klar zu einem der genannten Presets passt, sonst null
- sub: true für Unterübungen, false für Übungen`

async function propose(day: number): Promise<{ proposal: Proposal; file: SegmentsFile }> {
  const meta = RHYTHMUS_DAYS.find((d) => d.number === day)
  if (!meta) throw new Error(`Tag ${day} fehlt in data/rhythmusfundament-days.ts`)
  const asr = join(WORKDIR, `tag-${pad2(day)}`, '02-asr', 'segments.json')
  if (!existsSync(asr)) throw new Error(`Kein Transkript: ${asr}`)
  const file = JSON.parse(readFileSync(asr, 'utf8')) as SegmentsFile

  // Lange Sprechpausen markieren: dort wird meist gespielt — oft die Grenze einer Unterübung.
  let prevEnd = 0
  const transcript = file.segments
    .map((s) => {
      const gap = s.start - prevEnd
      prevEnd = s.end
      return `${gap >= 4 ? `  (${Math.round(gap)} s Pause)\n` : ''}[${s.id} ${mmss(s.start)}] ${s.de}`
    })
    .join('\n')
  const presets = meta.presets.map((p) => `- ${p.id}: ${p.label}${p.hint ? ` (${p.hint})` : ''}`).join('\n')
  const user = `Tag ${day} · ${meta.title}

Presets dieses Tages:
${presets || '(keine)'}

Aufgabenbeschreibung aus dem Kurstext:
${praxisSection(day) || '(keine)'}

Transkript (Segment-ID, Startzeit, Text):
${transcript}`

  // Lange Videos brauchen mehr als drei Minuten; ein zweiter Versuch fängt Ausreißer ab.
  let proc = Bun.spawnSync(['bun', INFERENCE, '--level', 'standard', '--json', '--timeout', '360000', SYSTEM, user], {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  if (proc.exitCode !== 0) {
    console.warn(`  Tag ${day}: erster Versuch fehlgeschlagen, zweiter …`)
    proc = Bun.spawnSync(['bun', INFERENCE, '--level', 'standard', '--json', '--timeout', '360000', SYSTEM, user], {
      stdout: 'pipe',
      stderr: 'pipe',
    })
  }
  if (proc.exitCode !== 0) throw new Error(`Inference fehlgeschlagen (Tag ${day}): ${proc.stderr.toString()}`)
  const raw = proc.stdout.toString()
  const json = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)) as {
    chapters: { segmentId: string; label: string; presetId: string | null; sub?: boolean }[]
  }

  const presetIds = new Set(meta.presets.map((p) => p.id))
  const chapters: VideoChapter[] = []
  for (const c of json.chapters) {
    const seg = file.segments.find((s) => s.id === c.segmentId)
    if (!seg) {
      console.warn(`  Tag ${day}: unbekanntes Segment ${c.segmentId} — übersprungen`)
      continue
    }
    const chapter: VideoChapter = {
      label: c.label.trim(),
      // Erstes Kapitel ab 0, sonst eine Sekunde Vorlauf vor dem ersten Wort.
      start: chapters.length === 0 ? 0 : Math.max(0, Math.floor(seg.start) - 1),
    }
    if (c.presetId && presetIds.has(c.presetId)) chapter.presetId = c.presetId
    if (c.sub && chapters.length > 0) chapter.sub = true
    chapters.push(chapter)
  }
  chapters.sort((a, b) => a.start - b.start)
  return { proposal: { day, mediaDurationSec: file.mediaDurationSec, chapters }, file }
}

function writeProposal(p: Proposal, file: SegmentsFile) {
  mkdirSync(OUT_DIR, { recursive: true })
  writeFileSync(join(OUT_DIR, `tag-${pad2(p.day)}.json`), JSON.stringify(p, null, 2) + '\n')
  const meta = RHYTHMUS_DAYS.find((d) => d.number === p.day)!
  const lines = p.chapters.map((c) => {
    const seg = file.segments.find((s) => s.start >= c.start) ?? file.segments[0]
    const preset = c.presetId ? meta.presets.find((x) => x.id === c.presetId)?.label : null
    const indent = c.sub ? '  ' : ''
    return `${indent}- **${mmss(c.start)}** · ${c.label}${preset ? ` → _Selbst üben: ${preset}_` : ''}\n${indent}  > ${seg.de}`
  })
  writeFileSync(
    join(OUT_DIR, `tag-${pad2(p.day)}.md`),
    `# Tag ${p.day} · ${meta.title} — Kapitel-Vorschlag\n\nVideo ${mmss(p.mediaDurationSec)} lang. Unter jeder Marke steht der Satz, mit dem sie beginnt.\nKorrekturen bitte in \`tag-${pad2(p.day)}.json\` (start in Sekunden).\n\n${lines.join('\n')}\n`,
  )
}

function apply(day: number, replace = false, source?: string) {
  const path = join(OUT_DIR, `tag-${pad2(day)}.json`)
  if (!existsSync(path)) throw new Error(`Kein Vorschlag für Tag ${day}: ${path}`)
  const { chapters } = JSON.parse(readFileSync(path, 'utf8')) as Proposal
  let src = source ?? readFileSync(DATA_FILE, 'utf8')

  // Auch die Zyklen haben `number:` — erst ab der Tagesliste suchen.
  const listAt = src.indexOf('export const RHYTHMUS_DAYS')
  const dayAt = src.indexOf(`    number: ${day},\n`, listAt)
  if (listAt < 0 || dayAt < 0) throw new Error(`Tag ${day} nicht im Datenfile gefunden`)
  const nextDay = src.indexOf('\n    number: ', dayAt + 1)
  const block = src.slice(dayAt, nextDay < 0 ? undefined : nextDay)
  if (block.includes('    chapters: [')) {
    if (!replace) throw new Error(`Tag ${day} hat schon Kapitel — mit --replace überschreiben`)
    const from = dayAt + block.indexOf('    chapters: [')
    const to = src.indexOf('    ],\n', from) + '    ],\n'.length
    src = src.slice(0, from) + src.slice(to)
    return apply(day, false, src)
  }
  const videoLine = block.match(/\n {4}videoId: '[^']+',\n/)
  if (!videoLine || videoLine.index === undefined) throw new Error(`Tag ${day} hat keine videoId`)

  const body = chapters
    .map((c) => {
      const label = c.label.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
      const fields = [`label: '${label}'`, `start: ${c.start}`]
      if (c.end !== undefined) fields.push(`end: ${c.end}`)
      if (c.presetId) fields.push(`presetId: '${c.presetId}'`)
      if (c.sub) fields.push('sub: true')
      return `      { ${fields.join(', ')} },`
    })
    .join('\n')
  const insertAt = dayAt + videoLine.index + videoLine[0].length
  src = `${src.slice(0, insertAt)}    chapters: [\n${body}\n    ],\n${src.slice(insertAt)}`
  writeFileSync(DATA_FILE, src)
  console.log(`Tag ${day}: ${chapters.length} Kapitel eingetragen`)
}

const days = parseDays(process.argv[2])
if (process.argv.includes('--apply')) {
  for (const d of days) apply(d, process.argv.includes('--replace'))
} else {
  const failed: number[] = []
  for (const d of days) {
    console.log(`Tag ${d} …`)
    try {
      const { proposal, file } = await propose(d)
      writeProposal(proposal, file)
      console.log(`  ${proposal.chapters.length} Kapitel → Plans/kapitel-vorschlaege/tag-${pad2(d)}.md`)
    } catch (e) {
      failed.push(d)
      console.error(`  Tag ${d} übersprungen: ${(e as Error).message.split('\n')[0]}`)
    }
  }
  if (failed.length) {
    console.error(`Fehlgeschlagen: ${failed.join(',')}`)
    process.exitCode = 1
  }
}
