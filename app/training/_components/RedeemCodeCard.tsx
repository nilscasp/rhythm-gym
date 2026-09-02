'use client'

import { useActionState } from 'react'
import { redeemCodeAction, type RedeemState } from '../_actions'

// ─────────────────────────────────────────────────────────────────────────────
// Gesperrte Rhythmusfundament-Karte mit Code-Einlösung.
// Erscheint im Trainings-Hub für alle ohne Kurs-Enrollment. Nach erfolgreicher
// Einlösung revalidiert die Server Action /training — die Karte verschwindet
// und die normale Programm-Karte übernimmt.
// Styles kommen aus HUB_CSS in app/training/page.tsx (.hub-locked-* / .hub-redeem-*).
// ─────────────────────────────────────────────────────────────────────────────

const initialState: RedeemState = { status: 'idle' }

export function RedeemCodeCard() {
  const [state, formAction, pending] = useActionState(redeemCodeAction, initialState)

  return (
    <article className="hub-card hub-locked-card">
      <div className="hub-card-top">
        <span className="hub-chip">Anfänger</span>
        <span className="hub-chip hub-chip-muted">🔒 Mit Code freischalten</span>
      </div>
      <h3 className="hub-card-title">Rhythmus-Fundament</h3>
      <p className="hub-card-desc">
        44 Tage · drei Zyklen · vom Puls bis zur eigenen Komposition. Dieser
        Kurs ist Teilnehmer:innen mit Zugangs-Code vorbehalten.
      </p>
      <form action={formAction} className="hub-redeem-form">
        <input
          type="text"
          name="code"
          required
          placeholder="RG-XXXX-XXXX"
          className="hub-redeem-input"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={20}
          aria-label="Zugangs-Code"
        />
        <button type="submit" className="hub-redeem-btn" disabled={pending}>
          {pending ? 'Prüfe …' : 'Freischalten'}
        </button>
      </form>
      {state.status === 'error' && (
        <p className="hub-redeem-error" role="alert">
          {state.message}
        </p>
      )}
      <p className="hub-redeem-hint">
        Du hast keinen Code? Die Standard-Pattern-Library und das Tool stehen
        dir trotzdem offen.
      </p>
    </article>
  )
}
