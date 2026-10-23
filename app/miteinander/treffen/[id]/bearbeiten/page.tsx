import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { berlinToday } from '../../../../lib/miteinander'
import { utcISOToBerlinLocal } from '../../../../lib/event-time'
import { updateMeetupAction } from '../../../_actions'
import { loadMeetup, loadSecret } from '../../../_load'
import { miteinanderSession, param } from '../../../_session'
import { BackLink, MeetupFields, MiteinanderPage, Notice } from '../../../_ui'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Treffen bearbeiten — Miteinander',
}

export default async function EditMeetupPage({
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
  if (meetup.created_by !== user.id) redirect(`/miteinander/treffen/${meetup.id}`)

  const exactPlace = await loadSecret(supabase, 'meetup_exact_place', meetup.id)
  const local = utcISOToBerlinLocal(meetup.starts_at) // „2026-10-31T14:00“

  return (
    <MiteinanderPage wide={false}>
      <BackLink href={`/miteinander/treffen/${meetup.id}`}>Zum Treffen</BackLink>
      <header className="cr-head">
        <p className="mt-sub">Dein Treffen</p>
        <h1 className="cr-title">Bearbeiten</h1>
      </header>
      <Notice fehler={param(query.fehler)} />
      <form action={updateMeetupAction} className="mt-form">
        <input type="hidden" name="id" value={meetup.id} />
        <MeetupFields
          today={berlinToday()}
          defaults={{
            title: meetup.title,
            description: meetup.description ?? '',
            region: meetup.region ?? '',
            place_hint: meetup.place_hint ?? '',
            exact_place: exactPlace ?? '',
            date: local.slice(0, 10),
            time: local.slice(11, 16),
            max_people: meetup.max_people === null ? '' : String(meetup.max_people),
            online: meetup.online,
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
