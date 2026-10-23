import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { OPEN_FOR, OPEN_FOR_LABELS, waMeUrl } from '../../../lib/miteinander'
import { connectionWith, isUuid, type ConnectionRow } from '../../../lib/miteinander-view'
import {
  answerConnectionAction,
  endConnectionAction,
  requestConnectionAction,
  withdrawConnectionAction,
} from '../../_actions'
import { MessageField } from '../../_message-field'
import { miteinanderSession, param } from '../../_session'
import { Avatar, BackLink, MiteinanderPage, Notice } from '../../_ui'

// ─────────────────────────────────────────────────────────────────────────────
// /miteinander/mensch/[id] — ein Profil ohne Nummer (get_member), dazu der
// Stand der Verbindung (my_connection_requests). Die Nummer kommt nur aus
// connection_phone() und nur bei angenommener Verbindung.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Mensch — Miteinander',
}

type MemberRow = {
  user_id: string
  display_name: string
  region: string | null
  about: string | null
  open_for: string[]
  visible: boolean
}

export default async function MemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { supabase, user } = await miteinanderSession()
  const [{ id }, query] = await Promise.all([params, searchParams])
  if (!isUuid(id)) notFound()
  if (id === user.id) redirect('/mein-weg#kontakt')

  const [memberRes, requestsRes] = await Promise.all([
    supabase.rpc('get_member', { p_user_id: id }),
    supabase.rpc('my_connection_requests'),
  ])
  if (memberRes.error) console.error('[miteinander] get_member failed', { code: memberRes.error.code })
  if (requestsRes.error) console.error('[miteinander] my_connection_requests failed', { code: requestsRes.error.code })
  const member = ((memberRes.data ?? []) as MemberRow[])[0]
  if (!member) notFound()

  const connection = connectionWith((requestsRes.error ? [] : (requestsRes.data ?? [])) as ConnectionRow[], id)
  let phone: string | null = null
  if (connection.state === 'connected') {
    const { data, error } = await supabase.rpc('connection_phone', { p_other_user: id })
    if (error) console.error('[miteinander] connection_phone failed', { code: error.code })
    phone = typeof data === 'string' && data ? data : null
  }

  const here = `/miteinander/mensch/${id}`
  const name = member.display_name
  const open = OPEN_FOR.filter((k) => (member.open_for ?? []).includes(k))

  return (
    <MiteinanderPage>
      <BackLink href="/miteinander#menschen">Alle Menschen</BackLink>

      <div className="mt-layout">
        <div className="mt-main">
          <header className="sp-profile">
            <Avatar name={name} size="xl" />
            <div className="cr-head">
              <h1 className="cr-title">{name}</h1>
              {member.region ? (
                <div className="mt-chips">
                  <span className="mt-chip">{member.region}</span>
                </div>
              ) : null}
            </div>
          </header>

          <Notice fehler={param(query.fehler)} ok={param(query.ok)} />

          {member.about || open.length > 0 ? (
            <section className="mt-box" aria-labelledby="p-about">
              <h2 id="p-about" className="cr-kicker">
                Über mich
              </h2>
              {member.about ? <p className="mt-text">{member.about}</p> : null}
              {open.length > 0 ? (
                <div className="mt-chips">
                  {open.map((k) => (
                    <span key={k} className="mt-chip mt-chip--gold">
                      Offen für {OPEN_FOR_LABELS[k]}
                    </span>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}
        </div>

        <aside className="mt-aside" aria-label="Verbinden">
          {connection.state === 'connected' ? (
            <div className="mt-box mt-box--gold">
              <p className="mt-sub">Ihr seid verbunden</p>
              {phone ? (
                <>
                  <div className="mt-request-head">
                    <Avatar name={name} />
                    <div>
                      <p className="mt-text">{name}</p>
                      <p className="mt-phone">{phone}</p>
                    </div>
                  </div>
                  <a href={waMeUrl(phone)} className="cr-btn" target="_blank" rel="noopener noreferrer">
                    Auf WhatsApp schreiben
                  </a>
                </>
              ) : (
                <p className="mt-hint">{name} hat noch keine Handynummer eingetragen.</p>
              )}
              <form action={endConnectionAction}>
                <input type="hidden" name="request_id" value={connection.requestId ?? ''} />
                <input type="hidden" name="zurueck" value={here} />
                <button type="submit" className="cr-btn cr-btn--ghost">
                  Verbindung lösen
                </button>
              </form>
            </div>
          ) : connection.state === 'pending_out' ? (
            <div className="mt-box mt-box--gold">
              <p className="mt-sub">Anfrage gesendet</p>
              <p className="mt-text">
                {name} entscheidet, ob ihr euch verbindet. Deine Nummer bleibt bis dahin verborgen.
              </p>
              <form action={withdrawConnectionAction}>
                <input type="hidden" name="request_id" value={connection.requestId ?? ''} />
                <input type="hidden" name="zurueck" value={here} />
                <button type="submit" className="cr-btn cr-btn--ghost">
                  Zurückziehen
                </button>
              </form>
            </div>
          ) : connection.state === 'pending_in' ? (
            <div className="mt-box mt-box--gold">
              <p className="cr-kicker">Anfrage an dich</p>
              {connection.message ? <p className="mt-quote">„{connection.message}“</p> : null}
              <div className="mt-actions">
                <form action={answerConnectionAction}>
                  <input type="hidden" name="request_id" value={connection.requestId ?? ''} />
                  <input type="hidden" name="accept" value="1" />
                  <input type="hidden" name="zurueck" value={here} />
                  <button type="submit" className="cr-btn">
                    Annehmen
                  </button>
                </form>
                <form action={answerConnectionAction}>
                  <input type="hidden" name="request_id" value={connection.requestId ?? ''} />
                  <input type="hidden" name="accept" value="0" />
                  <input type="hidden" name="zurueck" value={here} />
                  <button type="submit" className="cr-btn cr-btn--ghost">
                    Lieber nicht
                  </button>
                </form>
              </div>
              <p className="mt-hint">Lehnst du ab, erfährt die Person nur, dass es gerade nicht passt.</p>
            </div>
          ) : member.visible ? (
            <form action={requestConnectionAction} className="mt-box mt-box--gold mt-form">
              <p className="cr-kicker">Verbinden</p>
              <p className="mt-text">
                Möchtest du mit {name} üben oder euch treffen? Schick eine kurze Anfrage. Wenn {name} zustimmt, seht ihr
                beide eure Handynummer und schreibt euch auf WhatsApp.
              </p>
              <input type="hidden" name="to_user" value={member.user_id} />
              <MessageField id="anfrage" name="message" label={`Deine Nachricht an ${name}`} />
              <button type="submit" className="cr-btn">
                Verbindung anfragen
              </button>
            </form>
          ) : (
            <div className="mt-box">
              <p className="mt-hint">{name} ist gerade nicht unter „Menschen“ zu finden.</p>
            </div>
          )}
        </aside>
      </div>
    </MiteinanderPage>
  )
}
