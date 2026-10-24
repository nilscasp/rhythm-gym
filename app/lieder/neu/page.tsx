import type { Metadata } from 'next'
import { Werkstatt } from '../_player/Werkstatt'
import { liederSession, param } from '../_session'
import { BackLink, LiederPage, MembersOnly, Notice } from '../_ui'

// /lieder/neu — eigenes Lied schreiben oder hochladen (Werkstatt).

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Lied teilen — Handpan Schule des Lebens',
}

export default async function NeuesLiedRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { isMember } = await liederSession()
  if (!isMember) return <MembersOnly />
  const sp = await searchParams
  return (
    <LiederPage>
      <BackLink />
      <header className="ld-hero">
        <div className="ld-hero-main">
          <p className="ld-kicker">Werkstatt</p>
          <h1 className="ld-h1">Teile dein Lied</h1>
          <p className="ld-lead">
            Schreib dein Stück Feld für Feld auf oder lade einen fertigen Tab hoch. Hör beim Schreiben jederzeit
            hinein. Wenn es klingt, wie du es spielst, reichst du es ein.
          </p>
        </div>
      </header>
      <Notice fehler={param(sp.fehler)} />
      <Werkstatt />
    </LiederPage>
  )
}
