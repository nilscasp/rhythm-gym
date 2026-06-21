import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../lib/supabase/server'
import type { Database } from '../lib/supabase/database.types'
import { RedeemCodeCard } from './_components/RedeemCodeCard'

export const metadata = {
  title: 'Training — Rhythm Gym',
  description:
    'Dein persönlicher Trainings-Hub. Aktive Programme, Praxis-Spiegel und Patterns an einem Ort.',
}

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────

type ProgramRow = Pick<
  Database['public']['Tables']['programs']['Row'],
  'id' | 'title' | 'slug' | 'description' | 'level' | 'category' | 'total_exercises'
>

type EnrollmentRow = {
  program_id: string
  status: string | null
  started_at: string | null
  programs: ProgramRow | null
}

type ProfileRow = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'full_name' | 'plan' | 'current_streak' | 'current_level' | 'last_practice_date'
>

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

const RHYTHMUSFUNDAMENT_SLUG = 'rhythmusfundament'

function todayDateString(): string {
  // ISO date (YYYY-MM-DD) in UTC. Good enough for daily_activity bucketing.
  return new Date().toISOString().slice(0, 10)
}

function firstName(fullName: string | null | undefined): string | null {
  if (!fullName) return null
  const trimmed = fullName.trim()
  if (!trimmed) return null
  // First whitespace-separated token. "Anna Müller" → "Anna"; "Jean-Paul" → "Jean-Paul".
  const first = trimmed.split(/\s+/)[0]
  return first || null
}

function formatRelativeLastPractice(iso: string | null): string {
  if (!iso) return 'Schön, dass du da bist.'
  const then = new Date(iso)
  if (Number.isNaN(then.getTime())) return 'Schön, dass du da bist.'
  const now = new Date()
  const diffMs = now.getTime() - then.getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'Letzter Besuch: heute'
  if (days === 1) return 'Letzter Besuch: gestern'
  if (days < 7) return `Letzter Besuch: vor ${days} Tagen`
  if (days < 30) return `Letzter Besuch: vor ${Math.floor(days / 7)} Wochen`
  if (days < 365) return `Letzter Besuch: vor ${Math.floor(days / 30)} Monaten`
  return `Letzter Besuch: vor ${Math.floor(days / 365)} Jahren`
}

function levelLabel(level: string | null | undefined): string {
  if (!level) return 'OFFEN'
  const v = level.toLowerCase()
  if (v.startsWith('anf')) return 'ANFÄNGER'
  if (v.startsWith('mit')) return 'MITTEL'
  if (v.startsWith('fort')) return 'FORTGESCHRITTEN'
  return level.toUpperCase()
}

// Consecutive days ending today (or yesterday if no login yet today).
function computeStreak(days: string[]): number {
  if (days.length === 0) return 0
  const sorted = Array.from(new Set(days)).sort().reverse()
  let expected = sorted[0] // start from the most recent day on record
  let streak = 0
  for (const d of sorted) {
    if (d !== expected) break
    streak++
    const dt = new Date(expected)
    dt.setUTCDate(dt.getUTCDate() - 1)
    expected = dt.toISOString().slice(0, 10)
  }
  // If the most-recent activity is older than yesterday, streak is broken.
  const today = todayDateString()
  const yesterday = (() => {
    const t = new Date(today)
    t.setUTCDate(t.getUTCDate() - 1)
    return t.toISOString().slice(0, 10)
  })()
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0
  return streak
}

type StreakTier = { name: string; level: number; min: number }
// Placeholder naming — Nils to finalize in Phase 2 polish.
const STREAK_TIERS: StreakTier[] = [
  { name: 'Ritualisiert', level: 5, min: 30 },
  { name: 'Eingerichtet', level: 4, min: 14 },
  { name: 'Tägliche Praxis', level: 3, min: 7 },
  { name: 'Im Fluss', level: 2, min: 3 },
  { name: 'Erste Schritte', level: 1, min: 1 },
]
function streakLevel(streak: number): { name: string; level: number } {
  if (streak <= 0) return { name: 'Bereit zum Start', level: 0 }
  return STREAK_TIERS.find((t) => streak >= t.min) ?? STREAK_TIERS[STREAK_TIERS.length - 1]
}

// ──────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────

export default async function TrainingHubPage() {
  const supabase = await createClient()

  // A. Auth gate
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // B. Parallel reads
  const [profileRes, enrollmentsRes, completionsRes, savedPatternsRes, activityRes] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, plan, current_streak, current_level, last_practice_date')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('enrollments')
        .select(
          'program_id, status, started_at, programs(id, title, slug, description, level, category, total_exercises)'
        )
        .eq('user_id', user.id),
      supabase
        .from('completions')
        .select('exercise_id, exercises(program_id)')
        .eq('user_id', user.id),
      supabase
        .from('saved_patterns')
        .select('id, name, notation, bpm, handsatz, tags, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6),
      supabase
        .from('daily_activity')
        .select('day')
        .eq('user_id', user.id)
        .order('day', { ascending: false })
        .limit(60),
    ])

  const profile: ProfileRow | null = (profileRes.data as ProfileRow | null) ?? null

  // First-time / unvollständiges Profil → Onboarding erzwingen, bevor der Hub zeigt.
  // Verhindert die Anrede mit dem Email-Local-Part.
  if (!profile?.full_name) {
    redirect('/settings?onboarding=true')
  }

  const enrollments: EnrollmentRow[] = (enrollmentsRes.data as EnrollmentRow[] | null) ?? []
  type CompletionRow = { exercise_id: string; exercises: { program_id: string } | null }
  const completionRows: CompletionRow[] = (completionsRes.data as CompletionRow[] | null) ?? []
  const completionCount: number = completionRows.length
  const completionsByProgram = new Map<string, number>()
  for (const c of completionRows) {
    const pid = c.exercises?.program_id
    if (pid) completionsByProgram.set(pid, (completionsByProgram.get(pid) ?? 0) + 1)
  }
  type SavedPatternRow = {
    id: string
    name: string
    notation: string
    bpm: number | null
    handsatz: string | null
    tags: string[] | null
    created_at: string | null
  }
  const savedPatterns: SavedPatternRow[] = (savedPatternsRes.data as SavedPatternRow[] | null) ?? []
  const savedPatternsCount: number = savedPatterns.length
  const activityDays: string[] = (activityRes.data ?? []).map(
    (r: { day: string }) => r.day,
  )

  // C. Kein Auto-Enrollment mehr: Kurszugang kommt ausschließlich über
  // Grandfathering (Migration fundament_access_gating) oder einen
  // eingelösten Zugangs-Code (redeem_access_code). Neue Accounts sehen
  // stattdessen die gesperrte Kurskarte (RedeemCodeCard).

  // D. Fire-and-forget daily activity upsert. Never throw.
  try {
    await supabase
      .from('daily_activity')
      .upsert({ user_id: user.id, day: todayDateString() }, { onConflict: 'user_id,day' })
  } catch {
    // ignore — non-critical
  }

  // ── Derived view data ──────────────────────────────────────────────
  const userFirstName = firstName(profile?.full_name)
  const greetingSub = formatRelativeLastPractice(profile?.last_practice_date ?? null)
  const hasRhythmusfundament = enrollments.some(
    (e) => e.programs?.slug === RHYTHMUSFUNDAMENT_SLUG
  )
  // Streak is computed from daily_activity (source of truth) — the `profile.current_streak`
  // column is a denormalized cache that no job updates yet.
  const streak = computeStreak(activityDays)
  const streakInfo = streakLevel(streak)
  // 30-day grid: today + 29 days back. true = had activity, false = none.
  const heatmap: { day: string; active: boolean }[] = (() => {
    const activitySet = new Set(activityDays)
    const out: { day: string; active: boolean }[] = []
    const t = new Date(todayDateString())
    for (let i = 29; i >= 0; i--) {
      const dt = new Date(t)
      dt.setUTCDate(dt.getUTCDate() - i)
      const ds = dt.toISOString().slice(0, 10)
      out.push({ day: ds, active: activitySet.has(ds) })
    }
    return out
  })()

  return (
    <>
      <style>{HUB_CSS}</style>

      <main className="hub-page">
        <div className="hub-wrap">
          {/* ── HERO ── */}
          <section className="hub-hero">
            <div className="hub-hero-kicker">Rhythm Gym · Personal</div>
            <h1>
              {userFirstName ? (
                <>
                  GRÜẞ DICH LIEBE/R <span className="hub-hero-name">{userFirstName}</span>!
                </>
              ) : (
                'GRÜẞ DICH!'
              )}
            </h1>
            <p className="hub-hero-sub">{greetingSub}</p>
            {!userFirstName && (
              <p className="hub-hero-name-prompt">
                <Link href="/settings" className="hub-hero-name-link">
                  → Vornamen in den Einstellungen setzen
                </Link>
              </p>
            )}

            {hasRhythmusfundament ? (
              <Link href="/training/rhythmusfundament" className="hub-cta-primary">
                Weiter mit Rhythmus-Fundament →
              </Link>
            ) : (
              <Link href="/patterns" className="hub-cta-primary">
                Kurs-Katalog entdecken →
              </Link>
            )}

          </section>

          {/* ── MEINE PROGRAMME ── */}
          <section className="hub-zone">
            <div className="hub-zone-head">
              <span className="hub-eyebrow">Meine Programme</span>
              <h2>WORAN DU GERADE ARBEITEST</h2>
            </div>

            <div className="hub-grid">
                {!hasRhythmusfundament && <RedeemCodeCard />}
                {enrollments.map((enr) => {
                  const p = enr.programs
                  if (!p) return null
                  const total = p.total_exercises ?? 0
                  const done = completionsByProgram.get(p.id) ?? 0
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0
                  return (
                    <article key={p.id} className="hub-card hub-program-card">
                      <div className="hub-card-top">
                        <span className="hub-chip">{levelLabel(p.level)}</span>
                        {enr.status && enr.status !== 'active' && (
                          <span className="hub-chip hub-chip-muted">
                            {enr.status.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <h3 className="hub-card-title">{p.title}</h3>
                      {p.description && (
                        <p className="hub-card-desc">{p.description}</p>
                      )}
                      <div className="hub-progress">
                        <div className="hub-progress-bar" aria-hidden="true">
                          <span className="hub-progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="hub-progress-label">
                          {done} von {total} Übungen abgehakt
                          {total > 0 ? <> · <strong>{pct} %</strong></> : null}
                        </span>
                      </div>
                      <Link
                        href={`/training/${p.slug}`}
                        className="hub-cta-secondary"
                      >
                        Weiter →
                      </Link>
                    </article>
                  )
                })}
            </div>
          </section>

          {/* ── PRAXIS-SPIEGEL (live) ── */}
          <section className="hub-zone">
            <div className="hub-zone-head">
              <span className="hub-eyebrow">Praxis-Spiegel</span>
              <h2>DEIN RHYTHMUS-DIALOG</h2>
            </div>

            <div className="hub-stats-grid">
              {/* Streak */}
              <div className="hub-stat-card">
                <div className="hub-stat-eyebrow">Streak · Level {streakInfo.level}</div>
                <div className="hub-stat-value">
                  {streak}
                  <span className="hub-stat-unit">
                    {streak === 1 ? 'Tag' : 'Tage'}
                  </span>
                </div>
                <div className="hub-stat-label hub-stat-label--accent">{streakInfo.name}</div>
              </div>

              {/* Übungen abgehakt — total + Rhythmusfundament % */}
              {(() => {
                const rfEnrollment = enrollments.find(
                  (e) => e.programs?.slug === RHYTHMUSFUNDAMENT_SLUG,
                )
                const rfTotal = rfEnrollment?.programs?.total_exercises ?? 0
                const rfDone = rfEnrollment?.programs
                  ? (completionsByProgram.get(rfEnrollment.programs.id) ?? 0)
                  : 0
                const rfPct = rfTotal > 0 ? Math.round((rfDone / rfTotal) * 100) : 0
                return (
                  <div className="hub-stat-card">
                    <div className="hub-stat-eyebrow">Übungen abgehakt</div>
                    <div className="hub-stat-value">
                      {completionCount}
                      <span className="hub-stat-unit">gesamt</span>
                    </div>
                    {rfTotal > 0 ? (
                      <div className="hub-stat-label">
                        Rhythmus-Fundament: <strong>{rfDone}</strong> von {rfTotal} ·{' '}
                        <span className="hub-stat-label--accent">{rfPct} %</span>
                      </div>
                    ) : (
                      <div className="hub-stat-label">Noch keine Übungen abgehakt</div>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* 30-Tage Spiegel — eine Reihe Punkte */}
            <div className="hub-heatmap">
              <div className="hub-heatmap-label">Letzte 30 Tage</div>
              <div className="hub-heatmap-row" aria-label="Login-Aktivität der letzten 30 Tage">
                {heatmap.map((d) => (
                  <span
                    key={d.day}
                    className={d.active ? 'hub-heat-cell hub-heat-cell--on' : 'hub-heat-cell'}
                    title={d.day}
                  />
                ))}
              </div>
              <div className="hub-heatmap-foot">
                <span>vor 30 Tagen</span>
                <span>heute →</span>
              </div>
            </div>
          </section>

          {/* ── MEINE PATTERNS (live) ── */}
          <section className="hub-zone">
            <div className="hub-zone-head">
              <span className="hub-eyebrow">Meine Patterns</span>
              <h2>DEINE PERSÖNLICHE BIBLIOTHEK</h2>
            </div>

            {savedPatterns.length === 0 ? (
              <div className="hub-card hub-empty">
                <p>
                  Noch keine Patterns gespeichert. Bau dir eines im{' '}
                  <Link href="/tool" className="hub-inline-link">
                    Tool
                  </Link>
                  {' '}und klick „💾 Speichern" — die landen dann hier.
                </p>
              </div>
            ) : (
              <>
                <div className="hub-pattern-grid">
                  {savedPatterns.map((sp) => {
                    const toolHref = (() => {
                      const params = new URLSearchParams({
                        pattern: sp.notation,
                        bpm: String(sp.bpm ?? 60),
                        handsatz: sp.handsatz ?? 'frei',
                        from: 'meine',
                        label: sp.name,
                      })
                      return `/tool?${params.toString()}`
                    })()
                    const cells = sp.notation.split('')
                    return (
                      <article key={sp.id} className="hub-pattern-card">
                        <header className="hub-pattern-card-head">
                          <h3 className="hub-pattern-card-title">{sp.name}</h3>
                          <span className="hub-pattern-card-meta">
                            {sp.bpm ?? 60} BPM · {sp.handsatz ?? 'frei'}
                          </span>
                        </header>
                        <div className="hub-pattern-mini" aria-hidden="true">
                          {cells.map((c, i) => (
                            <span
                              key={i}
                              className={`hub-pattern-cell hub-pattern-cell--${c === '.' ? 'rest' : c}${i % 4 === 0 ? ' hub-pattern-cell--downbeat' : ''}`}
                            />
                          ))}
                        </div>
                        {sp.tags && sp.tags.length > 0 && (
                          <div className="hub-pattern-tags">
                            {sp.tags.slice(0, 4).map((t) => (
                              <span key={t} className="hub-pattern-tag">{t}</span>
                            ))}
                          </div>
                        )}
                        <Link href={toolHref} className="hub-pattern-open">
                          Im Tool öffnen →
                        </Link>
                      </article>
                    )
                  })}
                </div>
                {savedPatternsCount >= 6 && (
                  <p className="hub-pattern-more">
                    Zeige die letzten 6. Weitere im{' '}
                    <Link href="/tool" className="hub-inline-link">
                      Tool
                    </Link>{' '}
                    (volle Bibliothek folgt).
                  </p>
                )}
              </>
            )}
          </section>

          {/* ── QUICK ACTIONS ── */}
          <section className="hub-zone">
            <div className="hub-zone-head">
              <span className="hub-eyebrow">Weitergehen</span>
              <h2>NÄCHSTE SCHRITTE</h2>
            </div>
            <div className="hub-actions">
              <Link href="/patterns" className="hub-action hub-action-primary">
                Mehr Kurse entdecken →
              </Link>
              <Link href="/tool" className="hub-action">
                Freies Spiel im Tool →
              </Link>
              <Link href="/glossar" className="hub-action">
                Glossar lesen →
              </Link>
            </div>
          </section>

          {/* ── ACCOUNT BAR ── */}
          <footer className="hub-account">
            <div className="hub-account-info">
              <span className="hub-account-label">Eingeloggt als</span>
              <span className="hub-account-email">{user.email}</span>
              {profile?.plan && (
                <span className="hub-account-plan">Plan: {profile.plan}</span>
              )}
            </div>
            <div className="hub-account-actions">
              <Link href="/settings" className="hub-settings-link">
                Einstellungen
              </Link>
              <form action="/auth/logout" method="POST" className="hub-logout-form">
                <button type="submit" className="hub-logout-btn">
                  Abmelden
                </button>
              </form>
            </div>
          </footer>
        </div>
      </main>
    </>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────────────

const HUB_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Anton&family=Barlow:wght@300;400;600&family=Barlow+Condensed:wght@300;400;700&display=swap');

  .hub-page {
    min-height: 100vh;
    background: var(--black);
    color: var(--cream);
    padding: 48px 24px 96px;
    font-family: 'Barlow', sans-serif;
  }

  .hub-wrap {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 56px;
  }

  /* ── HERO ── */
  .hub-hero-name-prompt {
    margin-top: 12px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--muted);
  }
  .hub-hero-name-link {
    color: var(--amber);
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition: border-color 0.15s ease;
  }
  .hub-hero-name-link:hover {
    border-bottom-color: var(--amber);
  }
  .hub-account-actions {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .hub-settings-link {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    text-decoration: none;
    padding: 8px 14px;
    border: 1px solid var(--border);
    border-radius: 3px;
    transition: color 0.15s ease, border-color 0.15s ease;
  }
  .hub-settings-link:hover {
    color: var(--amber);
    border-color: var(--amber);
  }

  .hub-hero {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 40px 32px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    position: relative;
    overflow: hidden;
  }
  .hub-hero::before {
    content: '';
    position: absolute;
    top: -120px;
    right: -120px;
    width: 360px;
    height: 360px;
    background: radial-gradient(circle, rgba(245,166,35,0.08) 0%, transparent 70%);
    pointer-events: none;
  }
  .hub-hero-kicker {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .hub-hero h1 {
    font-family: 'Anton', sans-serif;
    font-size: clamp(36px, 6vw, 56px);
    letter-spacing: 2px;
    line-height: 1.05;
    color: var(--cream);
    margin: 0;
  }
  .hub-hero-name {
    color: var(--amber);
  }
  .hub-hero-sub {
    font-size: 15px;
    color: var(--muted2);
    margin: 0;
  }
  .hub-hero-note {
    font-size: 13px;
    color: var(--muted);
    margin: 0;
    font-style: italic;
  }

  /* ── CTAs ── */
  .hub-cta-primary {
    align-self: flex-start;
    margin-top: 8px;
    display: inline-block;
    background: var(--amber);
    color: var(--black);
    padding: 14px 28px;
    border-radius: 4px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    text-decoration: none;
    transition: background 0.2s, transform 0.15s;
  }
  .hub-cta-primary:hover {
    background: var(--amber2);
    transform: translateY(-1px);
  }

  .hub-cta-secondary {
    display: inline-block;
    margin-top: auto;
    padding: 10px 18px;
    border: 1px solid var(--amber);
    color: var(--amber);
    border-radius: 4px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    text-decoration: none;
    align-self: flex-start;
    transition: background 0.2s, color 0.2s;
  }
  .hub-cta-secondary:hover {
    background: var(--amber);
    color: var(--black);
  }

  /* ── ZONE ── */
  .hub-zone {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .hub-zone-head {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .hub-eyebrow {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .hub-zone-head h2 {
    font-family: 'Anton', sans-serif;
    font-size: 22px;
    letter-spacing: 2px;
    color: var(--cream);
    margin: 0;
  }

  /* ── GRID ── */
  .hub-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
  }

  /* ── CARD ── */
  .hub-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .hub-program-card {
    min-height: 240px;
  }
  .hub-card-top {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .hub-chip {
    display: inline-block;
    padding: 4px 10px;
    background: var(--amber-dim);
    color: var(--amber);
    border-radius: 2px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .hub-chip-muted {
    background: rgba(122,112,96,0.15);
    color: var(--muted);
  }
  .hub-card-title {
    font-family: 'Anton', sans-serif;
    font-size: 26px;
    letter-spacing: 1px;
    color: var(--cream);
    margin: 0;
    line-height: 1.1;
  }
  .hub-card-desc {
    font-size: 14px;
    color: var(--text);
    margin: 0;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* ── LOCKED CARD + CODE REDEEM ── */
  .hub-locked-card {
    border-style: dashed;
    border-color: rgba(245, 166, 35, 0.45);
  }
  .hub-redeem-form {
    display: flex;
    gap: 10px;
    margin-top: 4px;
  }
  .hub-redeem-input {
    flex: 1;
    min-width: 0;
    background: var(--dark);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--cream);
    padding: 12px 14px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 16px; /* ≥16px — verhindert iOS-Auto-Zoom (Mobile-Regel) */
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .hub-redeem-input:focus {
    outline: none;
    border-color: var(--amber);
  }
  .hub-redeem-input::placeholder {
    color: var(--muted);
    opacity: 0.6;
  }
  .hub-redeem-btn {
    background: var(--amber);
    color: var(--black);
    border: none;
    border-radius: 4px;
    padding: 12px 20px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.2s;
    white-space: nowrap;
  }
  .hub-redeem-btn:hover { background: var(--amber2); }
  .hub-redeem-btn:disabled { opacity: 0.6; cursor: wait; }
  .hub-redeem-error {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: #ff6b35;
  }
  .hub-redeem-hint {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--muted);
  }
  @media (max-width: 480px) {
    .hub-redeem-form { flex-direction: column; }
    .hub-redeem-btn { width: 100%; }
  }

  /* ── PROGRESS ── */
  .hub-progress {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 4px;
  }
  .hub-progress-bar {
    width: 100%;
    height: 6px;
    background: var(--dark);
    border: 1px solid var(--border);
    border-radius: 3px;
    overflow: hidden;
  }
  .hub-progress-fill {
    display: block;
    height: 100%;
    background: var(--amber);
    transition: width 0.3s;
  }
  .hub-progress-label {
    font-size: 11px;
    color: var(--muted);
    font-family: 'Barlow Condensed', sans-serif;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  /* ── EMPTY / PLACEHOLDER ── */
  .hub-empty p,
  .hub-placeholder p {
    font-size: 14px;
    color: var(--text);
    margin: 0;
    line-height: 1.6;
  }
  .hub-placeholder {
    opacity: 0.78;
    border-style: dashed;
  }
  .hub-placeholder-tag {
    align-self: flex-start;
    padding: 3px 8px;
    background: rgba(122,112,96,0.12);
    color: var(--muted2);
    border: 1px solid var(--border);
    border-radius: 2px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
  }

  /* ── STATS (Phase 2 live) ── */
  .hub-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 16px;
    margin-bottom: 20px;
  }
  .hub-stat-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .hub-stat-eyebrow {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .hub-stat-value {
    font-family: 'Anton', sans-serif;
    font-size: 48px;
    line-height: 1;
    color: var(--cream);
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin: 4px 0 0;
  }
  .hub-stat-unit {
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
  }
  .hub-stat-label {
    font-size: 14px;
    color: var(--text);
    line-height: 1.5;
    margin: 0;
  }
  .hub-stat-label--accent {
    color: var(--amber);
    font-weight: 600;
  }

  /* ── 30-DAY HEATMAP ── */
  .hub-heatmap {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .hub-heatmap-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--muted);
  }
  .hub-heatmap-row {
    display: grid;
    grid-template-columns: repeat(30, 1fr);
    gap: 4px;
  }
  .hub-heat-cell {
    display: block;
    height: 18px;
    border-radius: 2px;
    background: var(--border);
    opacity: 0.5;
  }
  .hub-heat-cell--on {
    background: var(--amber);
    opacity: 0.9;
  }
  .hub-heatmap-foot {
    display: flex;
    justify-content: space-between;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--muted);
  }
  @media (max-width: 480px) {
    .hub-stat-value { font-size: 36px; }
    .hub-heat-cell { height: 12px; }
    .hub-heatmap-row { gap: 3px; }
  }

  /* ── PATTERN LIBRARY (Phase 3 live) ── */
  .hub-pattern-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 14px;
  }
  .hub-pattern-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: border-color 0.15s ease, transform 0.15s ease;
  }
  .hub-pattern-card:hover {
    border-color: var(--amber);
    transform: translateY(-2px);
  }
  .hub-pattern-card-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
  }
  .hub-pattern-card-title {
    font-family: 'Anton', sans-serif;
    font-size: 18px;
    color: var(--cream);
    margin: 0;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    line-height: 1.1;
  }
  .hub-pattern-card-meta {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--muted);
    white-space: nowrap;
  }
  .hub-pattern-mini {
    display: grid;
    grid-template-columns: repeat(16, 1fr);
    gap: 2px;
    height: 28px;
  }
  .hub-pattern-cell {
    display: block;
    border-radius: 1px;
    background: var(--border);
    opacity: 0.5;
  }
  .hub-pattern-cell--downbeat { border-left: 1px solid var(--amber); }
  .hub-pattern-cell--rest { background: var(--border); opacity: 0.25; }
  .hub-pattern-cell--g { background: var(--muted); opacity: 0.55; }
  .hub-pattern-cell--T { background: #9CA98A; opacity: 0.85; }
  .hub-pattern-cell--S { background: var(--amber); opacity: 0.95; }
  .hub-pattern-cell--D { background: var(--cream); opacity: 0.9; }

  .hub-pattern-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .hub-pattern-tag {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--muted);
    padding: 2px 8px;
    border: 1px solid var(--border);
    border-radius: 2px;
  }
  .hub-pattern-open {
    margin-top: auto;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--amber);
    text-decoration: none;
    padding-top: 6px;
    border-top: 1px solid var(--border);
    transition: color 0.15s ease;
  }
  .hub-pattern-open:hover { color: var(--cream); }
  .hub-pattern-more {
    margin: 14px 0 0;
    font-size: 13px;
    color: var(--muted);
  }
  .hub-empty {
    background: var(--card);
    border: 1px dashed var(--border);
    border-radius: 10px;
    padding: 24px;
    color: var(--muted);
  }

  /* ── INLINE LINK ── */
  .hub-inline-link {
    color: var(--amber);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .hub-inline-link:hover {
    color: var(--amber2);
  }

  /* ── ACTIONS ── */
  .hub-actions {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .hub-action {
    display: block;
    padding: 18px 22px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--cream);
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 2px;
    text-transform: uppercase;
    text-decoration: none;
    transition: border-color 0.2s, color 0.2s, transform 0.15s;
  }
  .hub-action:hover {
    border-color: var(--amber);
    color: var(--amber);
    transform: translateY(-1px);
  }
  .hub-action-primary {
    background: var(--amber-dim);
    border-color: var(--amber);
    color: var(--amber);
  }
  .hub-action-primary:hover {
    background: var(--amber);
    color: var(--black);
  }

  /* ── ACCOUNT BAR ── */
  .hub-account {
    margin-top: 16px;
    padding: 20px 24px;
    background: var(--dark);
    border: 1px solid var(--border);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .hub-account-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .hub-account-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
  }
  .hub-account-email {
    font-size: 14px;
    color: var(--cream);
    word-break: break-all;
  }
  .hub-account-plan {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--muted2);
  }
  .hub-logout-form {
    margin: 0;
  }
  .hub-logout-btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted2);
    padding: 10px 18px;
    border-radius: 4px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s;
  }
  .hub-logout-btn:hover {
    border-color: var(--amber);
    color: var(--amber);
  }

  /* ── Desktop ── */
  @media (min-width: 760px) {
    .hub-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .hub-actions {
      grid-template-columns: repeat(3, 1fr);
    }
    .hub-hero {
      padding: 56px 48px;
    }
  }

  /* ── Mobile (≤ 480px) ── */
  @media (max-width: 480px) {
    .hub-page {
      padding: 32px 16px 80px;
    }
    .hub-wrap {
      gap: 40px;
    }
    .hub-hero {
      padding: 28px 22px;
    }
    .hub-card {
      padding: 20px;
    }
    .hub-cta-primary {
      align-self: stretch;
      text-align: center;
    }
    .hub-cta-secondary {
      align-self: stretch;
      text-align: center;
    }
    .hub-action {
      text-align: center;
    }
    .hub-account {
      flex-direction: column;
      align-items: stretch;
      gap: 14px;
    }
    .hub-logout-form {
      width: 100%;
    }
    .hub-logout-btn {
      width: 100%;
    }
  }
`
