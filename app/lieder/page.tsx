import type { Metadata } from 'next'
import Link from 'next/link'
import { DIFFICULTIES } from '../lib/lieder'
import { liederSession, param } from './_session'
import { LiederPage, MembersOnly, Notice, PanArt, StatusTag } from './_ui'

// ─────────────────────────────────────────────────────────────────────────────
// /lieder — gemeinsame Bibliothek (Migration 0015). Nur Marke schule.
// Reiter: Alle Lieder · Meine Lieder · Zur Freigabe (Admin).
// Lesefehler (z. B. solange 0015 nicht eingespielt ist) enden in einer leeren
// Liste, nie in einer kaputten Seite.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Lieder — Handpan Schule des Lebens',
}

type Row = {
  id: string
  title: string
  artist: string | null
  difficulty: string
  handpan: string | null
  bpm: number | null
  measures: number | null
  status: string
  review_note: string | null
  author_name: string
  is_mine: boolean
}

const SCOPES = { alle: 'Alle Lieder', meine: 'Meine Lieder', pruefen: 'Zur Freigabe' } as const
type Scope = keyof typeof SCOPES

export default async function LiederRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { supabase, isMember, isAdmin } = await liederSession()
  if (!isMember) return <MembersOnly />

  const params = await searchParams
  const wanted = param(params.zeige) as Scope
  const scope: Scope = wanted === 'meine' || (wanted === 'pruefen' && isAdmin) ? wanted : 'alle'
  const q = param(params.q).trim().slice(0, 80).toLowerCase()
  const stufe = param(params.stufe)

  const [listRes, pendingRes] = await Promise.all([
    supabase.rpc('list_songs', { p_scope: scope }),
    isAdmin ? supabase.rpc('list_songs', { p_scope: 'pruefen' }) : Promise.resolve({ data: [] as Row[], error: null }),
  ])
  if (listRes.error) console.error('[lieder] list_songs failed', { code: listRes.error.code, message: listRes.error.message })
  const rows = ((listRes.data ?? []) as Row[]).filter(
    (r) =>
      (!stufe || r.difficulty === stufe) &&
      (!q || `${r.title} ${r.artist ?? ''} ${r.handpan ?? ''} ${r.author_name}`.toLowerCase().includes(q)),
  )
  const pending = (pendingRes.data ?? []).length

  return (
    <LiederPage>
      <header className="ld-hero">
        <div className="ld-hero-main">
          <p className="ld-kicker">Lieder der Gemeinschaft</p>
          <h1 className="ld-h1">Spielt einander eure Lieder vor</h1>
          <p className="ld-lead">
            Eigene Stücke von Mitgliedern als Handpan-Tab: Du siehst, welches Feld wann klingt, hörst das Lied und
            spielst mit — langsamer, Abschnitt für Abschnitt, eine Hand nach der anderen.
          </p>
        </div>
        <div className="ld-hero-act">
          <Link className="cr-btn" href="/lieder/neu">Eigenes Lied teilen</Link>
        </div>
      </header>

      <Notice fehler={param(params.fehler)} ok={param(params.ok)} />

      <div className="ld-bar">
        <nav className="ld-tabs" aria-label="Ansicht">
          {(Object.keys(SCOPES) as Scope[])
            .filter((s) => s !== 'pruefen' || isAdmin)
            .map((s) => (
              <Link key={s} href={s === 'alle' ? '/lieder' : `/lieder?zeige=${s}`} aria-current={s === scope ? 'page' : undefined}>
                {SCOPES[s]}
                {s === 'pruefen' && pending > 0 && <span className="ld-badge">{pending}</span>}
              </Link>
            ))}
        </nav>
        <form className="ld-search" action="/lieder" role="search">
          {scope !== 'alle' && <input type="hidden" name="zeige" value={scope} />}
          <input type="search" name="q" defaultValue={param(params.q)} placeholder="Titel, Person, Handpan …" aria-label="Lieder suchen" />
          <select name="stufe" defaultValue={stufe} aria-label="Stufe">
            <option value="">Jede Stufe</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <button className="cr-btn cr-btn--ghost" type="submit">Suchen</button>
        </form>
      </div>

      {rows.length === 0 ? (
        <div className="ld-empty">
          <p className="ld-h2">
            {scope === 'meine' ? 'Du hast noch kein Lied geteilt' : scope === 'pruefen' ? 'Nichts wartet auf dich' : q || stufe ? 'Nichts gefunden' : 'Noch ist die Bibliothek still'}
          </p>
          <p className="ld-hint">
            {scope === 'pruefen' ? 'Neue Lieder erscheinen hier, sobald jemand eins einreicht.' : 'Ein eigenes Lied, ein Groove, eine kleine Melodie — alles, was du selbst spielst, darf hier hinein.'}
          </p>
          {scope !== 'pruefen' && <Link className="cr-btn" href="/lieder/neu">Eigenes Lied teilen</Link>}
        </div>
      ) : (
        <ul className="ld-grid">
          {rows.map((r) => (
            <li key={r.id}>
              <Link className="ld-card" href={`/lieder/${r.id}`}>
                <PanArt />
                <h3>{r.title}</h3>
                <p className="ld-card-by">
                  {r.artist ? `${r.artist} · ` : ''}geteilt von {r.is_mine ? 'dir' : r.author_name}
                </p>
                {r.review_note && r.status === 'abgelehnt' && <p className="ld-note">{r.review_note}</p>}
                <div className="ld-chips">
                  <StatusTag status={r.status} />
                  <span className="ld-tag ld-tag--gold">{r.difficulty}</span>
                  {r.handpan && <span className="ld-tag">{r.handpan}</span>}
                  {r.bpm && <span className="ld-tag">♩ {r.bpm}</span>}
                  {r.measures && <span className="ld-tag">{r.measures} Takte</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </LiederPage>
  )
}
