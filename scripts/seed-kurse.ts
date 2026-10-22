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
//   --source <json>     Bunny-Zuordnung (Standard: SOURCE_JSON unten)
//   --texts <ordner>    Skool-Texte, Unterordner je Kurs mit *-skool.md
//   --durations         Dauer je Video über die Bunny-API holen
//                       (BUNNY_STREAM_API_KEY, NEXT_PUBLIC_BUNNY_LIBRARY_ID)
//
// Idempotent: Programme per slug, Abschnitte per (program_id, slug), Lektionen
// per (program_id, slug), Inhalte per lesson_id — jeder Lauf schreibt denselben
// Stand. published_at wird nur mit --publish gesetzt und nie zurückgenommen.
// „von-anfang-an-spielen“ existiert schon: das Programm wird nicht angefasst,
// nur Lektionen werden angehängt.
//
// Geheimnisse: SUPABASE_SERVICE_ROLE_KEY und BUNNY_STREAM_API_KEY kommen aus
// der Umgebung (Bun lädt .env.local automatisch) und werden nie ausgegeben.
// ─────────────────────────────────────────────────────────────────────────────

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../app/lib/supabase/database.types'

// ── Konstanten ───────────────────────────────────────────────────────────────

const SOURCE_JSON = '/Volumes/2T-nils-1/Content-Hub/Upload/bunny-upload-2026-10-22.json'
const TEXTS_DIR = '/Volumes/2T-nils-1/Content-Hub/Lektionen'

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
  /** Abschnitt aus dem Dateinamen (nur Kurse mit Gliederung). */
  sectionFor?: (fileStem: string) => { slug: string; title: string } | null
}

// programs.level / programs.category sind NOT NULL (geprüft 22.10.2026).
// Die App liest level nur für das Etikett im Hub (levelLabel), category gar
// nicht. Werte bewusst schlicht.
const DEFAULT_LEVEL = 'alle'
const CATEGORY_COURSE = 'kurs'
const CATEGORY_LIBRARY = 'aufzeichnung'

// Klang der Elemente: Präfix-Buchstabe des Dateinamens → Abschnitt.
// a/f/w aus dem Auftrag; e/l/ae sind Annahmen — der Trockenlauf meldet jedes
// Präfix, das hier fehlt.
const ELEMENT_SECTIONS: Record<string, { slug: string; title: string; order: number }> = {
  a: { slug: 'grundlagen', title: 'Grundlagen', order: 10 },
  f: { slug: 'feuer', title: 'Feuer', order: 20 },
  w: { slug: 'wasser', title: 'Wasser', order: 30 },
  e: { slug: 'erde', title: 'Erde', order: 40 },
  l: { slug: 'luft', title: 'Luft', order: 50 },
  ae: { slug: 'aether', title: 'Äther', order: 60 },
}
const unknownElementPrefixes = new Set<string>()

function elementSection(stem: string) {
  const m = normalize(stem).match(/^(ae|[a-z])[\s_-]?\d/)
  const prefix = m?.[1] ?? normalize(stem).match(/^([a-z]+)/)?.[1] ?? ''
  const hit = ELEMENT_SECTIONS[prefix]
  if (!hit) {
    unknownElementPrefixes.add(prefix || '(kein Präfix)')
    return null
  }
  return { slug: hit.slug, title: hit.title }
}

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
    sectionFor: elementSection,
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

if (PUBLISH && !APPLY) {
  console.log('Hinweis: --publish wirkt nur zusammen mit --apply. Läuft als Trockenlauf.')
}

// ── Helfer ───────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function slugify(s: string): string {
  return normalize(s).replace(/\s+/g, '-').slice(0, 80).replace(/-+$/, '') || 'lektion'
}

function stemOf(file: string): string {
  return path.basename(file).replace(/\.[^.]+$/, '').replace(/[-_ ]?skool$/i, '')
}

/** Natürliche Sortierung: „a2“ vor „a10“. */
const natural = new Intl.Collator('de', { numeric: true, sensitivity: 'base' })

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

/** Titel aus der ersten „# “-Zeile, Text ohne diese Zeile. */
function parseSkool(markdown: string): { title: string | null; body: string } {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const i = lines.findIndex((l) => l.trim() !== '')
  if (i >= 0) {
    const m = lines[i].match(/^#\s+(.+?)\s*$/)
    if (m) return { title: m[1].replace(/\*\*/g, '').trim(), body: lines.slice(i + 1).join('\n').trim() }
  }
  return { title: null, body: markdown.trim() }
}

// ── Quellen lesen ────────────────────────────────────────────────────────────

type Video = { collection: string; title: string; file: string; guid: string }

const anomalies: string[] = []

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
      title: String(r.title ?? '').trim(),
      file: String(r.file ?? '').trim(),
      guid: String(r.guid ?? '').trim(),
    }
    if (!v.guid) anomalies.push(`Eintrag ${i + 1} („${v.title || v.file}“) ohne guid — übersprungen`)
    else if (!v.collection) anomalies.push(`Eintrag ${i + 1} („${v.title || v.file}“) ohne collection — übersprungen`)
    else out.push(v)
  })
  return out
}

type SkoolText = { programSlug: string; stem: string; title: string | null; body: string; file: string }

function readTexts(): SkoolText[] {
  if (!existsSync(textsDir)) {
    anomalies.push(`Skool-Texte nicht gefunden: ${textsDir}`)
    return []
  }
  const out: SkoolText[] = []
  for (const dir of readdirSync(textsDir)) {
    const full = path.join(textsDir, dir)
    if (!statSync(full).isDirectory()) continue
    const spec = programFor(dir)
    const files = readdirSync(full).filter((f) => /-skool\.md$/i.test(f))
    if (!spec) {
      if (files.length) anomalies.push(`Textordner „${dir}“ (${files.length} Texte) passt zu keinem Programm`)
      continue
    }
    for (const f of files) {
      const parsed = parseSkool(readFileSync(path.join(full, f), 'utf8'))
      out.push({ programSlug: spec.slug, stem: stemOf(f), file: path.join(dir, f), ...parsed })
    }
  }
  return out
}

// ── Plan bauen ───────────────────────────────────────────────────────────────

type PlannedLesson = {
  slug: string
  title: string
  sortOrder: number
  sectionSlug: string | null
  videoGuid: string
  bodyMd: string | null
  durationSeconds: number | null
  sourceFile: string
}

type PlannedProgram = {
  spec: ProgramSpec
  sections: { slug: string; title: string; sortOrder: number }[]
  lessons: PlannedLesson[]
}

function buildPlan(videos: Video[], texts: SkoolText[]): PlannedProgram[] {
  const plan = new Map<string, PlannedProgram>(
    PROGRAMS.map((spec) => [spec.slug, { spec, sections: [], lessons: [] }]),
  )
  const unmatchedCollections = new Map<string, number>()
  const usedTexts = new Set<SkoolText>()

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
    const sorted = [...list].sort((a, b) => natural.compare(a.file || a.title, b.file || b.title))
    const taken = new Set<string>()
    const sectionMap = new Map<string, { slug: string; title: string; sortOrder: number }>()

    sorted.forEach((v, i) => {
      const stem = stemOf(v.file || v.title)
      const text =
        texts.find((t) => t.programSlug === slug && normalize(t.stem) === normalize(stem)) ??
        texts.find((t) => t.programSlug === slug && t.title && normalize(t.title) === normalize(v.title))
      if (text) usedTexts.add(text)

      const title = text?.title || v.title || stem
      let lessonSlug = slugify(title)
      for (let n = 2; taken.has(lessonSlug); n++) lessonSlug = `${slugify(title)}-${n}`
      if (lessonSlug !== slugify(title)) anomalies.push(`${slug}: doppelter Titel „${title}“ → Slug ${lessonSlug}`)
      taken.add(lessonSlug)

      const section = entry.spec.sectionFor?.(stem) ?? null
      if (section && !sectionMap.has(section.slug)) {
        const known = Object.values(ELEMENT_SECTIONS).find((s) => s.slug === section.slug)
        sectionMap.set(section.slug, { ...section, sortOrder: known?.order ?? 100 })
      }
      if (entry.spec.sectionFor && !section) {
        anomalies.push(`${slug}: „${v.file || v.title}“ ohne erkennbaren Abschnitt → ohne Abschnitt`)
      }

      entry.lessons.push({
        slug: lessonSlug,
        title,
        // Kurse: Reihenfolge der Dateinamen. Bibliotheken: dieselbe Reihenfolge,
        // die Seite zeigt sie absteigend (höchste sort_order = neueste).
        sortOrder: (i + 1) * 10,
        sectionSlug: section?.slug ?? null,
        videoGuid: v.guid,
        bodyMd: text?.body || null,
        durationSeconds: null,
        sourceFile: v.file || v.title,
      })
      if (!text && entry.spec.kind === 'course') {
        anomalies.push(`${slug}: kein Skool-Text zu „${v.file || v.title}“`)
      }
    })
    entry.sections = [...sectionMap.values()].sort((a, b) => a.sortOrder - b.sortOrder)
  }

  for (const t of texts) {
    if (!usedTexts.has(t)) anomalies.push(`${t.programSlug}: Skool-Text ohne Video — ${t.file}`)
  }
  for (const p of unknownElementPrefixes) {
    anomalies.push(`klang-der-elemente: unbekanntes Präfix „${p}“ — in ELEMENT_SECTIONS ergänzen`)
  }
  return [...plan.values()]
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

function printSummary(plan: PlannedProgram[], videos: Video[], texts: SkoolText[]) {
  console.log(`\nseed-kurse · ${APPLY ? 'SCHREIBEN' : 'Trockenlauf (nichts geschrieben)'}${APPLY && PUBLISH ? ' + veröffentlichen' : ''}`)
  console.log(`Quelle: ${videos.length} Videos, ${texts.length} Skool-Texte\n`)
  for (const p of plan) {
    const s = p.spec
    const head = `${s.slug.padEnd(24)} ${s.kind.padEnd(8)} Abo: ${String(s.includedInPlan ?? '—').padEnd(8)}`
    const withText = p.lessons.filter((l) => l.bodyMd).length
    console.log(`${head} ${String(p.lessons.length).padStart(3)} Lektionen (${withText} mit Text)${s.existing ? ' · Programm besteht, nur Lektionen' : ''}`)
    if (p.sections.length) console.log(`    Abschnitte: ${p.sections.map((x) => x.title).join(', ')}`)
    const sample = p.lessons.slice(0, 3).map((l) => l.slug)
    if (sample.length) console.log(`    z. B.: ${sample.join(', ')}${p.lessons.length > 3 ? ', …' : ''}`)
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
            sort_order: l.sortOrder,
            section_id: l.sectionSlug ? (sectionIds.get(l.sectionSlug) ?? null) : null,
            media_kind: 'video',
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

// ── Lauf ─────────────────────────────────────────────────────────────────────

const videos = readVideos()
const texts = readTexts()
const plan = buildPlan(videos, texts)
if (DURATIONS) await fillDurations(plan)
printSummary(plan, videos, texts)
if (APPLY) {
  if (videos.length === 0) {
    console.error('\nAbbruch: keine Videos in der Quelle — nichts zu schreiben.')
    process.exit(1)
  }
  await apply(plan)
}
