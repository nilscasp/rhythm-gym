'use client'

import { useState } from 'react'
import { EVENT_KINDS, EVENT_VISIBILITIES, KIND_LABELS } from '../../lib/event-access'
import { MAX_REPEAT_WEEKS } from '../../lib/event-time'
import { createEventAction, updateEventAction } from '../_actions'
import { PendingSubmitButton } from './PendingSubmitButton'

// ─────────────────────────────────────────────────────────────────────────────
// Ein Formular für beides: neuen Termin anlegen und bestehenden bearbeiten.
// Der Unterschied ist klein genug, dass zwei Formulare nur auseinanderlaufen
// würden — `event` entscheidet über Action, verstecktes `id` und ob es das
// Wiederholungs-Feld gibt (eine Serie legt man an, man bearbeitet sie nicht).
//
// Client-Component wegen einer einzigen Sache: bei Sichtbarkeit „nur wer im
// Kurs ist" muss der Kurs Pflicht werden. Das ist Bequemlichkeit, keine
// Sicherung — dieselbe Regel steht noch einmal in readEventFields().
// ─────────────────────────────────────────────────────────────────────────────

/** Die Sichtbarkeiten in Nils' Worten. Reihenfolge = offen → geschlossen. */
const VISIBILITY_LABELS: Record<(typeof EVENT_VISIBILITIES)[number], string> = {
  public: 'Offen',
  members: 'Mit Konto',
  premium: 'Innerer Kreis',
  program: 'Im Kurs',
}

const VISIBILITY_HINTS: Record<(typeof EVENT_VISIBILITIES)[number], string> = {
  public: 'für alle sichtbar, Tür offen',
  members: 'nur mit Konto',
  premium: 'nur Innerer Kreis',
  program: 'nur wer im Kurs ist',
}

export type EventFormValues = {
  id: string
  titleDe: string
  descriptionDe: string
  startsAtLocal: string
  durationMinutes: number | null
  kind: string
  visibility: string
  location: string
  zoomUrl: string
  programId: string | null
  websiteLink: string
  /** Termine ohne Uhrzeit (Migration 0006). Fehlt = mit Uhrzeit. */
  allDay?: boolean
}

export function EventForm({
  programs,
  event,
}: {
  programs: { id: string; title: string }[]
  event?: EventFormValues
}) {
  const isEdit = Boolean(event)
  const [visibility, setVisibility] = useState(event?.visibility ?? 'members')
  const programRequired = visibility === 'program'

  return (
    <form
      action={isEdit ? updateEventAction : createEventAction}
      className="cch-event-form"
    >
      {isEdit && <input type="hidden" name="id" value={event!.id} />}

      <label className="cch-code-field cch-event-field--wide">
        <span>Titel</span>
        <input
          type="text"
          name="title_de"
          defaultValue={event?.titleDe ?? ''}
          maxLength={160}
          required
          placeholder="z. B. Offener Klangabend"
        />
      </label>

      <label className="cch-code-field cch-event-field--wide">
        <span>Beschreibung (optional)</span>
        <textarea
          name="description_de"
          defaultValue={event?.descriptionDe ?? ''}
          rows={3}
          maxLength={2000}
          placeholder="Worum geht es? Was brauchst du mit?"
        />
      </label>

      <label className="cch-code-field">
        <span>Beginn (Berliner Zeit)</span>
        <input
          type="datetime-local"
          name="starts_at_local"
          defaultValue={event?.startsAtLocal ?? ''}
          required
        />
      </label>

      <label className="cch-code-field">
        <span>Dauer in Minuten (optional)</span>
        <input
          type="number"
          name="duration_minutes"
          min={1}
          max={1440}
          step={5}
          defaultValue={event?.durationMinutes ?? ''}
          placeholder="90"
        />
      </label>

      <label className="cch-code-field">
        <span>Art</span>
        <select name="kind" defaultValue={event?.kind ?? 'live_training'} required>
          {EVENT_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {KIND_LABELS[kind]}
            </option>
          ))}
        </select>
      </label>

      <label className="cch-code-field">
        <span>Sichtbarkeit</span>
        <select
          name="visibility"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
          required
        >
          {EVENT_VISIBILITIES.map((value) => (
            <option key={value} value={value}>
              {VISIBILITY_LABELS[value]} — {VISIBILITY_HINTS[value]}
            </option>
          ))}
        </select>
        <small className="cch-event-hint">{VISIBILITY_HINTS[visibility as keyof typeof VISIBILITY_HINTS]}</small>
      </label>

      <label className="cch-code-field">
        <span>Kurs {programRequired ? '(nötig)' : '(optional)'}</span>
        <select
          name="program_id"
          defaultValue={event?.programId ?? ''}
          required={programRequired}
        >
          <option value="">— keiner —</option>
          {programs.map((program) => (
            <option key={program.id} value={program.id}>
              {program.title}
            </option>
          ))}
        </select>
        {programRequired && (
          <small className="cch-event-hint">
            Ohne Kurs käme hier niemand hinein.
          </small>
        )}
      </label>

      <label className="cch-code-field">
        <span>Ort (optional)</span>
        <input
          type="text"
          name="location"
          defaultValue={event?.location ?? ''}
          maxLength={160}
          placeholder="Online · oder wo ihr euch trefft"
        />
      </label>

      <label className="cch-code-field">
        <span>Zoom-Tür (optional)</span>
        <input
          type="url"
          name="zoom_url"
          defaultValue={event?.zoomUrl ?? ''}
          maxLength={500}
          placeholder="https://…"
        />
        {isEdit && (
          <small className="cch-event-hint">
            Steht hier leer, weil die Tür nicht ausgelesen werden kann. Leer
            lassen heißt: bleibt, wie sie ist.
          </small>
        )}
      </label>

      {isEdit && (
        <label className="cch-event-check">
          <input type="checkbox" name="remove_zoom_url" value="1" />
          <span>Zoom-Tür entfernen</span>
        </label>
      )}

      <label className="cch-code-field cch-event-field--wide">
        <span>Link auf handpan.schule (optional)</span>
        <input
          type="url"
          name="website_link"
          defaultValue={event?.websiteLink ?? ''}
          maxLength={500}
          placeholder="Leer = die Seite des Termins"
        />
      </label>

      <label className="cch-event-check">
        <input type="checkbox" name="all_day" value="1" defaultChecked={event?.allDay ?? false} />
        <span>Ganztägig — ohne Uhrzeit anzeigen</span>
      </label>

      {!isEdit && (
        <label className="cch-code-field">
          <span>Wöchentlich wiederholen</span>
          <input
            type="number"
            name="repeat_weeks"
            min={1}
            max={MAX_REPEAT_WEEKS}
            defaultValue={1}
          />
          <small className="cch-event-hint">
            1 = ein einzelner Termin. Höher legst du so viele Wochen am Stück an,
            jeweils zur selben Uhrzeit — auch über die Zeitumstellung hinweg.
          </small>
        </label>
      )}

      <div className="cch-event-submit">
        <PendingSubmitButton
          className="cch-code-create"
          pendingLabel={isEdit ? 'Speichere …' : 'Lege an …'}
        >
          {isEdit ? 'Änderungen sichern' : 'Termin anlegen'}
        </PendingSubmitButton>
      </div>
    </form>
  )
}
