'use client'

import { useState } from 'react'
import { LIMITS } from '../lib/miteinander'

// Textfeld fürs „Hallo“ mit Zeichenzähler. Die Grenze prüfen
// validateConnectionMessage und die Datenbank noch einmal.
export function MessageField({ id, name, label }: { id: string; name: string; label: string }) {
  const [value, setValue] = useState('')
  const used = Array.from(value).length
  return (
    <div className="mt-field">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        name={name}
        className="mt-input mt-textarea"
        rows={4}
        maxLength={LIMITS.message}
        required
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-describedby={`${id}-hint`}
      />
      <p id={`${id}-hint`} className="mt-hint mt-counter">
        <span>Das ist kein Chat, nur ein Hallo.</span>
        <span aria-live="polite">
          {used} / {LIMITS.message}
        </span>
      </p>
    </div>
  )
}
