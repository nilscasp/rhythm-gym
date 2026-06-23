import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { createClient } from '../lib/supabase/server'
import { OnboardingInstrumentStep } from './_components/OnboardingInstrumentStep'

export const metadata = {
  title: 'Einstellungen — Rhythm Gym',
  description: 'Dein Profil und deine Einstellungen.',
}

// ──────────────────────────────────────────────────────────────────────
// Dreyfus-Modell — 5 Stufen für die Selbsteinschätzung
// (Stuart & Hubert Dreyfus, Skill Acquisition Model). Hier auf die
// Handpan-Reise gemünzt: nicht „mehr Wissen", sondern qualitativer
// Wandel in der Wahrnehmung — vom Regel-Folger zum intuitiven Spiel.
// ──────────────────────────────────────────────────────────────────────
type DreyfusStage = {
  value: number
  num: string
  name: string
  anchor: string
  checks: string[]
}

const DREYFUS_STAGES: DreyfusStage[] = [
  {
    value: 1,
    num: '01',
    name: 'Neuling',
    anchor: 'Vertrauen · Technik-Basis',
    checks: [
      'Ich konzentriere mich stark auf Fingerhaltung, Patternstruktur und Koordination.',
      'Ich brauche klare Anweisungen und Übungsblätter.',
      'Mein Ziel ist es, einen klaren Klang und einen durchgängigen Rhythmus zu erzeugen.',
    ],
  },
  {
    value: 2,
    num: '02',
    name: 'Fortgeschrittener Anfänger',
    anchor: 'Geduld · Muster & Variation',
    checks: [
      'Ich kann einfache Rhythmen halten, ohne ständig nachzudenken.',
      'Ich erkenne Unterschiede in der Dynamik (laut/leise).',
      'Ich fange an, kleine Melodien selbst zu kombinieren.',
    ],
  },
  {
    value: 3,
    num: '03',
    name: 'Kompetent',
    anchor: 'Verantwortung · Struktur & Plan',
    checks: [
      'Ich kann längere Stücke und Patterns spielen und bewusst variieren.',
      'Ich verstehe den Aufbau eines Stücks (Intro, Hauptteil, Schluss).',
      'Ich fühle mich sicher genug, vor anderen Menschen zu spielen.',
    ],
  },
  {
    value: 4,
    num: '04',
    name: 'Gewandt',
    anchor: 'Resonanz · Intuition & Gefühl',
    checks: [
      'Ich denke nicht mehr über einzelne Schläge nach — ich höre das Lied bereits im Kopf.',
      'Ich kann auf die Energie im Raum reagieren und mein Spiel anpassen.',
      'Technik ist für mich Mittel zum Zweck, nicht mehr das Ziel.',
    ],
  },
  {
    value: 5,
    num: '05',
    name: 'Experte',
    anchor: 'Flow & Freiheit · Pure Spielfreude',
    checks: [
      'Ich spiele intuitiv, ohne bewusste Planung, auf hohem Niveau.',
      'Das Instrument fühlt sich wie eine Erweiterung meines Körpers an.',
      'Ich finde tiefe Meditation und absolute Freiheit im Spiel.',
    ],
  },
]

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
  const isOnboarding = String(formData.get('onboarding') ?? '') === 'true'

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
  // Onboarding: weiter zum Instrument-Schritt statt direkt ins Training.
  if (isOnboarding) redirect('/settings?onboarding=true&step=instrument')
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
  searchParams: Promise<{ msg?: string; detail?: string; onboarding?: string; step?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const sp = await searchParams
  const flash = readFlash(sp?.msg, sp?.detail)
  const isOnboarding = sp?.onboarding === 'true'
  const isInstrumentStep = isOnboarding && sp?.step === 'instrument'

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
            {isInstrumentStep ? (
              <>
                <div className="set-eyebrow">Schritt 2 von 2 · Dein Instrument</div>
                <h1>WELCHE HANDPAN SPIELST DU?</h1>
                <p className="set-sub">
                  Wähl deine Skala — oder bau dein Instrument frei. Damit klingen
                  deine Übungen später in genau deinen Tönen.
                </p>
              </>
            ) : isOnboarding ? (
              <>
                <div className="set-eyebrow">Willkommen im Rhythm Gym</div>
                <h1>SCHÖN, DASS DU DA BIST</h1>
                <p className="set-sub">
                  Bevor es losgeht — wie sollen wir dich ansprechen? Wir brauchen nur
                  deinen Vornamen, das Spiel-Level kannst du wählen wenn du magst.
                </p>
              </>
            ) : (
              <>
                <div className="set-eyebrow">Dein Profil</div>
                <h1>EINSTELLUNGEN</h1>
                <p className="set-sub">
                  Wie sollen wir dich ansprechen und wo stehst du gerade?
                </p>
              </>
            )}
          </header>

          {flash && (
            <div className={`set-flash set-flash--${flash.kind}`} role="status">
              {flash.text}
            </div>
          )}

          {isInstrumentStep ? (
            <OnboardingInstrumentStep />
          ) : (
            <>
          <form action={updateProfile} className="set-form">
            {isOnboarding && <input type="hidden" name="onboarding" value="true" />}
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
                required={isOnboarding}
                autoFocus={isOnboarding}
              />
              <p className="set-hint">
                Wir nehmen den ersten Wortteil als Anrede auf der Trainingsseite.
              </p>
            </div>

            <div className="set-field">
              <span className="set-label">Wo stehst du auf deiner Handpan-Reise?</span>
              <p className="set-hint">
                Das <strong>Dreyfus-Modell</strong> beschreibt den Weg vom Regel-Folger
                zum intuitiven Spiel. Wähle die Stufe, in der du dich aktuell
                wiederfindest — du kannst es jederzeit ändern.
              </p>

              <fieldset className="set-levels">
                <legend className="set-sr-only">Handpan-Stufe</legend>
                {DREYFUS_STAGES.map((stage) => (
                  <label key={stage.value} className="set-level">
                    <input
                      type="radio"
                      name="current_level"
                      value={stage.value}
                      defaultChecked={currentLevel === stage.value}
                      className="set-level-radio"
                    />
                    <div className="set-level-content">
                      <div className="set-level-head">
                        <span className="set-level-num">{stage.num}</span>
                        <span className="set-level-name">{stage.name}</span>
                      </div>
                      <span className="set-level-anchor">{stage.anchor}</span>
                      <ul className="set-level-checks">
                        {stage.checks.map((check, i) => (
                          <li key={i}>{check}</li>
                        ))}
                      </ul>
                    </div>
                  </label>
                ))}
              </fieldset>
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
                {isOnboarding ? 'Los geht’s →' : 'Speichern und zurück →'}
              </button>
              {!isOnboarding && (
                <Link href="/training" className="set-cancel">
                  Abbrechen
                </Link>
              )}
            </div>
          </form>

          {!isOnboarding && (
            <>
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
            </>
          )}
            </>
          )}
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

  /* ── Dreyfus-Level-Picker — 5 Radio-Cards ───────────────────────── */
  .set-levels {
    border: 0;
    padding: 0;
    margin: 12px 0 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .set-level {
    display: block;
    cursor: pointer;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 16px 18px;
    background: var(--black);
    transition: border-color 0.15s ease, background-color 0.15s ease;
    position: relative;
  }
  .set-level:hover {
    border-color: rgba(245, 166, 35, 0.5);
  }
  .set-level:has(input:checked) {
    border-color: var(--amber);
    background: rgba(245, 166, 35, 0.05);
  }
  .set-level:focus-within {
    outline: 2px solid rgba(245, 166, 35, 0.6);
    outline-offset: 2px;
  }
  .set-level-radio {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .set-level-head {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 2px;
  }
  .set-level-num {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px;
    letter-spacing: 2px;
    color: var(--muted);
  }
  .set-level:has(input:checked) .set-level-num {
    color: var(--amber);
  }
  .set-level-name {
    font-family: 'Anton', sans-serif;
    font-size: 20px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: var(--cream);
    line-height: 1.1;
  }
  .set-level-anchor {
    display: block;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--amber);
    margin-bottom: 10px;
    opacity: 0.85;
  }
  .set-level-checks {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .set-level-checks li {
    font-size: 13px;
    line-height: 1.5;
    color: var(--cream);
    padding-left: 16px;
    position: relative;
  }
  .set-level-checks li::before {
    content: '—';
    position: absolute;
    left: 0;
    color: var(--muted);
  }
  .set-sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
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
    .set-level {
      padding: 14px 16px;
    }
    .set-level-name {
      font-size: 18px;
    }
  }
`
