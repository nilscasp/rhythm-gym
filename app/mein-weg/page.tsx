import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '../lib/supabase/server'
import { currentBrand } from '../lib/brand-server'
import { progressPercent } from '../lib/course-progress'
import { switchLocaleHref } from '../lib/locale'
import { LIMITS, OPEN_FOR, OPEN_FOR_LABELS } from '../lib/miteinander'
import { firstName, type ConnectionRow } from '../lib/miteinander-view'
import { getMessages } from '../../messages/server'
import { SCHULE_PAGE_CSS } from '../_schule/pages-css'
import { COURSE_CSS } from '../training/_course/views'
import { loadCourseCatalog } from '../training/_course/catalog'
import {
  answerConnectionAction,
  endConnectionAction,
  saveContactAction,
  withdrawConnectionAction,
} from '../miteinander/_actions'
import { param } from '../miteinander/_session'
import { Avatar, MITEINANDER_CSS, Notice } from '../miteinander/_ui'

// ─────────────────────────────────────────────────────────────────────────────
// /mein-weg — Profil-Kopf, Einstellungen, eigene Kurse mit Fortschritt,
// Abmelden. Hierher führt der runde Profil-Knopf oben rechts. Später kommt
// das Übe-Tagebuch dazu. Admin findet hier auch „Coach“.
//
// Miteinander (0013): „Anfragen an dich“ (#anfragen, Ziel der Glocke),
// „Meine Verbindungen“ und „Mein Kontakt“ (#kontakt). Lesefehler — etwa
// solange 0013 nicht eingespielt ist — lassen die Abschnitte leer.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Mein Weg — Handpan Schule des Lebens',
}

type ContactRow = {
  display_name: string | null
  phone: string | null
  region: string | null
  about: string | null
  visible: boolean
  open_for: string[]
}

export default async function MeinWegPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  if ((await currentBrand()) !== 'schule') notFound()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, cards, { locale, t }, contactRes, requestsRes, query] = await Promise.all([
    supabase.from('profiles').select('full_name, is_admin').eq('id', user.id).maybeSingle(),
    loadCourseCatalog(supabase, user.id),
    getMessages(),
    supabase
      .from('member_profiles')
      .select('display_name, phone, region, about, visible, open_for')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase.rpc('my_connection_requests'),
    searchParams,
  ])
  if (contactRes.error) console.error('[mein-weg] member_profiles read failed', { code: contactRes.error.code })
  if (requestsRes.error) console.error('[mein-weg] my_connection_requests failed', { code: requestsRes.error.code })

  const name: string = profile?.full_name?.trim() || user.email || 'Du'
  const initial = (Array.from(name)[0] ?? '·').toLocaleUpperCase('de-DE')
  const mine = cards.filter((c) => c.hasAccess && c.kind === 'course')
  const other = locale === 'de' ? 'en' : 'de'

  const contact = (contactRes.error ? null : contactRes.data) as ContactRow | null
  const requests = (requestsRes.error ? [] : (requestsRes.data ?? [])) as ConnectionRow[]
  const incoming = requests.filter((r) => r.direction === 'in' && r.status === 'pending')
  const outgoing = requests.filter((r) => r.direction === 'out' && r.status === 'pending')
  const connected = requests.filter((r) => r.status === 'accepted')
  const fallbackName = firstName(profile?.full_name) || 'Mitglied'
  const fehler = param(query.fehler)
  const ok = param(query.ok) || (param(query.gespeichert) ? 'gespeichert' : '')

  return (
    <>
      <style>{COURSE_CSS}</style>
      <style>{SCHULE_PAGE_CSS}</style>
      <style>{MITEINANDER_CSS}</style>
      <main className="cr-page sp-page mt-page">
        <div className="cr-wrap sp-wrap">
          <header className="sp-profile">
            <span className="sp-avatar" aria-hidden="true">
              {initial}
            </span>
            <div className="cr-head">
              <p className="cr-kicker">Mein Weg</p>
              <h1 className="cr-title">{name}</h1>
            </div>
          </header>

          <Notice fehler={fehler} ok={ok} />

          <section className="sp-section" aria-labelledby="mw-kurse">
            <h2 id="mw-kurse" className="cr-kicker">Deine Kurse</h2>
            {mine.length === 0 ? (
              <p className="sp-note">Noch kein Kurs offen.</p>
            ) : (
              <ul className="sp-list">
                {mine.map((c) => (
                  <li key={c.programId}>
                    <Link href={c.href} className="sp-list-item">
                      <span>{c.title}</span>
                      {c.total > 0 ? (
                        <span className="sp-list-meta">{progressPercent(c.done, c.total)} %</span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/training/kurse" className="sp-link">
              Alle Kurse
            </Link>
          </section>

          <section id="anfragen" className="sp-section mt-section" aria-labelledby="mw-anfragen">
            <h2 id="mw-anfragen" className="cr-kicker">
              Anfragen an dich
            </h2>
            {incoming.length === 0 ? (
              <p className="sp-note">Gerade keine offenen Anfragen.</p>
            ) : (
              <ul className="mt-people">
                {incoming.map((r) => (
                  <li key={r.id} className="mt-request">
                    <div className="mt-request-head">
                      <Avatar name={r.other_name} />
                      <Link href={`/miteinander/mensch/${r.other_user}`} className="mt-person-name">
                        {r.other_name}
                      </Link>
                    </div>
                    <p className="mt-quote">„{r.message}“</p>
                    <div className="mt-actions">
                      <form action={answerConnectionAction}>
                        <input type="hidden" name="request_id" value={r.id} />
                        <input type="hidden" name="accept" value="1" />
                        <input type="hidden" name="zurueck" value="/mein-weg#anfragen" />
                        <button type="submit" className="cr-btn">
                          Annehmen
                        </button>
                      </form>
                      <form action={answerConnectionAction}>
                        <input type="hidden" name="request_id" value={r.id} />
                        <input type="hidden" name="accept" value="0" />
                        <input type="hidden" name="zurueck" value="/mein-weg#anfragen" />
                        <button type="submit" className="cr-btn cr-btn--ghost">
                          Lieber nicht
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-hint">Lehnst du ab, erfährt die Person nur, dass es gerade nicht passt.</p>
          </section>

          <section id="verbindungen" className="sp-section mt-section" aria-labelledby="mw-verbindungen">
            <h2 id="mw-verbindungen" className="cr-kicker">
              Meine Verbindungen
            </h2>
            {connected.length === 0 && outgoing.length === 0 ? (
              <p className="sp-note">
                Noch keine Verbindungen.{' '}
                <Link href="/miteinander#menschen" className="sp-link mt-inline">
                  Menschen finden
                </Link>
              </p>
            ) : (
              <ul className="mt-people">
                {connected.map((r) => (
                  <li key={r.id} className="mt-person">
                    <Avatar name={r.other_name} />
                    <Link href={`/miteinander/mensch/${r.other_user}`} className="mt-person-name">
                      {r.other_name}
                    </Link>
                    <form action={endConnectionAction}>
                      <input type="hidden" name="request_id" value={r.id} />
                      <input type="hidden" name="zurueck" value="/mein-weg#verbindungen" />
                      <button type="submit" className="sp-account-link">
                        Lösen
                      </button>
                    </form>
                  </li>
                ))}
                {outgoing.map((r) => (
                  <li key={r.id} className="mt-person">
                    <Avatar name={r.other_name} />
                    <Link href={`/miteinander/mensch/${r.other_user}`} className="mt-person-name">
                      {r.other_name}
                    </Link>
                    <span className="mt-person-note">wartet</span>
                    <form action={withdrawConnectionAction}>
                      <input type="hidden" name="request_id" value={r.id} />
                      <input type="hidden" name="zurueck" value="/mein-weg#verbindungen" />
                      <button type="submit" className="sp-account-link">
                        Zurückziehen
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="kontakt" className="sp-section mt-section" aria-labelledby="mw-kontakt">
            <h2 id="mw-kontakt" className="cr-kicker">
              Mein Kontakt
            </h2>
            <form action={saveContactAction} className="mt-form mt-box">
              <div className="mt-field">
                <label htmlFor="k-phone">Handynummer für WhatsApp</label>
                <input
                  id="k-phone"
                  name="phone"
                  className="mt-input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+49 176 …"
                  defaultValue={contact?.phone ?? ''}
                  aria-describedby="k-phone-hint"
                />
                <p id="k-phone-hint" className="mt-hint">
                  Niemand sieht deine Nummer, bis du einer Verbindung zustimmst.
                </p>
              </div>
              <div className="mt-field">
                <label htmlFor="k-region">Wo du ungefähr wohnst</label>
                <input
                  id="k-region"
                  name="region"
                  className="mt-input"
                  type="text"
                  maxLength={LIMITS.region}
                  placeholder="z. B. Raum München"
                  defaultValue={contact?.region ?? ''}
                  aria-describedby="k-region-hint"
                />
                <p id="k-region-hint" className="mt-hint">
                  Nur die Region, nie die Adresse.
                </p>
              </div>
              <div className="mt-field">
                <label htmlFor="k-about">Über mich</label>
                <textarea
                  id="k-about"
                  name="about"
                  className="mt-input mt-textarea"
                  maxLength={LIMITS.about}
                  placeholder="Seit wann du spielst, was du suchst"
                  defaultValue={contact?.about ?? ''}
                />
              </div>
              <div className="mt-field">
                <label htmlFor="k-name">Anzeigename (freiwillig)</label>
                <input
                  id="k-name"
                  name="display_name"
                  className="mt-input"
                  type="text"
                  maxLength={LIMITS.displayName}
                  placeholder={fallbackName}
                  defaultValue={contact?.display_name ?? ''}
                  aria-describedby="k-name-hint"
                />
                <p id="k-name-hint" className="mt-hint">
                  Leer lassen, dann steht dort dein Vorname: {fallbackName}.
                </p>
              </div>
              <hr className="mt-rule" />
              <fieldset className="mt-fieldset">
                <legend className="mt-label">Sichtbarkeit</legend>
                <label className="mt-check">
                  <input type="checkbox" name="visible" defaultChecked={contact?.visible ?? false} />
                  Unter „Menschen“ sichtbar sein
                </label>
                {OPEN_FOR.map((k) => (
                  <label key={k} className="mt-check">
                    <input
                      type="checkbox"
                      name="open_for"
                      value={k}
                      defaultChecked={(contact?.open_for ?? []).includes(k)}
                    />
                    Offen für {OPEN_FOR_LABELS[k]}
                  </label>
                ))}
              </fieldset>
              <div className="mt-actions">
                <button type="submit" className="cr-btn">
                  Speichern
                </button>
              </div>
            </form>
          </section>

          <section className="sp-section" aria-labelledby="mw-konto">
            <h2 id="mw-konto" className="cr-kicker">Konto</h2>
            <ul className="sp-list">
              <li>
                <Link href="/settings" className="sp-list-item">
                  Einstellungen
                </Link>
              </li>
              <li>
                <Link href={switchLocaleHref('/mein-weg', other)} hrefLang={other} className="sp-list-item">
                  {other === 'en' ? t.nav.toEnglish : t.nav.toGerman}
                </Link>
              </li>
              {profile?.is_admin ? (
                <li>
                  <Link href="/coach" className="sp-list-item">
                    Coach
                  </Link>
                </li>
              ) : null}
            </ul>
          </section>

          <footer className="sp-account">
            <form action="/auth/logout" method="POST">
              <button type="submit" className="sp-account-link">
                Abmelden
              </button>
            </form>
          </footer>
        </div>
      </main>
    </>
  )
}
