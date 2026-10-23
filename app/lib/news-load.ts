import 'server-only'
import { cache } from 'react'
import { createClient } from './supabase/server'
import { getProgramAccessMap, isLessonUnlocked } from './course-access'
import { eventTimeLabel, hasEventAccess, localized } from './event-access'
import { COURSE_TOTAL_DAYS } from '../../data/rhythmusfundament-days'
import { EVENT_COLUMNS, currentViewer, type Termin } from '../termine/_viewer'
import {
  EMPTY_NEWS,
  EVENT_NEWS_HOURS,
  LESSON_NEWS_DAYS,
  buildNews,
  type News,
  type NewsLessonInput,
} from './news'

// ─────────────────────────────────────────────────────────────────────────────
// Neuigkeiten für die angemeldete Person laden (Marke schule).
//
// Liest die drei Quellen, filtert sie mit den VORHANDENEN Zugriffsregeln und
// gibt sie an die reine Funktion buildNews() (app/lib/news.ts):
//   · Beiträge: RLS (can_read_post, Migration 0011) entscheidet.
//   · Lektionen: getProgramAccessMap + isLessonUnlocked (course-access.ts).
//   · Termine: hasEventAccess (event-access.ts), nur mit offener Tür.
//
// `cache` sorgt dafür, dass Layout (Glocke) und „Heute“ (Leiste, Karte) im
// selben Request nur einmal lesen. Jeder Lesefehler — auch „Tabelle fehlt“,
// solange 0011 nicht eingespielt ist — endet in leeren Neuigkeiten, nie in
// einer kaputten Seite.
// ─────────────────────────────────────────────────────────────────────────────

const POSTS_IN_NEWS = 10
const RHYTHMUSFUNDAMENT_SLUG = 'rhythmusfundament'
const LESSON_COURSE_DAYS = 366

export const loadNewsForUser = cache(async (userId: string): Promise<News> => {
  try {
    return await load(userId)
  } catch (error) {
    console.error('[news] load failed', { message: (error as Error)?.message })
    return EMPTY_NEWS
  }
})

async function load(userId: string): Promise<News> {
  const supabase = await createClient()
  const now = new Date()
  const nowIso = now.toISOString()
  const lessonsFrom = new Date(now.getTime() - LESSON_NEWS_DAYS * 86_400_000).toISOString()
  const eventsUntil = new Date(now.getTime() + EVENT_NEWS_HOURS * 3_600_000).toISOString()

  const [stateRes, postsRes, lessonsRes, eventsRes, viewer] = await Promise.all([
    supabase.from('news_state').select('seen_at').eq('user_id', userId).maybeSingle(),
    supabase
      .from('posts')
      .select('id, slug, title, published_at')
      .not('published_at', 'is', null)
      .lte('published_at', nowIso)
      .order('published_at', { ascending: false })
      .limit(POSTS_IN_NEWS),
    supabase
      .from('lessons')
      .select('id, slug, title, program_id, published_at, unlock_day')
      .gte('published_at', lessonsFrom)
      .lte('published_at', nowIso)
      .order('published_at', { ascending: false })
      .limit(200),
    supabase
      .from('events')
      .select(EVENT_COLUMNS)
      .gte('starts_at', nowIso)
      .lte('starts_at', eventsUntil)
      .order('starts_at', { ascending: true })
      .limit(20),
    currentViewer(supabase),
  ])

  for (const [name, res] of [
    ['news_state', stateRes],
    ['posts', postsRes],
    ['lessons', lessonsRes],
    ['events', eventsRes],
  ] as const) {
    if (res.error) {
      console.error(`[news] ${name} read failed`, { code: res.error.code, message: res.error.message })
    }
  }

  // ── Lektionen: nur aus Programmen mit Zugang, nur offene ──
  const rawLessons = lessonsRes.data ?? []
  const programIds = [...new Set(rawLessons.map((l) => l.program_id))]
  let lessons: NewsLessonInput[] = []
  if (programIds.length > 0) {
    const { data: programs, error } = await supabase
      .from('programs')
      .select('id, slug, title, kind, included_in_plan, published_at')
      .in('id', programIds)
    if (error) {
      console.error('[news] programs read failed', { code: error.code, message: error.message })
    }
    const programRows = programs ?? []
    const { access } = await getProgramAccessMap(supabase, userId, programRows, (p) =>
      p.slug === RHYTHMUSFUNDAMENT_SLUG ? COURSE_TOTAL_DAYS : LESSON_COURSE_DAYS,
    )
    const byId = new Map(programRows.map((p) => [p.id, p]))
    lessons = rawLessons.flatMap((l) => {
      const program = byId.get(l.program_id)
      const a = access.get(l.program_id)
      if (!program || !a || !l.published_at) return []
      // Unveröffentlichte Kurse tauchen nur für Admin auf (wie im Kursraum).
      if (!program.published_at && a.source !== 'admin') return []
      if (!isLessonUnlocked(l, a)) return []
      return [
        {
          id: l.id,
          slug: l.slug,
          title: l.title,
          publishedAt: l.published_at,
          programId: program.id,
          programSlug: program.slug,
          programTitle: program.title,
          programKind: program.kind === 'library' ? 'library' : 'course',
        },
      ]
    })
  }

  // ── Termine: nur, wo die Tür für diese Person offen ist ──
  const events = ((eventsRes.data ?? []) as Termin[])
    .filter((e) => hasEventAccess(viewer, e).canJoin)
    .map((e) => ({
      id: e.id,
      title: localized(e.title),
      startsAt: e.starts_at,
      timeLabel: eventTimeLabel(e),
      href: `/termine/${e.id}`,
    }))

  return buildNews({
    posts: (postsRes.data ?? []).flatMap((p) =>
      p.published_at ? [{ id: p.id, slug: p.slug, title: p.title, publishedAt: p.published_at }] : [],
    ),
    lessons,
    events,
    seenAt: stateRes.error ? null : (stateRes.data?.seen_at ?? null),
    now,
  })
}
