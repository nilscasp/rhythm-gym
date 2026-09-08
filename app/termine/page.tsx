import type { Metadata } from 'next'
import Link from 'next/link'
import { currentLocale, getMessages } from '../../messages/server'
import { localizeHref, type Locale } from '../lib/locale'
import { createClient } from '../lib/supabase/server'
import {
  berlinDate,
  eventTimeLabel,
  groupByMonth,
  hasEventAccess,
  isEventKind,
  localized,
  monthLabel,
} from '../lib/event-access'
import {
  EVENT_COLUMNS,
  LIST_LOAD_ERROR,
  LIST_META,
  currentViewer,
  hintFor,
  type Termin,
} from './_viewer'

// ─────────────────────────────────────────────────────────────────────────────
// /termine — der Kalender als Schaufenster (Phasenplan v2 §4).
//
// Ohne Anmeldung erreichbar (PUBLIC_PATHS in app/lib/supabase/middleware.ts):
// wer noch kein Konto hat, soll sehen, was stattfindet. Titel, Zeit und Ort
// stehen für alle da; die Zoom-Tür steht hier grundsätzlich NIE — nicht einmal
// für Eingeloggte mit Zugang. Sie gibt es ausschließlich auf der Detailseite,
// und auch dort nur aus `event_zoom_url()`.
//
// Ist die Tür zu, sagt die Karte in einer ruhigen Zeile, woran es liegt
// (`hintFor`) — kein Schloss-Symbol, kein Verkaufsdruck.
//
// Sprache: `getMessages()` liest den Header, den `proxy.ts` gesetzt hat. Jede
// interne Adresse läuft durch `localizeHref`, damit `/en/termine` nicht auf
// halbem Weg nach Deutsch zurückfällt.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return LIST_META[await currentLocale()]
}

/**
 * Tageszahl und Monatskürzel für das Datumsschild, beides aus den Helfern.
 * Die Tageszahl kommt aus dem ISO-Datum (sprachunabhängig), das Kürzel aus dem
 * Monatsnamen der jeweiligen Sprache — „Sep" hier, „Sep" dort, „Mai"/„May" da.
 */
function dateBadge(startsAt: string, locale: Locale): { day: string; month: string } {
  return {
    day: String(Number(berlinDate(startsAt).slice(8, 10))),
    month: monthLabel(startsAt, locale).split(' ')[0].slice(0, 3),
  }
}

export default async function TerminePage() {
  const { locale, t } = await getMessages()
  const supabase = await createClient()
  const viewer = await currentViewer(supabase)

  const { data, error } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(100)

  if (error) {
    console.error('[termine] events read failed', {
      code: error.code,
      message: error.message,
    })
  }

  const events = (data ?? []) as Termin[]
  const groups = groupByMonth(events, locale)

  return (
    <>
      <style>{TERMINE_CSS}</style>
      <main className="tm-page">
        <div className="tm-wrap">
          <header className="tm-header">
            <p className="tm-eyebrow">{t.events.eyebrow}</p>
            <h1 className="tm-title">{t.events.title}</h1>
            <p className="tm-intro">{t.events.intro}</p>
          </header>

          {error ? (
            <p className="tm-empty" role="status">
              {LIST_LOAD_ERROR[locale]}
            </p>
          ) : groups.length === 0 ? (
            <p className="tm-empty">{t.events.empty}</p>
          ) : (
            groups.map((group) => (
              <section key={group.key} className="tm-month">
                <h2 className="tm-month-title">{group.label}</h2>
                <ul className="tm-list">
                  {group.events.map((event) => {
                    const badge = dateBadge(event.starts_at, locale)
                    const access = hasEventAccess(viewer, event)
                    const hint = hintFor(access, t)
                    const kindLabel = isEventKind(event.kind)
                      ? t.events.kinds[event.kind]
                      : null

                    return (
                      <li key={event.id}>
                        <Link
                          href={localizeHref(`/termine/${event.id}`, locale)}
                          className="tm-card"
                        >
                          <div className="tm-badge" aria-hidden="true">
                            <span className="tm-badge-day">{badge.day}</span>
                            <span className="tm-badge-month">{badge.month}</span>
                          </div>

                          <div className="tm-card-body">
                            <div className="tm-card-head">
                              <h3 className="tm-card-title">
                                {localized(event.title, locale)}
                              </h3>
                              {kindLabel ? (
                                <span className="tm-tag">{kindLabel}</span>
                              ) : null}
                            </div>

                            <p className="tm-meta">
                              {eventTimeLabel(event, {
                                locale,
                                allDayLabel: t.events.allDay,
                              })}
                            </p>
                            {event.location ? (
                              <p className="tm-place">{event.location}</p>
                            ) : null}
                            {hint ? <p className="tm-hint">{hint}</p> : null}
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
      </main>
    </>
  )
}

const TERMINE_CSS = `
  .tm-page {
    min-height: 100vh;
    min-height: 100dvh;
    background: var(--black);
    color: var(--cream);
    padding: 40px 20px 96px;
    font-family: var(--font-body);
  }
  .tm-wrap {
    max-width: 760px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 36px;
    min-width: 0;
  }

  .tm-header {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .tm-eyebrow {
    margin: 0;
    font-family: var(--font-ui);
    font-size: 13px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .tm-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(32px, 7vw, 48px);
    letter-spacing: 1.5px;
    line-height: 1.05;
    color: var(--cream);
    overflow-wrap: anywhere;
  }
  .tm-intro {
    margin: 0;
    font-size: 17px;
    line-height: 1.6;
    color: var(--muted2);
    max-width: 60ch;
  }

  .tm-empty {
    margin: 0;
    color: var(--muted2);
    font-size: 16px;
    line-height: 1.6;
    max-width: 56ch;
  }

  .tm-month {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
  }
  .tm-month-title {
    margin: 0;
    font-family: var(--font-ui);
    font-size: 14px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--muted);
    border-bottom: 1px solid var(--border);
    padding-bottom: 8px;
  }

  .tm-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }

  .tm-card {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    padding: 16px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--card);
    text-decoration: none;
    color: inherit;
    min-width: 0;
    transition: border-color 0.15s, background-color 0.15s;
  }
  .tm-card:hover {
    border-color: var(--amber);
    background: var(--card2);
  }

  .tm-badge {
    flex: 0 0 auto;
    width: 56px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 8px 0;
    border-radius: 4px;
    background: var(--amber-dim);
  }
  .tm-badge-day {
    font-family: var(--font-display);
    font-size: 24px;
    line-height: 1;
    color: var(--amber);
  }
  .tm-badge-month {
    font-family: var(--font-ui);
    font-size: 12px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--muted2);
  }

  .tm-card-body {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .tm-card-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
  }
  .tm-card-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: 20px;
    line-height: 1.2;
    letter-spacing: 0.5px;
    color: var(--cream);
    overflow-wrap: anywhere;
  }
  .tm-tag {
    flex: 0 0 auto;
    font-family: var(--font-ui);
    font-size: 11px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--amber);
    border: 1px solid var(--border2);
    border-radius: 999px;
    padding: 2px 10px;
  }
  .tm-meta,
  .tm-place,
  .tm-hint {
    margin: 0;
    font-size: 15px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
  .tm-meta {
    color: var(--muted2);
  }
  .tm-place {
    color: var(--muted);
  }
  .tm-hint {
    color: var(--muted);
    font-style: italic;
  }

  /* Mobil (iPhone 390x844 ist die Pflichtprobe): nichts laeuft ueber den Rand,
     das Datumsschild wird zur Zeile ueber dem Titel. */
  @media (max-width: 480px) {
    .tm-page {
      padding: 28px 14px 80px;
    }
    .tm-wrap {
      gap: 28px;
    }
    .tm-intro {
      font-size: 16px;
    }
    .tm-card {
      flex-direction: column;
      gap: 10px;
      padding: 14px;
    }
    .tm-badge {
      width: auto;
      flex-direction: row;
      align-items: baseline;
      gap: 8px;
      padding: 4px 10px;
      align-self: flex-start;
    }
    .tm-badge-day {
      font-size: 20px;
    }
    .tm-card-body {
      width: 100%;
    }
  }
`
