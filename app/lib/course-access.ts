import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './supabase/database.types'
import { TOTAL_DAYS } from '../../data/rhythmusfundament-days'

// ─────────────────────────────────────────────────────────────────────────────
// Kurszugang = Einschreibung (enrollments). Einziger Lese-Check fürs Gating
// der Kursrouten. Schreibwege in enrollments sind ausschließlich die
// DB-Funktion redeem_access_code() und Admin-Operationen — die RLS-Policy
// enrollments_insert_own wurde entfernt (Migration fundament_access_gating).
//
// Drip-Unlock (Migration 0003_drip_unlock): trägt das Enrollment ein
// `drip_start_date`, ist Tag N erst offen, wenn heute (Europe/Berlin)
// >= drip_start_date + (N-1) Tage. NULL = alles offen (Grandfathering).
//
// SÄMTLICHE Datumsmathematik lebt hier — nirgends inline in Routen oder
// Client-Komponenten. Die Helfer sind rein und testbar (tests/course-access).
// ─────────────────────────────────────────────────────────────────────────────

export const COURSE_TIMEZONE = 'Europe/Berlin'

export type CourseAccess = {
  /** Enrollment-Zeile vorhanden? */
  enrolled: boolean
  /** ISO-Datum (YYYY-MM-DD) oder null = kein Drip, alles offen */
  dripStartDate: string | null
  /** Höchste freigeschaltete Tagesnummer (0 = noch nichts offen) */
  maxUnlockedDay: number
  /** Heutiges Datum in Europe/Berlin, ISO YYYY-MM-DD */
  today: string
}

/** Heutiges Kalenderdatum in der Kurs-Zeitzone als YYYY-MM-DD. */
export function berlinToday(now: Date = new Date()): string {
  // en-CA liefert exakt YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: COURSE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

// Kalendertage seit Epoche für ein YYYY-MM-DD — über Date.UTC, damit
// Sommerzeit-Wechsel nie einen Off-by-one erzeugen (Advisor-Hinweis).
function epochDays(isoDate: string): number {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
}

function isoFromEpochDays(days: number): string {
  return new Date(days * 86_400_000).toISOString().slice(0, 10)
}

/**
 * Höchste freigeschaltete Tagesnummer. Kalendertage (inkl. Wochenende):
 * Tag 1 am drip_start, Tag 2 am Folgetag, … Ergebnis liegt in [0, totalDays].
 */
export function unlockedThroughDay(
  dripStartDate: string | null,
  today: string,
  totalDays: number = TOTAL_DAYS,
): number {
  if (!dripStartDate) return totalDays
  const diff = epochDays(today) - epochDays(dripStartDate)
  // Fail closed: ein unparsebares Datum darf nie via NaN-Vergleich alles öffnen.
  if (!Number.isFinite(diff)) {
    console.error('[course-access] unparseable drip_start_date', { dripStartDate, today })
    return 0
  }
  return Math.max(0, Math.min(totalDays, diff + 1))
}

/** Datum (YYYY-MM-DD), an dem Tag `day` frei wird. */
export function unlockDateForDay(dripStartDate: string, day: number): string {
  return isoFromEpochDays(epochDays(dripStartDate) + (day - 1))
}

/** YYYY-MM-DD → DD.MM.YYYY (serverseitig formatiert, Client rechnet nie). */
export function formatDateDE(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

export async function getCourseAccess(
  supabase: SupabaseClient<Database>,
  userId: string,
  courseSlug: string,
): Promise<CourseAccess> {
  const today = berlinToday()
  const locked: CourseAccess = { enrolled: false, dripStartDate: null, maxUnlockedDay: 0, today }

  const { data, error } = await supabase
    .from('enrollments')
    .select('drip_start_date, programs!inner(slug)')
    .eq('user_id', userId)
    .eq('programs.slug', courseSlug)
    .limit(1)

  // Fail closed: ein Lesefehler darf den Kurs nicht öffnen. Der Redirect
  // landet auf /training, wo die gesperrte Karte den Weg erklärt.
  if (error) {
    console.error('[course-access] enrollments read failed', {
      userId,
      courseSlug,
      code: error.code,
      message: error.message,
    })
    return locked
  }
  const row = (data ?? [])[0]
  if (!row) return locked

  const dripStartDate = row.drip_start_date ?? null
  return {
    enrolled: true,
    dripStartDate,
    maxUnlockedDay: unlockedThroughDay(dripStartDate, today),
    today,
  }
}

export async function hasCourseAccess(
  supabase: SupabaseClient<Database>,
  userId: string,
  courseSlug: string,
): Promise<boolean> {
  return (await getCourseAccess(supabase, userId, courseSlug)).enrolled
}
