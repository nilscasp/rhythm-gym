import { COURSE_TIMEZONE } from './course-access'

// ─────────────────────────────────────────────────────────────────────────────
// Reine Helfer für „Heute“, die Startseite der Schule (/training, Marke schule).
// Alles auf Kalenderdaten YYYY-MM-DD in Europe/Berlin — das heutige Datum
// liefert berlinToday() aus course-access.ts. Getestet in
// tests/schule-heute.test.ts.
// ─────────────────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000
const WEEKDAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const

function utcDate(isoDate: string): Date {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** 0 = Montag … 6 = Sonntag */
function mondayIndex(date: Date): number {
  return (date.getUTCDay() + 6) % 7
}

/** ISO-8601-Kalenderwoche (Woche mit dem ersten Donnerstag ist KW 1). */
export function isoWeek(isoDate: string): number {
  const date = utcDate(isoDate)
  // Donnerstag derselben Woche entscheidet über das Jahr.
  const thursday = new Date(date.getTime() + (3 - mondayIndex(date)) * DAY_MS)
  const jan1 = Date.UTC(thursday.getUTCFullYear(), 0, 1)
  return Math.floor((thursday.getTime() - jan1) / DAY_MS / 7) + 1
}

/** Die sieben Kalendertage (Mo–So) der Woche, in der `isoDate` liegt. */
export function weekDays(isoDate: string): string[] {
  const date = utcDate(isoDate)
  const monday = date.getTime() - mondayIndex(date) * DAY_MS
  return Array.from({ length: 7 }, (_, i) =>
    new Date(monday + i * DAY_MS).toISOString().slice(0, 10),
  )
}

export type WeekDot = {
  day: string
  label: (typeof WEEKDAY_SHORT)[number]
  active: boolean
  isToday: boolean
  isFuture: boolean
}

/** Sieben Punkte Mo–So; gefüllt, wo `activityDays` einen Eintrag hat. */
export function weekDots(today: string, activityDays: readonly string[]): WeekDot[] {
  const active = new Set(activityDays.map((d) => d.slice(0, 10)))
  const todayKey = today.slice(0, 10)
  return weekDays(todayKey).map((day, i) => ({
    day,
    label: WEEKDAY_SHORT[i],
    active: active.has(day),
    isToday: day === todayKey,
    isFuture: day > todayKey,
  }))
}

export function activeDayCount(dots: readonly WeekDot[]): number {
  return dots.filter((d) => d.active).length
}

/** „Donnerstag, 22. Oktober“ — Wochentag und Datum in Berliner Zeit. */
export function greetingDateLabel(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: COURSE_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now)
}
