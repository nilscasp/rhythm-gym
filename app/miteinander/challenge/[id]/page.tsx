import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  AREA_LABELS,
  berlinToday,
  dateRangeLabel,
  durationLabel,
  isArea,
  spotsLabel,
} from '../../../lib/miteinander'
import { closeChallengeAction, joinChallengeAction, leaveChallengeAction } from '../../_actions'
import { loadChallenge, loadPeople, loadSecret } from '../../_load'
import { miteinanderSession, param } from '../../_session'
import { Avatar, BackLink, MiteinanderPage, Notice, PeopleList } from '../../_ui'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Challenge — Miteinander',
}

export default async function ChallengePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { supabase, user } = await miteinanderSession()
  const [{ id }, query] = await Promise.all([params, searchParams])
  const challenge = await loadChallenge(supabase, id)
  if (!challenge) notFound()

  const people = await loadPeople(supabase, 'challenge_people', challenge.id)
  const isCreator = challenge.created_by === user.id
  const joined = isCreator || people.some((p) => p.user_id === user.id)
  const groupUrl = joined ? await loadSecret(supabase, 'challenge_whatsapp_url', challenge.id) : null

  const today = berlinToday()
  const creator = people.find((p) => p.is_creator)
  const open = challenge.status === 'open' && today <= challenge.ends_on
  const spots = spotsLabel(people.length, challenge.max_members)
  const full = spots === 'ausgebucht'
  const area = isArea(challenge.area) ? AREA_LABELS[challenge.area] : AREA_LABELS.frei

  return (
    <MiteinanderPage>
      <BackLink href="/miteinander#challenges">Alle Challenges</BackLink>

      <div className="mt-layout">
        <div className="mt-main">
          <header className="cr-head">
            <div className="mt-chips">
              <span className="mt-chip">{area}</span>
              <span className="mt-chip">{durationLabel(challenge.starts_on, challenge.ends_on)}</span>
              <span className="mt-chip">{dateRangeLabel(challenge.starts_on, challenge.ends_on)}</span>
            </div>
            <h1 className="cr-title">{challenge.title}</h1>
            {creator ? (
              <div className="mt-request-head">
                <Avatar name={creator.display_name} />
                <p className="mt-meta">
                  vorgeschlagen von{' '}
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

          {challenge.description ? (
            <section className="mt-box" aria-labelledby="c-vorhaben">
              <h2 id="c-vorhaben" className="cr-kicker">
                Was wir vorhaben
              </h2>
              <p className="mt-text">{challenge.description}</p>
            </section>
          ) : null}

          <section className="mt-box" aria-labelledby="c-tragen">
            <h2 id="c-tragen" className="cr-kicker">
              Wie wir uns tragen
            </h2>
            <p className="mt-text">
              Abgesprochen wird in der WhatsApp-Gruppe dieser Challenge: wann ihr euch meldet, wie ihr euch erinnert,
              was ihr teilt.
            </p>
          </section>

          <section className="mt-section" aria-labelledby="c-dabei">
            <h2 id="c-dabei" className="mt-h3">
              Dabei sind {people.length}
            </h2>
            {people.length > 0 ? (
              <PeopleList people={people} me={user.id} creatorNote="hat sie gestartet" />
            ) : (
              <p className="sp-note">Noch niemand.</p>
            )}
          </section>
        </div>

        <aside className="mt-aside" aria-label="Mitmachen">
          {!open ? (
            <div className="mt-box">
              <p className="cr-kicker">Geschlossen</p>
              <p className="mt-text">Bei dieser Challenge kann man sich nicht mehr eintragen.</p>
            </div>
          ) : !joined ? (
            <div className="mt-box mt-box--gold">
              <p className="cr-kicker">Mitmachen</p>
              <p className="mt-text">{spots ? `${capitalize(spots)}.` : 'Jede und jeder kann dazukommen.'}</p>
              {full ? null : (
                <form action={joinChallengeAction}>
                  <input type="hidden" name="id" value={challenge.id} />
                  <button type="submit" className="cr-btn">
                    Ich mache mit
                  </button>
                </form>
              )}
              <p className="mt-hint">Danach bekommst du den Link zur WhatsApp-Gruppe dieser Challenge.</p>
            </div>
          ) : null}

          {joined ? (
            <div className="mt-box mt-box--gold">
              <p className="mt-sub">{isCreator ? 'Deine Challenge' : 'Du bist dabei'}</p>
              {groupUrl ? (
                <>
                  <p className="mt-text">Komm in die Gruppe, dort sprecht ihr euch ab.</p>
                  <a href={groupUrl} className="cr-btn" target="_blank" rel="noopener noreferrer">
                    WhatsApp-Gruppe beitreten
                  </a>
                </>
              ) : (
                <p className="mt-hint">
                  {isCreator
                    ? 'Noch kein Gruppenlink. Trag ihn unter „Bearbeiten“ ein, dann sehen ihn alle, die mitmachen.'
                    : 'Der Link zur WhatsApp-Gruppe ist noch nicht eingetragen.'}
                </p>
              )}
              {!isCreator ? (
                <form action={leaveChallengeAction}>
                  <input type="hidden" name="id" value={challenge.id} />
                  <button type="submit" className="cr-btn cr-btn--ghost">
                    Doch nicht mitmachen
                  </button>
                </form>
              ) : null}
            </div>
          ) : null}

          {isCreator ? (
            <div className="mt-box">
              <p className="cr-kicker">Du hast sie vorgeschlagen</p>
              <div className="mt-actions">
                <Link href={`/miteinander/challenge/${challenge.id}/bearbeiten`} className="cr-btn cr-btn--ghost">
                  Bearbeiten
                </Link>
                {challenge.status === 'open' ? (
                  <form action={closeChallengeAction}>
                    <input type="hidden" name="id" value={challenge.id} />
                    <button type="submit" className="cr-btn cr-btn--ghost">
                      Schließen
                    </button>
                  </form>
                ) : null}
              </div>
              <p className="mt-hint">Schließen heißt: Niemand kann sich mehr eintragen. Die Gruppe in WhatsApp bleibt.</p>
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
