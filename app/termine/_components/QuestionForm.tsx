'use client'

import { useActionState, useEffect, useRef } from 'react'
import { submitQuestionAction, type QuestionState } from '../_actions'

// ─────────────────────────────────────────────────────────────────────────────
// Frage vorab — das Formular. Die Texte kommen fertig vom Server (messages/*),
// die Prüfung macht submit_event_question() in der DB.
// ─────────────────────────────────────────────────────────────────────────────

export type QuestionFormTexts = {
  placeholder: string
  submit: string
  sent: string
  invalid: string
  limit: string
  closed: string
  error: string
}

const INITIAL: QuestionState = { status: 'idle' }

export function QuestionForm({
  eventId,
  maxLength,
  texts,
}: {
  eventId: string
  maxLength: number
  texts: QuestionFormTexts
}) {
  const [state, action, pending] = useActionState(submitQuestionAction, INITIAL)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.status === 'sent') formRef.current?.reset()
  }, [state])

  const message =
    state.status === 'sent'
      ? texts.sent
      : state.status === 'error'
        ? { invalid: texts.invalid, limit: texts.limit, closed: texts.closed, other: texts.error }[
            state.code
          ]
        : null

  return (
    <form ref={formRef} action={action} className="tv-q-form">
      <input type="hidden" name="event_id" value={eventId} />
      <textarea
        name="body"
        required
        minLength={3}
        maxLength={maxLength}
        rows={4}
        placeholder={texts.placeholder}
        aria-label={texts.placeholder}
        className="tv-q-input"
      />
      <div className="tv-cta-row">
        <button type="submit" disabled={pending} className="tv-cta tv-cta--primary">
          {texts.submit}
        </button>
      </div>
      {message ? (
        <p
          role="status"
          className={state.status === 'sent' ? 'tv-q-note tv-q-note--ok' : 'tv-q-note'}
        >
          {message}
        </p>
      ) : null}
    </form>
  )
}
