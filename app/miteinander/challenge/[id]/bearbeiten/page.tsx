import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { berlinToday } from '../../../../lib/miteinander'
import { updateChallengeAction } from '../../../_actions'
import { loadChallenge, loadSecret } from '../../../_load'
import { miteinanderSession, param } from '../../../_session'
import { BackLink, ChallengeFields, MiteinanderPage, Notice } from '../../../_ui'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Challenge bearbeiten — Miteinander',
}

export default async function EditChallengePage({
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
  if (challenge.created_by !== user.id) redirect(`/miteinander/challenge/${challenge.id}`)

  const groupUrl = await loadSecret(supabase, 'challenge_whatsapp_url', challenge.id)

  return (
    <MiteinanderPage wide={false}>
      <BackLink href={`/miteinander/challenge/${challenge.id}`}>Zur Challenge</BackLink>
      <header className="cr-head">
        <p className="mt-sub">Deine Challenge</p>
        <h1 className="cr-title">Bearbeiten</h1>
      </header>
      <Notice fehler={param(query.fehler)} />
      <form action={updateChallengeAction} className="mt-form">
        <input type="hidden" name="id" value={challenge.id} />
        <ChallengeFields
          mode="edit"
          today={berlinToday()}
          defaults={{
            title: challenge.title,
            description: challenge.description ?? '',
            area: challenge.area,
            starts_on: challenge.starts_on,
            ends_on: challenge.ends_on,
            max_members: challenge.max_members === null ? '' : String(challenge.max_members),
            whatsapp_url: groupUrl ?? '',
          }}
        />
        <div className="mt-actions">
          <button type="submit" className="cr-btn">
            Speichern
          </button>
        </div>
      </form>
    </MiteinanderPage>
  )
}
