'use client'

import { useState } from 'react'
import { InstrumentPicker } from './InstrumentPicker'

// ─────────────────────────────────────────────────────────────────────────────
// InstrumentSection — das aktive Instrument in den Einstellungen.
//
// Ruhezustand ist eine Zeile, kein Formular: Name, Skala, ein Knopf. Erst der
// Klick klappt den Wähl-und-Bau-Weg auf (InstrumentPicker, derselbe wie im
// Onboarding) — ohne Seitenwechsel, damit niemand seinen Platz verliert.
//
// Styling kommt aus SETTINGS_CSS (.set-*) und den .inst-* Klassen des Pickers;
// hier nur die paar Zeilen für die Zusammenfassung.
// ─────────────────────────────────────────────────────────────────────────────

export function InstrumentSection({
  current,
}: {
  current: { id: string; name: string; scaleName: string | null } | null
}) {
  const [open, setOpen] = useState(false)

  // Offen ohne eigenen .set-form-Rahmen: der Picker bringt im Bau-Modus seinen
  // eigenen mit, ein zweiter drumherum wäre eine Karte in einer Karte.
  if (open) {
    return <InstrumentPicker returnTo="/settings" onCancel={() => setOpen(false)} />
  }

  return (
    <div className="set-form">
      <style>{SECTION_CSS}</style>

      {current ? (
        <div className="inst-now">
          <span className="set-label">Dein Instrument</span>
          <span className="inst-now-name">{current.name}</span>
          <span className="inst-now-scale">{current.scaleName ?? 'frei gebaut'}</span>
        </div>
      ) : (
        <p className="inst-empty">Du hast noch kein Instrument hinterlegt.</p>
      )}

      <div className="set-actions">
        <button type="button" className="set-save" onClick={() => setOpen(true)}>
          {current ? 'Instrument ändern' : 'Instrument wählen'}
        </button>
      </div>
    </div>
  )
}

const SECTION_CSS = `
  .inst-now {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }
  .inst-now-name {
    font-family: var(--font-display);
    font-size: 22px;
    line-height: 1.1;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: var(--cream);
    overflow-wrap: anywhere;
  }
  .inst-now-scale {
    font-family: var(--font-ui);
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .inst-empty {
    font-size: 15px;
    line-height: 1.6;
    color: var(--muted);
    margin: 0;
  }

  @media (max-width: 480px) {
    .inst-now-name { font-size: 19px; }
  }
`
