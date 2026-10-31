// ─────────────────────────────────────────────────────────────────────────────
// Rhythmus Fundament 1.5 — 22 Tage, nur für Teilnehmende von RF 1.0
//
// Kickoff am 01.11.2026 um 19:00, Tag 1 am 02.11.2026, danach täglich einer
// (Drip, Berlin-Kalendertage — Logik in app/lib/course-access.ts).
//
// Jeder Tag hat drei Blöcke:
//   1 · Fingerübung            — Feinmotorik
//   2 · Kompositorisches Denken — Hauptteil, baut auf RF 1.0 Tag 22+N auf
//   3 · Muskelgedächtnis        — beide Hände, die Gehirnhälften verbinden
//
// VIDEOS: Noch keins ist exportiert oder hochgeladen. Jedes Video ist ein
// Eintrag in VIDEO_IDS unten (Bunny-GUID). Leer = die Seite zeigt „Video
// folgt". Zum Einsetzen nur die GUID eintragen, sonst nichts ändern.
//
// Der Fingerplan (Block 1) wird nicht von Hand getippt, sondern aus den
// Regeln der Fingerpyramide berechnet (fingeruebungFuerTag) — so kann keine
// Zeile aus dem Rhythmus fallen.
// ─────────────────────────────────────────────────────────────────────────────

export const RF15_SLUG = 'rhythmusfundament-1-5'
export const RF15_TITLE = 'Rhythmus Fundament 1.5'
export const RF15_TOTAL_DAYS = 22
/** Tag 1 wird an diesem Datum frei (Europe/Berlin), danach täglich einer. */
export const RF15_START_DATE = '2026-11-02'
/** Kickoff, Berliner Zeit. Nur Anzeige. */
export const RF15_KICKOFF_LABEL = '01.11.2026 · 19:00 Uhr'
/** RF 1.5 Tag N gehört zu RF 1.0 Tag N + 22. */
export const RF10_DAY_OFFSET = 22

export type Rf15BlockKey = 'fingeruebung' | 'komposition' | 'muskelgedaechtnis'

export interface Rf15BlockInfo {
  key: Rf15BlockKey
  nummer: 1 | 2 | 3
  titel: string
  zweck: string
}

export const RF15_BLOCKS: readonly Rf15BlockInfo[] = [
  { key: 'fingeruebung', nummer: 1, titel: 'Fingerübung', zweck: 'Feinmotorik' },
  { key: 'komposition', nummer: 2, titel: 'Kompositorisches Denken', zweck: 'Der Hauptteil' },
  {
    key: 'muskelgedaechtnis',
    nummer: 3,
    titel: 'Muskelgedächtnis',
    zweck: 'Beide Hände — die Gehirnhälften verbinden',
  },
] as const

// ─────────────────────────────────────────────────────────────────────────────
// Video-IDs — HIER eintragen, sobald hochgeladen (Bunny-GUID, Format UUID).
// ─────────────────────────────────────────────────────────────────────────────

export interface Rf15Intro {
  id: 'kursablauf' | 'fingeruebungen-erklaert'
  titel: string
  videoId?: string
}

export const RF15_INTROS: readonly Rf15Intro[] = [
  { id: 'kursablauf', titel: 'Kursablauf', videoId: undefined },
  { id: 'fingeruebungen-erklaert', titel: 'Die Fingerübungen erklärt', videoId: undefined },
]

type DayVideos = Partial<Record<Rf15BlockKey, string>>

/** Tag → Block → Bunny-GUID. Fehlt ein Eintrag, zeigt die Seite „Video folgt". */
const VIDEO_IDS: Record<number, DayVideos> = {
  // 1: { fingeruebung: 'xxxxxxxx-…', komposition: 'xxxxxxxx-…', muskelgedaechtnis: 'xxxxxxxx-…' },
}

// ─────────────────────────────────────────────────────────────────────────────
// Begleit-PDF
//
// Das PDF liegt NICHT unter public/, sondern unter content/ und wird über
// /training/rhythmusfundament-1-5/fingerpyramide ausgeliefert — nur an
// Eingeschriebene. `file` leer = „PDF folgt".
// ─────────────────────────────────────────────────────────────────────────────

export const RF15_PDF = {
  titel: 'Die Fingerpyramide',
  untertitel: 'Dein Baukasten für Fingerübungen',
  /** Dateiname unter content/rhythmusfundament-1-5/. */
  file: 'fingerpyramide.pdf' as string | undefined,
  downloadName: 'Rhythmus-Fundament-1.5-Fingerpyramide.pdf',
}

// ─────────────────────────────────────────────────────────────────────────────
// Block 1 · Fingerübung — Plan aus der Fingerpyramide
//
// Gezählt wird je Zyklus (k = 1..11): Tag 12 ist gebaut wie Tag 1, Tag 13
// wie Tag 2 usw. (Fingerpyramide, „Zyklus 2 · Geschwindigkeit und Position").
//
//   Hände:   k ungerade beide Hände, k gerade eine Hand
//   Schläge: 1, 2, 3, dann wieder von vorn
//   Finger:  k ungerade ein Finger, k gerade Fingerreihe.
//            Zyklus 1: Zeige, Mittel, Ring, klein, Daumen, Zeige
//            Zyklus 2: „ein Finger" — der, der am besten liegt
//   Basis:   Tag 1–11 Geschwindigkeit + Lautstärke, Tag 12–22 Geschwindigkeit + Position
//   Weg:     immer die Tonleiter hoch und runter
// ─────────────────────────────────────────────────────────────────────────────

export interface Fingeruebung {
  haende: 'beide Hände' | 'eine Hand'
  schlaege: 1 | 2 | 3
  finger: string
  basis: string
  weg: string
}

const EIN_FINGER_ZYKLUS_1 = [
  'Zeigefinger',
  'Mittelfinger',
  'Ringfinger',
  'kleiner Finger',
  'Daumen',
  'Zeigefinger',
] as const

export function fingeruebungFuerTag(n: number): Fingeruebung {
  const zyklus1 = n <= 11
  const k = zyklus1 ? n : n - 11
  const ungerade = k % 2 === 1
  let finger: string
  if (!ungerade) finger = 'Fingerreihe'
  else if (zyklus1) finger = EIN_FINGER_ZYKLUS_1[(k - 1) / 2]
  else finger = 'ein Finger (der, der am besten liegt)'
  return {
    haende: ungerade ? 'beide Hände' : 'eine Hand',
    schlaege: (((k - 1) % 3) + 1) as 1 | 2 | 3,
    finger,
    basis: zyklus1 ? 'Geschwindigkeit und Lautstärke' : 'Geschwindigkeit und Position',
    weg: 'Tonleiter hoch und runter',
  }
}

/** Einzeiler für Karten und Tagesleiste, z. B. „Beide Hände · 1 Schlag · Zeigefinger". */
export function fingeruebungKurz(f: Fingeruebung): string {
  const haende = f.haende === 'beide Hände' ? 'Beide Hände' : 'Eine Hand'
  const schlaege = f.schlaege === 1 ? '1 Schlag' : `${f.schlaege} Schläge`
  const finger = f.finger.startsWith('ein Finger') ? 'ein Finger' : f.finger
  return `${haende} · ${schlaege} · ${finger}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Tage
// ─────────────────────────────────────────────────────────────────────────────

export interface Rf15Day {
  /** 1..22 */
  number: number
  /** Zyklus nach dem Fingerplan: 1 = Tag 1–11, 2 = Tag 12–22. */
  cycle: 1 | 2
  /** Zugehöriger Tag in RF 1.0 (N + 22). */
  rf10Day: number
  fingeruebung: Fingeruebung
  videos: DayVideos
}

export interface Rf15Cycle {
  number: 1 | 2
  titel: string
  untertitel: string
  dayRange: [number, number]
}

export const RF15_CYCLES: readonly Rf15Cycle[] = [
  {
    number: 1,
    titel: 'Zyklus 1',
    untertitel: 'Fingerübungen mit Geschwindigkeit und Lautstärke',
    dayRange: [1, 11],
  },
  {
    number: 2,
    titel: 'Zyklus 2',
    untertitel: 'Fingerübungen mit Geschwindigkeit und Position',
    dayRange: [12, 22],
  },
] as const

export const RF15_DAYS: readonly Rf15Day[] = Array.from(
  { length: RF15_TOTAL_DAYS },
  (_, i) => {
    const n = i + 1
    return {
      number: n,
      cycle: n <= 11 ? 1 : 2,
      rf10Day: n + RF10_DAY_OFFSET,
      fingeruebung: fingeruebungFuerTag(n),
      videos: VIDEO_IDS[n] ?? {},
    }
  },
)
