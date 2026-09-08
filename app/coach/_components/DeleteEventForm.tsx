'use client'

import { deleteEventAction } from '../_actions'

// ─────────────────────────────────────────────────────────────────────────────
// Löschen mit Rückfrage. Ein Termin ist nicht wiederherstellbar, und der Knopf
// sitzt in einer langen Liste — ein Fehlklick beim Scrollen darf nicht reichen.
//
// Die Rückfrage nennt den Titel und sagt, ob es um die ganze Serie geht:
// „wirklich löschen?" allein beantwortet man versehentlich mit Ja.
//
// Ohne JavaScript entfällt die Rückfrage; das ist hinnehmbar, weil der Coach-
// Bereich ohnehin nur Nils gehört. Was NICHT hinnehmbar wäre: dass ein
// verändertes Formular eine fremde Serie trifft — darum liest die Action die
// series_id aus der Zeile und nicht aus dem Formular.
// ─────────────────────────────────────────────────────────────────────────────

export function DeleteEventForm({
  id,
  title,
  hasSeries,
}: {
  id: string
  title: string
  hasSeries: boolean
}) {
  function confirmDelete(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget
    const wholeSeries =
      (form.elements.namedItem('whole_series') as HTMLInputElement | null)?.checked ?? false

    const what = wholeSeries
      ? `alle Termine der Serie „${title}"`
      : `den Termin „${title}"`

    if (!window.confirm(`Willst du ${what} wirklich löschen? Das lässt sich nicht rückgängig machen.`)) {
      e.preventDefault()
    }
  }

  return (
    <form action={deleteEventAction} onSubmit={confirmDelete} className="cch-event-delete">
      <input type="hidden" name="id" value={id} />
      {hasSeries && (
        <label className="cch-event-check cch-event-check--small">
          <input type="checkbox" name="whole_series" value="1" />
          <span>ganze Serie</span>
        </label>
      )}
      <button type="submit" className="cch-code-toggle cch-event-delete-btn">
        Löschen
      </button>
    </form>
  )
}
