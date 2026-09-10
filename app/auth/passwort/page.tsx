'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'

/**
 * Neues Passwort setzen. Man landet hier über den Link aus der
 * „Passwort vergessen"-Mail: der führt auf /auth/callback?next=/auth/passwort,
 * das Callback tauscht den Code gegen eine Sitzung und leitet hierher weiter.
 * Ohne Sitzung gibt es hier nichts zu tun — zurück zum Login.
 */
const MIN_LENGTH = 8

export default function PasswortPage() {
  const supabase = createClient()
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return
      if (!user) {
        router.replace(
          '/auth/login?error=' +
            encodeURIComponent('Der Link ist abgelaufen. Bitte fordere einen neuen an.')
        )
        return
      }
      setReady(true)
    })
    return () => {
      cancelled = true
    }
    // supabase/router sind pro Render stabil genug; ein Lauf beim Mount reicht.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async () => {
    if (loading) return
    setMessage('')
    if (password.length < MIN_LENGTH) {
      setMessage(`Das Passwort braucht mindestens ${MIN_LENGTH} Zeichen.`)
      return
    }
    if (password !== repeat) {
      setMessage('Die beiden Passwörter sind nicht gleich.')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setMessage(error.message)
      } else {
        router.push('/training')
        router.refresh()
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: 'var(--black)',
    border: '1px solid var(--border)',
    borderRadius: 2,
    padding: '12px 16px',
    color: 'var(--cream)',
    // 16px verhindert iOS Auto-Zoom beim Fokus.
    fontSize: 16,
    fontFamily: 'var(--font-body)',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-ui)',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'var(--muted)',
    display: 'block',
    marginBottom: 8,
  }

  return (
    <main
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--black)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        paddingBottom: 'max(96px, env(safe-area-inset-bottom))',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: 40,
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              letterSpacing: 1,
              color: 'var(--cream)',
              margin: '0 0 8px',
            }}
          >
            Neues Passwort
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              lineHeight: 1.5,
              color: 'var(--muted2)',
              margin: '0 0 24px',
            }}
          >
            Wähle ein neues Passwort mit mindestens {MIN_LENGTH} Zeichen.
          </p>

          {!ready ? (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--muted)' }}>
              Einen Moment…
            </p>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Neues Passwort</label>
                  <input
                    type="password"
                    value={password}
                    autoComplete="new-password"
                    onChange={(e) => setPassword(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Noch einmal</label>
                  <input
                    type="password"
                    value={repeat}
                    autoComplete="new-password"
                    onChange={(e) => setRepeat(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSubmit()
                    }}
                    style={inputStyle}
                  />
                </div>
              </div>

              {message && (
                <p
                  style={{
                    marginTop: 16,
                    fontSize: 14,
                    color: '#f87171',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {message}
                </p>
              )}

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
                  padding: 14,
                  borderRadius: 2,
                  fontFamily: 'var(--font-ui)',
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Laden...' : 'Passwort speichern →'}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
