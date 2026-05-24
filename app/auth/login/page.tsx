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
        const { error } = await supabase.auth.signUp({ email, password })
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

  return (
    <>
      <style>{LOGIN_CSS}</style>
      <main
        style={{
          minHeight: '100vh',
          backgroundColor: '#0A0907',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(245,166,35,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(245,166,35,0.03) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            pointerEvents: 'none',
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
            pointerEvents: 'none',
          }}
        />

        <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <Link
              href="/"
              style={{
                fontFamily: "'Anton', sans-serif",
                fontSize: 28,
                letterSpacing: 3,
                color: '#F5EDD8',
                textDecoration: 'none',
              }}
            >
              RHYTHM<span style={{ color: '#F5A623' }}>GYM</span>
            </Link>
          </div>

          {/* Card */}
          <div
            style={{
              backgroundColor: '#1C1A14',
              border: '1px solid #2E2A1E',
              borderRadius: 4,
              padding: 40,
            }}
          >
            {/* Toggle */}
            <div
              style={{
                display: 'flex',
                marginBottom: 32,
                borderBottom: '1px solid #2E2A1E',
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
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 13,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    color: mode === m ? '#F5A623' : '#7A7060',
                    borderBottom:
                      mode === m ? '2px solid #F5A623' : '2px solid transparent',
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
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 11,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    color: '#7A7060',
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
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#0A0907',
                    border: '1px solid #2E2A1E',
                    borderRadius: 2,
                    padding: '12px 16px',
                    color: '#F5EDD8',
                    fontSize: 15,
                    fontFamily: "'Barlow', sans-serif",
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 11,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    color: '#7A7060',
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmit()
                  }}
                  style={{
                    width: '100%',
                    backgroundColor: '#0A0907',
                    border: '1px solid #2E2A1E',
                    borderRadius: 2,
                    padding: '12px 16px',
                    color: '#F5EDD8',
                    fontSize: 15,
                    fontFamily: "'Barlow', sans-serif",
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
                  fontFamily: "'Barlow', sans-serif",
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
                background: '#F5A623',
                color: '#0A0907',
                border: 'none',
                padding: '14px',
                borderRadius: 2,
                fontFamily: "'Barlow Condensed', sans-serif",
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
              color: '#7A7060',
              fontFamily: "'Barlow', sans-serif",
            }}
          >
            <Link href="/" style={{ color: '#7A7060', textDecoration: 'none' }}>
              ← Zurück zur Startseite
            </Link>
          </p>
        </div>
      </main>
    </>
  )
}

const LOGIN_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Anton&family=Barlow:wght@300;400;600&family=Barlow+Condensed:wght@300;400;700&display=swap');
`
