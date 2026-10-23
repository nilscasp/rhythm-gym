'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../lib/supabase/server'
import { normalizeQuestion } from '../lib/event-access'

// ─────────────────────────────────────────────────────────────────────────────
// Frage vorab — Schreibwege (Migration 0014).
//
// Beide Aktionen rufen ausschließlich die SECURITY-DEFINER-Funktionen
// submit_event_question() / withdraw_event_question(). Die prüfen Anmeldung,
// Zugang (has_event_access), Beginn und Höchstzahl selbst; hier wird nur der
// Text vorab getrimmt und der Fehler in einen ruhigen Satz übersetzt.
// ─────────────────────────────────────────────────────────────────────────────

export type QuestionState =
  | { status: 'idle' }
  | { status: 'sent' }
  | { status: 'error'; code: 'invalid' | 'limit' | 'closed' | 'other' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function submitQuestionAction(
  _prev: QuestionState,
  formData: FormData,
): Promise<QuestionState> {
  const eventId = formData.get('event_id')
  const body = normalizeQuestion(formData.get('body'))
  if (typeof eventId !== 'string' || !UUID.test(eventId)) {
    return { status: 'error', code: 'other' }
  }
  if (!body) return { status: 'error', code: 'invalid' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('submit_event_question', {
    p_event_id: eventId,
    p_body: body,
  })

  if (error) {
    const message = error.message ?? ''
    if (message.includes('too_many_questions')) return { status: 'error', code: 'limit' }
    if (message.includes('event_started')) return { status: 'error', code: 'closed' }
    if (message.includes('invalid_body')) return { status: 'error', code: 'invalid' }
    console.error('[termine] submit_event_question failed', { eventId, code: error.code, message })
    return { status: 'error', code: 'other' }
  }

  revalidatePath(`/termine/${eventId}`)
  return { status: 'sent' }
}

export async function withdrawQuestionAction(formData: FormData): Promise<void> {
  const questionId = formData.get('question_id')
  const eventId = formData.get('event_id')
  if (typeof questionId !== 'string' || !UUID.test(questionId)) return

  const supabase = await createClient()
  const { error } = await supabase.rpc('withdraw_event_question', { p_question_id: questionId })
  if (error) {
    console.error('[termine] withdraw_event_question failed', {
      questionId,
      code: error.code,
      message: error.message,
    })
  }
  if (typeof eventId === 'string' && UUID.test(eventId)) revalidatePath(`/termine/${eventId}`)
}
