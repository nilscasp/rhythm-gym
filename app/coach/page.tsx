import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../lib/supabase/server'
import type { Database } from '../lib/supabase/database.types'
import { createAccessCodeAction, toggleAccessCodeAction } from './_actions'
import { PendingSubmitButton } from './_components/PendingSubmitButton'

export const metadata = {
  title: 'Coach-Sicht — Rhythm Gym',
  description: 'Schüler-Übersicht mit Stufe, Aktivität und Fortschritt.',
}

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────

type ProfileRow = Database['public']['Tables']['profiles']['Row']

type AccessCodeRow = Pick<
  Database['public']['Tables']['access_codes']['Row'],
  'id' | 'code' | 'max_uses' | 'uses' | 'expires_at' | 'active' | 'note' | 'created_at'
>

// Dreyfus-Stufen — Single Source: app/settings/page.tsx (eines Tages teilen).
const LEVEL_LABEL: Record<number, string> = {
  1: 'Neuling',
  2: 'Fortgeschrittener Anfänger',
  3: 'Kompetent',
  4: 'Gewandt',
  5: 'Experte',
}
const LEVEL_SHORT: Record<number, string> = {
  1: 'Neuling',
  2: 'Fortg. Anfänger',
  3: 'Kompetent',
  4: 'Gewandt',
  5: 'Experte',
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoUTC(n: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

// Consecutive activity days ending today/yesterday — Streak.
function computeStreak(days: string[]): number {
  if (days.length === 0) return 0
  const sorted = Array.from(new Set(days)).sort().reverse()
  const today = todayUTC()
  const yesterday = daysAgoUTC(1)
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0
  let expected = sorted[0]
  let streak = 0
  for (const d of sorted) {
    if (d !== expected) break
    streak++
    const dt = new Date(expected)
    dt.setUTCDate(dt.getUTCDate() - 1)
    expected = dt.toISOString().slice(0, 10)
  }
  return streak
}

function formatLastActive(lastDay: string | null): { text: string; tone: 'fresh' | 'warm' | 'stale' | 'cold' | 'never' } {
  if (!lastDay) return { text: 'Noch nie aktiv', tone: 'never' }
  const today = todayUTC()
  if (lastDay === today) return { text: 'Heute aktiv', tone: 'fresh' }
  const then = new Date(lastDay)
  const now = new Date()
  const diffMs = now.getTime() - then.getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days <= 1) return { text: 'Gestern aktiv', tone: 'fresh' }
  if (days < 7) return { text: `vor ${days} Tagen`, tone: 'warm' }
  if (days < 30) return { text: `vor ${Math.floor(days / 7)} Wochen`, tone: 'stale' }
  if (days < 365) return { text: `vor ${Math.floor(days / 30)} Monaten`, tone: 'cold' }
  return { text: `vor ${Math.floor(days / 365)} Jahren`, tone: 'cold' }
}

function formatJoined(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function firstNameOr(name: string | null, fallback: string): string {
  if (!name) return fallback
  const trimmed = name.trim()
  return trimmed || fallback
}

// ──────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────

export default async function CoachPage() {
  const supabase = await createClient()

  // A. Auth gate
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // B. Admin gate — non-admin landet auf /training.
  const { data: meProfile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()
  if (!meProfile?.is_admin) redirect('/training')

  // C. Parallel reads (RLS lässt Admins alle Zeilen sehen — siehe Migration
  //    add_admin_role_and_rls_policies)
  const since90 = daysAgoUTC(90)
  const [profilesRes, completionsRes, patternsRes, activityRes, enrollmentsRes, codesRes] =
    await Promise.all([
      supabase
        .from('profiles')
        .select(
          'id, email, full_name, current_level, plan, created_at, last_practice_date, is_admin'
        )
        .order('created_at', { ascending: true }),
      supabase.from('completions').select('user_id'),
      supabase.from('saved_patterns').select('user_id'),
      supabase.from('daily_activity').select('user_id, day').gte('day', since90),
      supabase.from('enrollments').select('user_id, program_id, status'),
      supabase
        .from('access_codes')
        .select('id, code, max_uses, uses, expires_at, active, note, created_at')
        .order('created_at', { ascending: false }),
    ])

  const profiles: ProfileRow[] = (profilesRes.data ?? []) as ProfileRow[]
  const codes: AccessCodeRow[] = (codesRes.data as AccessCodeRow[] | null) ?? []

  // Aggregate maps per user
  const completionsByUser = new Map<string, number>()
  for (const c of completionsRes.data ?? []) {
    const uid = c.user_id
    completionsByUser.set(uid, (completionsByUser.get(uid) ?? 0) + 1)
  }
  const patternsByUser = new Map<string, number>()
  for (const p of patternsRes.data ?? []) {
    const uid = p.user_id
    patternsByUser.set(uid, (patternsByUser.get(uid) ?? 0) + 1)
  }
  const activityByUser = new Map<string, string[]>()
  for (const a of activityRes.data ?? []) {
    const uid = a.user_id
    if (!activityByUser.has(uid)) activityByUser.set(uid, [])
    activityByUser.get(uid)!.push(a.day)
  }
  const enrollmentsByUser = new Map<string, number>()
  for (const e of enrollmentsRes.data ?? []) {
    const uid = e.user_id
    enrollmentsByUser.set(uid, (enrollmentsByUser.get(uid) ?? 0) + 1)
  }

  // Build student rows (Admins werden separat unten gelistet)
  type StudentRow = {
    id: string
    email: string | null
    fullName: string | null
    level: number | null
    plan: string | null
    createdAt: string | null
    lastDay: string | null
    streak: number
    completions: number
    patterns: number
    enrollments: number
    isAdmin: boolean
  }
  const allRows: StudentRow[] = profiles.map((p) => {
    const days = (activityByUser.get(p.id) ?? []).slice().sort().reverse()
    const lastDay = days[0] ?? p.last_practice_date ?? null
    return {
      id: p.id,
      email: p.email,
      fullName: p.full_name,
      level: p.current_level,
      plan: p.plan,
      createdAt: p.created_at,
      lastDay,
      streak: computeStreak(days),
      completions: completionsByUser.get(p.id) ?? 0,
      patterns: patternsByUser.get(p.id) ?? 0,
      enrollments: enrollmentsByUser.get(p.id) ?? 0,
      isAdmin: p.is_admin,
    }
  })

  const students = allRows.filter((r) => !r.isAdmin)
  const admins = allRows.filter((r) => r.isAdmin)

  // Sort students: zuletzt aktiv zuerst, „noch nie" am Ende
  students.sort((a, b) => {
    if (!a.lastDay && !b.lastDay) return 0
    if (!a.lastDay) return 1
    if (!b.lastDay) return -1
    return b.lastDay.localeCompare(a.lastDay)
  })

  // Aggregate stats
  const totalStudents = students.length
  const sevenDaysAgo = daysAgoUTC(7)
  const activeWeekly = students.filter((s) => s.lastDay && s.lastDay >= sevenDaysAgo).length
  const totalCompletions = students.reduce((a, s) => a + s.completions, 0)
  const totalPatterns = students.reduce((a, s) => a + s.patterns, 0)

  const levelDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let levelUnset = 0
  for (const s of students) {
    if (s.level && s.level >= 1 && s.level <= 5) {
      levelDist[s.level] = (levelDist[s.level] ?? 0) + 1
    } else {
      levelUnset++
    }
  }
  const maxLevelBar = Math.max(1, ...Object.values(levelDist), levelUnset)

  return (
    <>
      <style>{COACH_CSS}</style>

      <main className="cch-page">
        <div className="cch-wrap">
          <header className="cch-head">
            <div className="cch-eyebrow">Coach-Sicht</div>
            <h1>SCHÜLER-ÜBERSICHT</h1>
            <p className="cch-sub">
              {totalStudents} {totalStudents === 1 ? 'Schüler:in' : 'Schüler:innen'} ·{' '}
              {activeWeekly} {activeWeekly === 1 ? 'aktiv' : 'aktive'} diese Woche
            </p>
          </header>

          {/* ── Aggregate Stats ───────────────────────────────────────── */}
          <section className="cch-grid">
            <StatCard label="Schüler" value={totalStudents} />
            <StatCard label="Aktiv (7T)" value={activeWeekly} />
            <StatCard label="Übungen abg." value={totalCompletions} />
            <StatCard label="Gespeicherte Patterns" value={totalPatterns} />
          </section>

          {/* ── Stufen-Verteilung ─────────────────────────────────────── */}
          <section className="cch-section">
            <header className="cch-section-head">
              <div className="cch-eyebrow">Verteilung</div>
              <h2>STUFEN (DREYFUS)</h2>
            </header>
            <div className="cch-level-bars">
              {([1, 2, 3, 4, 5] as const).map((lvl) => {
                const count = levelDist[lvl] ?? 0
                const pct = (count / maxLevelBar) * 100
                return (
                  <div key={lvl} className="cch-level-bar">
                    <span className="cch-level-bar-label">
                      {lvl < 10 ? `0${lvl}` : lvl} · {LEVEL_LABEL[lvl]}
                    </span>
                    <div className="cch-level-bar-track">
                      <div className="cch-level-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="cch-level-bar-count">{count}</span>
                  </div>
                )
              })}
              {levelUnset > 0 && (
                <div className="cch-level-bar">
                  <span className="cch-level-bar-label cch-level-bar-label--muted">— · keine Angabe</span>
                  <div className="cch-level-bar-track">
                    <div
                      className="cch-level-bar-fill cch-level-bar-fill--muted"
                      style={{ width: `${(levelUnset / maxLevelBar) * 100}%` }}
                    />
                  </div>
                  <span className="cch-level-bar-count">{levelUnset}</span>
                </div>
              )}
            </div>
          </section>

          {/* ── Schüler-Liste ─────────────────────────────────────────── */}
          <section className="cch-section">
            <header className="cch-section-head">
              <div className="cch-eyebrow">Aktivität · Sortiert nach zuletzt aktiv</div>
              <h2>SCHÜLER:INNEN</h2>
            </header>

            {students.length === 0 ? (
              <div className="cch-empty">
                Noch keine Schüler:innen registriert. Sobald sich jemand anmeldet,
                erscheint die Person hier.
              </div>
            ) : (
              <ul className="cch-list">
                {students.map((s) => {
                  const last = formatLastActive(s.lastDay)
                  const displayName = firstNameOr(
                    s.fullName,
                    s.email ? '— (kein Name)' : '— (anonym)'
                  )
                  return (
                    <li key={s.id} className={`cch-row cch-row--${last.tone}`}>
                      <div className="cch-row-main">
                        <div className="cch-row-name">{displayName}</div>
                        <div className="cch-row-email">{s.email ?? '—'}</div>
                      </div>
                      <div className="cch-row-stats">
                        <Stat label="Stufe" value={s.level ? LEVEL_SHORT[s.level] : '—'} />
                        <Stat label="Streak" value={s.streak > 0 ? `${s.streak}d` : '—'} />
                        <Stat label="Übungen" value={s.completions} />
                        <Stat label="Patterns" value={s.patterns} />
                      </div>
                      <div className={`cch-row-last cch-row-last--${last.tone}`}>
                        {last.text}
                        <span className="cch-row-joined">
                          Beigetreten {formatJoined(s.createdAt)}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* ── Zugangs-Codes (Rhythmus-Fundament) ────────────────────── */}
          <section className="cch-section">
            <header className="cch-section-head">
              <div className="cch-eyebrow">Rhythmus-Fundament · Kurszugang</div>
              <h2>ZUGANGS-CODES</h2>
            </header>

            <form action={createAccessCodeAction} className="cch-code-form">
              <label className="cch-code-field">
                <span>Nutzungen</span>
                <input type="number" name="max_uses" min={1} max={1000} defaultValue={1} required />
              </label>
              <label className="cch-code-field">
                <span>Gültig bis (optional)</span>
                <input type="date" name="expires_at" />
              </label>
              <label className="cch-code-field cch-code-field--grow">
                <span>Notiz (optional)</span>
                <input type="text" name="note" placeholder="z. B. Workshop Juni" maxLength={120} />
              </label>
              <PendingSubmitButton className="cch-code-create" pendingLabel="Generiere …">
                Code generieren
              </PendingSubmitButton>
            </form>

            {codes.length === 0 ? (
              <div className="cch-empty">
                Noch keine Codes erstellt. Generier oben den ersten und gib ihn
                an deine Teilnehmer:innen weiter — eingelöst wird er auf der
                Trainings-Seite.
              </div>
            ) : (
              <ul className="cch-list">
                {codes.map((c) => {
                  const expired = c.expires_at
                    ? new Date(c.expires_at).getTime() < Date.now()
                    : false
                  const exhausted = c.uses >= c.max_uses
                  const status = !c.active
                    ? 'deaktiviert'
                    : expired
                      ? 'abgelaufen'
                      : exhausted
                        ? 'aufgebraucht'
                        : 'aktiv'
                  return (
                    <li
                      key={c.id}
                      className={`cch-row cch-code-row ${status === 'aktiv' ? 'cch-code-row--on' : 'cch-code-row--off'}`}
                    >
                      <div className="cch-row-main">
                        <div className="cch-code-value">{c.code}</div>
                        <div className="cch-row-email">{c.note ?? '—'}</div>
                      </div>
                      <div className="cch-row-stats">
                        <Stat label="Eingelöst" value={`${c.uses}/${c.max_uses}`} />
                        <Stat label="Status" value={status} />
                        <Stat
                          label="Gültig bis"
                          value={c.expires_at ? formatJoined(c.expires_at) : '∞'}
                        />
                        <Stat label="Erstellt" value={formatJoined(c.created_at)} />
                      </div>
                      <div className="cch-code-actions">
                        <form action={toggleAccessCodeAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <button type="submit" className="cch-code-toggle">
                            {c.active ? 'Deaktivieren' : 'Aktivieren'}
                          </button>
                        </form>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* ── Admin-Liste (Coaches) ─────────────────────────────────── */}
          {admins.length > 0 && (
            <section className="cch-section">
              <header className="cch-section-head">
                <div className="cch-eyebrow">Team</div>
                <h2>COACHES</h2>
              </header>
              <ul className="cch-list">
                {admins.map((s) => {
                  const last = formatLastActive(s.lastDay)
                  const displayName = firstNameOr(s.fullName, s.email ?? '—')
                  return (
                    <li key={s.id} className="cch-row cch-row--admin">
                      <div className="cch-row-main">
                        <div className="cch-row-name">
                          {displayName} <span className="cch-admin-badge">Admin</span>
                        </div>
                        <div className="cch-row-email">{s.email ?? '—'}</div>
                      </div>
                      <div className="cch-row-stats">
                        <Stat label="Stufe" value={s.level ? LEVEL_SHORT[s.level] : '—'} />
                        <Stat label="Streak" value={s.streak > 0 ? `${s.streak}d` : '—'} />
                        <Stat label="Übungen" value={s.completions} />
                        <Stat label="Patterns" value={s.patterns} />
                      </div>
                      <div className="cch-row-last">{last.text}</div>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          <div className="cch-actions">
            <Link href="/training" className="cch-back">
              ← Zurück zum Training
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Small components
// ──────────────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="cch-stat-card">
      <span className="cch-stat-label">{label}</span>
      <span className="cch-stat-value">{value}</span>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="cch-stat">
      <span className="cch-stat-mini-label">{label}</span>
      <span className="cch-stat-mini-value">{value}</span>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Styles — prefixed `.cch-` (Coach)
// ──────────────────────────────────────────────────────────────────────
const COACH_CSS = `
  .cch-page {
    min-height: 100vh;
    min-height: 100dvh;
    background: var(--black);
    color: var(--cream);
    padding: 56px 24px 96px;
    font-family: 'Barlow', sans-serif;
  }
  .cch-wrap {
    max-width: 1080px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 40px;
  }
  .cch-head {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .cch-eyebrow {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .cch-head h1 {
    font-family: 'Anton', sans-serif;
    font-size: clamp(32px, 5vw, 48px);
    line-height: 1;
    margin: 4px 0 0;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .cch-sub {
    color: var(--muted);
    font-size: 14px;
    margin: 4px 0 0;
    line-height: 1.6;
  }

  /* Grid of headline stat cards */
  .cch-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }
  .cch-stat-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 18px 18px 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .cch-stat-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
  }
  .cch-stat-value {
    font-family: 'Anton', sans-serif;
    font-size: 32px;
    line-height: 1;
    color: var(--cream);
  }

  /* Section wrapper */
  .cch-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .cch-section-head {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .cch-section-head h2 {
    font-family: 'Anton', sans-serif;
    font-size: clamp(22px, 3vw, 28px);
    line-height: 1;
    margin: 4px 0 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--cream);
  }

  /* Level distribution bars */
  .cch-level-bars {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 20px 22px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .cch-level-bar {
    display: grid;
    grid-template-columns: 220px 1fr 32px;
    align-items: center;
    gap: 14px;
  }
  .cch-level-bar-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--cream);
  }
  .cch-level-bar-label--muted {
    color: var(--muted);
  }
  .cch-level-bar-track {
    height: 10px;
    background: var(--black);
    border: 1px solid var(--border);
    border-radius: 4px;
    overflow: hidden;
  }
  .cch-level-bar-fill {
    height: 100%;
    background: var(--amber);
    transition: width 0.3s ease;
  }
  .cch-level-bar-fill--muted {
    background: var(--muted);
  }
  .cch-level-bar-count {
    font-family: 'Anton', sans-serif;
    font-size: 18px;
    text-align: right;
    color: var(--cream);
  }

  /* Student list */
  .cch-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .cch-row {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 16px 18px;
    display: grid;
    grid-template-columns: 1.4fr 2fr 1fr;
    gap: 16px;
    align-items: center;
    border-left-width: 3px;
  }
  .cch-row--fresh   { border-left-color: var(--amber); }
  .cch-row--warm    { border-left-color: rgba(245, 166, 35, 0.55); }
  .cch-row--stale   { border-left-color: rgba(255, 107, 53, 0.55); }
  .cch-row--cold    { border-left-color: rgba(122, 112, 96, 0.6); }
  .cch-row--never   { border-left-color: rgba(122, 112, 96, 0.3); }
  .cch-row--admin   { border-left-color: var(--amber); background: rgba(245,166,35,0.04); }

  .cch-row-main {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .cch-row-name {
    font-family: 'Anton', sans-serif;
    font-size: 18px;
    letter-spacing: 0.5px;
    color: var(--cream);
    text-transform: uppercase;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .cch-admin-badge {
    display: inline-block;
    margin-left: 8px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 2px;
    color: var(--black);
    background: var(--amber);
    padding: 2px 6px;
    border-radius: 2px;
    vertical-align: middle;
  }
  .cch-row-email {
    font-size: 12px;
    color: var(--muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cch-row-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }
  .cch-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .cch-stat-mini-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--muted);
  }
  .cch-stat-mini-value {
    font-family: 'Barlow', sans-serif;
    font-size: 14px;
    font-weight: 500;
    color: var(--cream);
  }

  .cch-row-last {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    text-align: right;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 13px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .cch-row-last--fresh  { color: var(--amber); }
  .cch-row-last--warm   { color: rgba(245, 237, 216, 0.85); }
  .cch-row-last--stale  { color: rgba(255, 107, 53, 0.85); }
  .cch-row-last--cold   { color: var(--muted); }
  .cch-row-last--never  { color: var(--muted); font-style: italic; }
  .cch-row-joined {
    margin-top: 4px;
    font-size: 11px;
    letter-spacing: 1.5px;
    color: var(--muted);
    font-style: normal;
  }

  .cch-empty {
    background: var(--card);
    border: 1px dashed var(--border);
    border-radius: 6px;
    padding: 28px;
    text-align: center;
    color: var(--muted);
    font-size: 14px;
    line-height: 1.6;
  }

  .cch-actions {
    padding-top: 8px;
  }
  .cch-back {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    text-decoration: none;
    border-bottom: 1px solid transparent;
    padding-bottom: 2px;
    transition: color 0.15s ease, border-color 0.15s ease;
  }
  .cch-back:hover {
    color: var(--amber);
    border-bottom-color: var(--amber);
  }

  /* Zugangs-Codes */
  .cch-code-form {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 18px 20px;
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 14px;
  }
  .cch-code-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .cch-code-field--grow { flex: 1; min-width: 180px; }
  .cch-code-field span {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
  }
  .cch-code-field input {
    background: var(--black);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--cream);
    padding: 10px 12px;
    font-family: 'Barlow', sans-serif;
    font-size: 16px; /* ≥16px — verhindert iOS-Auto-Zoom (Mobile-Regel) */
  }
  .cch-code-field input:focus {
    outline: none;
    border-color: var(--amber);
  }
  .cch-code-create {
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
  }
  .cch-code-create:hover { background: var(--amber2); }
  .cch-code-row--on  { border-left-color: var(--amber); }
  .cch-code-row--off { border-left-color: rgba(122, 112, 96, 0.4); opacity: 0.75; }
  .cch-code-value {
    font-family: 'Courier New', monospace;
    font-size: 17px;
    font-weight: 700;
    letter-spacing: 2px;
    color: var(--amber);
    user-select: all;
  }
  .cch-code-actions {
    display: flex;
    justify-content: flex-end;
  }
  .cch-code-toggle {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted2);
    padding: 8px 14px;
    border-radius: 4px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s;
  }
  .cch-code-toggle:hover {
    border-color: var(--amber);
    color: var(--amber);
  }
  @media (max-width: 560px) {
    .cch-code-form { flex-direction: column; align-items: stretch; }
    .cch-code-actions { justify-content: flex-start; }
    .cch-code-toggle { width: 100%; }
  }

  /* Tablet */
  @media (max-width: 900px) {
    .cch-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .cch-row {
      grid-template-columns: 1fr 1fr;
      grid-template-areas:
        "main last"
        "stats stats";
    }
    .cch-row-main { grid-area: main; }
    .cch-row-stats { grid-area: stats; }
    .cch-row-last { grid-area: last; }
    .cch-level-bar {
      grid-template-columns: 1fr 1fr 32px;
      gap: 12px;
    }
  }
  /* Mobile */
  @media (max-width: 560px) {
    .cch-grid {
      grid-template-columns: 1fr 1fr;
    }
    .cch-stat-value {
      font-size: 28px;
    }
    .cch-row {
      grid-template-columns: 1fr;
      grid-template-areas:
        "main"
        "last"
        "stats";
      gap: 10px;
    }
    .cch-row-last {
      align-items: flex-start;
      text-align: left;
    }
    .cch-row-stats {
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }
    .cch-level-bar {
      grid-template-columns: 1fr 24px;
      grid-template-areas:
        "label count"
        "track track";
      gap: 4px 8px;
    }
    .cch-level-bar-label { grid-area: label; }
    .cch-level-bar-count { grid-area: count; }
    .cch-level-bar-track { grid-area: track; }
  }
`
