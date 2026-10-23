import type { Metadata } from 'next'
import { berlinToday } from '../../../lib/miteinander'
import { createMeetupAction } from '../../_actions'
import { miteinanderSession, param } from '../../_session'
import { BackLink, MeetupFields, MiteinanderPage, Notice } from '../../_ui'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Treffen eintragen — Miteinander',
}

export default async function NewMeetupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await miteinanderSession()
  const params = await searchParams
  const today = berlinToday()

  return (
    <MiteinanderPage wide={false}>
      <BackLink href="/miteinander#treffen">Alle Treffen</BackLink>
      <header className="cr-head">
        <p className="mt-sub">Von Mitgliedern, für Mitglieder</p>
        <h1 className="cr-title">Treffen eintragen</h1>
        <p className="cr-intro">
          Ihr spielt im Park, bei jemandem zu Hause oder am See? Trag es ein, dann kann dazukommen, wer Lust hat. Das
          sind keine Termine der Schule.
        </p>
      </header>
      <Notice fehler={param(params.fehler)} />
      <form action={createMeetupAction} className="mt-form">
        <MeetupFields
          today={today}
          defaults={{
            title: '',
            description: '',
            region: '',
            place_hint: '',
            exact_place: '',
            date: '',
            time: '',
            max_people: '',
            online: false,
          }}
        />
        <div className="mt-actions">
          <button type="submit" className="cr-btn">
            Eintragen
          </button>
        </div>
      </form>
    </MiteinanderPage>
  )
}
