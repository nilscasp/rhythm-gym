import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../lib/supabase/database.types'
import { getProgramAccessMap, type CourseAccess } from '../../lib/course-access'
import {
  getCompletedDaysByProgram,
  getCompletedLessonCountsByProgram,
} from '../../lib/course-progress'
import { COURSE_TOTAL_DAYS } from '../../../data/rhythmusfundament-days'
import { LESSON_COURSE_DAYS, lockedHint } from './load'

// ─────────────────────────────────────────────────────────────────────────────
// Alle Kurse und Bibliotheken der Schule als Karten — für /training/kurse und
// „Mein Weg“. Zugang über getProgramAccessMap (course-access.ts, dieselbe
// Regel wie im Kursraum), Fortschritt über course-progress.ts.
// Sichtbar: veröffentlichte Programme; Admin sieht auch Entwürfe. Das
// Rhythmus Fundament ist immer dabei (Dateikurs, Tage statt Lektionen).
// ─────────────────────────────────────────────────────────────────────────────

type Client = SupabaseClient<Database>

const RHYTHMUSFUNDAMENT_SLUG = 'rhythmusfundament'

export type CatalogCard = {
  programId: string
  slug: string
  title: string
  description: string | null
  kind: 'course' | 'library'
  draft: boolean
  href: string
  hasAccess: boolean
  /** Fortschritt nur für Kurse mit Zugang; total 0 = unbekannt */
  done: number
  total: number
  /** Für Karten ohne Zugang */
  lockedHint: string | null
  /** true = nur über Buchung (nicht im Abo) → „Kurs buchen“ */
  bookable: boolean
}

export async function loadCourseCatalog(supabase: Client, userId: string): Promise<CatalogCard[]> {
  const { data: programs, error } = await supabase
    .from('programs')
    .select('id, slug, title, description, kind, included_in_plan, sort_order, published_at')
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true })

  if (error) {
    console.error('[kurse] programs read failed', { code: error.code, message: error.message })
    return []
  }
  const rows = programs ?? []

  const [{ access, isAdmin }, lessonsRes, lessonDone, daysDone] = await Promise.all([
    getProgramAccessMap(supabase, userId, rows, (p) =>
      p.slug === RHYTHMUSFUNDAMENT_SLUG ? COURSE_TOTAL_DAYS : LESSON_COURSE_DAYS,
    ),
    supabase.from('lessons').select('program_id, published_at'),
    getCompletedLessonCountsByProgram(supabase, userId),
    getCompletedDaysByProgram(supabase, userId),
  ])
  if (lessonsRes.error) {
    console.error('[kurse] lessons read failed', {
      code: lessonsRes.error.code,
      message: lessonsRes.error.message,
    })
  }

  // Zahl der Lektionen je Kurs (veröffentlicht; Admin zählt Entwürfe mit).
  const lessonTotals = new Map<string, number>()
  for (const l of lessonsRes.data ?? []) {
    if (!l.published_at && !isAdmin) continue
    lessonTotals.set(l.program_id, (lessonTotals.get(l.program_id) ?? 0) + 1)
  }

  const cards: CatalogCard[] = []
  for (const p of rows) {
    const isFundament = p.slug === RHYTHMUSFUNDAMENT_SLUG
    const draft = !p.published_at
    if (draft && !isAdmin && !isFundament) continue
    const a: CourseAccess | undefined = access.get(p.id)
    const hasAccess = a?.hasAccess === true
    const kind = p.kind === 'library' ? 'library' : 'course'
    const total = isFundament ? COURSE_TOTAL_DAYS : (lessonTotals.get(p.id) ?? 0)
    const done = !hasAccess
      ? 0
      : isFundament
        ? (daysDone.get(p.id)?.size ?? 0)
        : (lessonDone.get(p.id) ?? 0)
    cards.push({
      programId: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      kind,
      draft: draft && !isFundament,
      href: `/training/${p.slug}`,
      hasAccess,
      done: Math.min(done, total),
      total: kind === 'library' ? 0 : total,
      lockedHint: hasAccess || !a ? null : lockedHint(a),
      bookable: !hasAccess && (a?.includedInPlan ?? null) === null,
    })
  }

  // Rhythmus Fundament zuerst, sonst sort_order.
  return cards.sort(
    (x, y) => Number(y.slug === RHYTHMUSFUNDAMENT_SLUG) - Number(x.slug === RHYTHMUSFUNDAMENT_SLUG),
  )
}
