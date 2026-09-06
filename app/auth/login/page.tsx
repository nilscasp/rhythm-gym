'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'

type Mode = 'login' | 'signup'

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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<Mode>(initialMode)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
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
          setMessage(error.message)
        } else {
          router.push('/training')
          router.refresh()
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          // Expliziter Redirect aufs Callback-Route — entkoppelt den
          // Bestätigungs-Flow von der Dashboard-Site-URL. Ein dort
          // versehentlich kaputter Wert kann Auth so nicht mehr lahmlegen.
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) {
          setMessage(error.message)
        } else {
          setMessage('✅ Bestätigungsmail gesendet — bitte E-Mail prüfen!')
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
          {/* Grid */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'linear-gradient(rgba(245,166,35,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(245,166,35,0.03) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          {/* Glow */}
          <div
            style={{
              position: 'absolute',
              top: -200,
              right: -200,
              width: 600,
              height: 600,
              background:
                'radial-gradient(circle, rgba(245,166,35,0.06) 0%, transparent 70%)',
            }}
          />
        </div>

        <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <Link
              href="/"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 28,
                letterSpacing: 3,
                color: 'var(--cream)',
                textDecoration: 'none',
              }}
            >
              <span className="wm-gym">RHYTHM<span style={{ color: 'var(--amber)' }}>GYM</span></span>
              <span className="wm-schule" style={{ letterSpacing: 1, fontSize: 22 }}>Handpan Schule des Lebens</span>
            </Link>
          </div>

          {/* Beta-Banner — gilt für Login und Registrieren */}
          <div className="login-beta" role="note">
            <span className="login-beta-tag">Beta</span>
            <span className="login-beta-text">
              Kostenloser Beta-Test — alle Funktionen frei nutzbar.
            </span>
          </div>

          {/* Card */}
          <div
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: 40,
            }}
          >
            {/* Toggle */}
            <div
              style={{
                display: 'flex',
                marginBottom: 32,
                borderBottom: '1px solid var(--border)',
              }}
            >
              {(['login', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  style={{
                    flex: 1,
                    padding: '12px 0',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: "var(--font-ui)",
                    fontSize: 13,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    color: mode === m ? 'var(--amber)' : 'var(--muted)',
                    borderBottom:
                      mode === m ? '2px solid var(--amber)' : '2px solid transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  {m === 'login' ? 'Einloggen' : 'Registrieren'}
                </button>
              ))}
            </div>

            {/* Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                    display: 'block',
                    marginBottom: 8,
                  }}
                >
                  E-Mail
                </label>
                <input
                  type="email"
                  value={email}
                  autoComplete="email"
                  inputMode="email"
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={handleInputFocus}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--black)',
                    border: '1px solid var(--border)',
                    borderRadius: 2,
                    padding: '12px 16px',
                    color: 'var(--cream)',
                    // 16px verhindert iOS Auto-Zoom beim Fokus (alles <16px zoomt).
                    fontSize: 16,
                    fontFamily: "var(--font-body)",
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                    display: 'block',
                    marginBottom: 8,
                  }}
                >
                  Passwort
                </label>
                <input
                  type="password"
                  value={password}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={handleInputFocus}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmit()
                  }}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--black)',
                    border: '1px solid var(--border)',
                    borderRadius: 2,
                    padding: '12px 16px',
                    color: 'var(--cream)',
                    // 16px verhindert iOS Auto-Zoom beim Fokus (alles <16px zoomt).
                    fontSize: 16,
                    fontFamily: "var(--font-body)",
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Message */}
            {message && (
              <p
                style={{
                  marginTop: 16,
                  fontSize: 14,
                  color: message.startsWith('✅') ? '#4ade80' : '#f87171',
                  fontFamily: "var(--font-body)",
                }}
              >
                {message}
              </p>
            )}

            {/* CTA */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              style={{
                marginTop: 24,
                width: '100%',
                background: 'var(--amber)',
                color: 'var(--black)',
                border: 'none',
                padding: '14px',
                borderRadius: 2,
                fontFamily: "var(--font-ui)",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: 'uppercase',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading
                ? 'Laden...'
                : mode === 'login'
                  ? 'Einloggen →'
                  : 'Account erstellen →'}
            </button>
          </div>

          <p
            style={{
              textAlign: 'center',
              marginTop: 24,
              fontSize: 13,
              color: 'var(--muted)',
              fontFamily: "var(--font-body)",
            }}
          >
            <Link href="/" style={{ color: 'var(--muted)', textDecoration: 'none' }}>
              ← Zurück zur Startseite
            </Link>
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
`
