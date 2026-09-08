import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import { getCourseAccess } from '../../lib/course-access'
import {
  eventTimeLabel,
  formatEventDate,
  hasEventAccess,
  isEventKind,
  KIND_LABELS,
  localized,
  type PublicEvent,
} from '../../lib/event-access'

// ─────────────────────────────────────────────────────────────────────────────
// /training/von-anfang-an-spielen — der Kursraum des Live-Kurses.
//
// Anders als das Rhythmus-Fundament hat dieser Kurs KEINE Tagesstruktur in der
// App: er lebt von zehn Wochen gemeinsamer Live-Termine. Diese Seite ist
// deshalb bewusst schmal — sie sagt, wann wir uns treffen, und hält die Tür
// zum Raum bereit. Sie behauptet nicht, ein Kursraum voller Material zu sein,
// den es noch nicht gibt.
//
// Warum es sie überhaupt gibt: die Übersicht unter /training verlinkt jede
// Einschreibung auf `/training/{slug}`. Ohne diese Seite bekäme jeder
// Teilnehmer eine Fehlerseite — genau der tote Weg, der beim Anlegen des
// Programms sonst entstanden wäre.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

const SLUG = 'von-anfang-an-spielen'

export const metadata: Metadata = {
  title: 'Von Anfang an spielen — Handpan Schule des Lebens',
  description: 'Deine Termine und dein Zugang zum Live-Kurs.',
}

/** Nur die Spalten, die anon und authenticated lesen dürfen — nie `zoom_url`. */
const EVENT_COLUMNS =
  'id, title, description, starts_at, ends_at, kind, location, program_id, visibility, series_id, all_day, website_link, created_at, updated_at'

export default async function VonAnfangAnSpielenPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const access = await getCourseAccess(supabase, user.id, SLUG)
  if (!access.enrolled) redirect('/training')

  const { data: program } = await supabase
    .from('programs')
    .select('id, title, description')
    .eq('slug', SLUG)
    .maybeSingle()

  // Termine dieses Kurses, ab heute.
  const { data: eventRows } = program
    ? await supabase
        .from('events')
        .select(EVENT_COLUMNS)
        .eq('program_id', program.id)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
    : { data: null }

  const events = (eventRows ?? []) as PublicEvent[]

  // Eingeschrieben heißt hier: die Tür steht offen. Die Prüfung bleibt
  // trotzdem dieselbe wie überall, damit es nur eine Regel gibt.
  const viewer = {
    isAuthenticated: true,
    isPremium: false,
    enrolledProgramIds: program ? [program.id] : [],
  }

  // Die Türen vorher holen, nicht im JSX: ein Array von Promises als Kinder
  // ist kein verlässliches Rendern. Gefragt wird nur, wo die Anzeige-Logik
  // ohnehin zustimmt; die Adresse selbst gibt allein `event_zoom_url()` heraus.
  const zoomUrls = new Map<string, string>()
  await Promise.all(
    events.map(async (event) => {
      if (!hasEventAccess(viewer, event).canJoin) return
      const { data: url } = await supabase.rpc('event_zoom_url', { p_event_id: event.id })
      if (typeof url === 'string' && url.trim() !== '') zoomUrls.set(event.id, url)
    }),
  )

  return (
    <>
      <style>{VAAS_CSS}</style>
      <main className="va-page">
        <div className="va-wrap">
          <Link href="/training" className="va-back">
            ← Deine Kurse
          </Link>

          <header className="va-header">
            <p className="va-eyebrow">Live-Kurs</p>
            <h1 className="va-title">{program?.title ?? 'Von Anfang an spielen'}</h1>
            <p className="va-intro">
              Zehn Wochen gemeinsam, von der ersten Berührung an. Wir treffen uns live in
              der Gruppe — hier stehen die Termine und die Tür zum Raum.
            </p>
          </header>

          <section className="va-section">
            <h2 className="va-h2">Kommende Termine</h2>

            {events.length === 0 ? (
              <p className="va-muted">
                Sobald der nächste Termin steht, findest du ihn hier. Alle Termine der
                Schule stehen außerdem im{' '}
                <Link href="/termine" className="va-inline">
                  Kalender
                </Link>
                .
              </p>
            ) : (
              <ul className="va-events">
                {events.map((event) => {
                  const kindLabel = isEventKind(event.kind) ? KIND_LABELS[event.kind] : null
                  const zoomUrl = zoomUrls.get(event.id) ?? null

                  return (
                    <li key={event.id} className="va-event">
                      <div className="va-event-body">
                        <p className="va-event-when">
                          {formatEventDate(event.starts_at)} · {eventTimeLabel(event)}
                        </p>
                        <h3 className="va-event-title">{localized(event.title)}</h3>
                        {kindLabel ? <span className="va-tag">{kindLabel}</span> : null}
                        {event.location ? (
                          <p className="va-muted">{event.location}</p>
                        ) : null}
                      </div>

                      {zoomUrl ? (
                        <a
                          href={zoomUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="va-door"
                        >
                          Zum Raum
                        </a>
                      ) : (
                        <span className="va-muted">Die Tür öffnet kurz vor Beginn.</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="va-section">
            <h2 className="va-h2">Zwischen den Terminen</h2>
            <p className="va-text">
              Zum Üben zwischendurch steht dir die{' '}
              <Link href="/tool" className="va-inline">
                Rhythmus-Werkstatt
              </Link>{' '}
              offen: Patterns hören, verlangsamen und auf deine eigene Pan stimmen. Im{' '}
              <Link href="/glossar" className="va-inline">
                Glossar
              </Link>{' '}
              findest du jeden Begriff, der in den Sessions fällt.
            </p>
            <p className="va-muted">
              Die Unterlagen zum Kurs bekommst du wie gewohnt per Mail und in den Sessions.
            </p>
          </section>
        </div>
      </main>
    </>
  )
}

const VAAS_CSS = `
  .va-page {
    min-height: 100vh;
    min-height: 100dvh;
    background: var(--black);
    color: var(--cream);
    padding: 40px 20px 96px;
    font-family: var(--font-body);
  }
  .va-wrap {
    max-width: 760px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 36px;
    min-width: 0;
  }

  .va-back {
    font-family: var(--font-ui);
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    text-decoration: none;
  }
  .va-back:hover { color: var(--amber); }

  .va-header { display: flex; flex-direction: column; gap: 10px; }
  .va-eyebrow {
    margin: 0;
    font-family: var(--font-ui);
    font-size: 12px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .va-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(30px, 6.5vw, 44px);
    line-height: 1.1;
  }
  .va-intro { margin: 0; font-size: 17px; line-height: 1.6; color: var(--muted2); max-width: 58ch; }

  .va-section { display: flex; flex-direction: column; gap: 14px; }
  .va-h2 {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(22px, 5vw, 28px);
    line-height: 1.15;
    padding-top: 18px;
    border-top: 1px solid var(--border);
  }
  .va-text { margin: 0; font-size: 16px; line-height: 1.7; color: var(--muted2); max-width: 58ch; }
  .va-muted { margin: 0; font-size: 14px; line-height: 1.6; color: var(--muted); }
  .va-inline { color: var(--amber); text-decoration: underline; text-underline-offset: 3px; }

  .va-events { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
  .va-event {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    background: var(--card);
    border: 1px solid var(--border);
    padding: 18px 20px;
  }
  .va-event-body { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
  .va-event-when {
    margin: 0;
    font-family: var(--font-ui);
    font-size: 12px;
    letter-spacing: 1px;
    color: var(--amber);
  }
  .va-event-title { margin: 0; font-family: var(--font-display); font-size: 20px; line-height: 1.2; }
  .va-tag {
    align-self: flex-start;
    font-family: var(--font-ui);
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    border: 1px solid var(--border2);
    border-radius: 2px;
    padding: 4px 8px;
  }

  .va-door {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 12px 22px;
    background: var(--amber);
    color: var(--black);
    border-radius: 2px;
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    text-decoration: none;
    white-space: nowrap;
  }
  .va-door:hover { background: var(--amber2); }

  @media (max-width: 480px) {
    .va-page { padding: 28px 14px 80px; }
    .va-wrap { gap: 28px; }
    .va-event { flex-direction: column; align-items: stretch; }
    .va-door { width: 100%; }
  }
`
