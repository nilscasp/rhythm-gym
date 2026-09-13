'use client'

import { useActionState } from 'react'
import { toggleDayAction, type DayToggleState } from '../_actions'

// ─────────────────────────────────────────────────────────────────────────────
// DayCheck — „Tag abhaken" am Ende der Tagesseite.
//
// Der Zustand kommt vom Server (`done`), nicht aus lokalem State: nach dem
// Toggle revalidiert die Action die Seite, und die neuen Props tragen den
// Haken. So kann die Anzeige nie etwas behaupten, was die DB nicht hat.
// ─────────────────────────────────────────────────────────────────────────────

const INITIAL: DayToggleState = { status: 'idle' }

export function DayCheck({ day, done }: { day: number; done: boolean }) {
  const [state, formAction, pending] = useActionState(toggleDayAction, INITIAL)

  return (
    <form action={formAction} className={done ? 'dc dc--done' : 'dc'}>
      <input type="hidden" name="day" value={day} />
      {/* Soll-Zustand, nicht Flip: abhaken wenn noch offen, sonst entfernen. */}
      <input type="hidden" name="want" value={done ? '0' : '1'} />

      <div className="dc-text">
        <span className="dc-eyebrow">{done ? 'Erledigt' : 'Tag geschafft?'}</span>
        <span className="dc-title">
          {done ? `Tag ${day} ist abgehakt.` : `Tag ${day} abhaken`}
        </span>
        <span className="dc-note">
          {done
            ? 'Dein Fortschritt ist gespeichert — du siehst ihn in der Tagesleiste und in deiner Kursübersicht.'
            : 'Ein Tipp genügt. Der Haken landet in deiner Kursübersicht.'}
        </span>
      </div>

      <button type="submit" className="dc-btn" disabled={pending} aria-busy={pending}>
        {pending ? 'Speichern …' : done ? 'Abgehakt ✓ · rückgängig' : `Tag ${day} abhaken`}
      </button>

      {state.status === 'error' && state.message ? (
        <p className="dc-error" role="alert">
          {state.message}
        </p>
      ) : null}

      <style>{DAY_CHECK_CSS}</style>
    </form>
  )
}

const DAY_CHECK_CSS = `
  .dc {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 14px 20px;
    padding: 20px 22px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 10px;
    font-family: var(--font-body);
  }
  .dc--done {
    border-color: var(--amber);
    background: var(--amber-dim, rgba(245,166,35,0.12));
  }
  .dc-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    flex: 1 1 260px;
  }
  .dc-eyebrow {
    font-family: var(--font-ui);
    font-size: 11px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .dc-title {
    font-family: var(--font-display);
    font-size: 22px;
    line-height: 1.15;
    color: var(--cream);
  }
  .dc-note {
    font-size: 13px;
    line-height: 1.5;
    color: var(--muted);
  }
  .dc-btn {
    flex: 0 0 auto;
    min-height: 48px;
    padding: 12px 22px;
    border-radius: 4px;
    border: 1px solid var(--amber);
    background: var(--amber);
    color: var(--black);
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .dc-btn:hover { background: var(--amber2, var(--amber)); border-color: var(--amber2, var(--amber)); }
  .dc--done .dc-btn {
    background: transparent;
    color: var(--amber);
  }
  .dc--done .dc-btn:hover { background: var(--amber); color: var(--black); }
  .dc-btn:disabled { opacity: 0.6; cursor: wait; }
  .dc-error {
    flex: 1 1 100%;
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: #ff8b8b;
  }

  @media (max-width: 480px) {
    .dc { padding: 16px; }
    .dc-btn { flex: 1 1 100%; width: 100%; }
  }
`
