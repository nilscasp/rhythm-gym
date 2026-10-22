'use client'

import { useActionState } from 'react'
import { toggleLessonAction, type LessonToggleState } from './actions'

// „Lektion geübt“ — Zustand kommt vom Server (`done`), nicht aus lokalem State
// (wie DayCheck im Rhythmus Fundament).

const INITIAL: LessonToggleState = { status: 'idle' }

export function LessonCheck({ lessonId, done }: { lessonId: string; done: boolean }) {
  const [state, formAction, pending] = useActionState(toggleLessonAction, INITIAL)

  return (
    <form action={formAction} className={done ? 'lc lc--done' : 'lc'}>
      <input type="hidden" name="lesson" value={lessonId} />
      <input type="hidden" name="want" value={done ? '0' : '1'} />

      <div className="lc-text">
        <span className="lc-kicker">{done ? 'Geübt' : 'Fertig für heute?'}</span>
        <span className="lc-note">
          {done
            ? 'Der Haken steht in deinem Kursverlauf.'
            : 'Ein Tipp genügt — der Haken landet in deinem Kursverlauf.'}
        </span>
      </div>

      <button type="submit" className="lc-btn" disabled={pending} aria-busy={pending}>
        {pending ? 'Speichern …' : done ? '✓ Geübt · zurücknehmen' : 'Lektion geübt'}
      </button>

      {state.status === 'error' && state.message ? (
        <p className="lc-error" role="alert">
          {state.message}
        </p>
      ) : null}

      <style>{LESSON_CHECK_CSS}</style>
    </form>
  )
}

const LESSON_CHECK_CSS = `
  .lc {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 14px 20px;
    padding: 18px 20px;
    border: 1px solid var(--border2);
    border-radius: 2px;
    background: transparent;
  }
  .lc--done { border-color: var(--amber); }
  .lc-text { display: flex; flex-direction: column; gap: 4px; flex: 1 1 220px; min-width: 0; }
  .lc-kicker {
    font-family: var(--font-ui);
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .lc-note { font-family: var(--font-body); font-size: 15px; line-height: 1.5; color: var(--muted2); }
  .lc-btn {
    flex: 0 0 auto;
    min-height: 48px;
    padding: 12px 22px;
    border-radius: 2px;
    border: 1px solid var(--amber);
    background: var(--amber);
    color: var(--black);
    font-family: var(--font-ui);
    font-size: 14px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    cursor: pointer;
  }
  .lc--done .lc-btn { background: transparent; color: var(--amber); }
  .lc-btn:disabled { opacity: 0.6; cursor: wait; }
  .lc-btn:focus-visible { outline: 2px solid var(--amber); outline-offset: 3px; }
  .lc-error { flex: 1 1 100%; margin: 0; font-size: 14px; color: #ff8b8b; }
  @media (max-width: 520px) {
    .lc-btn { flex: 1 1 100%; width: 100%; }
  }
`
