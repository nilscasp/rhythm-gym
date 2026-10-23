#!/usr/bin/env bun
// ─────────────────────────────────────────────────────────────────────────────
// seed-kurse.ts — Kurse, Abschnitte und Lektionen aus der Bunny-Zuordnung und
// den Skool-Texten in die DB (Bauabschnitt C, Migration 0010).
//
//   bun scripts/seed-kurse.ts            # = --dry: nur Ausgabe, keine DB
//   bun scripts/seed-kurse.ts --apply    # schreibt (service_role)
//   bun scripts/seed-kurse.ts --apply --publish   # setzt zusätzlich published_at
//
// Optionen:
//   --source <json>       Bunny-Zuordnung (Standard: SOURCE_JSON unten)
//   --texts <ordner>      Content-Hub/Lektionen, ein Unterordner je Kurs
//   --landkarte <md>      Content-Hub/LANDKARTE.md (Titel der Aufnahmen)
//   --durations           Dauer je Video über die Bunny-API holen
//                         (BUNNY_STREAM_API_KEY, NEXT_PUBLIC_BUNNY_LIBRARY_ID)
//
// Quellen je Kurs (Stand 22.10.2026, Content-Hub auf 2T-nils-1):
//   Handpan Kompass      hk-lNN-skool.md je Lektion, hk-uebersicht-skool.md =
//                        Kursbeschreibung, Modul aus der Kopfzeile = Abschnitt
//   Klang der Elemente   Skool-Texte.md (eine Datei, ## Abschnitt / ### N · Titel)
//   Handpan Kreativ      Skool-Beschreibungen.md (## Lektion N · Titel (Dauer))
//   Von Anfang an …      vaa3-vaa4-skool-texte.md (## Session R · Lektion N · Titel)
//   Bibliotheken         Titel aus LANDKARTE.md, Slug = Dateiname
// AppleDouble-Dateien („._*“) werden überall ignoriert.
//
// Idempotent: Programme per slug, Abschnitte per (program_id, slug), Lektionen
// per (program_id, slug), Inhalte per lesson_id — jeder Lauf schreibt denselben
// Stand. published_at wird nur mit --publish gesetzt und nie zurückgenommen.
// „von-anfang-an-spielen“ existiert schon: das Programm wird nicht angefasst,
// nur Lektionen werden angehängt.
//
// PDF-Anhänge: Der Storage-Upload ist noch nicht gebaut. Der Trockenlauf zeigt
// sie, --apply überspringt sie und meldet sie als Auffälligkeit.
//
// Geheimnisse: SUPABASE_SERVICE_ROLE_KEY und BUNNY_STREAM_API_KEY kommen aus
// der Umgebung (Bun lädt .env.local automatisch) und werden nie ausgegeben.
// ─────────────────────────────────────────────────────────────────────────────

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../app/lib/supabase/database.types'
import {
  ELEMENT_LETTERS,
  type ElementeText,
  type Landkarte,
  type ParsedText,
  elementHeadingFor,
  isAppleDouble,
  lessonKey,
  normalize,
  parseElementeTexte,
  parseKompassLesson,
  parseKompassOverview,
  parseKreativTexte,
  parseLandkarte,
  parseVaaTexte,
  sessionTitle,
  slugify,
  stemOf,
  titleFromFilename,
  titleMatchesFile,
} from './lib/kurse-quellen'

// ── Konstanten ───────────────────────────────────────────────────────────────

const SOURCE_JSON = '/Volumes/2T-nils-1/Content-Hub/Upload/bunny-upload-2026-10-22.json'
const TEXTS_DIR = '/Volumes/2T-nils-1/Content-Hub/Lektionen'
const LANDKARTE_MD = '/Volumes/2T-nils-1/Content-Hub/LANDKARTE.md'

type PlanTier = 'premium' | 'vip' | null

type ProgramSpec = {
  slug: string
  title: string
  kind: 'course' | 'library'
  includedInPlan: PlanTier
  sortOrder: number
  /** Programm existiert schon — nur Lektionen anhängen, Zeile nicht ändern. */
  existing?: boolean
  /** Bunny-collection- bzw. Textordner-Namen (klein, ohne Sonderzeichen), die hierher gehören. */
  match: (normalized: string) => boolean
}

// programs.level / programs.category sind NOT NULL (geprüft 22.10.2026).
// Die App liest level nur für das Etikett im Hub (levelLabel), category gar
// nicht. Werte bewusst schlicht.
const DEFAULT_LEVEL = 'alle'
const CATEGORY_COURSE = 'kurs'
const CATEGORY_LIBRARY = 'aufzeichnung'

const PROGRAMS: ProgramSpec[] = [
  {
    slug: 'handpan-kompass',
    title: 'Handpan Kompass',
    kind: 'course',
    includedInPlan: 'premium',
    sortOrder: 10,
    match: (n) => n.includes('kompass') && !n.includes('live'),
  },
  {
    slug: 'klang-der-elemente',
    title: 'Klang der Elemente',
    kind: 'course',
    includedInPlan: 'premium',
    sortOrder: 20,
    match: (n) => n.includes('element'),
  },
  {
    slug: 'handpan-kreativ',
    title: 'Handpan Kreativ',
    kind: 'course',
    includedInPlan: 'premium', // Nils, 22.10.2026
    sortOrder: 30,
    match: (n) => n.includes('kreativ'),
  },
  {
    slug: 'von-anfang-an-spielen',
    title: 'Von Anfang an spielen',
    kind: 'course',
    includedInPlan: null,
    sortOrder: 40,
    existing: true,
    match: (n) => n.includes('von anfang') || n.includes('vonanfang') || /\bvaa\b/.test(n),
  },
  {
    slug: 'nachschauen',
    title: 'Nachschauen',
    kind: 'library',
    includedInPlan: 'premium',
    sortOrder: 60,
    match: (n) => n.includes('nachschau') || n.includes('aufzeichnung') || n.includes('recap'),
  },
  {
    slug: 'kompass-live',
    title: 'Kompass Live',
    kind: 'library',
    includedInPlan: 'premium',
    sortOrder: 70,
    match: (n) => n.includes('kompass') && n.includes('live'),
  },
  {
    slug: 'masterclasses',
    title: 'Masterclasses',
    kind: 'library',
    includedInPlan: 'premium',
    sortOrder: 80,
    match: (n) => n.includes('masterclass'),
  },
  {
    // Live dabei sein ist VIP (events.visibility 'vip'), die Aufnahmen gibt es
    // ab Premium (Nils, 22.10.2026). Noch keine Aufnahmen in der Bunny-Liste.
    slug: 'vip-calls',
    title: 'VIP-Calls',
    kind: 'library',
    includedInPlan: 'premium',
    sortOrder: 90,
    match: (n) => n.includes('vip'),
  },
]

// PDF-Anhänge: Datei im Kursordner → Lektion. Die Lektion steht im Skool-Text
// („PDF unten“) oder, wo es keinen Lektionsbezug gibt, auf der ersten Lektion.
const ATTACHMENTS: { program: string; lesson: string; dir: string; file: string; title: string }[] = [
  // In Skool auf der Übersichtsseite; die Kursseite hat keine Programm-Anhänge.
  { program: 'handpan-kompass', lesson: 'l01', dir: 'Handpan Kompass', file: 'Handpan Kompass · Kursbegleiter.pdf', title: 'Handpan Kompass · Kursbegleiter' },
  { program: 'handpan-kompass', lesson: 'l02', dir: 'Handpan Kompass', file: 'Das Rad der Handpan.pdf', title: 'Das Rad der Handpan' },
  // In Skool auf „So gehst du vor“ (Textseite vor a1).
  { program: 'klang-der-elemente', lesson: 'a1', dir: 'Klang der Elemente', file: 'Klang-der-Elemente-Wochenkarte.pdf', title: 'Klang der Elemente · Wochenkarte' },
  // „Anhang zu Nachschau und Lektion 1“ (Skool-Beschreibungen.md).
  { program: 'handpan-kreativ', lesson: 'l01', dir: 'Handpan Kreativ', file: 'Handpan Kreativ · Session 1.pdf', title: 'Handpan Kreativ · Session 1 (Folien)' },
  { program: 'nachschauen', lesson: 'hkr1-nachschau', dir: 'Handpan Kreativ', file: 'Handpan Kreativ · Session 1.pdf', title: 'Handpan Kreativ · Session 1 (Folien)' },
]

// Dateien in Kursordnern, die bewusst nicht eingelesen werden.
const IGNORED_TEXT_FILES = [
  'Skool-Beschreibungen.md', // Kompass: Sammeldatei, dieselben Texte wie hk-lNN-skool.md
  'hk-ankuendigung-skool-whatsapp.md', // Ankündigung, kein Lektionstext
  'SCHNITTPLAN.md',
]

// ── Argumente ────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2)
const flag = (name: string) => argv.includes(name)
const option = (name: string): string | null => {
  const i = argv.indexOf(name)
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : null
}
const APPLY = flag('--apply')
const PUBLISH = flag('--publish')
const DURATIONS = flag('--durations')
const sourcePath = option('--source') ?? SOURCE_JSON
const textsDir = option('--texts') ?? TEXTS_DIR
const landkartePath = option('--landkarte') ?? LANDKARTE_MD

if (PUBLISH && !APPLY) {
  console.log('Hinweis: --publish wirkt nur zusammen mit --apply. Läuft als Trockenlauf.')
}

// ── Helfer ───────────────────────────────────────────────────────────────────

/** Natürliche Sortierung: „a2“ vor „a10“. */
const natural = new Intl.Collator('de', { numeric: true, sensitivity: 'base' })

const nfc = (s: string) => s.normalize('NFC')

function programFor(name: string): ProgramSpec | null {
  const n = normalize(name)
  // Spezifischere Regeln zuerst (kompass-live vor handpan-kompass).
  const order = ['kompass-live', ...PROGRAMS.map((p) => p.slug).filter((s) => s !== 'kompass-live')]
  for (const slug of order) {
    const spec = PROGRAMS.find((p) => p.slug === slug)!
    if (spec.match(n)) return spec
  }
  return null
}

function listDir(dir: string): string[] {
  return existsSync(dir) ? readdirSync(dir).filter((f) => !isAppleDouble(f)).map(nfc) : []
}

function readText(file: string): string | null {
  return existsSync(file) ? readFileSync(file, 'utf8') : null
}

// ── Quellen lesen ────────────────────────────────────────────────────────────

type Video = { collection: string; title: string; file: string; guid: string }

const anomalies: string[] = []
const notes: string[] = []

function readVideos(): Video[] {
  if (!existsSync(sourcePath)) {
    anomalies.push(`Bunny-Zuordnung nicht gefunden: ${sourcePath} (Laufwerk 2T-nils-1 eingehängt?)`)
    return []
  }
  const raw: unknown = JSON.parse(readFileSync(sourcePath, 'utf8'))
  // Liste oder { videos: [...] } / { items: [...] } zulassen.
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object'
      ? ((Object.values(raw as Record<string, unknown>).find(Array.isArray) as unknown[]) ?? [])
      : []
  const out: Video[] = []
  list.forEach((item, i) => {
    const r = (item ?? {}) as Record<string, unknown>
    const v = {
      collection: String(r.collection ?? '').trim(),
      title: nfc(String(r.title ?? '').trim()),
      file: nfc(String(r.file ?? '').trim()),
      guid: String(r.guid ?? '').trim(),
    }
    if (isAppleDouble(v.file) || isAppleDouble(v.title)) return
    if (!v.guid) anomalies.push(`Eintrag ${i + 1} („${v.title || v.file}“) ohne guid — übersprungen`)
    else if (!v.collection) anomalies.push(`Eintrag ${i + 1} („${v.title || v.file}“) ohne collection — übersprungen`)
    else out.push(v)
  })
  return out
}

/** Kursordner in Content-Hub/Lektionen je Programm-Slug. */
function courseDirs(): Map<string, string> {
  const out = new Map<string, string>()
  if (!existsSync(textsDir)) {
    anomalies.push(`Kursordner nicht gefunden: ${textsDir}`)
    return out
  }
  for (const dir of listDir(textsDir)) {
    const full = path.join(textsDir, dir)
    if (!statSync(full).isDirectory()) continue
    const spec = programFor(dir)
    if (spec) out.set(spec.slug, full)
    else {
      const videos = listDir(full).filter((f) => /\.mp4$/i.test(f)).length
      anomalies.push(`Kursordner „${dir}“ (${videos} Videos) passt zu keinem Programm — nicht eingeplant`)
    }
  }
  return out
}

type CourseTexts = {
  kompass: Map<number, ParsedText & { file: string }>
  kompassDescription: string | null
  elemente: ElementeText[]
  kreativ: ReturnType<typeof parseKreativTexte>
  vaa: Map<string, ParsedText>
  count: number
}

function readCourseTexts(dirs: Map<string, string>): CourseTexts {
  const t: CourseTexts = {
    kompass: new Map(),
    kompassDescription: null,
    elemente: [],
    kreativ: { lessons: new Map(), nachschau: new Map() },
    vaa: new Map(),
    count: 0,
  }

  const kompassDir = dirs.get('handpan-kompass')
  if (kompassDir) {
    for (const f of listDir(kompassDir)) {
      const m = f.match(/^hk-l(\d+)-skool\.md$/i)
      if (m) {
        const parsed = parseKompassLesson(readText(path.join(kompassDir, f)) ?? '')
        if (parsed) {
          t.kompass.set(Number(m[1]), { ...parsed, file: f })
          t.count++
        } else anomalies.push(`handpan-kompass: ${f} ohne „# “-Überschrift — nicht verwendet`)
      } else if (/^hk-uebersicht-skool\.md$/i.test(f)) {
        t.kompassDescription = parseKompassOverview(readText(path.join(kompassDir, f)) ?? '') || null
      } else if (/\.md$/i.test(f) && !IGNORED_TEXT_FILES.includes(f)) {
        anomalies.push(`handpan-kompass: unbekannte Textdatei ${f} — nicht verwendet`)
      }
    }
    if (!t.kompassDescription) anomalies.push('handpan-kompass: hk-uebersicht-skool.md fehlt — keine Kursbeschreibung')
  }

  const elementeDir = dirs.get('klang-der-elemente')
  if (elementeDir) {
    const md = readText(path.join(elementeDir, 'Skool-Texte.md'))
    if (md) {
      t.elemente = parseElementeTexte(md)
      t.count += t.elemente.length
    } else anomalies.push('klang-der-elemente: Skool-Texte.md fehlt')
  }

  const kreativDir = dirs.get('handpan-kreativ')
  if (kreativDir) {
    const md = readText(path.join(kreativDir, 'Skool-Beschreibungen.md'))
    if (md) {
      t.kreativ = parseKreativTexte(md)
      t.count += t.kreativ.lessons.size + t.kreativ.nachschau.size
    } else anomalies.push('handpan-kreativ: Skool-Beschreibungen.md fehlt — Lektionen ohne Text')
  }

  const vaaDir = dirs.get('von-anfang-an-spielen')
  if (vaaDir) {
    for (const f of listDir(vaaDir).filter((x) => /skool.*\.md$/i.test(x))) {
      for (const [k, v] of parseVaaTexte(readText(path.join(vaaDir, f)) ?? '')) {
        t.vaa.set(k, v)
        t.count++
      }
    }
  }
  return t
}

function readLandkarte(): Landkarte {
  const md = readText(landkartePath)
  if (!md) {
    anomalies.push(`LANDKARTE.md nicht gefunden: ${landkartePath} — Bibliothekstitel aus Dateinamen`)
    return { sessions: new Map(), items: new Map() }
  }
  return parseLandkarte(md)
}

// ── Plan bauen ───────────────────────────────────────────────────────────────

type PlannedLesson = {
  slug: string
  title: string
  subtitle: string | null
  sortOrder: number
  sectionSlug: string | null
  mediaKind: 'video' | 'text'
  videoGuid: string | null
  bodyMd: string | null
  durationSeconds: number | null
  sourceFile: string
}

type PlannedSection = { slug: string; title: string; sortOrder: number }

type PlannedProgram = {
  spec: ProgramSpec
  description: string | null
  sections: PlannedSection[]
  lessons: PlannedLesson[]
}

type PlannedAttachment = { program: string; lesson: string; title: string; path: string }

/** Text, Abschnitt und Kennung einer Kurslektion. */
type CourseMatch = { text: (ParsedText & { label: string }) | null; section: PlannedSection | null }

function matchCourse(slug: string, key: NonNullable<ReturnType<typeof lessonKey>>, texts: CourseTexts): CourseMatch {
  if (slug === 'handpan-kompass') {
    const t = texts.kompass.get(key.number)
    const section = t?.section
      ? { slug: `modul-${t.section.number}`, title: t.section.title, sortOrder: t.section.number * 10 }
      : null
    return { text: t ? { ...t, label: t.file } : null, section }
  }
  if (slug === 'klang-der-elemente') {
    const letter = key.letter ?? ''
    const spec = ELEMENT_LETTERS[letter]
    const headings = [...new Set(texts.elemente.map((e) => e.sectionHeading))]
    const heading = elementHeadingFor(letter, headings)
    const section = spec ? { slug: spec.slug, title: heading ?? spec.fallback, sortOrder: spec.order } : null
    const t = heading ? texts.elemente.find((e) => e.sectionHeading === heading && e.index === key.number) : undefined
    return { text: t ? { ...t, label: `Skool-Texte.md · ${heading} · ${t.index}` } : null, section }
  }
  if (slug === 'handpan-kreativ') {
    const t = texts.kreativ.lessons.get(key.number)
    return { text: t ? { ...t, label: `Skool-Beschreibungen.md · Lektion ${key.number}` } : null, section: null }
  }
  if (slug === 'von-anfang-an-spielen') {
    const t = texts.vaa.get(`${key.round}-${key.number}`)
    return { text: t ? { ...t, label: `Session ${key.round} · Lektion ${key.number}` } : null, section: null }
  }
  return { text: null, section: null }
}

function buildCourse(entry: PlannedProgram, list: Video[], texts: CourseTexts, used: Set<string>) {
  const slug = entry.spec.slug
  const sections = new Map<string, PlannedSection>()
  const taken = new Set<string>()
  const sorted = [...list].sort((a, b) => natural.compare(stemOf(a.file || a.title), stemOf(b.file || b.title)))

  sorted.forEach((v, i) => {
    const stem = stemOf(v.file || v.title)
    const key = lessonKey(slug, stem)
    if (!key) anomalies.push(`${slug}: „${stem}“ passt nicht zum Dateinamen-Muster — Slug aus dem Dateinamen`)
    const lessonSlug = key?.slug ?? slugify(stem)
    if (taken.has(lessonSlug)) {
      anomalies.push(`${slug}: Slug ${lessonSlug} doppelt („${stem}“) — übersprungen`)
      return
    }
    taken.add(lessonSlug)

    const { text, section } = key ? matchCourse(slug, key, texts) : { text: null, section: null }
    if (text) used.add(`${slug}:${text.label}`)
    if (section && !sections.has(section.slug)) sections.set(section.slug, section)
    if (slug === 'klang-der-elemente' && key && !ELEMENT_LETTERS[key.letter ?? '']) {
      anomalies.push(`klang-der-elemente: unbekannter Abschnitts-Buchstabe „${key.letter}“ in „${stem}“`)
    }
    if (slug === 'klang-der-elemente' && section && !elementHeadingFor(key?.letter ?? '', texts.elemente.map((e) => e.sectionHeading))) {
      anomalies.push(`klang-der-elemente: Abschnitt „${section.title}“ steht nicht in Skool-Texte.md — Name angenommen`)
    }

    let title = text?.title ?? ''
    if (!title) {
      title = titleFromFilename(key?.rest ?? stem)
      anomalies.push(`${slug}: kein Skool-Text zu „${stem}“ — Titel aus dem Dateinamen: „${title}“`)
    } else if (key && key.rest && !titleMatchesFile(title, key.rest)) {
      anomalies.push(`${slug}: Text „${title}“ (${text?.label}) passt evtl. nicht zu „${stem}“ — bitte prüfen`)
    }

    entry.lessons.push({
      slug: lessonSlug,
      title,
      subtitle: text?.subtitle ?? null,
      sortOrder: key?.sortOrder ?? (i + 1) * 10,
      sectionSlug: section?.slug ?? null,
      mediaKind: 'video',
      videoGuid: v.guid,
      bodyMd: toPlatformText(text?.body),
      durationSeconds: text?.durationSeconds ?? null,
      sourceFile: stem,
    })
  })

  // Elemente: Textseiten ohne Video (z. B. „4 · Dein Beitrag zur Pattern-Mediathek“
  // in der Ernte) werden Textlektionen — in Skool stehen sie genauso.
  if (slug === 'klang-der-elemente') {
    for (const e of texts.elemente) {
      const label = `Skool-Texte.md · ${e.sectionHeading} · ${e.index}`
      if (used.has(`${slug}:${label}`)) continue
      const letter = Object.keys(ELEMENT_LETTERS).find((l) => elementHeadingFor(l, [e.sectionHeading]))
      if (!letter) {
        anomalies.push(`klang-der-elemente: Abschnitt „${e.sectionHeading}“ in Skool-Texte.md ohne Buchstaben — „${e.title}“ nicht eingeplant`)
        continue
      }
      const spec = ELEMENT_LETTERS[letter]
      const lessonSlug = `${letter}${e.index}`
      if (taken.has(lessonSlug)) continue
      taken.add(lessonSlug)
      used.add(`${slug}:${label}`)
      if (!sections.has(spec.slug)) sections.set(spec.slug, { slug: spec.slug, title: e.sectionHeading, sortOrder: spec.order })
      const inSection = entry.lessons.filter((l) => l.sectionSlug === spec.slug)
      const after = Math.max(0, ...inSection.map((l) => l.sortOrder))
      entry.lessons.push({
        slug: lessonSlug,
        title: e.title,
        subtitle: null,
        sortOrder: after + 5,
        sectionSlug: spec.slug,
        mediaKind: 'text',
        videoGuid: null,
        bodyMd: toPlatformText(e.body),
        durationSeconds: null,
        sourceFile: label,
      })
      notes.push(`klang-der-elemente: „${e.title}“ (${lessonSlug}) ist eine Textlektion ohne Video, wie in Skool`)
    }
  }

  entry.lessons.sort((a, b) => a.sortOrder - b.sortOrder)
  entry.sections = [...sections.values()].sort((a, b) => a.sortOrder - b.sortOrder)
}

function libraryTitle(slug: string, stem: string, video: Video, lk: Landkarte): string | null {
  if (slug === 'nachschauen') {
    const base = stem.replace(/-nachschau$/i, '')
    return sessionTitle(lk, base, lk.items.get(stem)?.title)
  }
  if (slug === 'masterclasses') return lk.items.get(stem)?.title ?? null
  if (slug === 'kompass-live') {
    const n = stem.match(/(\d+)\s*$/)?.[1]
    return n ? sessionTitle(lk, `hk${n}`) : null
  }
  // Bunny-Titel nehmen, wenn er schon lesbar ist (Leerzeichen statt Bindestriche).
  return /\s/.test(video.title) ? video.title : null
}

/** Sitzungs-Kennung einer Aufnahme für Datum und Reihenfolge. */
function sessionIdOf(slug: string, stem: string): string {
  if (slug === 'kompass-live') return `hk${stem.match(/(\d+)\s*$/)?.[1] ?? ''}`
  return stem.replace(/-(nachschau|masterclass\d*)$/i, '')
}

function buildLibrary(entry: PlannedProgram, list: Video[], lk: Landkarte, texts: CourseTexts) {
  const slug = entry.spec.slug
  const dated = list.map((v) => {
    const stem = stemOf(v.file || v.title)
    return { v, stem, date: lk.sessions.get(sessionIdOf(slug, stem))?.date ?? '' }
  })
  // Reihenfolge nach Sitzungsdatum (Seite zeigt absteigend: höchste sort_order = neueste),
  // ohne Datum ans Ende, sonst nach Dateiname.
  dated.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || natural.compare(a.stem, b.stem))
  const taken = new Set<string>()
  dated.forEach(({ v, stem, date }, i) => {
    const lessonSlug = slugify(stem)
    if (taken.has(lessonSlug)) {
      anomalies.push(`${slug}: Slug ${lessonSlug} doppelt („${stem}“) — übersprungen`)
      return
    }
    taken.add(lessonSlug)
    let title = libraryTitle(slug, stem, v, lk)
    if (!title) {
      title = titleFromFilename(stem)
      anomalies.push(`${slug}: „${stem}“ nicht in LANDKARTE.md — Titel aus dem Dateinamen: „${title}“`)
    }
    if (!date) anomalies.push(`${slug}: „${stem}“ ohne Sitzungsdatum in LANDKARTE.md — Reihenfolge nach Dateiname`)
    // Kreativ-Nachschau hat einen Skool-Text (Skool-Beschreibungen.md).
    const hkr = slug === 'nachschauen' ? stem.match(/^hkr(\d+)-nachschau$/i) : null
    const text = hkr ? texts.kreativ.nachschau.get(Number(hkr[1])) : undefined
    entry.lessons.push({
      slug: lessonSlug,
      title: text?.title || title,
      subtitle: null,
      sortOrder: (i + 1) * 10,
      sectionSlug: null,
      mediaKind: 'video',
      videoGuid: v.guid,
      bodyMd: toPlatformText(text?.body),
      durationSeconds: text?.durationSeconds ?? null,
      sourceFile: stem,
    })
  })
  const without = entry.lessons.filter((l) => !l.bodyMd).length
  if (without) notes.push(`${slug}: ${without} von ${entry.lessons.length} Aufnahmen ohne Beschreibung (Bibliothek, kein Pflichttext)`)
}

function buildPlan(videos: Video[], texts: CourseTexts, dirs: Map<string, string>, lk: Landkarte): PlannedProgram[] {
  const plan = new Map<string, PlannedProgram>(
    PROGRAMS.map((spec) => [spec.slug, { spec, description: null, sections: [], lessons: [] }]),
  )
  plan.get('handpan-kompass')!.description = texts.kompassDescription
  const unmatchedCollections = new Map<string, number>()
  const used = new Set<string>()

  const byProgram = new Map<string, Video[]>()
  for (const v of videos) {
    const spec = programFor(v.collection)
    if (!spec) {
      unmatchedCollections.set(v.collection, (unmatchedCollections.get(v.collection) ?? 0) + 1)
      continue
    }
    byProgram.set(spec.slug, [...(byProgram.get(spec.slug) ?? []), v])
  }
  for (const [collection, n] of unmatchedCollections) {
    anomalies.push(`Collection „${collection}“ (${n} Videos) passt zu keinem Programm — nicht eingeplant`)
  }

  for (const [slug, list] of byProgram) {
    const entry = plan.get(slug)!
    if (entry.spec.kind === 'course') buildCourse(entry, list, texts, used)
    else buildLibrary(entry, list, lk, texts)
  }

  // Videos im Kursordner, die nicht in der Bunny-Liste stehen.
  for (const [slug, dir] of dirs) {
    const inBunny = new Set((byProgram.get(slug) ?? []).map((v) => stemOf(v.file || v.title)))
    for (const f of listDir(dir).filter((x) => /\.mp4$/i.test(x))) {
      if (!inBunny.has(stemOf(f))) anomalies.push(`${slug}: Video ${f} liegt im Kursordner, fehlt aber in der Bunny-Liste`)
    }
  }

  // Texte ohne Video.
  for (const [n, t] of texts.kompass) {
    if (!used.has(`handpan-kompass:${t.file}`)) anomalies.push(`handpan-kompass: Skool-Text ohne Video — ${t.file} (Lektion ${n})`)
  }
  for (const [n, t] of texts.kreativ.lessons) {
    if (!used.has(`handpan-kreativ:Skool-Beschreibungen.md · Lektion ${n}`)) anomalies.push(`handpan-kreativ: Skool-Text ohne Video — Lektion ${n} „${t.title}“`)
  }
  for (const [k, t] of texts.vaa) {
    const [r, n] = k.split('-')
    if (!used.has(`von-anfang-an-spielen:Session ${r} · Lektion ${n}`)) anomalies.push(`von-anfang-an-spielen: Skool-Text ohne Video — Session ${r} · Lektion ${n} „${t.title}“`)
  }

  for (const p of plan.values()) {
    if (p.spec.kind === 'course' && !p.spec.existing && p.lessons.length && !p.description) {
      anomalies.push(`${p.spec.slug}: keine Kursbeschreibung gefunden (programs.description bleibt leer)`)
    }
  }
  return [...plan.values()]
}

function planAttachments(plan: PlannedProgram[], dirs: Map<string, string>): PlannedAttachment[] {
  const out: PlannedAttachment[] = []
  const known = new Set<string>()
  for (const a of ATTACHMENTS) {
    const dir = path.join(textsDir, a.dir)
    known.add(nfc(path.join(dir, a.file)))
    const file = listDir(dir).find((f) => f === nfc(a.file))
    if (!file) {
      anomalies.push(`Anhang fehlt: ${a.dir}/${a.file}`)
      continue
    }
    const lesson = plan.find((p) => p.spec.slug === a.program)?.lessons.find((l) => l.slug === a.lesson)
    if (!lesson) {
      anomalies.push(`Anhang ${a.file}: Lektion ${a.program}/${a.lesson} nicht im Plan`)
      continue
    }
    out.push({ program: a.program, lesson: a.lesson, title: a.title, path: path.join(dir, file) })
  }
  for (const [slug, dir] of dirs) {
    for (const f of listDir(dir).filter((x) => /\.pdf$/i.test(x))) {
      if (!known.has(nfc(path.join(dir, f)))) anomalies.push(`${slug}: PDF ${f} keiner Lektion zugeordnet — in ATTACHMENTS ergänzen`)
    }
  }
  return out
}

// ── Bunny-Dauer (optional) ───────────────────────────────────────────────────

async function fillDurations(plan: PlannedProgram[]) {
  const key = process.env.BUNNY_STREAM_API_KEY
  const lib = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID
  if (!key || !lib) {
    anomalies.push('--durations: BUNNY_STREAM_API_KEY oder NEXT_PUBLIC_BUNNY_LIBRARY_ID fehlt — Dauer bleibt leer')
    return
  }
  for (const p of plan) {
    for (const l of p.lessons) {
      if (!l.videoGuid) continue
      try {
        const res = await fetch(`https://video.bunnycdn.com/library/${lib}/videos/${l.videoGuid}`, {
          headers: { AccessKey: key, accept: 'application/json' },
        })
        if (!res.ok) {
          anomalies.push(`Bunny ${res.status} für ${p.spec.slug}/${l.slug}`)
          continue
        }
        const body = (await res.json()) as { length?: number }
        if (typeof body.length === 'number' && body.length > 0) l.durationSeconds = Math.round(body.length)
      } catch {
        anomalies.push(`Bunny nicht erreichbar für ${p.spec.slug}/${l.slug}`)
      }
    }
  }
}

// ── Ausgabe ──────────────────────────────────────────────────────────────────

function printSummary(plan: PlannedProgram[], videos: Video[], texts: CourseTexts, attachments: PlannedAttachment[]) {
  console.log(`\nseed-kurse · ${APPLY ? 'SCHREIBEN' : 'Trockenlauf (nichts geschrieben)'}${APPLY && PUBLISH ? ' + veröffentlichen' : ''}`)
  console.log(`Quelle: ${videos.length} Videos, ${texts.count} Skool-Texte\n`)
  for (const p of plan) {
    const s = p.spec
    const head = `${s.slug.padEnd(24)} ${s.kind.padEnd(8)} Abo: ${String(s.includedInPlan ?? '—').padEnd(8)}`
    const withText = p.lessons.filter((l) => l.bodyMd).length
    console.log(`${head} ${String(p.lessons.length).padStart(3)} Lektionen (${withText} mit Text)${s.existing ? ' · Programm besteht, nur Lektionen' : ''}`)
    if (p.description) console.log(`    Beschreibung: ${p.description.replace(/\s+/g, ' ').slice(0, 90)}…`)
    const sectionTitle = new Map(p.sections.map((x) => [x.slug, x.title]))
    let lastSection: string | null | undefined
    for (const l of p.lessons) {
      if (p.sections.length && l.sectionSlug !== lastSection) {
        console.log(`    ▸ ${l.sectionSlug ? sectionTitle.get(l.sectionSlug) : '(ohne Abschnitt)'}`)
        lastSection = l.sectionSlug
      }
      const marks = [
        l.bodyMd ? 'Text' : 'ohne Text',
        l.mediaKind === 'text' ? 'nur Text' : null,
        l.subtitle,
        l.durationSeconds ? `${Math.floor(l.durationSeconds / 60)}:${String(l.durationSeconds % 60).padStart(2, '0')}` : null,
      ].filter(Boolean)
      console.log(`      ${String(l.sortOrder).padStart(4)}  ${l.slug.padEnd(28)} ${l.title}  [${marks.join(' · ')}]`)
    }
  }
  if (attachments.length) {
    console.log(`\nAnhänge (${attachments.length}, Storage-Upload noch nicht gebaut${APPLY ? ' — übersprungen' : ''}):`)
    for (const a of attachments) console.log(`  · ${a.program}/${a.lesson}: ${a.title}  ← ${path.relative(textsDir, a.path)}`)
  }
  if (notes.length) {
    console.log('\nHinweise:')
    for (const n of notes) console.log(`  · ${n}`)
  }
  console.log(`\nAuffälligkeiten (${anomalies.length}):`)
  if (anomalies.length === 0) console.log('  keine')
  for (const a of anomalies) console.log(`  · ${a}`)
}

// ── Schreiben ────────────────────────────────────────────────────────────────

async function apply(plan: PlannedProgram[]) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('\nAbbruch: NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt (.env.local).')
    process.exit(1)
  }
  const db = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const now = new Date().toISOString()
  const fail = (what: string, error: { message: string } | null) => {
    if (error) {
      console.error(`Fehler bei ${what}: ${error.message}`)
      process.exit(1)
    }
  }

  for (const p of plan) {
    const s = p.spec
    let programId: string
    if (s.existing) {
      const { data, error } = await db.from('programs').select('id').eq('slug', s.slug).maybeSingle()
      fail(`programs ${s.slug}`, error)
      if (!data) {
        console.error(`Programm ${s.slug} fehlt in der DB — übersprungen.`)
        continue
      }
      programId = data.id
    } else {
      const { data, error } = await db
        .from('programs')
        .upsert(
          {
            slug: s.slug,
            title: s.title,
            kind: s.kind,
            included_in_plan: s.includedInPlan,
            sort_order: s.sortOrder,
            level: DEFAULT_LEVEL,
            category: s.kind === 'library' ? CATEGORY_LIBRARY : CATEGORY_COURSE,
            ...(p.description ? { description: p.description } : {}),
            ...(PUBLISH ? { published_at: now } : {}),
          },
          { onConflict: 'slug' },
        )
        .select('id')
        .single()
      fail(`programs ${s.slug}`, error)
      programId = data!.id
    }

    const sectionIds = new Map<string, string>()
    for (const sec of p.sections) {
      const { data, error } = await db
        .from('program_sections')
        .upsert(
          { program_id: programId, slug: sec.slug, title: sec.title, sort_order: sec.sortOrder },
          { onConflict: 'program_id,slug' },
        )
        .select('id')
        .single()
      fail(`program_sections ${s.slug}/${sec.slug}`, error)
      sectionIds.set(sec.slug, data!.id)
    }

    for (const l of p.lessons) {
      const { data, error } = await db
        .from('lessons')
        .upsert(
          {
            program_id: programId,
            slug: l.slug,
            title: l.title,
            subtitle: l.subtitle,
            sort_order: l.sortOrder,
            section_id: l.sectionSlug ? (sectionIds.get(l.sectionSlug) ?? null) : null,
            media_kind: l.mediaKind,
            updated_at: now,
            ...(l.durationSeconds != null ? { duration_seconds: l.durationSeconds } : {}),
            ...(PUBLISH ? { published_at: now } : {}),
          },
          { onConflict: 'program_id,slug' },
        )
        .select('id')
        .single()
      fail(`lessons ${s.slug}/${l.slug}`, error)
      const { error: contentError } = await db
        .from('lesson_contents')
        .upsert(
          { lesson_id: data!.id, video_guid: l.videoGuid, body_md: l.bodyMd, updated_at: now },
          { onConflict: 'lesson_id' },
        )
      fail(`lesson_contents ${s.slug}/${l.slug}`, contentError)
    }
    console.log(`✓ ${s.slug}: ${p.lessons.length} Lektionen geschrieben`)
  }
}

// ── Skool → Plattform ────────────────────────────────────────────────────────
// Die Texte stammen aus Skool. Auf der Plattform gibt es keine Kommentare;
// das Gespräch läuft auf WhatsApp (Entscheidung 22.10.2026). Dieselben
// Ersetzungen wurden am 23.10.2026 in der Live-DB angewandt.
const PLATFORM_REPLACEMENTS: [string, string][] = [
  ['Schick mir eine Nachricht hier in Skool oder poste dein Video mit „Für die Pattern-Mediathek“ in der Community.',
    'Schick mir dein Video per WhatsApp oder poste es mit „Für die Pattern-Mediathek“ in der WhatsApp-Community.'],
  ['hier in den Kommentaren', 'in der WhatsApp-Community'],
  ['in die Kommentare', 'in die WhatsApp-Community'],
  ['in den Kommentaren', 'in der WhatsApp-Community'],
  ["Schreib's in die Community.", "Schreib's in deine Kursgruppe auf WhatsApp."],
  ['Teil deine Aufnahme hier in der Community.', 'Teil deine Aufnahme in deiner Kursgruppe auf WhatsApp.'],
  ['Teil eine kurze Aufnahme in der Community.', 'Teil eine kurze Aufnahme in deiner Kursgruppe auf WhatsApp.'],
]

function toPlatformText(body: string | null | undefined): string | null {
  if (!body) return null
  let out = body
  for (const [from, to] of PLATFORM_REPLACEMENTS) out = out.split(from).join(to)
  return out
}

// ── SQL statt service_role ───────────────────────────────────────────────────
// `--sql <datei>` schreibt dasselbe wie --apply als eine idempotente SQL-Datei.
// So lässt sich der Seed über den Supabase-MCP (execute_sql) einspielen, ohne
// dass der service_role-Schlüssel auf diesem Rechner liegen muss.

function sqlText(v: string | null | undefined): string {
  if (v == null) return 'null'
  let tag = 'q'
  while (v.includes(`$${tag}$`)) tag += 'q'
  return `$${tag}$${v}$${tag}$`
}

function sqlNum(v: number | null | undefined): string {
  return v == null ? 'null' : String(Math.trunc(v))
}

function buildSql(plan: PlannedProgram[]): string {
  const out: string[] = ['-- seed-kurse.ts --sql · erzeugt ' + new Date().toISOString(), 'begin;']
  const pub = PUBLISH ? 'now()' : 'null'
  for (const p of plan) {
    const s = p.spec
    const prog = `(select id from public.programs where slug = ${sqlText(s.slug)})`
    if (!s.existing) {
      out.push(
        `insert into public.programs (slug, title, kind, included_in_plan, sort_order, level, category, description, published_at)
values (${sqlText(s.slug)}, ${sqlText(s.title)}, ${sqlText(s.kind)}, ${sqlText(s.includedInPlan)}, ${sqlNum(s.sortOrder)}, ${sqlText(DEFAULT_LEVEL)}, ${sqlText(s.kind === 'library' ? CATEGORY_LIBRARY : CATEGORY_COURSE)}, ${sqlText(p.description ?? null)}, ${pub})
on conflict (slug) do update set title = excluded.title, kind = excluded.kind, included_in_plan = excluded.included_in_plan,
  sort_order = excluded.sort_order, description = coalesce(excluded.description, public.programs.description)${PUBLISH ? ', published_at = coalesce(public.programs.published_at, excluded.published_at)' : ''};`,
      )
    }
    for (const sec of p.sections) {
      out.push(
        `insert into public.program_sections (program_id, slug, title, sort_order)
values (${prog}, ${sqlText(sec.slug)}, ${sqlText(sec.title)}, ${sqlNum(sec.sortOrder)})
on conflict (program_id, slug) do update set title = excluded.title, sort_order = excluded.sort_order;`,
      )
    }
    for (const l of p.lessons) {
      const section = l.sectionSlug
        ? `(select id from public.program_sections where program_id = ${prog} and slug = ${sqlText(l.sectionSlug)})`
        : 'null'
      out.push(
        `insert into public.lessons (program_id, slug, title, subtitle, sort_order, section_id, media_kind, duration_seconds, published_at, updated_at)
values (${prog}, ${sqlText(l.slug)}, ${sqlText(l.title)}, ${sqlText(l.subtitle ?? null)}, ${sqlNum(l.sortOrder)}, ${section}, ${sqlText(l.mediaKind)}, ${sqlNum(l.durationSeconds)}, ${pub}, now())
on conflict (program_id, slug) do update set title = excluded.title, subtitle = excluded.subtitle, sort_order = excluded.sort_order,
  section_id = excluded.section_id, media_kind = excluded.media_kind,
  duration_seconds = coalesce(excluded.duration_seconds, public.lessons.duration_seconds), updated_at = now()${PUBLISH ? ', published_at = coalesce(public.lessons.published_at, excluded.published_at)' : ''};`,
        `insert into public.lesson_contents (lesson_id, video_guid, body_md, updated_at)
values ((select id from public.lessons where program_id = ${prog} and slug = ${sqlText(l.slug)}), ${sqlText(l.videoGuid ?? null)}, ${sqlText(l.bodyMd ?? null)}, now())
on conflict (lesson_id) do update set video_guid = excluded.video_guid, body_md = excluded.body_md, updated_at = now();`,
      )
    }
  }
  out.push('commit;')
  return out.join('\n\n') + '\n'
}

// ── Lauf ─────────────────────────────────────────────────────────────────────

const videos = readVideos()
const dirs = courseDirs()
const texts = readCourseTexts(dirs)
const landkarte = readLandkarte()
const plan = buildPlan(videos, texts, dirs, landkarte)
const attachments = planAttachments(plan, dirs)
if (APPLY) {
  for (const a of attachments) {
    anomalies.push(`Anhang übersprungen (Storage-Upload fehlt): ${a.program}/${a.lesson} „${a.title}“`)
  }
}
if (DURATIONS) await fillDurations(plan)
printSummary(plan, videos, texts, attachments)
const sqlOut = option('--sql')
if (sqlOut) {
  const { writeFileSync } = await import('node:fs')
  writeFileSync(sqlOut, buildSql(plan))
  console.log(`\nSQL geschrieben: ${sqlOut}`)
}
if (APPLY) {
  if (videos.length === 0) {
    console.error('\nAbbruch: keine Videos in der Quelle — nichts zu schreiben.')
    process.exit(1)
  }
  await apply(plan)
}
