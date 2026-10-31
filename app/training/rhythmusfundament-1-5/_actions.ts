'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '../../lib/supabase/server'
import { getCourseAccess } from '../../lib/course-access'
import { isDayCompletable } from '../../lib/course-progress'
import type { DayToggleState } from '../rhythmusfundament/_actions'
import {
  RF15_DAYS,
  RF15_SLUG,
  RF15_START_DATE,
  RF15_TOTAL_DAYS,
} from '../../../data/rhythmusfundament-1-5-days'

// ─────────────────────────────────────────────────────────────────────────────
// toggleRf15DayAction — Tag in RF 1.5 abhaken oder Haken entfernen.
//
// Gleiche Regeln wie toggleDayAction im Rhythmus-Fundament (Soll-Zustand statt
// Flip, Abhaken nur für offene Tage, Entfernen immer), nur gegen das eigene
// Programm und den eigenen Drip-Kalender.
// ─────────────────────────────────────────────────────────────────────────────

const WRITE_FAILED = 'Speichern fehlgeschlagen — versuch es gleich noch einmal.'

export async function toggleRf15DayAction(
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

  const access = await getCourseAccess(supabase, user.id, RF15_SLUG, {
    totalDays: RF15_TOTAL_DAYS,
    defaultDripStartDate: RF15_START_DATE,
  })
  if (!access.enrolled || !access.programId) redirect('/training')

  if (want) {
    const availableDays = RF15_DAYS.map((d) => d.number)
    if (!isDayCompletable(day, access.maxUnlockedDay, availableDays)) {
      return {
        status: 'error',
        message:
          'Dieser Tag ist noch nicht freigeschaltet — abhaken geht erst, wenn er offen ist.',
      }
    }
    const { error } = await supabase
      .from('day_completions')
      .upsert(
        { user_id: user.id, program_id: access.programId, day_number: day },
        { onConflict: 'user_id,program_id,day_number', ignoreDuplicates: true },
      )
    if (error) {
      console.error('[toggleRf15DayAction] insert failed', { code: error.code, message: error.message })
      return { status: 'error', message: WRITE_FAILED }
    }
  } else {
    const { error } = await supabase
      .from('day_completions')
      .delete()
      .eq('user_id', user.id)
      .eq('program_id', access.programId)
      .eq('day_number', day)
    if (error) {
      console.error('[toggleRf15DayAction] delete failed', { code: error.code, message: error.message })
      return { status: 'error', message: WRITE_FAILED }
    }
  }

  revalidatePath('/training/rhythmusfundament-1-5', 'layout')
  revalidatePath('/training')
  return { status: 'idle' }
}
