// ─────────────────────────────────────────────────────────────────────────────
// kurse-quellen.ts — reine Helfer für scripts/seed-kurse.ts: Dateinamen →
// Lektions-Schlüssel, lesbare Titel, Zerlegen der Skool-Texte und der
// LANDKARTE.md aus dem Content-Hub. Kein Dateisystem, keine DB — testbar in
// tests/kurse-quellen.test.ts.
// ─────────────────────────────────────────────────────────────────────────────

/** macOS-Begleitdateien auf exFAT/FAT-Platten („._name“). */
export function isAppleDouble(name: string): boolean {
  return /(^|\/)\._/.test(name)
}

export function normalize(s: string): string {
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

export function slugify(s: string): string {
  return normalize(s).replace(/\s+/g, '-').slice(0, 80).replace(/-+$/, '') || 'lektion'
}

/** Dateiname ohne Ordner und Endung. */
export function stemOf(file: string): string {
  return (file.split('/').pop() ?? file).replace(/\.[^.]+$/, '')
}

// ── Lektions-Schlüssel aus dem Dateinamen ────────────────────────────────────

export type LessonKey = {
  slug: string
  /** Nummer innerhalb des Kurses (für Text-Zuordnung). */
  number: number
  sortOrder: number
  /** Klang der Elemente: Abschnitts-Buchstabe (a, f, w, e, l, h). */
  letter?: string
  /** Von Anfang an spielen: Runde/Session. */
  round?: number
  /** Teil des Dateinamens nach dem Schlüssel, z. B. „nordstern“. */
  rest: string
}

/**
 * Kurze, stabile Slugs:
 *   handpan-kompass        hk-l01-nordstern            → l01
 *   handpan-kreativ        hkr-l01-…                   → l01
 *   von-anfang-an-spielen  vaa3-l01-…                  → vaa3-l01
 *   klang-der-elemente     01-a1-warum-die-elemente    → a1 (01 = Reihenfolge)
 * null = Dateiname passt nicht zum Muster des Kurses.
 */
export function lessonKey(programSlug: string, stem: string): LessonKey | null {
  const s = stem.toLowerCase()
  const two = (n: number) => String(n).padStart(2, '0')
  if (programSlug === 'handpan-kompass') {
    const m = s.match(/^hk-l(\d+)(?:-(.*))?$/)
    if (!m) return null
    const n = Number(m[1])
    return { slug: `l${two(n)}`, number: n, sortOrder: n * 10, rest: m[2] ?? '' }
  }
  if (programSlug === 'handpan-kreativ') {
    const m = s.match(/^hkr-l(\d+)(?:-(.*))?$/)
    if (!m) return null
    const n = Number(m[1])
    return { slug: `l${two(n)}`, number: n, sortOrder: n * 10, rest: m[2] ?? '' }
  }
  if (programSlug === 'von-anfang-an-spielen') {
    const m = s.match(/^vaa(\d+)-l(\d+)(?:-(.*))?$/)
    if (!m) return null
    const round = Number(m[1])
    const n = Number(m[2])
    return { slug: `vaa${round}-l${two(n)}`, number: n, round, sortOrder: round * 100 + n * 10, rest: m[3] ?? '' }
  }
  if (programSlug === 'klang-der-elemente') {
    const m = s.match(/^(\d+)-([a-z])(\d+)(?:-(.*))?$/)
    if (!m) return null
    const n = Number(m[3])
    return { slug: `${m[2]}${n}`, number: n, letter: m[2], sortOrder: Number(m[1]) * 10, rest: m[4] ?? '' }
  }
  return null
}

// ── Lesbare Titel aus Dateinamen ─────────────────────────────────────────────

// Wörter, in denen ae/oe/ue kein Umlaut ist (Teilstring-Treffer).
const NO_UMLAUT = [
  'poe', 'koexist', 'aero', 'israel', 'michael', 'zuerst', 'zuende', 'duell', 'duett',
  'aktuell', 'manuell', 'eventuell', 'individuell', 'virtuell', 'sexuell', 'visuell',
  'konfluenz', 'frequenz', 'sequenz', 'influenc', 'statue', 'queue', 'blues',
]

/**
 * ae/oe/ue → ä/ö/ü nur, wo es eindeutig ist: nicht nach einem Vokal oder q
 * (feuer, neue, quelle, aquarell) und nicht in den Ausnahmewörtern.
 */
export function restoreUmlauts(word: string): string {
  const lower = word.toLowerCase()
  if (NO_UMLAUT.some((x) => lower.includes(x))) return word
  return word.replace(/(^|[^aeiouqAEIOUQ])(ae|oe|ue|Ae|Oe|Ue)/g, (_, pre: string, pair: string) => {
    const map: Record<string, string> = { ae: 'ä', oe: 'ö', ue: 'ü', Ae: 'Ä', Oe: 'Ö', Ue: 'Ü' }
    return pre + map[pair]
  })
}

/** „welche-identitaet-haelt-dich“ → „Welche identität hält dich“. */
export function titleFromFilename(rest: string): string {
  const words = rest
    .replace(/[-_]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(restoreUmlauts)
  const t = words.join(' ')
  return t ? t[0].toUpperCase() + t.slice(1) : ''
}

/**
 * Passt ein Titel zum Dateinamen? Mindestens ein Wort ab 4 Zeichen gemeinsam,
 * oder gleicher Wortanfang ab 5 Zeichen („improvisiert“ ~ „improvisation“).
 */
export function titleMatchesFile(title: string, rest: string): boolean {
  const a = normalize(title).split(' ').filter((w) => w.length >= 4)
  const same = (x: string, y: string) => x === y || (x.length >= 5 && y.length >= 5 && x.slice(0, 5) === y.slice(0, 5))
  return normalize(rest)
    .split(' ')
    .some((w) => w.length >= 4 && a.some((x) => same(x, w)))
}

// ── Skool-Texte ──────────────────────────────────────────────────────────────

export type ParsedText = {
  title: string
  body: string
  subtitle?: string | null
  section?: { number: number; title: string } | null
  durationSeconds?: number | null
}

function clean(lines: string[]): string {
  return lines
    .join('\n')
    .replace(/\n-{3,}\s*$/g, '')
    .trim()
}

/** „7:08“ / „1:02:03“ → Sekunden. */
export function parseDuration(s: string): number | null {
  const parts = s.trim().split(':').map(Number)
  if (parts.length < 2 || parts.some((n) => !Number.isFinite(n))) return null
  return parts.reduce((acc, n) => acc * 60 + n, 0)
}

/**
 * Handpan Kompass, hk-lNN-skool.md:
 *   # Lektion 1: Für wen spielst du? Dein Nordstern
 *   **Modul 1 · Ausrichten** · Lektion 1 von 15 · Impuls
 * Titel ohne „Lektion N:“ (die Seite zeigt „Lektion N von M“ selbst), Modul
 * als Abschnitt, Art („Impuls · Übung“) als Untertitel; Kopfzeile und
 * Modulzeile fallen aus dem Text.
 */
export function parseKompassLesson(md: string): ParsedText | null {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const h = lines.findIndex((l) => /^#\s+/.test(l))
  if (h < 0) return null
  const title = lines[h]
    .replace(/^#\s+/, '')
    .replace(/^Lektion\s+\d+\s*[:·–-]\s*/i, '')
    .replace(/\*\*/g, '')
    .trim()
  let rest = lines.slice(h + 1)
  let section: ParsedText['section'] = null
  let subtitle: string | null = null
  const metaIdx = rest.findIndex((l) => l.trim() !== '')
  const meta = metaIdx >= 0 ? rest[metaIdx].match(/^\*\*Modul\s+(\d+)\s*·\s*(.+?)\*\*\s*·\s*Lektion\s+\d+\s+von\s+\d+\s*(?:·\s*(.+))?$/) : null
  if (meta) {
    section = { number: Number(meta[1]), title: `Modul ${meta[1]} · ${meta[2].trim()}` }
    subtitle = meta[3]?.trim() || null
    rest = rest.slice(metaIdx + 1)
  }
  return { title, body: clean(rest), subtitle, section }
}

/**
 * hk-uebersicht-skool.md → programs.description. Die Kursseite zeigt die
 * Beschreibung als einfachen Absatz, darum nur der Einstieg bis zur ersten
 * Trennlinie, ohne Überschrift und ohne Markdown-Betonung.
 */
export function parseKompassOverview(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  for (const l of lines) {
    if (/^━+/.test(l.trim())) break
    if (/^#\s+/.test(l)) continue
    out.push(l)
  }
  return out
    .join('\n')
    .replace(/\*+([^*\n]+?)\*+/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export type ElementeText = ParsedText & { sectionHeading: string; index: number }

/**
 * Klang der Elemente, Skool-Texte.md (eine Datei für alle):
 *   ## Auftakt | ## Woche 1 · Feuer | … | ## Ernte
 *   ### 1 · Warum die Elemente
 * Jede „### N · Titel“-Überschrift ist eine Lektion, N zählt innerhalb des
 * Abschnitts.
 */
export function parseElementeTexte(md: string): ElementeText[] {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const out: ElementeText[] = []
  let heading = ''
  let cur: { title: string; index: number; heading: string; lines: string[] } | null = null
  const flush = () => {
    if (cur) out.push({ sectionHeading: cur.heading, index: cur.index, title: cur.title, body: clean(cur.lines) })
    cur = null
  }
  for (const l of lines) {
    const h2 = l.match(/^##\s+(?!#)(.+?)\s*$/)
    const h3 = l.match(/^###\s+(\d+)\s*·\s*(.+?)\s*$/)
    if (h2) {
      flush()
      heading = h2[1]
    } else if (h3) {
      flush()
      cur = { title: h3[2], index: Number(h3[1]), heading, lines: [] }
    } else if (/^#\s+/.test(l)) {
      flush()
    } else if (cur) {
      cur.lines.push(l)
    }
  }
  flush()
  return out
}

/** Abschnitts-Buchstabe der Elemente-Dateien → Schlüsselwörter der Überschrift. */
export const ELEMENT_LETTERS: Record<string, { slug: string; keywords: string[]; fallback: string; order: number }> = {
  a: { slug: 'auftakt', keywords: ['auftakt', 'grundlagen'], fallback: 'Grundlagen', order: 10 },
  f: { slug: 'feuer', keywords: ['feuer'], fallback: 'Feuer', order: 20 },
  w: { slug: 'wasser', keywords: ['wasser'], fallback: 'Wasser', order: 30 },
  e: { slug: 'erde', keywords: ['erde'], fallback: 'Erde', order: 40 },
  l: { slug: 'luft', keywords: ['luft'], fallback: 'Luft', order: 50 },
  h: { slug: 'ernte', keywords: ['ernte', 'herz', 'abschluss'], fallback: 'Herz/Abschluss', order: 60 },
}

export function elementHeadingFor(letter: string, headings: string[]): string | null {
  const spec = ELEMENT_LETTERS[letter]
  if (!spec) return null
  return headings.find((h) => spec.keywords.some((k) => normalize(h).split(' ').includes(k))) ?? null
}

/**
 * Handpan Kreativ, Skool-Beschreibungen.md:
 *   ## Lektion 1 · Die Sprache der Ästhetik (7:08)
 *   ## Nachschau · Session 1 · Die Sprache der Ästhetik
 *   **Titel in Skool:** …
 */
export function parseKreativTexte(md: string): {
  lessons: Map<number, ParsedText>
  nachschau: Map<number, ParsedText>
} {
  const lessons = new Map<number, ParsedText>()
  const nachschau = new Map<number, ParsedText>()
  for (const block of splitH2(md)) {
    const lm = block.heading.match(/^Lektion\s+(\d+)\s*·\s*(.+?)\s*(?:\((\d+(?::\d+)+)\))?$/)
    const nm = block.heading.match(/^Nachschau\s*·\s*Session\s+(\d+)\s*·\s*(.+?)\s*(?:\((\d+(?::\d+)+)\))?$/)
    const m = lm ?? nm
    if (!m) continue
    const skoolTitle = block.lines.find((l) => /^\*\*Titel in Skool:\*\*/.test(l))
    const body = clean(block.lines.filter((l) => l !== skoolTitle))
    const parsed: ParsedText = {
      title: nm && skoolTitle ? skoolTitle.replace(/^\*\*Titel in Skool:\*\*\s*/, '').trim() : m[2].trim(),
      body,
      durationSeconds: m[3] ? parseDuration(m[3]) : null,
    }
    ;(lm ? lessons : nachschau).set(Number(m[1]), parsed)
  }
  return { lessons, nachschau }
}

/**
 * Von Anfang an spielen, vaa3-vaa4-skool-texte.md:
 *   ## Session 3 · Lektion 1 · Kompositorische Körper
 * Schlüssel „3-1“.
 */
export function parseVaaTexte(md: string): Map<string, ParsedText> {
  const out = new Map<string, ParsedText>()
  for (const block of splitH2(md)) {
    const m = block.heading.match(/^Session\s+(\d+)\s*·\s*Lektion\s+(\d+)\s*·\s*(.+?)\s*$/)
    if (!m) continue
    out.set(`${Number(m[1])}-${Number(m[2])}`, { title: m[3], body: clean(block.lines) })
  }
  return out
}

function splitH2(md: string): { heading: string; lines: string[] }[] {
  const out: { heading: string; lines: string[] }[] = []
  let cur: { heading: string; lines: string[] } | null = null
  for (const l of md.replace(/\r\n/g, '\n').split('\n')) {
    const h = l.match(/^##\s+(?!#)(.+?)\s*$/)
    if (h) {
      cur = { heading: h[1], lines: [] }
      out.push(cur)
    } else if (/^#\s+/.test(l)) {
      cur = null
    } else if (cur) {
      cur.lines.push(l)
    }
  }
  return out
}

// ── LANDKARTE.md (Content-Hub) ───────────────────────────────────────────────

export type Landkarte = {
  /** Sitzungen: `vaa1` | VAA | 1 | 2026-09-26 | … | Thema | … */
  sessions: Map<string, { series: string; number: string; date: string; theme: string }>
  /** Stücke: `vaa1-nachschau` | nachschau | Titel | … */
  items: Map<string, { type: string; title: string }>
}

export function parseLandkarte(md: string): Landkarte {
  const sessions: Landkarte['sessions'] = new Map()
  const items: Landkarte['items'] = new Map()
  for (const line of md.split('\n')) {
    if (!line.startsWith('| `')) continue
    const cells = line.split('|').slice(1, -1).map((c) => c.trim())
    const id = cells[0]?.match(/^`([^`]+)`$/)?.[1]
    if (!id) continue
    if (/^\d{4}-\d{2}-\d{2}/.test(cells[3] ?? '')) {
      sessions.set(id, { series: cells[1], number: cells[2], date: cells[3].slice(0, 10), theme: cells[7] ?? '' })
    } else if (cells[1] && cells[2]) {
      items.set(id, { type: cells[1], title: cells[2] })
    }
  }
  return { sessions, items }
}

const SERIES_NAMES: Record<string, string> = {
  VAA: 'Von Anfang an spielen',
  'RF 1': 'Rhythmus Fundament 1',
  'RF 2': 'Rhythmus Fundament 2',
  HKR: 'Handpan Kreativ',
  HK: 'Handpan Kompass',
  THP: 'The Handpan Path',
}

/** „<Kurs> · Session N · <Thema>“ aus einer Sitzungszeile; null, wenn unbekannt. */
export function sessionTitle(lk: Landkarte, sessionId: string, theme?: string | null): string | null {
  const s = lk.sessions.get(sessionId)
  const series = s ? SERIES_NAMES[s.series] : undefined
  if (!s || !series) return null
  const t = (theme ?? s.theme).trim()
  return t ? `${series} · Session ${s.number} · ${t}` : `${series} · Session ${s.number}`
}
