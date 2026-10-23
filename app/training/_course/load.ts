import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../lib/supabase/database.types'
import {
  getCourseAccess,
  isLessonUnlocked,
  lessonUnlockLabel,
  type CourseAccess,
} from '../../lib/course-access'
import { getCompletedLessons, nextOpenLesson } from '../../lib/course-progress'
import { TIER_NAMES } from '../../lib/tiers'

// ─────────────────────────────────────────────────────────────────────────────
// Kursraum aus der DB laden (Migration 0010) — für /training/[slug] und
// /training/[slug]/[lektion] (und die Lektionen von „Von Anfang an spielen“).
//
// Liest nur die öffentliche Gliederung (programs, program_sections, lessons)
// plus Zugriff, Haken und Kursgruppe. Den Inhalt (lesson_contents,
// lesson_attachments) holt erst die Lektionsseite — und nur, wenn die Lektion
// offen ist. RLS hält den Inhalt ohnehin zurück; die Prüfung hier entscheidet
// nur, was die Oberfläche zeigt.
// ─────────────────────────────────────────────────────────────────────────────

type Client = SupabaseClient<Database>

/** Drip-Obergrenze für Lektions-Kurse (lessons.unlock_day 1–366). */
export const LESSON_COURSE_DAYS = 366

export type RoomProgram = {
  id: string
  slug: string
  title: string
  description: string | null
  kind: 'course' | 'library'
  published_at: string | null
}

export type RoomLesson = {
  id: string
  slug: string
  title: string
  subtitle: string | null
  duration_seconds: number | null
  media_kind: string
  unlock_day: number | null
  sort_order: number
  section_id: string | null
  published_at: string | null
  created_at: string
  /** Ergebnis von isLessonUnlocked() — Kurszugang + Drip. */
  unlocked: boolean
  /** „Frei ab TT.MM.JJJJ“, wenn per Drip gesperrt. */
  unlockLabel: string | null
}

export type RoomSection = {
  id: string | null
  title: string | null
  lessons: RoomLesson[]
}

export type CourseRoom = {
  program: RoomProgram
  access: CourseAccess
  isLibrary: boolean
  sections: RoomSection[]
  /** Alle Lektionen in Anzeige-Reihenfolge (Kurs: Abschnitt → Lektion). */
  lessons: RoomLesson[]
  completed: Set<string>
  /** Nächste offene, nicht abgehakte Lektion (nur Kurse). */
  next: RoomLesson | null
  whatsappUrl: string | null
}

const LESSON_COLUMNS =
  'id, slug, title, subtitle, duration_seconds, media_kind, unlock_day, sort_order, section_id, published_at, created_at'

/**
 * null = kein (sichtbares) Programm unter diesem Slug → notFound().
 * `requirePublished`: unveröffentlichte Programme sieht nur Admin.
 */
export async function loadCourseRoom(
  supabase: Client,
  userId: string,
  slug: string,
  options: { requirePublished?: boolean } = {},
): Promise<CourseRoom | null> {
  const requirePublished = options.requirePublished ?? true

  const { data: programRow, error: programError } = await supabase
    .from('programs')
    .select('id, slug, title, description, kind, published_at')
    .eq('slug', slug)
    .maybeSingle()

  if (programError) {
    console.error('[course-room] programs read failed', {
      slug,
      code: programError.code,
      message: programError.message,
    })
    return null
  }
  if (!programRow) return null

  const access = await getCourseAccess(supabase, userId, slug, {
    totalDays: LESSON_COURSE_DAYS,
  })
  if (requirePublished && !programRow.published_at && access.source !== 'admin') return null

  const program: RoomProgram = {
    ...programRow,
    kind: programRow.kind === 'library' ? 'library' : 'course',
  }
  const isLibrary = program.kind === 'library'

  const [sectionsRes, lessonsRes] = await Promise.all([
    supabase
      .from('program_sections')
      .select('id, title, sort_order')
      .eq('program_id', program.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('lessons')
      .select(LESSON_COLUMNS)
      .eq('program_id', program.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  if (sectionsRes.error || lessonsRes.error) {
    console.error('[course-room] outline read failed', {
      slug,
      sections: sectionsRes.error?.message,
      lessons: lessonsRes.error?.message,
    })
  }

  const rawLessons = lessonsRes.data ?? []
  const allLessons: RoomLesson[] = rawLessons.map((l) => ({
    ...l,
    unlocked: isLessonUnlocked(l, access),
    unlockLabel: lessonUnlockLabel(l, access),
  }))

  let sections: RoomSection[]
  let ordered: RoomLesson[]

  if (isLibrary) {
    // Bibliothek: neueste zuerst. Der Seed vergibt aufsteigende sort_order
    // in Aufnahme-Reihenfolge, also absteigend sortieren.
    ordered = [...allLessons].sort(
      (a, b) => b.sort_order - a.sort_order || b.created_at.localeCompare(a.created_at),
    )
    sections = [{ id: null, title: null, lessons: ordered }]
  } else {
    const sectionRows = sectionsRes.data ?? []
    const known = new Set(sectionRows.map((s) => s.id))
    sections = sectionRows.map((s) => ({
      id: s.id,
      title: s.title,
      lessons: allLessons.filter((l) => l.section_id === s.id),
    }))
    const loose = allLessons.filter((l) => !l.section_id || !known.has(l.section_id))
    if (loose.length > 0) {
      sections.push({ id: null, title: sectionRows.length > 0 ? 'Weitere Lektionen' : null, lessons: loose })
    }
    sections = sections.filter((s) => s.lessons.length > 0)
    ordered = sections.flatMap((s) => s.lessons)
  }

  const [completed, whatsappUrl] = await Promise.all([
    access.hasAccess && !isLibrary
      ? getCompletedLessons(supabase, userId, program.id)
      : Promise.resolve(new Set<string>()),
    access.hasAccess ? fetchWhatsappUrl(supabase, program.id) : Promise.resolve(null),
  ])

  return {
    program,
    access,
    isLibrary,
    sections,
    lessons: ordered,
    completed,
    next: isLibrary ? null : nextOpenLesson(ordered, completed, (l) => l.unlocked),
    whatsappUrl,
  }
}

async function fetchWhatsappUrl(supabase: Client, programId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('program_whatsapp_url', { p_program_id: programId })
  if (error) {
    console.error('[course-room] program_whatsapp_url failed', {
      code: error.code,
      message: error.message,
    })
    return null
  }
  return typeof data === 'string' && /^https:\/\//.test(data.trim()) ? data.trim() : null
}

/** Sekunden → „12 Min.“ bzw. „1 Std. 5 Min.“; null bei fehlender Dauer. */
export function durationLabel(seconds: number | null): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 60) return `${minutes} Min.`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} Std.` : `${h} Std. ${m} Min.`
}

/** Hinweis für Menschen ohne Zugriff. */
export function lockedHint(access: CourseAccess): string {
  if (access.includedInPlan) {
    return `In der Mitgliedschaft ab ${TIER_NAMES[access.includedInPlan]} enthalten.`
  }
  return 'Dieser Kurs ist buchbar.'
}
