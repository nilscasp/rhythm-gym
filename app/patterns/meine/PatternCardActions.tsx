'use client'

import { useState, useTransition } from 'react'
import { renamePatternAction, deletePatternAction } from './_actions'

export function PatternCardActions({
  patternId,
  currentName,
}: {
  patternId: string
  currentName: string
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleRename() {
    if (pending) return
    const next = window.prompt('Neuen Namen wählen:', currentName)
    if (next === null) return
    const trimmed = next.trim()
    if (trimmed === '' || trimmed === currentName) return

    const fd = new FormData()
    fd.set('pattern_id', patternId)
    fd.set('name', trimmed)

    startTransition(async () => {
      try {
        setError(null)
        await renamePatternAction(fd)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Umbenennen fehlgeschlagen')
      }
    })
  }

  function handleDelete() {
    if (pending) return
    const ok = window.confirm(
      `„${currentName}" wirklich löschen? Das lässt sich nicht rückgängig machen.`,
    )
    if (!ok) return

    const fd = new FormData()
    fd.set('pattern_id', patternId)

    startTransition(async () => {
      try {
        setError(null)
        await deletePatternAction(fd)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen')
      }
    })
  }

  return (
    <div className="meine-card-actions" aria-label="Pattern-Aktionen">
      <button
        type="button"
        onClick={handleRename}
        disabled={pending}
        className="meine-action meine-action--rename"
        aria-label={`Pattern „${currentName}" umbenennen`}
        title="Umbenennen"
      >
        Umbenennen
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="meine-action meine-action--delete"
        aria-label={`Pattern „${currentName}" löschen`}
        title="Löschen"
      >
        Löschen
      </button>
      {error && <span className="meine-action-error">{error}</span>}
    </div>
  )
}
