import type { Metadata } from 'next'
import { berlinToday } from '../../../lib/miteinander'
import { createChallengeAction } from '../../_actions'
import { miteinanderSession, param } from '../../_session'
import { BackLink, ChallengeFields, MiteinanderPage, Notice } from '../../_ui'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Challenge vorschlagen — Miteinander',
}

export default async function NewChallengePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await miteinanderSession()
  const params = await searchParams
  const today = berlinToday()

  return (
    <MiteinanderPage wide={false}>
      <BackLink href="/miteinander#challenges">Alle Challenges</BackLink>
      <header className="cr-head">
        <p className="mt-sub">Sich etwas vornehmen, zusammen</p>
        <h1 className="cr-title">Challenge vorschlagen</h1>
        <p className="cr-intro">
          Nimm dir etwas vor und lade andere ein, mitzumachen. Abgesprochen wird in eurer WhatsApp-Gruppe.
        </p>
      </header>
      <Notice fehler={param(params.fehler)} />
      <form action={createChallengeAction} className="mt-form">
        <ChallengeFields
          mode="new"
          today={today}
          defaults={{
            title: '',
            description: '',
            area: 'frei',
            starts_on: today,
            ends_on: '',
            max_members: '',
            whatsapp_url: '',
          }}
        />
        <div className="mt-actions">
          <button type="submit" className="cr-btn">
            Vorschlagen
          </button>
        </div>
      </form>
    </MiteinanderPage>
  )
}
