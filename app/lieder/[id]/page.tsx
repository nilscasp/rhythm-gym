import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isUuid } from '../../lib/lieder'
import type { SongSource } from '../../lib/lieder/model'
import { deleteSongAction, reviewSongAction } from '../_actions'
import { LiedAnsicht } from '../_player/LiedAnsicht'
import { liederSession, param } from '../_session'
import { BackLink, LiederPage, MembersOnly, Notice, StatusTag } from '../_ui'

// ─────────────────────────────────────────────────────────────────────────────
// /lieder/<id> — ein Lied zum Mitspielen. Sichtbar, wenn freigegeben, eigenes
// oder für Admin (get_song, 0015). Admin sieht hier die Freigabe.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Lied — Handpan Schule des Lebens',
}

export default async function LiedRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { supabase, isMember, isAdmin } = await liederSession()
  if (!isMember) return <MembersOnly />
  const { id } = await params
  if (!isUuid(id)) notFound()
  const sp = await searchParams

  const { data, error } = await supabase.rpc('get_song', { p_id: id })
  if (error) console.error('[lieder] get_song failed', { code: error.code, message: error.message })
  const row = data?.[0]
  if (!row) notFound()
  const source = row.data as unknown as SongSource

  return (
    <LiederPage>
      <BackLink />
      <header className="ld-hero">
        <div className="ld-hero-main">
          <p className="ld-kicker">{row.is_mine ? 'Dein Lied' : `Geteilt von ${row.author_name}`}</p>
          <h1 className="ld-h1">{row.title}</h1>
          {row.artist && <p className="ld-lead">{row.artist}</p>}
          <div className="ld-chips">
            <StatusTag status={row.status} />
            <span className="ld-tag ld-tag--gold">{row.difficulty}</span>
            {row.handpan && <span className="ld-tag">{row.handpan}</span>}
          </div>
        </div>
        {row.is_mine && (
          <div className="ld-hero-act ld-actions">
            <Link className="cr-btn cr-btn--ghost" href={`/lieder/${id}/bearbeiten`}>Bearbeiten</Link>
          </div>
        )}
      </header>

      <Notice fehler={param(sp.fehler)} ok={param(sp.ok)} />
      {row.status === 'abgelehnt' && row.review_note && <p className="ld-note">{row.review_note}</p>}
      {row.status === 'eingereicht' && row.is_mine && (
        <p className="ld-hint">Dein Lied wartet auf die Freigabe. Bis dahin siehst nur du es.</p>
      )}

      <LiedAnsicht source={source} id={id} />

      {isAdmin && row.status !== 'freigegeben' && (
        <form className="ld-review" action={reviewSongAction}>
          <input type="hidden" name="id" value={id} />
          <p className="ld-h2">Freigabe</p>
          <p className="ld-hint">Ist es ein eigenes Lied oder Arrangement des Mitglieds? Hör kurz hinein, dann entscheide.</p>
          <label className="ld-field">
            Notiz an die Person (bei „Nicht freigeben“ sinnvoll)
            <textarea name="notiz" maxLength={500} />
          </label>
          <div className="ld-actions">
            <button className="cr-btn" type="submit" name="entscheidung" value="frei">Freigeben</button>
            <button className="cr-btn cr-btn--ghost" type="submit" name="entscheidung" value="nein">Nicht freigeben</button>
          </div>
        </form>
      )}

      {(row.is_mine || isAdmin) && (
        <form action={deleteSongAction} className="ld-actions">
          <input type="hidden" name="id" value={id} />
          <button className="cr-btn cr-btn--ghost" type="submit">Lied löschen</button>
        </form>
      )}
    </LiederPage>
  )
}
