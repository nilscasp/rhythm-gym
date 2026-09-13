'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '../../lib/supabase/server'
import { getCourseAccess } from '../../lib/course-access'
import { isDayCompletable } from '../../lib/course-progress'
import { RHYTHMUS_DAYS } from '../../../data/rhythmusfundament-days'

// ─────────────────────────────────────────────────────────────────────────────
// toggleDayAction — einen Kurstag abhaken oder den Haken wieder entfernen.
//
// Einziger Schreibweg auf `day_completions`. Das Formular schickt den
// SOLL-Zustand (`want=1` abhaken, `want=0` entfernen), nicht „flippe, was
// gerade da ist": zwei schnelle Klicks oder zwei offene Tabs heben sich so
// nicht gegenseitig auf (Advisor-Hinweis).
//
// Abhaken prüft dieselbe Regel wie der Server-Redirect der Tagesseite: nur
// Tage bis `maxUnlockedDay`, nur Tage mit Inhalt. Entfernen ist immer erlaubt
// — sonst bliebe ein Haken kleben, wenn ein Coach das Startdatum nach hinten
// schiebt und der Tag wieder gesperrt ist.
// ─────────────────────────────────────────────────────────────────────────────

const SLUG = 'rhythmusfundament'

export type DayToggleState = { status: 'idle' | 'error'; message?: string }

const WRITE_FAILED = 'Speichern fehlgeschlagen — versuch es gleich noch einmal.'

export async function toggleDayAction(
  _prev: DayToggleState,
  formData: FormData,
): Promise<DayToggleState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const rawDay = formData.get('day')
  const day = typeof rawDay === 'string' ? parseInt(rawDay, 10) : Number.NaN
  const want = formData.get('want') === '1'

  if (!Number.isInteger(day) || day < 1) {
    return { status: 'error', message: 'Ungültiger Tag.' }
  }

  const access = await getCourseAccess(supabase, user.id, SLUG)
  if (!access.enrolled || !access.programId) redirect('/training')

  if (want) {
    const availableDays = RHYTHMUS_DAYS.map((d) => d.number)
    if (!isDayCompletable(day, access.maxUnlockedDay, availableDays)) {
      return {
        status: 'error',
        message:
          'Dieser Tag ist noch nicht freigeschaltet — abhaken geht erst, wenn er offen ist.',
      }
    }
    // PK (user_id, program_id, day_number) macht den Insert idempotent:
    // ein zweiter Klick auf „abhaken" ist kein Fehler, sondern ein No-op.
    const { error } = await supabase
      .from('day_completions')
      .upsert(
        { user_id: user.id, program_id: access.programId, day_number: day },
        { onConflict: 'user_id,program_id,day_number', ignoreDuplicates: true },
      )
    if (error) {
      console.error('[toggleDayAction] insert failed', { code: error.code, message: error.message })
      return { status: 'error', message: WRITE_FAILED }
    }
  } else {
    // 0 gelöschte Zeilen ist Erfolg — der Haken war schon weg.
    const { error } = await supabase
      .from('day_completions')
      .delete()
      .eq('user_id', user.id)
      .eq('program_id', access.programId)
      .eq('day_number', day)
    if (error) {
      console.error('[toggleDayAction] delete failed', { code: error.code, message: error.message })
      return { status: 'error', message: WRITE_FAILED }
    }
  }

  // Der Haken steht an vier Stellen: Tagesseite, Tagesleiste jeder anderen
  // Tagesseite, Kurs-Index, Hub. `layout` erwischt den ganzen Kursbaum.
  revalidatePath('/training/rhythmusfundament', 'layout')
  revalidatePath('/training')
  return { status: 'idle' }
}
