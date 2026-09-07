'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { CONSENT_TEXT } from '../../lib/consent'
import { updateBriefeConsentAction, type ConsentState } from '../_actions'

// ─────────────────────────────────────────────────────────────────────────────
// BriefeSection — Einwilligung für die „Briefe aus der Schule" umschalten.
//
// Der Wortlaut kommt aus app/lib/consent.ts, damit der gelesene Text und die
// protokollierte Textversion garantiert derselbe sind. Der Haken ist nicht
// vorangekreuzt gemeint, sondern spiegelt den gespeicherten Zustand: wer schon
// zugestimmt hat, sieht das hier und kann es mit einem Klick zurücknehmen.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Das Wort, das im Einwilligungstext zur Datenschutzerklärung verlinkt wird.
 * Dieselbe Auftrennung wie im Login-Formular — bewusst dupliziert und nicht
 * geteilt, solange es genau diese zwei Orte sind: ein gemeinsamer Helfer würde
 * hier weniger Zeilen sparen als er an Kopplung kostet.
 */
const CONSENT_LINK_WORD = 'Datenschutzerklärung'

function ConsentLabelText() {
  const at = CONSENT_TEXT.indexOf(CONSENT_LINK_WORD)
  if (at === -1) return <>{CONSENT_TEXT}</>
  return (
    <>
      {CONSENT_TEXT.slice(0, at)}
      <Link
        href="/datenschutz"
        target="_blank"
        rel="noopener noreferrer"
        // Ohne stopPropagation würde der Klick auf den Link zusätzlich das
        // Label auslösen und damit die Checkbox umschalten.
        onClick={(e) => e.stopPropagation()}
        className="set-inline-link"
      >
        {CONSENT_LINK_WORD}
      </Link>
      {CONSENT_TEXT.slice(at + CONSENT_LINK_WORD.length)}
    </>
  )
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const initialState: ConsentState = { status: 'idle' }

export function BriefeSection({
  consentAt,
  brevoSynced,
}: {
  consentAt: string | null
  brevoSynced: boolean
}) {
  const [state, formAction, pending] = useActionState(
    updateBriefeConsentAction,
    initialState,
  )

  return (
    <form action={formAction} className="set-form">
      <style>{BRIEFE_CSS}</style>

      <div className="set-field">
        <label className="briefe-consent" htmlFor="briefe-consent">
          <input
            id="briefe-consent"
            name="consent"
            type="checkbox"
            className="briefe-box"
            defaultChecked={!!consentAt}
          />
          <span className="briefe-text">
            <ConsentLabelText />
          </span>
        </label>

        <p className="briefe-status">
          {consentAt ? (
            <>
              Du bekommst die Briefe seit dem {formatDate(consentAt)}.
              {!brevoSynced && ' Die Übertragung an den Versand steht noch aus.'}
            </>
          ) : (
            'Du bekommst gerade keine Briefe.'
          )}
        </p>
      </div>

      {state.message && (
        <p
          className={`set-flash set-flash--${state.status === 'error' ? 'err' : 'ok'}`}
          role="status"
        >
          {state.message}
        </p>
      )}

      <div className="set-actions">
        <button type="submit" className="set-save" disabled={pending}>
          {pending ? 'Speichere …' : 'Speichern'}
        </button>
      </div>
    </form>
  )
}

const BRIEFE_CSS = `
  .briefe-consent {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    cursor: pointer;
    min-width: 0;
  }
  .briefe-box {
    flex: 0 0 auto;
    width: 24px;
    height: 24px;
    margin: 0;
    accent-color: var(--amber);
    cursor: pointer;
  }
  .briefe-text {
    min-width: 0;
    font-size: 14px;
    line-height: 1.6;
    color: var(--cream);
    overflow-wrap: anywhere;
  }
  .briefe-status {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    color: var(--muted);
  }
`
