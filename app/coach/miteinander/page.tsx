import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import { currentBrand } from '../../lib/brand-server'
import { dateRangeLabel, meetupDateBox, messageFor } from '../../lib/miteinander'
import { ilikeTerm } from '../../lib/miteinander-view'
import { COURSE_CSS } from '../../training/_course/views'
import {
  adminCloseChallengeAction,
  adminCloseMeetupAction,
  blockMemberAction,
  hideMemberAction,
  unblockMemberAction,
} from './_actions'

// ─────────────────────────────────────────────────────────────────────────────
// /coach/miteinander — Moderation (nur Admin, nur schule): offene Challenges
// und Treffen schließen (admin_close_*, lässt sich von Mitgliedern nicht
// wieder öffnen), Profile ausblenden (admin_hide_member) und Personen für
// Miteinander sperren (community_blocks). Kein Lesen geheimer Spalten.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata = { title: 'Miteinander — Coach' }
export const dynamic = 'force-dynamic'

const RESULTS: Record<string, string> = {
  'challenge-geschlossen': 'Challenge geschlossen. Mitglieder können sie nicht wieder öffnen.',
  'treffen-geschlossen': 'Treffen geschlossen. Mitglieder können es nicht wieder öffnen.',
  ausgeblendet: 'Profil ausgeblendet. Es erscheint nicht mehr unter „Menschen“.',
  freigegeben: 'Profil wieder freigegeben. Sichtbar schaltet die Person selbst.',
  gesperrt: 'Für Miteinander gesperrt: keine Anfragen, kein Beitreten, nichts Neues anlegen.',
  entsperrt: 'Sperre aufgehoben.',
  ungueltig: 'Eingabe unvollständig.',
}

const CSS = `
  .mm-form { display: flex; flex-wrap: wrap; gap: 12px; }
  .mm-input {
    flex: 1 1 260px; min-width: 0; min-height: 48px; padding: 10px 14px;
    border: 1px solid var(--border2); border-radius: 2px;
    background: transparent; color: var(--text); font-family: var(--font-body); font-size: 16px;
  }
  .mm-section { display: flex; flex-direction: column; gap: 14px; }
  .mm-h2 { margin: 0; font-family: var(--font-display); font-weight: 300; font-size: 26px; color: var(--cream); }
  .mm-list { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--border); }
  .mm-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 16px; padding: 14px 0; border-bottom: 1px solid var(--border); }
  .mm-main { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1 1 280px; }
  .mm-title { font-family: var(--font-body); font-size: 17px; color: var(--cream); overflow-wrap: anywhere; text-decoration: none; }
  a.mm-title:hover { color: var(--amber); }
  .mm-meta { font-family: var(--font-ui); font-size: 14px; color: var(--muted2); overflow-wrap: anywhere; }
  .mm-row form { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
  .mm-row .cr-btn, .mm-form .cr-btn { cursor: pointer; }
`

type ChallengeRow = { id: string; title: string; starts_on: string; ends_on: string; created_by: string }
type MeetupRow = { id: string; title: string; starts_at: string; region: string | null; created_by: string }
type ProfileRow = { id: string; email: string | null; full_name: string | null }

export default async function CoachMiteinanderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  if ((await currentBrand()) !== 'schule') notFound()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!me?.is_admin) redirect('/training')

  const params = await searchParams
  const q = typeof params.q === 'string' ? params.q.trim().slice(0, 120) : ''
  const code = typeof params.ergebnis === 'string' ? params.ergebnis : ''
  const result = code ? (RESULTS[code] ?? messageFor(code)) : null

  const [challengesRes, meetupsRes] = await Promise.all([
    supabase
      .from('challenges')
      .select('id, title, starts_on, ends_on, created_by')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('meetups')
      .select('id, title, starts_at, region, created_by')
      .eq('status', 'open')
      .order('starts_at', { ascending: true })
      .limit(100),
  ])
  const challenges = (challengesRes.error ? [] : (challengesRes.data ?? [])) as ChallengeRow[]
  const meetups = (meetupsRes.error ? [] : (meetupsRes.data ?? [])) as MeetupRow[]
  const loadError = Boolean(challengesRes.error || meetupsRes.error)

  // Namen der Ersteller (Admin darf profiles lesen).
  const creatorIds = [...new Set([...challenges, ...meetups].map((r) => r.created_by))]
  const creatorsRes =
    creatorIds.length > 0
      ? await supabase.from('profiles').select('id, email, full_name').in('id', creatorIds)
      : { data: [] as ProfileRow[], error: null }
  const creators = new Map(((creatorsRes.data ?? []) as ProfileRow[]).map((p) => [p.id, p]))
  const who = (id: string) => {
    const p = creators.get(id)
    return p?.full_name?.trim() || p?.email || 'unbekannt'
  }

  // Personen suchen (E-Mail oder Name).
  let people: ProfileRow[] = []
  let hidden = new Set<string>()
  let blocked = new Set<string>()
  let searchError = false
  const term = ilikeTerm(q)
  if (term.length >= 3) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .or(`email.ilike.%${term}%,full_name.ilike.%${term}%`)
      .order('email')
      .limit(25)
    searchError = Boolean(error)
    people = (data ?? []) as ProfileRow[]
    if (people.length > 0) {
      const ids = people.map((p) => p.id)
      const [modRes, blockRes] = await Promise.all([
        supabase.from('member_moderation').select('user_id, hidden').in('user_id', ids),
        supabase.from('community_blocks').select('user_id').in('user_id', ids),
      ])
      searchError = searchError || Boolean(modRes.error || blockRes.error)
      hidden = new Set(
        ((modRes.data ?? []) as { user_id: string; hidden: boolean }[]).filter((r) => r.hidden).map((r) => r.user_id),
      )
      blocked = new Set(((blockRes.data ?? []) as { user_id: string }[]).map((r) => r.user_id))
    }
  }

  return (
    <>
      <style>{COURSE_CSS}</style>
      <style>{CSS}</style>
      <main className="cr-page">
        <div className="cr-wrap">
          <Link href="/coach" className="cr-back">
            ← Coach
          </Link>
          <header className="cr-head">
            <p className="cr-kicker">Coach</p>
            <h1 className="cr-title">Miteinander</h1>
            <p className="cr-intro">
              Challenges und Treffen schließen, Profile ausblenden, Personen für Miteinander sperren. Nummern,
              Gruppenlinks und Adressen sind hier nicht zu sehen.
            </p>
          </header>

          {result ? (
            <p className="cr-notice" role="status">
              {result}
            </p>
          ) : null}
          {loadError ? <p className="cr-muted">Lesen fehlgeschlagen. Ist Migration 0013 eingespielt?</p> : null}

          <section className="mm-section" aria-labelledby="mm-challenges">
            <h2 id="mm-challenges" className="mm-h2">
              Offene Challenges
            </h2>
            {challenges.length === 0 ? (
              <p className="cr-muted">Keine offenen Challenges.</p>
            ) : (
              <ul className="mm-list">
                {challenges.map((c) => (
                  <li key={c.id} className="mm-row">
                    <div className="mm-main">
                      <Link href={`/miteinander/challenge/${c.id}`} className="mm-title">
                        {c.title}
                      </Link>
                      <span className="mm-meta">
                        {dateRangeLabel(c.starts_on, c.ends_on)} · von {who(c.created_by)}
                      </span>
                    </div>
                    <form action={adminCloseChallengeAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="q" value={q} />
                      <button type="submit" className="cr-btn cr-btn--ghost">
                        Schließen
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mm-section" aria-labelledby="mm-treffen">
            <h2 id="mm-treffen" className="mm-h2">
              Offene Treffen
            </h2>
            {meetups.length === 0 ? (
              <p className="cr-muted">Keine offenen Treffen.</p>
            ) : (
              <ul className="mm-list">
                {meetups.map((m) => (
                  <li key={m.id} className="mm-row">
                    <div className="mm-main">
                      <Link href={`/miteinander/treffen/${m.id}`} className="mm-title">
                        {m.title}
                      </Link>
                      <span className="mm-meta">
                        {meetupDateBox(m.starts_at).long}
                        {m.region ? ` · ${m.region}` : ''} · von {who(m.created_by)}
                      </span>
                    </div>
                    <form action={adminCloseMeetupAction}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="q" value={q} />
                      <button type="submit" className="cr-btn cr-btn--ghost">
                        Schließen
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mm-section" aria-labelledby="mm-personen">
            <h2 id="mm-personen" className="mm-h2">
              Personen
            </h2>
            <form method="get" className="mm-form" role="search">
              <input
                className="mm-input"
                type="search"
                name="q"
                defaultValue={q}
                placeholder="E-Mail oder Name (mindestens 3 Zeichen)"
                aria-label="Nach E-Mail oder Name suchen"
                autoComplete="off"
              />
              <button type="submit" className="cr-btn">
                Suchen
              </button>
            </form>
            {searchError ? (
              <p className="cr-muted">Suche fehlgeschlagen. Ist Migration 0013 eingespielt?</p>
            ) : term.length >= 3 && people.length === 0 ? (
              <p className="cr-muted">Keine Treffer.</p>
            ) : null}
            {people.length > 0 ? (
              <ul className="mm-list">
                {people.map((p) => {
                  const isHidden = hidden.has(p.id)
                  const isBlocked = blocked.has(p.id)
                  return (
                    <li key={p.id} className="mm-row">
                      <div className="mm-main">
                        <span className="mm-title">{p.full_name?.trim() || '(ohne Namen)'}</span>
                        <span className="mm-meta">
                          {p.email ?? '(ohne Adresse)'} · Profil {isHidden ? 'ausgeblendet' : 'nicht ausgeblendet'} ·{' '}
                          {isBlocked ? 'gesperrt' : 'nicht gesperrt'}
                        </span>
                      </div>
                      <form action={hideMemberAction}>
                        <input type="hidden" name="user_id" value={p.id} />
                        <input type="hidden" name="hidden" value={isHidden ? '0' : '1'} />
                        <input type="hidden" name="q" value={q} />
                        <button type="submit" className="cr-btn cr-btn--ghost">
                          {isHidden ? 'Wieder freigeben' : 'Profil ausblenden'}
                        </button>
                      </form>
                      <form action={isBlocked ? unblockMemberAction : blockMemberAction}>
                        <input type="hidden" name="user_id" value={p.id} />
                        <input type="hidden" name="q" value={q} />
                        <button type="submit" className="cr-btn cr-btn--ghost">
                          {isBlocked ? 'Entsperren' : 'Sperren'}
                        </button>
                      </form>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </section>
        </div>
      </main>
    </>
  )
}
