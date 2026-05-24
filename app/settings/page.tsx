import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { createClient } from '../lib/supabase/server'

export const metadata = {
  title: 'Einstellungen — Rhythm Gym',
  description: 'Dein Profil und deine Einstellungen.',
}

// ──────────────────────────────────────────────────────────────────────
// Server Action — save profile
// ──────────────────────────────────────────────────────────────────────
async function updateProfile(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const rawFullName = String(formData.get('full_name') ?? '').trim()
  const rawLevel = String(formData.get('current_level') ?? '').trim()

  const full_name: string | null = rawFullName === '' ? null : rawFullName
  const current_level: number | null =
    rawLevel === '' ? null : Number.isNaN(parseInt(rawLevel, 10)) ? null : parseInt(rawLevel, 10)

  await supabase
    .from('profiles')
    .update({ full_name, current_level })
    .eq('id', user.id)

  // The hub reads profile on render — bust the cache so the next /training paint
  // picks up the new name immediately.
  revalidatePath('/training')
  redirect('/training')
}

// ──────────────────────────────────────────────────────────────────────
// Server Action — change email (Supabase sends confirmation to BOTH old + new)
// ──────────────────────────────────────────────────────────────────────
async function updateEmail(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const newEmail = String(formData.get('email') ?? '').trim()
  if (!newEmail || newEmail === user.email) {
    redirect('/settings?msg=email-unchanged')
  }

  const { error } = await supabase.auth.updateUser({ email: newEmail })
  if (error) {
    redirect(`/settings?msg=email-error&detail=${encodeURIComponent(error.message)}`)
  }

  // Supabase sends a confirmation email to the new address — the change isn't
  // live until the user clicks that link.
  redirect('/settings?msg=email-confirm-sent')
}

// ──────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────
type FlashKey =
  | 'email-unchanged'
  | 'email-confirm-sent'
  | 'email-error'
  | null

function readFlash(msg: string | undefined, detail: string | undefined): {
  kind: 'ok' | 'warn' | 'err'
  text: string
} | null {
  switch (msg as FlashKey) {
    case 'email-confirm-sent':
      return {
        kind: 'ok',
        text:
          '✉️ Bestätigungs-Mail wurde an die neue Adresse geschickt. Erst nach Klick ist die Änderung aktiv.',
      }
    case 'email-unchanged':
      return { kind: 'warn', text: 'Email blieb unverändert.' }
    case 'email-error':
      return {
        kind: 'err',
        text: `Email-Änderung fehlgeschlagen: ${detail ?? 'unbekannter Fehler'}`,
      }
    default:
      return null
  }
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; detail?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const sp = await searchParams
  const flash = readFlash(sp?.msg, sp?.detail)

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, current_level, plan')
    .eq('id', user.id)
    .maybeSingle()

  const currentName = profile?.full_name ?? ''
  const currentLevel = profile?.current_level ?? 0

  return (
    <>
      <style>{SETTINGS_CSS}</style>

      <main className="set-page">
        <div className="set-wrap">
          <header className="set-head">
            <div className="set-eyebrow">Dein Profil</div>
            <h1>EINSTELLUNGEN</h1>
            <p className="set-sub">
              Wie sollen wir dich ansprechen und wo stehst du gerade?
            </p>
          </header>

          {flash && (
            <div className={`set-flash set-flash--${flash.kind}`} role="status">
              {flash.text}
            </div>
          )}

          <form action={updateProfile} className="set-form">
            <div className="set-field">
              <label htmlFor="full_name" className="set-label">
                Vorname (oder ganzer Name)
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                defaultValue={currentName}
                placeholder="z. B. Anna oder Anna Müller"
                className="set-input"
                autoComplete="given-name"
              />
              <p className="set-hint">
                Wir nehmen den ersten Wortteil als Anrede auf der Trainingsseite.
              </p>
            </div>

            <div className="set-field">
              <label htmlFor="current_level" className="set-label">
                Wie weit bist du mit der Handpan?
              </label>
              <select
                id="current_level"
                name="current_level"
                defaultValue={String(currentLevel)}
                className="set-select"
              >
                <option value="0">— bitte wählen —</option>
                <option value="1">Anfänger:in</option>
                <option value="2">Mittelstufe</option>
                <option value="3">Fortgeschritten</option>
              </select>
              <p className="set-hint">
                Hilft uns, dir passende Kurse zu empfehlen. Du kannst es jederzeit ändern.
              </p>
            </div>

            <div className="set-meta">
              <div className="set-meta-item">
                <span className="set-meta-label">Eingeloggt als</span>
                <span className="set-meta-value">{user.email}</span>
              </div>
              {profile?.plan && (
                <div className="set-meta-item">
                  <span className="set-meta-label">Plan</span>
                  <span className="set-meta-value">{profile.plan}</span>
                </div>
              )}
            </div>

            <div className="set-actions">
              <button type="submit" className="set-save">
                Speichern und zurück →
              </button>
              <Link href="/training" className="set-cancel">
                Abbrechen
              </Link>
            </div>
          </form>

          {/* ── EMAIL ÄNDERN ── */}
          <section className="set-section">
            <header className="set-section-head">
              <div className="set-eyebrow">Login</div>
              <h2>EMAIL-ADRESSE</h2>
            </header>
            <form action={updateEmail} className="set-form">
              <div className="set-field">
                <label htmlFor="email" className="set-label">Neue Email-Adresse</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={user.email ?? ''}
                  required
                  className="set-input"
                  autoComplete="email"
                />
                <p className="set-hint">
                  Nach Klick auf Speichern bekommst du eine Bestätigungs-Mail. Die alte Adresse bleibt aktiv, bis du den Link in der neuen Mail klickst.
                </p>
              </div>
              <div className="set-actions">
                <button type="submit" className="set-save">
                  Bestätigungs-Mail senden →
                </button>
              </div>
            </form>
          </section>

          {/* ── ABMELDEN ── */}
          <section className="set-section">
            <header className="set-section-head">
              <div className="set-eyebrow">Sitzung</div>
              <h2>ABMELDEN</h2>
            </header>
            <div className="set-form">
              <p className="set-hint">
                Beendet deine Sitzung in diesem Browser. Du kannst dich danach jederzeit wieder einloggen.
              </p>
              <form action="/auth/logout" method="POST" className="set-actions">
                <button type="submit" className="set-logout-btn">
                  Aus diesem Browser abmelden
                </button>
              </form>
            </div>
          </section>

          <aside className="set-future">
            <div className="set-future-tag">Bald</div>
            <p>
              Weitere Profil-Felder folgen — unter anderem dein
              {' '}<strong>Handpan-Rad</strong> (Skill-Karte für deine technischen Fähigkeiten),
              Skala deiner Handpan, und Lern-Ziele. Account-Löschung auf Anfrage an {' '}
              <a href="mailto:kontakt@nilscaspar.de" className="set-inline-link">
                kontakt@nilscaspar.de
              </a>.
            </p>
          </aside>
        </div>
      </main>
    </>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Styles — prefixed `.set-` to avoid collisions
// ──────────────────────────────────────────────────────────────────────
const SETTINGS_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Anton&family=Barlow:wght@300;400;600&family=Barlow+Condensed:wght@300;400;700&display=swap');

  .set-page {
    min-height: 100vh;
    background: var(--black);
    color: var(--cream);
    padding: 56px 24px 96px;
    font-family: 'Barlow', sans-serif;
  }
  .set-wrap {
    max-width: 640px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 40px;
  }
  .set-head {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .set-eyebrow {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .set-head h1 {
    font-family: 'Anton', sans-serif;
    font-size: clamp(32px, 5vw, 44px);
    letter-spacing: 1px;
    line-height: 1;
    margin: 4px 0 0;
    text-transform: uppercase;
  }
  .set-sub {
    color: var(--muted);
    font-size: 15px;
    margin: 4px 0 0;
    line-height: 1.6;
  }
  .set-form {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 32px 28px;
    display: flex;
    flex-direction: column;
    gap: 28px;
  }
  .set-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .set-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
  }
  .set-input,
  .set-select {
    width: 100%;
    background: var(--black);
    border: 1px solid var(--border);
    color: var(--cream);
    font-size: 15px;
    font-family: 'Barlow', sans-serif;
    padding: 12px 14px;
    border-radius: 3px;
    outline: none;
    transition: border-color 0.15s ease;
    box-sizing: border-box;
  }
  .set-input:focus,
  .set-select:focus {
    border-color: var(--amber);
  }
  .set-hint {
    font-size: 12px;
    color: var(--muted);
    margin: 0;
    line-height: 1.5;
  }
  .set-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    padding-top: 8px;
    border-top: 1px solid var(--border);
  }
  .set-meta-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .set-meta-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
  }
  .set-meta-value {
    font-size: 14px;
    color: var(--cream);
  }
  .set-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }
  .set-save {
    background: var(--amber);
    color: var(--black);
    border: none;
    padding: 12px 22px;
    border-radius: 3px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }
  .set-save:hover {
    background: var(--cream);
  }
  .set-cancel {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    text-decoration: none;
    padding: 12px 14px;
    border-bottom: 1px solid transparent;
    transition: color 0.15s ease, border-color 0.15s ease;
  }
  .set-cancel:hover {
    color: var(--amber);
    border-bottom-color: var(--amber);
  }
  .set-section { margin-top: 16px; }
  .set-section-head { margin-bottom: 16px; }
  .set-section-head h2 {
    font-family: 'Anton', sans-serif;
    font-size: clamp(22px, 3vw, 28px);
    line-height: 1;
    color: var(--cream);
    margin: 6px 0 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .set-logout-btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted);
    padding: 12px 22px;
    border-radius: 3px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    cursor: pointer;
    transition: color 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
  }
  .set-logout-btn:hover {
    color: var(--warm);
    border-color: var(--warm);
  }

  .set-flash {
    padding: 14px 18px;
    border-radius: 4px;
    font-size: 14px;
    line-height: 1.5;
    margin-bottom: 8px;
  }
  .set-flash--ok {
    background: rgba(156, 169, 138, 0.12);
    border: 1px solid #9CA98A;
    color: #BFCBA6;
  }
  .set-flash--warn {
    background: rgba(245, 166, 35, 0.10);
    border: 1px solid var(--amber);
    color: var(--amber);
  }
  .set-flash--err {
    background: rgba(255, 107, 53, 0.10);
    border: 1px solid var(--warm);
    color: var(--warm);
  }
  .set-inline-link {
    color: var(--amber);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .set-future {
    background: transparent;
    border: 1px dashed var(--border);
    border-radius: 10px;
    padding: 20px;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.6;
  }
  .set-future-tag {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--amber);
    margin-bottom: 6px;
  }
  .set-future strong {
    color: var(--cream);
    font-weight: 600;
  }

  @media (max-width: 480px) {
    .set-form {
      padding: 24px 20px;
    }
    .set-actions {
      flex-direction: column;
      align-items: stretch;
    }
    .set-save,
    .set-cancel {
      width: 100%;
      text-align: center;
    }
  }
`
