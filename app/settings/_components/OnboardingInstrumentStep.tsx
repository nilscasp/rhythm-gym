'use client'

import { useActionState, useState } from 'react'
import { HANDPAN_TEMPLATES, type HandpanNote } from '../../../data/handpan-templates'
import { saveHandpanAction, type SaveHandpanState } from '../_actions'
import { HandpanBuilder } from './HandpanBuilder'

// ─────────────────────────────────────────────────────────────────────────────
// OnboardingInstrumentStep — zweiter Onboarding-Schritt: Instrument wählen.
//
// 'pick'  → Template-Grid (8 Skalen) + „Eigene Handpan bauen"-Karte
// 'build' → freier Builder, vorbefüllt (Template) oder mit einem Ding (Custom),
//           danach Speichern via saveHandpanAction (legt handpans-Row an + setzt
//           profiles.active_handpan_id und redirected nach /training).
//
// Reuse: .set-* Klassen aus SETTINGS_CSS (in settings/page.tsx injiziert).
// ─────────────────────────────────────────────────────────────────────────────

const initialState: SaveHandpanState = { status: 'idle' }

function clone(notes: HandpanNote[]): HandpanNote[] {
  return notes.map((n) => ({ ...n }))
}

export function OnboardingInstrumentStep() {
  const [state, formAction, pending] = useActionState(saveHandpanAction, initialState)
  const [mode, setMode] = useState<'pick' | 'build'>('pick')
  const [name, setName] = useState('')
  const [scaleName, setScaleName] = useState<string | null>(null)
  const [notes, setNotes] = useState<HandpanNote[]>([])

  function pickTemplate(scaleKey: string) {
    const t = HANDPAN_TEMPLATES.find((x) => x.scaleKey === scaleKey)
    if (!t) return
    setName(t.name)
    setScaleName(t.scaleKey)
    setNotes(clone(t.notes))
    setMode('build')
  }

  function startCustom() {
    setName('Meine Handpan')
    setScaleName(null)
    setNotes([{ id: crypto.randomUUID(), label: 'D3', x: 500, y: 500, r: 76 }])
    setMode('build')
  }

  if (mode === 'pick') {
    return (
      <div className="inst-pick">
        <style>{PICK_CSS}</style>
        <div className="inst-grid">
          {HANDPAN_TEMPLATES.map((t) => (
            <button
              key={t.scaleKey}
              type="button"
              className="inst-card"
              onClick={() => pickTemplate(t.scaleKey)}
            >
              <span className="inst-card-name">{t.name}</span>
              <span className="inst-card-meta">{t.notes.length} Töne</span>
              <span className="inst-card-notes">
                {t.notes.map((n) => n.label).join(' · ')}
              </span>
            </button>
          ))}
        </div>

        <button type="button" className="inst-custom" onClick={startCustom}>
          <span className="inst-custom-title">＋ Eigene Handpan bauen</span>
          <span className="inst-custom-sub">
            Deine Skala ist nicht dabei? Bau dein Instrument Ton für Ton selbst.
          </span>
        </button>
      </div>
    )
  }

  return (
    <form action={formAction} className="set-form">
      <style>{PICK_CSS}</style>
      <div className="set-field">
        <label htmlFor="hp-name" className="set-label">
          Name deines Instruments
        </label>
        <input
          id="hp-name"
          name="name"
          type="text"
          className="set-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z. B. Meine D-Kurd"
          required
          maxLength={60}
        />
        <p className="set-hint">
          {scaleName
            ? 'Auf Basis eines Templates — pass die Töne unten an, wenn deins abweicht.'
            : 'Frei gebaut — leg Ding und Tonfelder unten an.'}
        </p>
      </div>

      <input type="hidden" name="scale_name" value={scaleName ?? ''} />
      <input type="hidden" name="notes" value={JSON.stringify(notes)} />

      <HandpanBuilder notes={notes} onNotesChange={setNotes} />

      {state.status === 'error' && (
        <p className="set-flash set-flash--err" role="alert">
          {state.message}
        </p>
      )}

      <div className="set-actions">
        <button type="submit" className="set-save" disabled={pending}>
          {pending ? 'Speichere …' : 'Instrument speichern →'}
        </button>
        <button
          type="button"
          className="set-cancel"
          onClick={() => setMode('pick')}
        >
          Zurück zur Auswahl
        </button>
      </div>
    </form>
  )
}

const PICK_CSS = `
  .inst-pick { display: flex; flex-direction: column; gap: 20px; }
  .inst-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  .inst-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    text-align: left;
    padding: 16px 16px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--card);
    color: var(--cream);
    cursor: pointer;
    transition: border-color 0.15s ease, background-color 0.15s ease;
  }
  .inst-card:hover { border-color: var(--amber); background: rgba(245, 166, 35, 0.05); }
  .inst-card-name {
    font-family: var(--font-display);
    font-size: 18px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    line-height: 1.1;
  }
  .inst-card-meta {
    font-family: var(--font-ui);
    font-size: 11px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .inst-card-notes {
    font-size: 11px;
    color: var(--muted);
    line-height: 1.4;
    margin-top: 2px;
  }
  .inst-custom {
    display: flex;
    flex-direction: column;
    gap: 4px;
    text-align: left;
    padding: 16px 18px;
    border: 1px dashed var(--border);
    border-radius: 8px;
    background: transparent;
    color: var(--cream);
    cursor: pointer;
    transition: border-color 0.15s ease;
  }
  .inst-custom:hover { border-color: var(--amber); }
  .inst-custom-title {
    font-family: var(--font-ui);
    font-weight: 700;
    font-size: 15px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .inst-custom-sub { font-size: 13px; color: var(--muted); line-height: 1.5; }

  @media (max-width: 480px) {
    .inst-grid { grid-template-columns: 1fr; }
  }
`
