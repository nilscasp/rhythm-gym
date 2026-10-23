import type { Metadata } from 'next'
import Link from 'next/link'
import { communityUrl } from '../lib/community'
import {
  AREA_LABELS,
  berlinToday,
  challengeTiming,
  isArea,
  meetupDateBox,
  openForLabel,
  peopleCountLabel,
  spotsLabel,
} from '../lib/miteinander'
import { countBy, matchesRegion } from '../lib/miteinander-view'
import { miteinanderSession, param } from './_session'
import { Avatar, MiteinanderPage, Notice } from './_ui'

// ─────────────────────────────────────────────────────────────────────────────
// /miteinander — Challenges, Treffen, Menschen (Abschnitt G, Migration 0013).
// Gesprochen wird auf WhatsApp, gefunden wird hier. Kein Chat, kein Feed.
// Jeder Lesefehler (z. B. solange 0013 nicht eingespielt ist) endet in einem
// leeren Abschnitt, nie in einer kaputten Seite.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Miteinander — Handpan Schule des Lebens',
}

type ChallengeRow = {
  id: string
  title: string
  description: string | null
  area: string
  starts_on: string
  ends_on: string
  max_members: number | null
}

type MeetupRow = {
  id: string
  title: string
  region: string | null
  place_hint: string | null
  starts_at: string
  max_people: number | null
  online: boolean
}

type MemberRow = {
  user_id: string
  display_name: string
  region: string | null
  about: string | null
  open_for: string[]
}

function logError(name: string, error: { code?: string; message?: string } | null) {
  if (error) console.error(`[miteinander] ${name} read failed`, { code: error.code, message: error.message })
}

export default async function MiteinanderPageRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { supabase, user } = await miteinanderSession()
  const params = await searchParams
  const q = param(params.q).trim().slice(0, 80)
  const region = param(params.region).trim().slice(0, 80)
  const today = berlinToday()
  const nowIso = new Date().toISOString()

  const [challengesRes, meetupsRes, membersRes, ownRes] = await Promise.all([
    supabase
      .from('challenges')
      .select('id, title, description, area, starts_on, ends_on, max_members')
      .eq('status', 'open')
      .gte('ends_on', today)
      .order('starts_on', { ascending: true })
      .limit(30),
    supabase
      .from('meetups')
      .select('id, title, region, place_hint, starts_at, max_people, online')
      .eq('status', 'open')
      .gte('starts_at', nowIso)
      .order('starts_at', { ascending: true })
      .limit(30),
    supabase.rpc('list_members', { p_search: q || null }),
    supabase.from('member_profiles').select('visible').eq('user_id', user.id).maybeSingle(),
  ])
  logError('challenges', challengesRes.error)
  logError('meetups', meetupsRes.error)
  logError('list_members', membersRes.error)

  const challenges = (challengesRes.error ? [] : (challengesRes.data ?? [])) as ChallengeRow[]
  const meetups = (meetupsRes.error ? [] : (meetupsRes.data ?? [])) as MeetupRow[]
  const members = ((membersRes.error ? [] : (membersRes.data ?? [])) as MemberRow[]).filter((m) =>
    matchesRegion(m.region, region),
  )
  const ownVisible = !ownRes.error && Boolean((ownRes.data as { visible?: boolean } | null)?.visible)

  // Zahlen „N dabei“ / „N kommen“ — eine Abfrage je Liste.
  const [cmRes, maRes] = await Promise.all([
    challenges.length > 0
      ? supabase.from('challenge_members').select('challenge_id').in('challenge_id', challenges.map((c) => c.id))
      : Promise.resolve({ data: [], error: null }),
    meetups.length > 0
      ? supabase.from('meetup_attendees').select('meetup_id').in('meetup_id', meetups.map((m) => m.id))
      : Promise.resolve({ data: [], error: null }),
  ])
  logError('challenge_members', cmRes.error)
  logError('meetup_attendees', maRes.error)
  const challengeCounts = countBy((cmRes.data ?? []) as { challenge_id: string }[], (r) => r.challenge_id)
  const meetupCounts = countBy((maRes.data ?? []) as { meetup_id: string }[], (r) => r.meetup_id)

  const url = communityUrl()
  const searching = q !== '' || region !== ''

  return (
    <MiteinanderPage>
      <header className="mt-hero">
        <div className="mt-hero-main">
          <p className="mt-sub">Gemeinsam dranbleiben</p>
          <h1 className="cr-title">Miteinander</h1>
          <p className="cr-intro">
            Hier findest du Menschen, mit denen du übst, dich triffst und dich gegenseitig trägst. Gesprochen wird auf
            WhatsApp, gefunden wird hier.
          </p>
          <nav className="mt-jump" aria-label="Bereiche">
            <a href="#challenges">Challenges</a>
            <a href="#treffen">Treffen</a>
            <a href="#menschen">Menschen</a>
          </nav>
        </div>
        <div className="mt-box mt-hero-box">
          <p className="cr-kicker">WhatsApp-Community</p>
          <p className="mt-text">Ankündigungen von Nils, Austausch und deine Kursgruppen.</p>
          {url ? (
            <a href={url} className="cr-btn" target="_blank" rel="noopener noreferrer">
              WhatsApp-Community öffnen
            </a>
          ) : (
            <p className="mt-hint">Der Link zur WhatsApp-Community folgt.</p>
          )}
        </div>
      </header>

      <Notice fehler={param(params.fehler)} ok={param(params.ok)} />

      {/* ── Challenges ── */}
      <section id="challenges" className="mt-section" aria-labelledby="mt-challenges">
        <div className="mt-section-head">
          <div>
            <p className="mt-sub">Sich etwas vornehmen, zusammen</p>
            <h2 id="mt-challenges" className="mt-h2">
              Challenges
            </h2>
          </div>
          <Link href="/miteinander/challenge/neu" className="cr-btn">
            Challenge vorschlagen
          </Link>
        </div>
        {challenges.length === 0 ? (
          <p className="sp-note mt-empty">Noch keine Challenge. Vielleicht startest du die erste?</p>
        ) : (
          <ul className="mt-grid mt-grid--3">
            {challenges.map((c) => {
              const count = challengeCounts.get(c.id) ?? 0
              const spots = spotsLabel(count, c.max_members)
              return (
                <li key={c.id}>
                  <Link href={`/miteinander/challenge/${c.id}`} className="mt-card">
                    <div className="mt-card-top">
                      <span className="mt-chip">{isArea(c.area) ? AREA_LABELS[c.area] : AREA_LABELS.frei}</span>
                      <span className="mt-meta">{challengeTiming(c.starts_on, c.ends_on, today)}</span>
                    </div>
                    <h3 className="mt-h3">{c.title}</h3>
                    {c.description ? <p className="mt-meta">{shorten(c.description, 160)}</p> : null}
                    <div className="mt-card-foot">
                      <span className="mt-meta">
                        {peopleCountLabel(count, 'challenge')}
                        {spots ? ` · ${spots}` : ''}
                      </span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* ── Treffen ── */}
      <section id="treffen" className="mt-section" aria-labelledby="mt-treffen">
        <div className="mt-section-head">
          <div>
            <p className="mt-sub">Von Mitgliedern, für Mitglieder</p>
            <h2 id="mt-treffen" className="mt-h2">
              Treffen
            </h2>
          </div>
          <Link href="/miteinander/treffen/neu" className="cr-btn cr-btn--ghost">
            Treffen eintragen
          </Link>
        </div>
        <p className="mt-hint">
          Ihr trefft euch zum Spielen im Park, bei jemandem zu Hause oder am See? Trag es ein, dann kann dazukommen, wer
          Lust hat. Das sind keine Termine der Schule.
        </p>
        {meetups.length === 0 ? (
          <p className="sp-note mt-empty">Noch kein Treffen eingetragen. Magst du eins vorschlagen?</p>
        ) : (
          <ul className="mt-grid">
            {meetups.map((m) => {
              const box = meetupDateBox(m.starts_at)
              const count = meetupCounts.get(m.id) ?? 0
              const spots = spotsLabel(count, m.max_people)
              const where = m.online ? 'Online' : m.region
              return (
                <li key={m.id}>
                  <Link href={`/miteinander/treffen/${m.id}`} className="mt-card mt-card--row">
                    <span className="mt-date" aria-hidden="true">
                      <span className="mt-date-day">{box.day}</span>
                      <span className="mt-date-mon">
                        {box.month} · {box.weekday}
                      </span>
                    </span>
                    <div className="mt-card-body">
                      <span className="sp-sr">{box.long}</span>
                      <h3 className="mt-h3">{m.title}</h3>
                      <span className="mt-meta">
                        {[where, box.time, m.place_hint].filter(Boolean).join(' · ')}
                      </span>
                      {!m.online ? <span className="mt-hint">Genaue Adresse nach Zusage</span> : null}
                      <span className="mt-meta">
                        {peopleCountLabel(count, 'meetup')}
                        {spots ? ` · ${spots}` : ''}
                      </span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* ── Menschen ── */}
      <section id="menschen" className="mt-section" aria-labelledby="mt-menschen">
        <div className="mt-section-head">
          <div>
            <p className="mt-sub">Wer spielt wie du?</p>
            <h2 id="mt-menschen" className="mt-h2">
              Menschen
            </h2>
          </div>
        </div>
        <form method="get" action="/miteinander#menschen" className="mt-pair" role="search">
          <div className="mt-field">
            <label htmlFor="s-region">Region</label>
            <input
              id="s-region"
              name="region"
              className="mt-input"
              type="search"
              defaultValue={region}
              placeholder="z. B. München"
              autoComplete="off"
            />
          </div>
          <div className="mt-field">
            <label htmlFor="s-q">Name oder Stichwort</label>
            <input
              id="s-q"
              name="q"
              className="mt-input"
              type="search"
              defaultValue={q}
              placeholder="z. B. Kurd, Rhythmus"
              autoComplete="off"
            />
          </div>
          <div className="mt-actions">
            <button type="submit" className="cr-btn cr-btn--ghost">
              Suchen
            </button>
            {searching ? (
              <Link href="/miteinander#menschen" className="sp-link">
                Alle zeigen
              </Link>
            ) : null}
          </div>
        </form>

        {members.length === 0 ? (
          <p className="sp-note mt-empty">
            {searching
              ? 'Dazu haben wir niemanden gefunden. Versuch es mit einer anderen Region.'
              : 'Noch hat sich niemand sichtbar gemacht. Vielleicht bist du die erste Person?'}
          </p>
        ) : (
          <ul className="mt-grid mt-grid--3">
            {members.map((m) => {
              const open = openForLabel(m.open_for ?? [])
              return (
                <li key={m.user_id}>
                  <Link href={`/miteinander/mensch/${m.user_id}`} className="mt-card">
                    <Avatar name={m.display_name} size="lg" />
                    <span className="mt-h3">{m.display_name}</span>
                    {m.region ? <span className="mt-meta">{m.region}</span> : null}
                    {open ? <span className="mt-open">{open}</span> : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}

        <p className="mt-hint">
          Hier stehen nur Menschen, die sich in ihrem Profil dafür freigeben. Telefonnummern sieht niemand, bis beide
          einer Verbindung zugestimmt haben.
        </p>
        {!ownVisible ? (
          <p className="mt-meta">
            Du bist hier noch nicht zu finden.{' '}
            <Link href="/mein-weg#kontakt" className="sp-link mt-inline">
              In Mein Weg freigeben
            </Link>
          </p>
        ) : null}
      </section>
    </MiteinanderPage>
  )
}

function shorten(text: string, max: number): string {
  const chars = Array.from(text.trim())
  return chars.length <= max ? text.trim() : `${chars.slice(0, max - 1).join('').trimEnd()} …`
}
