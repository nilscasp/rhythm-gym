// Geprüfte Preset-Vorschläge ins Datenfile eintragen.
//
//   bun scripts/presets/apply.ts 13-22          → Presets dieser Tage ersetzen
//   bun scripts/presets/apply.ts 13-22 --check  → nur prüfen, nichts schreiben
//
// Quelle: Plans/preset-abgleich/tag-NN.json (Regeln: Plans/preset-abgleich/REGELN.md).
// Ersetzt je Tag den kompletten `presets: [...]`-Block. Bricht ab, wenn ein
// Muster ungültige Zeichen hat, IDs doppelt sind oder ein Videokapitel auf ein
// Preset zeigt, das es danach nicht mehr gibt.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import {
  RHYTHMUS_DAYS,
  type RhythmusHandsatzKey,
  type RhythmusPreset,
  type RhythmusSubdivisionKey,
} from '../../data/rhythmusfundament-days'

const ROOT = resolve(import.meta.dir, '../..')
const DATA_FILE = join(ROOT, 'data', 'rhythmusfundament-days.ts')
const IN_DIR = process.env.PRESET_DIR ?? join(ROOT, 'Plans', 'preset-abgleich')

const HANDSAETZE: RhythmusHandsatzKey[] = ['R-L', 'L-R', 'RR-LL', 'LL-RR', 'paradiddle', 'frei']
const SUBDIVISIONS: RhythmusSubdivisionKey[] = ['4n', '8n', '8t', '16n', '32n']
// Gruppengröße für die lesbare Schreibweise 'Dggg' + 'Sggg' + …
const GROUP: Record<RhythmusSubdivisionKey, number> = { '4n': 4, '8n': 2, '8t': 3, '16n': 4, '32n': 8 }

const pad2 = (n: number) => String(n).padStart(2, '0')
const quote = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`

function parseDays(arg: string | undefined): number[] {
  if (!arg) throw new Error('Tage angeben, z. B. "13-22"')
  const out = new Set<number>()
  for (const part of arg.split(',')) {
    const [a, b] = part.split('-').map(Number)
    for (let d = a; d <= (b ?? a); d++) out.add(d)
  }
  return [...out].sort((x, y) => x - y)
}

function validate(day: number, presets: RhythmusPreset[]) {
  const errors: string[] = []
  const ids = new Set<string>()
  for (const p of presets) {
    if (!p.id || ids.has(p.id)) errors.push(`ID fehlt oder doppelt: "${p.id}"`)
    ids.add(p.id)
    if (!/^[.gTSDXP]{1,128}$/.test(p.pattern)) errors.push(`${p.id}: ungültiges Muster "${p.pattern}"`)
    if (p.wiederholung !== undefined) {
      if (!/^[.gTSDXP]+$/.test(p.wiederholung)) errors.push(`${p.id}: ungültige Wiederholungs-Spur "${p.wiederholung}"`)
      if (p.wiederholung.length !== p.pattern.length) errors.push(`${p.id}: Wiederholungs-Spur ${p.wiederholung.length} ≠ Muster ${p.pattern.length} Schritte`)
    }
    if (!HANDSAETZE.includes(p.handsatz)) errors.push(`${p.id}: unbekannter Handsatz "${p.handsatz}"`)
    if (p.subdivision && !SUBDIVISIONS.includes(p.subdivision)) errors.push(`${p.id}: unbekannte Unterteilung "${p.subdivision}"`)
    if (!(p.bpm >= 30 && p.bpm <= 160)) errors.push(`${p.id}: BPM ${p.bpm} außerhalb 30–160`)
    if (!p.label || p.label.length > 40) errors.push(`${p.id}: Label fehlt oder zu lang`)
  }
  const meta = RHYTHMUS_DAYS.find((d) => d.number === day)
  for (const c of meta?.chapters ?? []) {
    if (c.presetId && !ids.has(c.presetId)) errors.push(`Kapitel „${c.label}" zeigt auf fehlendes Preset ${c.presetId}`)
  }
  if (errors.length) throw new Error(`Tag ${day}:\n  ${errors.join('\n  ')}`)
}

function formatPattern(p: RhythmusPreset, raw = p.pattern): string {
  const size = GROUP[p.subdivision ?? '16n']
  if (raw.length <= size) return quote(raw)
  const parts: string[] = []
  for (let i = 0; i < raw.length; i += size) parts.push(quote(raw.slice(i, i + size)))
  return parts.join(' + ')
}

function formatPresets(presets: RhythmusPreset[]): string {
  if (presets.length === 0) return '    presets: [],\n'
  const items = presets.map((p) => {
    const lines = [`        id: ${quote(p.id)},`, `        label: ${quote(p.label)},`]
    if (p.hint) lines.push(`        hint: ${quote(p.hint)},`)
    lines.push(`        pattern: ${formatPattern(p)},`)
    if (p.wiederholung) lines.push(`        wiederholung: ${formatPattern(p, p.wiederholung)},`)
    lines.push(`        handsatz: ${quote(p.handsatz)},`, `        bpm: ${p.bpm},`)
    if (p.subdivision) lines.push(`        subdivision: ${quote(p.subdivision)},`)
    return `      {\n${lines.join('\n')}\n      },`
  })
  return `    presets: [\n${items.join('\n')}\n    ],\n`
}

function replacePresets(src: string, day: number, presets: RhythmusPreset[]): string {
  // Auch die Zyklen haben `number:` — erst ab der Tagesliste suchen.
  const listAt = src.indexOf('export const RHYTHMUS_DAYS')
  const dayAt = src.indexOf(`    number: ${day},\n`, listAt)
  if (listAt < 0 || dayAt < 0) throw new Error(`Tag ${day} nicht im Datenfile gefunden`)
  const nextDay = src.indexOf('\n    number: ', dayAt + 1)
  const end = nextDay < 0 ? src.length : nextDay

  const empty = src.indexOf('    presets: [],\n', dayAt)
  if (empty >= 0 && empty < end) {
    return src.slice(0, empty) + formatPresets(presets) + src.slice(empty + '    presets: [],\n'.length)
  }
  const from = src.indexOf('    presets: [\n', dayAt)
  if (from < 0 || from > end) throw new Error(`Tag ${day}: presets-Block nicht gefunden`)
  const to = src.indexOf('\n    ],\n', from) + '\n    ],\n'.length
  return src.slice(0, from) + formatPresets(presets) + src.slice(to)
}

const days = parseDays(process.argv[2])
const checkOnly = process.argv.includes('--check')
let src = readFileSync(DATA_FILE, 'utf8')
for (const day of days) {
  const path = join(IN_DIR, `tag-${pad2(day)}.json`)
  if (!existsSync(path)) {
    console.warn(`Tag ${day}: kein Vorschlag (${path}) — übersprungen`)
    continue
  }
  const { presets } = JSON.parse(readFileSync(path, 'utf8')) as { presets: RhythmusPreset[] }
  validate(day, presets)
  src = replacePresets(src, day, presets)
  console.log(`Tag ${day}: ${presets.length} Presets ${checkOnly ? 'geprüft' : 'eingetragen'}`)
}
if (!checkOnly) writeFileSync(DATA_FILE, src)
