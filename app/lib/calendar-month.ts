import type { Locale } from './locale'

// ─────────────────────────────────────────────────────────────────────────────
// Monatsraster — reine Kalender-Arithmetik für /termine
//
// Diese Datei rechnet mit KALENDERTAGEN (YYYY-MM-DD), nicht mit Zeitpunkten.
// Die Umrechnung „Zeitpunkt → Berliner Kalendertag" hat genau eine Adresse:
// `berlinDate()` in event-access.ts. Wer hier einen ISO-Zeitstempel hineingibt,
// bekommt ein falsches Raster an jedem Termin nach 22 Uhr — deshalb nimmt jede
// Funktion hier ausschließlich das fertige Datum entgegen.
//
// Warum eigene Datumsmathematik statt `new Date().setMonth()`: Date rollt
// stillschweigend weiter (31. Januar + 1 Monat = 3. März) und trägt eine lokale
// Zeitzone mit sich, die auf Vercel anders ist als auf dem Laptop. Date.UTC auf
// reine Y-M-D-Werte ist zonenfrei und damit überall gleich.
//
// Die Woche beginnt am Montag. `Date.getUTCDay()` zählt Sonntag = 0 — genau der
// Off-by-one, der ein Raster um einen Tag verschiebt.
// ─────────────────────────────────────────────────────────────────────────────

/** „2026-09" — Monat als sortierbarer Schlüssel. */
export type MonthKey = string

/** Eine Zelle im Raster. `inMonth: false` sind die Randtage der Nachbarmonate. */
export type MonthCell = {
  /** YYYY-MM-DD */
  date: string
  /** Tageszahl ohne führende Null, für die Anzeige. */
  day: number
  inMonth: boolean
}

const DAY_MS = 86_400_000

function epochDays(isoDate: string): number {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS)
}

function isoFromEpochDays(days: number): string {
  return new Date(days * DAY_MS).toISOString().slice(0, 10)
}

/** Tage addieren — reine Kalenderarithmetik, keine Zeitzone im Spiel. */
export function addDays(isoDate: string, delta: number): string {
  return isoFromEpochDays(epochDays(isoDate) + delta)
}

/** „2026-09-26" → „2026-09" */
export function monthKeyOf(isoDate: string): MonthKey {
  return isoDate.slice(0, 7)
}

/** Monate verschieben, Jahreswechsel inbegriffen. */
export function shiftMonth(key: MonthKey, delta: number): MonthKey {
  const [y, m] = key.split('-').map(Number)
  // Monate seit Jahr 0 — der Übertrag rechnet sich von selbst.
  const total = y * 12 + (m - 1) + delta
  const year = Math.floor(total / 12)
  const month = total - year * 12 + 1
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`
}

/** Erster Tag des Monats als YYYY-MM-DD. */
export function firstDayOf(key: MonthKey): string {
  return `${key}-01`
}

/** Wochentag mit Montag = 0. */
function mondayIndex(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number)
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
}

/**
 * Das Raster eines Monats als ganze Wochen ab Montag. Die erste Woche beginnt
 * beim Montag vor (oder auf) dem Ersten, die letzte endet am Sonntag nach (oder
 * auf) dem Letzten. Fünf oder sechs Wochen, je nach Monat — nie auf sechs
 * aufgefüllt, damit kurze Monate keine leere Zeile bekommen.
 */
export function monthMatrix(key: MonthKey): MonthCell[][] {
  const first = firstDayOf(key)
  const start = epochDays(first) - mondayIndex(first)

  // Letzter Tag des Monats: erster Tag des Folgemonats minus eins.
  const lastDay = epochDays(firstDayOf(shiftMonth(key, 1))) - 1
  const end = lastDay + (6 - mondayIndex(isoFromEpochDays(lastDay)))

  const weeks: MonthCell[][] = []
  for (let cursor = start; cursor <= end; cursor += 7) {
    const week: MonthCell[] = []
    for (let offset = 0; offset < 7; offset++) {
      const date = isoFromEpochDays(cursor + offset)
      week.push({
        date,
        day: Number(date.slice(8, 10)),
        inMonth: date.slice(0, 7) === key,
      })
    }
    weeks.push(week)
  }
  return weeks
}

// ── Beschriftungen ───────────────────────────────────────────────────────────
// Alle Formate rechnen in UTC auf einem reinen Datum: die Eingabe IST schon der
// Berliner Kalendertag. Noch einmal durch eine Zeitzone geschickt, würde er an
// Monatsgrenzen wandern.

function atNoonUtc(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00.000Z`)
}

function tag(locale: Locale): string {
  return locale === 'en' ? 'en-GB' : 'de-DE'
}

/** „September 2026" bzw. „September 2026" */
export function monthTitle(key: MonthKey, locale: Locale = 'de'): string {
  return new Intl.DateTimeFormat(tag(locale), {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  }).format(atNoonUtc(firstDayOf(key)))
}

/** „Sonntag, 13. September" bzw. „Sunday, 13 September" */
export function dayTitle(isoDate: string, locale: Locale = 'de'): string {
  return new Intl.DateTimeFormat(tag(locale), {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(atNoonUtc(isoDate))
}

/** Die sieben Wochentagskürzel ab Montag — „Mo…So" bzw. „Mon…Sun". */
export function weekdayLabels(locale: Locale = 'de'): string[] {
  // 2024-01-01 war ein Montag.
  const format = new Intl.DateTimeFormat(tag(locale), {
    timeZone: 'UTC',
    weekday: 'short',
  })
  return Array.from({ length: 7 }, (_, i) =>
    format.format(atNoonUtc(addDays('2024-01-01', i))),
  )
}

// ── Zuordnung Termin → Tag ───────────────────────────────────────────────────

/** Das Minimum, das ein Eintrag fürs Raster mitbringen muss. */
export type DaySpan = {
  /** YYYY-MM-DD (Berlin) */
  startDate: string
  /** YYYY-MM-DD (Berlin) — gleich `startDate` bei eintägigen Terminen. */
  endDate: string
}

/**
 * Termine nach Kalendertag. Ein mehrtägiger Termin (Retreat über ein
 * Wochenende) erscheint an JEDEM Tag seiner Spanne — sonst wäre er ab dem
 * zweiten Tag im Kalender unsichtbar, obwohl er läuft.
 *
 * Die Spanne wird bei 92 Tagen gekappt: eine kaputte Zeile aus der Datenbank
 * darf das Raster nicht mit tausend Einträgen fluten.
 */
export function groupByDay<T extends DaySpan>(items: readonly T[]): Map<string, T[]> {
  const byDay = new Map<string, T[]>()
  for (const item of items) {
    const from = epochDays(item.startDate)
    const to = Math.max(from, Math.min(epochDays(item.endDate), from + 92))
    for (let d = from; d <= to; d++) {
      const key = isoFromEpochDays(d)
      const list = byDay.get(key)
      if (list) list.push(item)
      else byDay.set(key, [item])
    }
  }
  return byDay
}
