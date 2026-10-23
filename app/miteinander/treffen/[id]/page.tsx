import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { meetupDateBox, peopleCountLabel, spotsLabel } from '../../../lib/miteinander'
import { closeMeetupAction, joinMeetupAction, leaveMeetupAction } from '../../_actions'
import { loadMeetup, loadPeople, loadSecret } from '../../_load'
import { miteinanderSession, param } from '../../_session'
import { Avatar, BackLink, MiteinanderPage, Notice, PeopleList } from '../../_ui'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Treffen — Miteinander',
}

export default async function MeetupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { supabase, user } = await miteinanderSession()
  const [{ id }, query] = await Promise.all([params, searchParams])
  const meetup = await loadMeetup(supabase, id)
  if (!meetup) notFound()

  const people = await loadPeople(supabase, 'meetup_people', meetup.id)
  const isCreator = meetup.created_by === user.id
  const joined = isCreator || people.some((p) => p.user_id === user.id)
  const exactPlace = joined ? await loadSecret(supabase, 'meetup_exact_place', meetup.id) : null

  const box = meetupDateBox(meetup.starts_at)
  const creator = people.find((p) => p.is_creator)
  const open = meetup.status === 'open' && new Date(meetup.starts_at).getTime() > Date.now()
  const spots = spotsLabel(people.length, meetup.max_people)
  const full = spots === 'ausgebucht'
  const where = meetup.online ? 'Online' : meetup.region
  const exactIsLink = exactPlace !== null && /^https:\/\//.test(exactPlace)

  return (
    <MiteinanderPage>
      <BackLink href="/miteinander#treffen">Alle Treffen</BackLink>

      <div className="mt-layout">
        <div className="mt-main">
          <header className="cr-head">
            <div className="mt-card--row mt-request-head">
              <span className="mt-date" aria-hidden="true">
                <span className="mt-date-day">{box.day}</span>
                <span className="mt-date-mon">
                  {box.month} · {box.weekday}
                </span>
              </span>
              <p className="mt-meta">
                {box.long}
                {where ? ` · ${where}` : ''}
              </p>
            </div>
            <h1 className="cr-title">{meetup.title}</h1>
            {creator ? (
              <div className="mt-request-head">
                <Avatar name={creator.display_name} />
                <p className="mt-meta">
                  eingetragen von{' '}
                  {creator.profile_visible && !isCreator ? (
                    <Link href={`/miteinander/mensch/${creator.user_id}`} className="sp-link mt-inline">
                      {creator.display_name}
                    </Link>
                  ) : isCreator ? (
                    'dir'
                  ) : (
                    creator.display_name
                  )}
                </p>
              </div>
            ) : null}
          </header>

          <Notice fehler={param(query.fehler)} ok={param(query.ok)} />

          <p className="mt-hint">Ein Treffen von Mitgliedern. Das sind keine Termine der Schule.</p>

          {meetup.description ? (
            <section className="mt-box" aria-labelledby="m-beschreibung">
              <h2 id="m-beschreibung" className="cr-kicker">
                Beschreibung
              </h2>
              <p className="mt-text">{meetup.description}</p>
            </section>
          ) : null}

          <section className="mt-box" aria-labelledby="m-ort">
            <h2 id="m-ort" className="cr-kicker">
              Wo
            </h2>
            <p className="mt-text">{[where, meetup.place_hint].filter(Boolean).join(' · ') || 'Noch offen'}</p>
            {joined ? (
              exactPlace ? (
                exactIsLink ? (
                  <a href={exactPlace} className="sp-link" target="_blank" rel="noopener noreferrer">
                    Zum Online-Treffen
                  </a>
                ) : (
                  <p className="mt-text">{exactPlace}</p>
                )
              ) : (
                <p className="mt-hint">Die genaue Adresse ist noch nicht eingetragen.</p>
              )
            ) : (
              <p className="mt-hint">Genaue Adresse nach Zusage.</p>
            )}
          </section>

          <section className="mt-section" aria-labelledby="m-kommen">
            <h2 id="m-kommen" className="mt-h3">
              {capitalize(peopleCountLabel(people.length, 'meetup'))}
            </h2>
            {people.length > 0 ? (
              <PeopleList people={people} me={user.id} creatorNote="hat es eingetragen" />
            ) : null}
          </section>
        </div>

        <aside className="mt-aside" aria-label="Zusagen">
          {!open ? (
            <div className="mt-box">
              <p className="cr-kicker">Geschlossen</p>
              <p className="mt-text">Für dieses Treffen kann man sich nicht mehr eintragen.</p>
            </div>
          ) : !joined ? (
            <div className="mt-box mt-box--gold">
              <p className="cr-kicker">Dazukommen</p>
              <p className="mt-text">{spots ? `${capitalize(spots)}.` : 'Wer Lust hat, kommt dazu.'}</p>
              {full ? null : (
                <form action={joinMeetupAction}>
                  <input type="hidden" name="id" value={meetup.id} />
                  <button type="submit" className="cr-btn">
                    Ich komme
                  </button>
                </form>
              )}
              <p className="mt-hint">Nach der Zusage siehst du die genaue Adresse.</p>
            </div>
          ) : !isCreator ? (
            <div className="mt-box mt-box--gold">
              <p className="mt-sub">Du kommst</p>
              <form action={leaveMeetupAction}>
                <input type="hidden" name="id" value={meetup.id} />
                <button type="submit" className="cr-btn cr-btn--ghost">
                  Doch nicht kommen
                </button>
              </form>
            </div>
          ) : null}

          {isCreator ? (
            <div className="mt-box">
              <p className="cr-kicker">Du hast es eingetragen</p>
              <div className="mt-actions">
                <Link href={`/miteinander/treffen/${meetup.id}/bearbeiten`} className="cr-btn cr-btn--ghost">
                  Bearbeiten
                </Link>
                {meetup.status === 'open' ? (
                  <form action={closeMeetupAction}>
                    <input type="hidden" name="id" value={meetup.id} />
                    <button type="submit" className="cr-btn cr-btn--ghost">
                      Schließen
                    </button>
                  </form>
                ) : null}
              </div>
              <p className="mt-hint">Findet es nicht statt, schließ es. Dann kann sich niemand mehr eintragen.</p>
            </div>
          ) : null}
        </aside>
      </div>
    </MiteinanderPage>
  )
}

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase('de-DE') + text.slice(1)
}
