import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isUuid } from '../../../lib/lieder'
import type { SongSource } from '../../../lib/lieder/model'
import { Werkstatt } from '../../_player/Werkstatt'
import { liederSession, param } from '../../_session'
import { BackLink, LiederPage, MembersOnly, Notice } from '../../_ui'

// /lieder/<id>/bearbeiten — eigenes Lied ändern. Danach wieder in der Prüfung.

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Lied bearbeiten — Handpan Schule des Lebens',
}

export default async function LiedBearbeitenRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { supabase, isMember } = await liederSession()
  if (!isMember) return <MembersOnly />
  const { id } = await params
  if (!isUuid(id)) notFound()
  const { data } = await supabase.rpc('get_song', { p_id: id })
  const row = data?.[0]
  if (!row || !row.is_mine) notFound()
  const sp = await searchParams
  return (
    <LiederPage>
      <BackLink href={`/lieder/${id}`}>← Zurück zum Lied</BackLink>
      <header className="ld-hero">
        <div className="ld-hero-main">
          <p className="ld-kicker">Werkstatt</p>
          <h1 className="ld-h1">{row.title}</h1>
          <p className="ld-hint">Nach dem Einreichen ist das Lied wieder kurz in der Prüfung.</p>
        </div>
      </header>
      <Notice fehler={param(sp.fehler)} />
      <Werkstatt initial={row.data as unknown as SongSource} id={id} />
    </LiederPage>
  )
}
