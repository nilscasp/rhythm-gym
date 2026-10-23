'use client'

import { useActionState } from 'react'
import { linkRecordingAction, type RecordingFormState } from '../_actions'

// ─────────────────────────────────────────────────────────────────────────────
// Aufzeichnung an einen vergangenen Termin hängen: Bibliothek wählen,
// Bunny-Video-ID eintragen. Wer sie sieht, entscheidet die Bibliothek
// (programs.included_in_plan), nicht der Termin — VIP-Call live nur Stufe 2,
// die Aufzeichnung in „VIP-Calls“ ab Stufe 1.
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL: RecordingFormState = { status: 'idle' }

export function RecordingForm({
  eventId,
  defaultTitle,
  libraries,
}: {
  eventId: string
  defaultTitle: string
  libraries: { id: string; title: string; tierLabel: string }[]
}) {
  const [state, action, pending] = useActionState(linkRecordingAction, INITIAL)

  if (libraries.length === 0) {
    return <p className="cch-sub">Noch keine Bibliothek angelegt.</p>
  }

  return (
    <form action={action} className="cch-event-form">
      <input type="hidden" name="event_id" value={eventId} />
      <label className="cch-code-field cch-event-field--wide">
        <span>Bibliothek</span>
        <select name="program_id" required defaultValue={libraries[0]?.id}>
          {libraries.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title} · sichtbar ab {l.tierLabel}
            </option>
          ))}
        </select>
      </label>
      <label className="cch-code-field cch-event-field--wide">
        <span>Titel der Aufzeichnung</span>
        <input name="title" required maxLength={200} defaultValue={defaultTitle} />
      </label>
      <label className="cch-code-field cch-event-field--wide">
        <span>Bunny-Video-ID</span>
        <input
          name="video_guid"
          required
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        />
      </label>
      <button type="submit" className="cch-code-create" disabled={pending}>
        {pending ? 'Speichere …' : 'Aufzeichnung verknüpfen'}
      </button>
      {state.status === 'ok' ? <small className="cch-event-hint">Gespeichert.</small> : null}
      {state.status === 'error' ? (
        <p className="cch-sub" role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  )
}
