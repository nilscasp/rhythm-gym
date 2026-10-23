import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../lib/supabase/database.types'
import type { Messages } from '../../../messages'
import { berlinToday, getCourseAccess } from '../../lib/course-access'
import { getCompletedDays, nextOpenDay } from '../../lib/course-progress'
import { planSatisfies, toPaidPlan } from '../../lib/plan'
import {
  berlinDate,
  eventTimeLabel,
  formatEventDate,
  hasEventAccess,
  localized,
} from '../../lib/event-access'
import { weekDays } from '../../lib/schule-heute'
import { COURSE_TOTAL_DAYS, RHYTHMUS_DAYS } from '../../../data/rhythmusfundament-days'
import { EVENT_COLUMNS, currentViewer, hintFor, type Termin } from '../../termine/_viewer'
import { loadCourseRoom } from '../_course/load'

// ─────────────────────────────────────────────────────────────────────────────
// Daten für „Heute“ (Startseite der Schule). Sammelt dieselben Kurse wie der
// Hub (Enrollment + per Abo enthaltene Programme), fragt den Zugang aber je
// Kurs über getCourseAccess/loadCourseRoom ab — keine zweite Zugriffsregel.
// Bibliotheken (kind library) wandern in „Zum Nachschauen“.
// ─────────────────────────────────────────────────────────────────────────────

type Client = SupabaseClient<Database>

const RHYTHMUSFUNDAMENT_SLUG = 'rhythmusfundament'
const EVENTS_SHOWN = 2

export type HeuteCourse = {
  programId: string
  slug: string
  /** Kursname (Überzeile) */
  courseTitle: string
  /** Nächste offene Lektion bzw. nächster Tag; null = nichts Offenes mehr */
  nextTitle: string | null
  /** Ziel der Karte — die nächste Lektion oder der Kursraum */
  href: string
  done: number
  total: number
}

export type HeuteLibrary = { slug: string; title: string; href: string }

export type HeuteEvent = {
  id: string
  href: string
  badgeDay: string
  badgeMonth: string
  dateLabel: string
  timeLabel: string
  title: string
  hint: string | null
}

export type HeuteData = {
  today: string
  courses: HeuteCourse[]
  libraries: HeuteLibrary[]
  events: HeuteEvent[]
  eventsFailed: boolean
  activityDays: string[]
}

type EnrollmentRow = {
  program_id: string
  status: string | null
  programs: { id: string; title: string; slug: string } | null
}

export async function loadHeute(
  supabase: Client,
  userId: string,
  plan: string | null,
  t: Messages,
): Promise<HeuteData> {
  const today = berlinToday()
  const nowIso = new Date().toISOString()

  const [enrollmentsRes, planProgramsRes, activityRes, eventsRes, viewer] = await Promise.all([
    supabase
      .from('enrollments')
      .select('program_id, status, programs(id, title, slug)')
      .eq('user_id', userId),
    // Vor Migration 0010 fehlen die Spalten → Fehler → keine Abo-Kurse.
    supabase
      .from('programs')
      .select('id, title, slug, kind, included_in_plan, sort_order')
      .not('included_in_plan', 'is', null)
      .not('published_at', 'is', null)
      .order('sort_order', { ascending: true }),
    supabase
      .from('daily_activity')
      .select('day')
      .eq('user_id', userId)
      .gte('day', weekDays(today)[0])
      .order('day', { ascending: true }),
    supabase
      .from('events')
      .select(EVENT_COLUMNS)
      .gte('starts_at', nowIso)
      .order('starts_at', { ascending: true })
      .limit(EVENTS_SHOWN),
    currentViewer(supabase),
  ])

  if (enrollmentsRes.error) {
    console.error('[heute] enrollments read failed', {
      code: enrollmentsRes.error.code,
      message: enrollmentsRes.error.message,
    })
  }
  if (eventsRes.error) {
    console.error('[heute] events read failed', {
      code: eventsRes.error.code,
      message: eventsRes.error.message,
    })
  }

  // Aktive Enrollments (status null zählt wie 'active' — wie in course-access).
  const enrollments = ((enrollmentsRes.data as EnrollmentRow[] | null) ?? []).filter(
    (e) => e.programs && (e.status ?? 'active') === 'active',
  )
  const enrolledIds = new Set(enrollments.map((e) => e.program_id))
  const planPrograms = (planProgramsRes.data ?? []).filter((p) => {
    const required = toPaidPlan(p.included_in_plan)
    return required !== null && planSatisfies(plan, required) && !enrolledIds.has(p.id)
  })

  // Rhythmus Fundament zuerst, dann übrige Enrollments, dann Abo-Programme.
  const enrolledPrograms = enrollments
    .map((e) => e.programs!)
    .sort(
      (a, b) =>
        Number(b.slug === RHYTHMUSFUNDAMENT_SLUG) - Number(a.slug === RHYTHMUSFUNDAMENT_SLUG),
    )

  const courses: HeuteCourse[] = []
  const libraries: HeuteLibrary[] = []

  const enrolledResults = await Promise.all(
    enrolledPrograms.map((p) =>
      p.slug === RHYTHMUSFUNDAMENT_SLUG
        ? loadFundamentCard(supabase, userId, p)
        : loadLessonCard(supabase, userId, p, { requirePublished: false }),
    ),
  )
  const planResults = await Promise.all(
    planPrograms.map((p) =>
      p.kind === 'library'
        ? Promise.resolve<CardResult>({
            kind: 'library',
            library: { slug: p.slug, title: p.title, href: `/training/${p.slug}` },
          })
        : loadLessonCard(supabase, userId, p, { requirePublished: true }),
    ),
  )
  for (const result of [...enrolledResults, ...planResults]) {
    if (result?.kind === 'course') courses.push(result.course)
    if (result?.kind === 'library') libraries.push(result.library)
  }

  const events: HeuteEvent[] = ((eventsRes.data ?? []) as Termin[]).map((event) => {
    const startDate = berlinDate(event.starts_at)
    return {
      id: event.id,
      href: `/termine/${event.id}`,
      badgeDay: String(Number(startDate.slice(8, 10))),
      badgeMonth: monthShort(event.starts_at),
      dateLabel: formatEventDate(event.starts_at),
      timeLabel: eventTimeLabel(event, { allDayLabel: t.events.allDay }),
      title: localized(event.title),
      hint: hintFor(hasEventAccess(viewer, event), t),
    }
  })

  return {
    today,
    courses,
    libraries,
    events,
    eventsFailed: Boolean(eventsRes.error),
    activityDays: (activityRes.data ?? []).map((r: { day: string }) => r.day),
  }
}

type CardResult =
  | { kind: 'course'; course: HeuteCourse }
  | { kind: 'library'; library: HeuteLibrary }
  | null

async function loadFundamentCard(
  supabase: Client,
  userId: string,
  program: { id: string; title: string; slug: string },
): Promise<CardResult> {
  const access = await getCourseAccess(supabase, userId, RHYTHMUSFUNDAMENT_SLUG)
  if (!access.hasAccess) return null
  const completed = await getCompletedDays(supabase, userId, access.programId ?? program.id)
  const next = nextOpenDay(
    completed,
    access.maxUnlockedDay,
    RHYTHMUS_DAYS.map((d) => d.number),
  )
  const nextDay = next ? RHYTHMUS_DAYS.find((d) => d.number === next) : undefined
  return {
    kind: 'course',
    course: {
      programId: program.id,
      slug: program.slug,
      courseTitle: program.title,
      nextTitle: next ? `Tag ${next}${nextDay?.title ? ` · ${nextDay.title}` : ''}` : null,
      href: next ? `/training/rhythmusfundament/tag/${next}` : '/training/rhythmusfundament',
      done: completed.size,
      total: COURSE_TOTAL_DAYS,
    },
  }
}

async function loadLessonCard(
  supabase: Client,
  userId: string,
  program: { id: string; title: string; slug: string },
  options: { requirePublished: boolean },
): Promise<CardResult> {
  const room = await loadCourseRoom(supabase, userId, program.slug, options)
  const baseHref = `/training/${program.slug}`
  // Gliederung nicht lesbar (z. B. vor Migration 0010): schlichte Karte zum Kursraum.
  if (!room) {
    return {
      kind: 'course',
      course: {
        programId: program.id,
        slug: program.slug,
        courseTitle: program.title,
        nextTitle: null,
        href: baseHref,
        done: 0,
        total: 0,
      },
    }
  }
  if (!room.access.hasAccess) return null
  if (room.isLibrary) {
    return {
      kind: 'library',
      library: { slug: program.slug, title: room.program.title, href: baseHref },
    }
  }
  return {
    kind: 'course',
    course: {
      programId: room.program.id,
      slug: program.slug,
      courseTitle: room.program.title,
      nextTitle: room.next?.title ?? null,
      href: room.next ? `${baseHref}/${room.next.slug}` : baseHref,
      done: room.lessons.filter((l) => room.completed.has(l.id)).length,
      total: room.lessons.length,
    },
  }
}

/** „Okt“, „Nov“ — Monatskürzel in Berliner Zeit, ohne Punkt. */
function monthShort(startsAt: string): string {
  return new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', month: 'short' })
    .format(new Date(startsAt))
    .replace('.', '')
    .slice(0, 3)
}
