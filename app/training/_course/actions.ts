'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '../../lib/supabase/server'
import { getCourseAccess, isLessonUnlocked } from '../../lib/course-access'
import { LESSON_COURSE_DAYS } from './load'

// ─────────────────────────────────────────────────────────────────────────────
// toggleLessonAction — „Lektion geübt“ setzen oder zurücknehmen.
//
// Einziger Schreibweg auf `lesson_completions`. Wie bei den Kurstagen schickt
// das Formular den SOLL-Zustand (`want=1`/`want=0`), kein Umschalten.
// Setzen prüft Kurszugang + Drip über course-access.ts; RLS prüft den
// Kurszugang zusätzlich (has_program_access). Zurücknehmen ist immer erlaubt.
// ─────────────────────────────────────────────────────────────────────────────

export type LessonToggleState = { status: 'idle' | 'error'; message?: string }

const WRITE_FAILED = 'Speichern fehlgeschlagen — versuch es gleich noch einmal.'

export async function toggleLessonAction(
  _prev: LessonToggleState,
  formData: FormData,
): Promise<LessonToggleState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const lessonId = formData.get('lesson')
  const want = formData.get('want') === '1'
  if (typeof lessonId !== 'string' || !/^[0-9a-f-]{36}$/i.test(lessonId)) {
    return { status: 'error', message: 'Ungültige Lektion.' }
  }

  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('id, unlock_day, programs!inner(slug, kind)')
    .eq('id', lessonId)
    .maybeSingle()
  if (lessonError || !lesson) {
    return { status: 'error', message: 'Lektion nicht gefunden.' }
  }
  // Die handgeschriebenen Typen kennen die 1:n-Richtung nicht sicher —
  // Objekt oder Array zulassen, bis generate_typescript_types läuft.
  const embedded = lesson.programs as unknown as
    | { slug: string; kind: string }
    | { slug: string; kind: string }[]
    | null
  const program = Array.isArray(embedded) ? embedded[0] : embedded
  if (!program) return { status: 'error', message: 'Lektion nicht gefunden.' }
  if (program.kind === 'library') {
    return { status: 'error', message: 'Aufzeichnungen werden nicht abgehakt.' }
  }

  if (want) {
    const access = await getCourseAccess(supabase, user.id, program.slug, {
      totalDays: LESSON_COURSE_DAYS,
    })
    if (!isLessonUnlocked(lesson, access)) {
      return {
        status: 'error',
        message: 'Diese Lektion ist noch nicht offen — abhaken geht erst, wenn sie frei ist.',
      }
    }
    const { error } = await supabase
      .from('lesson_completions')
      .upsert(
        { user_id: user.id, lesson_id: lesson.id },
        { onConflict: 'user_id,lesson_id', ignoreDuplicates: true },
      )
    if (error) {
      console.error('[toggleLessonAction] insert failed', { code: error.code, message: error.message })
      return { status: 'error', message: WRITE_FAILED }
    }
  } else {
    const { error } = await supabase
      .from('lesson_completions')
      .delete()
      .eq('user_id', user.id)
      .eq('lesson_id', lesson.id)
    if (error) {
      console.error('[toggleLessonAction] delete failed', { code: error.code, message: error.message })
      return { status: 'error', message: WRITE_FAILED }
    }
  }

  revalidatePath(`/training/${program.slug}`, 'layout')
  revalidatePath('/training')
  return { status: 'idle' }
}
