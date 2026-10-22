import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './supabase/database.types'
import { COURSE_TOTAL_DAYS } from '../../data/rhythmusfundament-days'
import { planSatisfies, toPaidPlan, type PaidPlan } from './plan'

// ─────────────────────────────────────────────────────────────────────────────
// Kurszugang. Einziger Lese-Check fürs Gating der Kursrouten.
//
// Zugang hat, wer (Migration 0010, Spiegel von has_program_access()):
//   · ein AKTIVES Enrollment hat (status null oder 'active'), oder
//   · eine Abo-Stufe, in der der Kurs enthalten ist (programs.included_in_plan,
//     Rangfolge aus plan.ts), oder
//   · Admin ist.
// `enrolled` bleibt die alte Aussage „Enrollment-Zeile vorhanden“ — darauf
// prüft das Rhythmus Fundament weiterhin, damit es sich nicht ändert.
// Schreibwege in enrollments sind ausschließlich die
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

export type AccessSource = 'enrollment' | 'plan' | 'admin'

export type CourseAccess = {
  /** Enrollment-Zeile vorhanden (egal welcher Status)? Alte RF-Semantik. */
  enrolled: boolean
  /** Darf diese Person den Kursinhalt sehen? (Enrollment aktiv, Abo-Stufe, Admin) */
  hasAccess: boolean
  /** Woher der Zugang kommt — null ohne Zugang. Enrollment schlägt Abo schlägt Admin. */
  source: AccessSource | null
  /** programs.included_in_plan — für „im Abo ab Premium enthalten“. */
  includedInPlan: PaidPlan | null
  /**
   * programs.id des Kurses. Aus dem Enrollment, sonst aus der Programmzeile
   * (null, wenn das Programm unbekannt ist). Für day_/lesson_completions.
   */
  programId: string | null
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
 *
 * totalDays = geplante Kurslänge (COURSE_TOTAL_DAYS, 44), NICHT die Zahl der
 * bereits hochgeladenen Tage — so bleibt der Zeitplan stabil, wenn Tag 41–44
 * nachgeliefert werden.
 */
export function unlockedThroughDay(
  dripStartDate: string | null,
  today: string,
  totalDays: number = COURSE_TOTAL_DAYS,
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

export type ResolveAccessInput = {
  isAdmin: boolean
  /** profiles.plan (beliebiger Wert, unbekannt = free) */
  plan: unknown
  /** programs.included_in_plan (null = nur über Enrollment) */
  includedInPlan: unknown
  /** Enrollment-Zeile dieses Kurses oder null */
  enrollment: { status: string | null; drip_start_date: string | null } | null
  today: string
  /** Kurslänge für den Drip (RF: 44; Lektions-Kurse: 366). */
  totalDays?: number
}

export type ResolvedAccess = Pick<
  CourseAccess,
  'enrolled' | 'hasAccess' | 'source' | 'includedInPlan' | 'dripStartDate' | 'maxUnlockedDay'
>

/**
 * Reine Zugriffsentscheidung — Spiegel von has_program_access() (SQL).
 *
 * Drip: gilt nur, wenn der Zugang allein am Enrollment hängt. Wer den Kurs
 * zusätzlich über die Abo-Stufe hat, bekommt alles offen (das Abo kennt keine
 * Runde). Admin ohne aktives Enrollment sieht alles; mit aktivem Enrollment
 * gilt dessen Drip — so verhält sich das Rhythmus Fundament genau wie vorher.
 *
 * Ein nicht aktives Enrollment (z. B. cancelled) gibt keinen Zugang, liefert
 * aber weiter `enrolled` und den Drip-Stand (alte RF-Semantik).
 */
export function resolveAccess(input: ResolveAccessInput): ResolvedAccess {
  const totalDays = input.totalDays ?? COURSE_TOTAL_DAYS
  const includedInPlan = toPaidPlan(input.includedInPlan)
  const enrollment = input.enrollment
  const enrolled = enrollment !== null
  const enrollmentActive = enrollment !== null && (enrollment.status ?? 'active') === 'active'
  const byPlan = includedInPlan !== null && planSatisfies(input.plan, includedInPlan)

  const source: AccessSource | null = enrollmentActive
    ? 'enrollment'
    : byPlan
      ? 'plan'
      : input.isAdmin
        ? 'admin'
        : null

  const dripStartDate = enrollment?.drip_start_date ?? null
  let maxUnlockedDay = enrolled ? unlockedThroughDay(dripStartDate, input.today, totalDays) : 0
  if (byPlan || (input.isAdmin && !enrollmentActive)) maxUnlockedDay = totalDays

  return {
    enrolled,
    hasAccess: source !== null,
    source,
    includedInPlan,
    // Ohne Drip-Bindung (Abo/Admin) auch kein Datum anzeigen.
    dripStartDate: maxUnlockedDay === totalDays && source !== 'enrollment' ? null : dripStartDate,
    maxUnlockedDay,
  }
}

/** Ist diese Lektion für diese Person offen? Kurszugang + Drip (unlock_day). */
export function isLessonUnlocked(
  lesson: { unlock_day: number | null },
  access: Pick<CourseAccess, 'hasAccess' | 'maxUnlockedDay'>,
): boolean {
  if (!access.hasAccess) return false
  if (lesson.unlock_day == null) return true
  return lesson.unlock_day <= access.maxUnlockedDay
}

/** „Frei ab TT.MM.JJJJ“ für eine gesperrte Lektion — null ohne Drip-Datum. */
export function lessonUnlockLabel(
  lesson: { unlock_day: number | null },
  access: Pick<CourseAccess, 'dripStartDate'>,
): string | null {
  if (lesson.unlock_day == null || !access.dripStartDate) return null
  return formatDateDE(unlockDateForDay(access.dripStartDate, lesson.unlock_day))
}

export async function getCourseAccess(
  supabase: SupabaseClient<Database>,
  userId: string,
  courseSlug: string,
  options: { totalDays?: number } = {},
): Promise<CourseAccess> {
  const today = berlinToday()
  const locked: CourseAccess = {
    enrolled: false,
    hasAccess: false,
    source: null,
    includedInPlan: null,
    programId: null,
    dripStartDate: null,
    maxUnlockedDay: 0,
    today,
  }

  const [enrollmentRes, programRes, profileRes] = await Promise.all([
    supabase
      .from('enrollments')
      .select('program_id, drip_start_date, status, programs!inner(slug)')
      .eq('user_id', userId)
      .eq('programs.slug', courseSlug)
      .limit(1),
    supabase
      .from('programs')
      .select('id, included_in_plan')
      .eq('slug', courseSlug)
      .maybeSingle(),
    supabase.from('profiles').select('plan, is_admin').eq('id', userId).maybeSingle(),
  ])

  // Fail closed: ein Lesefehler darf den Kurs nicht öffnen. Der Redirect
  // landet auf /training, wo die gesperrte Karte den Weg erklärt.
  if (enrollmentRes.error) {
    console.error('[course-access] enrollments read failed', {
      userId,
      courseSlug,
      code: enrollmentRes.error.code,
      message: enrollmentRes.error.message,
    })
    return locked
  }

  // Programm- und Profil-Lesefehler schließen nur den Abo-/Admin-Weg — das
  // Enrollment gilt weiter. Wichtig, solange 0010 nicht eingespielt ist
  // (included_in_plan fehlt dann): das Rhythmus Fundament läuft unverändert.
  if (programRes.error) {
    console.error('[course-access] programs read failed', {
      courseSlug,
      code: programRes.error.code,
      message: programRes.error.message,
    })
  }
  if (profileRes.error) {
    console.error('[course-access] profile read failed', {
      userId,
      code: profileRes.error.code,
      message: profileRes.error.message,
    })
  }

  const row = (enrollmentRes.data ?? [])[0] ?? null
  const program = programRes.error ? null : programRes.data
  const profile = profileRes.error ? null : profileRes.data

  const resolved = resolveAccess({
    isAdmin: profile?.is_admin === true,
    plan: profile?.plan ?? null,
    includedInPlan: program?.included_in_plan ?? null,
    enrollment: row ? { status: row.status ?? null, drip_start_date: row.drip_start_date ?? null } : null,
    today,
    totalDays: options.totalDays,
  })

  return {
    ...resolved,
    programId: row?.program_id ?? program?.id ?? null,
    today,
  }
}

/** Darf diese Person den Kursinhalt sehen? (Enrollment aktiv, Abo-Stufe, Admin) */
export async function hasCourseAccess(
  supabase: SupabaseClient<Database>,
  userId: string,
  courseSlug: string,
): Promise<boolean> {
  return (await getCourseAccess(supabase, userId, courseSlug)).hasAccess
}
