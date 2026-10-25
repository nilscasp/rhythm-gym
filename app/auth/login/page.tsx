'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'
import { CONSENT_TEXT, CONSENT_TEXT_VERSION } from '../../lib/consent'
import { DEFAULT_AFTER_LOGIN, safeLoginNext } from '../../lib/login-next'
import { RosetteSea } from '../../../components/RosetteSea'

type Mode = 'login' | 'signup' | 'reset'

/**
 * Das Wort, das im Einwilligungstext zur Datenschutzerklärung verlinkt wird.
 * Der Text selbst bleibt eine Quelle (app/lib/consent.ts) — hier wird er nur
 * an dieser Stelle aufgetrennt, damit die Version im Protokoll und der
 * gelesene Wortlaut garantiert derselbe sind.
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
        style={{ color: 'var(--amber)', textDecoration: 'underline' }}
      >
        {CONSENT_LINK_WORD}
      </Link>
      {CONSENT_TEXT.slice(at + CONSENT_LINK_WORD.length)}
    </>
  )
}

const SPAM_HINT =
  'Bitte auch im Spam- oder Werbe-Ordner nachsehen (besonders bei GMX, Web.de und Outlook).'

/**
 * Supabase liefert englische Fehlertexte. Die häufigsten übersetzen wir und
 * sagen gleich, was zu tun ist — die unbestätigte Adresse ist in der Praxis
 * der Hauptgrund für „Login geht nicht".
 */
function loginErrorText(message: string): string {
  if (/email not confirmed/i.test(message)) {
    return `Deine E-Mail-Adresse ist noch nicht bestätigt. Bitte den Link in der Bestätigungsmail anklicken. ${SPAM_HINT}`
  }
  if (/invalid login credentials/i.test(message)) {
    return 'E-Mail oder Passwort stimmen nicht. Falls du dich gerade erst registriert hast: zuerst den Link in der Bestätigungsmail anklicken.'
  }
  return message
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  )
}

function LoginPageInner() {
  const searchParams = useSearchParams()
  const initialMode: Mode = searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  // Rückkehr nach dem Login, z. B. zur Mitgliedschaft. Feste Liste.
  const next = safeLoginNext(searchParams.get('next'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<Mode>(initialMode)
  // Nicht vorangekreuzt und freiwillig: ohne Haken gibt es nur Konto-Mails.
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  // Das Callback und die Passwort-Seite schicken Fehler als ?error= hierher —
  // vorher verpufften sie, die Person sah nur das leere Formular.
  const [message, setMessage] = useState(searchParams.get('error') ?? '')
  const supabase = createClient()
  const router = useRouter()

  const handleSubmit = async () => {
    if (loading) return
    setLoading(true)
    setMessage('')

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          setMessage(loginErrorText(error.message))
        } else {
          router.push(next)
          router.refresh()
        }
      } else if (mode === 'reset') {
        // Der Link in der Mail führt über das Callback (Code → Sitzung) und
        // von dort auf die Seite zum Setzen des neuen Passworts.
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/auth/passwort`,
        })
        if (error) {
          setMessage(error.message)
        } else {
          // Bewusst neutral: verrät nicht, ob es die Adresse gibt.
          setMessage(
            `✅ Wenn es ein Konto mit dieser Adresse gibt, ist eine Mail zum Zurücksetzen unterwegs. ${SPAM_HINT}`
          )
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          // Expliziter Redirect aufs Callback-Route — entkoppelt den
          // Bestätigungs-Flow von der Dashboard-Site-URL. Ein dort
          // versehentlich kaputter Wert kann Auth so nicht mehr lahmlegen.
          options: {
            emailRedirectTo:
              next === DEFAULT_AFTER_LOGIN
                ? `${window.location.origin}/auth/callback`
                : `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
            // Wandert als raw_user_meta_data in auth.users und wird von
            // handle_new_user() ins Profil kopiert (Migration 0005). Damit ist
            // protokolliert, WANN und ZU WELCHEM TEXT jemand Ja gesagt hat.
            data: {
              marketing_consent: consent,
              marketing_consent_text_version: CONSENT_TEXT_VERSION,
              marketing_consent_at: consent ? new Date().toISOString() : null,
            },
          },
        })
        if (error) {
          setMessage(error.message)
        } else if (data.user && data.user.identities?.length === 0) {
          // Supabase antwortet bei einer Adresse, die schon ein bestätigtes
          // Konto hat, mit 200 und leeren `identities` — und schickt KEINE
          // Mail (Schutz vor Adress-Abfrage). Ohne diesen Zweig stünde hier
          // „Bestätigungsmail gesendet", und die Person wartet vergeblich.
          setMessage(
            'ℹ️ Für diese Adresse gibt es schon ein Konto. Bitte einloggen — oder unten „Passwort vergessen" wählen.'
          )
        } else {
          setMessage(
            `✅ Bestätigungsmail gesendet — bitte den Link darin anklicken, erst dann klappt der Login. ${SPAM_HINT}`
          )
        }
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // iPad/iOS: virtuelle Tastatur überdeckt sonst die Inputs.
    // Nach der Keyboard-Animation den Input wieder ins Sichtfeld scrollen.
    const el = e.currentTarget
    window.setTimeout(() => {
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 280)
  }

  return (
    <>
      <style>{LOGIN_CSS}</style>
      <main className="login-page">
        {/* Background decorations — own clipped wrapper so the main itself
            kann vertikal scrollen wenn die iOS-Tastatur den Viewport schrumpft. */}
        <div className="login-bg" aria-hidden="true">
          {/* Gym: Raster und Glow. Schule: Rosetten-Meer (components/RosetteSea). */}
          <div className="login-grid wm-gym" />
          <div className="login-glow wm-gym" />
          <div className="wm-schule">
            <RosetteSea />
            <div className="login-veil" />
          </div>
        </div>

        <div className="login-wrap">
          {/* Kopf. Schule wie auf der Startseite von handpan.schule:
              Mandala, Fraunces leicht, darunter „Botschafter des Klangs“ (Nils, 25.10.2026). */}
          <div className="login-head">
            <Link href="/" className="login-home">
              <span className="wm-gym login-wm-gym">
                RHYTHM<span style={{ color: 'var(--amber)' }}>GYM</span>
              </span>
              <span className="wm-schule login-wm-schule">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/handpan-schule/logo.svg" alt="" width={64} height={66} className="login-mark" />
                <span className="login-title">Handpan Schule des Lebens</span>
                <span className="login-tagline">Botschafter des Klangs</span>
              </span>
            </Link>
          </div>

          {/* Beta-Banner — gilt für Login und Registrieren, nur im Gym.
              Die Schule hat bezahlte Kurse und Abos; „alle Funktionen frei“
              stimmt dort nicht (wm-gym blendet auf data-brand="schule" aus). */}
          <div className="login-beta wm-gym" role="note">
            <span className="login-beta-tag">Beta</span>
            <span className="login-beta-text">
              Kostenloser Beta-Test — alle Funktionen frei nutzbar.
            </span>
          </div>

          <div className="login-card">
            {/* Toggle */}
            <div className="login-tabs" role="tablist">
              {(['login', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => setMode(m)}
                  className={mode === m ? 'login-tab is-active' : 'login-tab'}
                >
                  {m === 'login' ? 'Einloggen' : 'Registrieren'}
                </button>
              ))}
            </div>

            {/* Fields */}
            <div className="login-fields">
              <div>
                <label className="login-label" htmlFor="login-email">
                  E-Mail
                </label>
                <input
                  id="login-email"
                  className="login-input"
                  type="email"
                  value={email}
                  autoComplete="email"
                  inputMode="email"
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={handleInputFocus}
                  onKeyDown={(e) => {
                    // Beim Zurücksetzen gibt es kein Passwortfeld — Enter muss hier reichen.
                    if (e.key === 'Enter' && mode === 'reset') handleSubmit()
                  }}
                />
              </div>
              {mode !== 'reset' && (
                <div>
                  <label className="login-label" htmlFor="login-password">
                    Passwort
                  </label>
                  <input
                    id="login-password"
                    className="login-input"
                    type="password"
                    value={password}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={handleInputFocus}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSubmit()
                    }}
                  />
                </div>
              )}
            </div>

            {/* Einwilligung Briefe — nur beim Konto anlegen, nie vorangekreuzt, freiwillig */}
            {mode === 'signup' && (
              <label className="login-consent">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>
                  <ConsentLabelText />
                </span>
              </label>
            )}

            {/* Message */}
            {message && (
              <p
                className="login-message"
                style={{
                  color: message.startsWith('✅')
                    ? '#4ade80'
                    : message.startsWith('ℹ️')
                      ? 'var(--amber)'
                      : '#f87171',
                }}
              >
                {message}
              </p>
            )}

            {/* CTA */}
            <button type="button" onClick={handleSubmit} disabled={loading} className="login-cta">
              {loading
                ? 'Laden...'
                : mode === 'login'
                  ? 'Einloggen →'
                  : mode === 'reset'
                    ? 'Link schicken →'
                    : 'Konto erstellen →'}
            </button>

            {/* Passwort vergessen — vom Login aus hin, vom Zurücksetzen aus zurück */}
            {mode !== 'signup' && (
              <p className="login-small">
                <button
                  type="button"
                  className="login-textbtn"
                  onClick={() => {
                    setMessage('')
                    setMode(mode === 'reset' ? 'login' : 'reset')
                  }}
                >
                  {mode === 'reset' ? '← Zurück zum Login' : 'Passwort vergessen?'}
                </button>
              </p>
            )}

            {mode !== 'reset' && (
              <p className="login-fine">
                Mit dem Konto akzeptierst du die <Link href="/datenschutz">Datenschutzerklärung</Link>.
              </p>
            )}
          </div>

          <p className="login-back">
            <Link href="/">← Zurück zur Startseite</Link>
          </p>
        </div>
      </main>
    </>
  )
}

const LOGIN_CSS = `
  /* iPad-Fix für die Auth-Form:
     vorher 100vh + overflow:hidden + center → iOS-Tastatur überdeckte Inputs,
     weil 100vh nicht auf den geschrumpften Visual Viewport reagiert und
     overflow:hidden das Hochscrollen blockierte. Jetzt:
     - 100dvh (passt sich Keyboard an, mit 100vh als Fallback)
     - bg-Decorations leben in eigenem clipping-Wrapper → main scrollt frei
     - großzügiges bottom-padding + safe-area-Reserve für Keyboard. */
  .login-page {
    min-height: 100vh;
    min-height: 100dvh;
    background-color: var(--black);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    padding-top: max(24px, env(safe-area-inset-top));
    padding-bottom: max(96px, env(safe-area-inset-bottom));
    position: relative;
  }
  .login-bg {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;
  }
  .login-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(245,166,35,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(245,166,35,0.03) 1px, transparent 1px);
    background-size: 40px 40px;
  }
  .login-glow {
    position: absolute;
    top: -200px;
    right: -200px;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(245,166,35,0.06) 0%, transparent 70%);
  }
  .login-wrap { width: 100%; max-width: 420px; position: relative; z-index: 1; }

  .login-head { text-align: center; margin-bottom: 28px; }
  .login-home {
    font-family: var(--font-display);
    font-size: 28px;
    letter-spacing: 3px;
    color: var(--cream);
    text-decoration: none;
  }

  /* Beta-Banner über der Auth-Card. Sitzt zwischen Logo und Card,
     gilt automatisch für Login und Registrieren (beide Modes derselben Card). */
  .login-beta {
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(245, 166, 35, 0.08);
    border: 1px solid rgba(245, 166, 35, 0.35);
    border-radius: 4px;
    padding: 10px 14px;
    margin-bottom: 24px;
  }
  .login-beta-tag {
    flex-shrink: 0;
    font-family: var(--font-ui);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--black);
    background: var(--amber);
    padding: 3px 8px;
    border-radius: 2px;
    line-height: 1.4;
  }
  .login-beta-text {
    font-family: var(--font-body);
    font-size: 13px;
    color: var(--cream);
    line-height: 1.4;
  }

  /* Karte und Felder — Gym-Standard (wie bisher) */
  .login-card {
    background-color: var(--card);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 40px;
  }
  .login-tabs { display: flex; margin-bottom: 32px; border-bottom: 1px solid var(--border); }
  .login-tab {
    flex: 1;
    padding: 12px 0;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    font-family: var(--font-ui);
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    transition: all 0.2s;
  }
  .login-tab.is-active { color: var(--amber); border-bottom-color: var(--amber); }
  .login-fields { display: flex; flex-direction: column; gap: 16px; }
  .login-label {
    font-family: var(--font-ui);
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    display: block;
    margin-bottom: 8px;
  }
  .login-input {
    width: 100%;
    background-color: var(--black);
    border: 1px solid var(--border);
    border-radius: 2px;
    padding: 12px 16px;
    color: var(--cream);
    /* 16px verhindert iOS Auto-Zoom beim Fokus (alles <16px zoomt). */
    font-size: 16px;
    font-family: var(--font-body);
    outline: none;
    box-sizing: border-box;
  }
  .login-consent {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    margin-top: 20px;
    font-family: var(--font-body);
    font-size: 14px;
    line-height: 1.5;
    color: var(--muted2);
    cursor: pointer;
  }
  .login-consent input {
    width: 20px;
    height: 20px;
    margin-top: 2px;
    flex-shrink: 0;
    accent-color: var(--amber);
  }
  .login-message { margin-top: 16px; font-size: 14px; font-family: var(--font-body); }
  .login-cta {
    margin-top: 24px;
    width: 100%;
    background: var(--amber);
    color: var(--black);
    border: none;
    padding: 14px;
    border-radius: 2px;
    font-family: var(--font-ui);
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    cursor: pointer;
  }
  .login-cta:disabled { cursor: not-allowed; opacity: 0.7; }
  .login-small { margin-top: 14px; font-size: 13px; text-align: center; font-family: var(--font-body); }
  .login-textbtn {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--muted);
    text-decoration: underline;
    font-family: inherit;
    font-size: inherit;
  }
  .login-fine {
    margin-top: 14px;
    font-size: 12px;
    line-height: 1.5;
    text-align: center;
    color: var(--muted);
    font-family: var(--font-body);
  }
  .login-fine a { color: var(--muted); text-decoration: underline; }
  .login-back { text-align: center; margin-top: 24px; font-size: 13px; font-family: var(--font-body); }
  .login-back a { color: var(--muted); text-decoration: none; }

  /* ── Schule: Rosetten-Meer, Kopf wie handpan.schule, ruhige Glaskarte ── */
  /* fest am Bildschirm, damit das Meer beim Scrollen und mit Tastatur stehen bleibt */
  .rosette-sea { position: fixed; inset: 0; width: 100vw; height: 100vh; display: block; }
  .login-veil {
    position: fixed;
    inset: 0;
    /* Mitte beruhigen, damit die Karte lesbar bleibt; Horizont weich ins Nachtblau */
    background:
      radial-gradient(ellipse 34% 46% at 50% 50%, rgba(10,14,20,0.6) 0%, rgba(10,14,20,0.2) 70%, transparent 100%),
      linear-gradient(to bottom, rgba(10,14,20,0.9) 0%, rgba(10,14,20,0) 34%);
  }
  .login-wm-schule { display: flex; flex-direction: column; align-items: center; gap: 0; }
  [data-brand="schule"] .login-wm-schule { display: flex; }
  .login-mark { width: 64px; height: auto; margin-bottom: 20px; opacity: 0.95; }
  /* Schriftzug wie in der Kopfzeile von handpan.schule: Fraunces leicht,
     Großbuchstaben, weit gesperrt (dort 0,2 em) */
  .login-title {
    font-family: 'Fraunces', Georgia, serif;
    font-weight: 300;
    font-size: clamp(17px, 4.4vw, 24px);
    line-height: 1.5;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba(232, 230, 227, 0.92);
  }
  .login-tagline {
    margin-top: 12px;
    font-family: 'Fraunces', Georgia, serif;
    font-style: italic;
    font-weight: 300;
    font-size: 18px;
    letter-spacing: 0.01em;
    color: var(--amber);
  }
  [data-brand="schule"] .login-head { margin-bottom: 32px; }
  [data-brand="schule"] .login-home { letter-spacing: 0; }
  [data-brand="schule"] .login-card {
    background: rgba(14, 19, 27, 0.72);
    -webkit-backdrop-filter: blur(14px);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(212, 165, 116, 0.18);
    border-radius: 18px;
    padding: 32px 32px 28px;
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
  }
  [data-brand="schule"] .login-tabs {
    border: 1px solid rgba(212, 165, 116, 0.16);
    border-radius: 999px;
    padding: 4px;
    margin-bottom: 28px;
    gap: 4px;
  }
  [data-brand="schule"] .login-tab {
    border: none;
    border-radius: 999px;
    padding: 10px 0;
    font-size: 12px;
    letter-spacing: 0.18em;
  }
  [data-brand="schule"] .login-tab.is-active { background: rgba(212, 165, 116, 0.14); color: var(--cream); }
  [data-brand="schule"] .login-label { letter-spacing: 0.16em; margin-bottom: 8px; }
  [data-brand="schule"] .login-input {
    background: rgba(10, 14, 20, 0.7);
    border: 1px solid rgba(212, 165, 116, 0.16);
    border-radius: 10px;
    padding: 13px 16px;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  [data-brand="schule"] .login-input:focus {
    border-color: rgba(212, 165, 116, 0.55);
    box-shadow: 0 0 0 3px rgba(212, 165, 116, 0.12);
  }
  [data-brand="schule"] .login-cta {
    border-radius: 999px;
    padding: 15px;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.18em;
    transition: background 0.2s, transform 0.2s;
  }
  [data-brand="schule"] .login-cta:hover:not(:disabled) { background: #E0B888; }
  [data-brand="schule"] .login-back a:hover { color: var(--cream); }
  @media (max-width: 480px) {
    [data-brand="schule"] .login-card { padding: 24px 20px 22px; border-radius: 16px; }
    .login-mark { width: 54px; margin-bottom: 16px; }
    .login-tagline { font-size: 16px; }
  }
`
