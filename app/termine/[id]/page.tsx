import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import {
  KIND_LABELS,
  accessHint,
  eventTimeLabel,
  formatEventDate,
  hasEventAccess,
  isEventKind,
  localized,
} from '../../lib/event-access'
import { EVENT_COLUMNS, currentViewer, type Termin } from '../_viewer'

// ─────────────────────────────────────────────────────────────────────────────
// /termine/[id] — der einzelne Termin, und die einzige Stelle im Verzeichnis,
// an der die Zoom-Tür überhaupt vorkommt.
//
// Der Weg dorthin ist bewusst schmal: `hasEventAccess` entscheidet nur, OB ein
// Knopf gezeigt wird; die Adresse selbst kommt ausschließlich aus
// `event_zoom_url()` (SECURITY DEFINER, Migration 0006), die ihre Prüfung
// unabhängig noch einmal macht. Wäre die Anzeige-Logik hier je falsch, sähe
// jemand einen Knopf ohne Ziel — durch die Tür käme er trotzdem nicht.
//
// Gibt die Funktion null zurück, obwohl die Person hineindürfte, ist meistens
// schlicht noch kein Link hinterlegt. Darum steht dort ein ruhiger Satz und
// keine Fehlermeldung.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

/**
 * Arten, bei denen es überhaupt einen Raum zu betreten gibt. Ein Kursstart oder
 * ein Retreat hat keine Zoom-Tür — dort wäre „Die Tür öffnet kurz vor Beginn"
 * ein Versprechen, das niemand einlöst.
 */
const ROOM_KINDS = new Set(['live_training', 'qa', 'community'])

interface PageProps {
  params: Promise<{ id: string }>
}

const FALLBACK_TITLE = 'Termin — Handpan Schule des Lebens'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()

  // Eine ungültige uuid endet hier als Lesefehler, nicht als Absturz.
  const { data } = await supabase
    .from('events')
    .select('title')
    .eq('id', id)
    .maybeSingle()

  const title = data ? localized(data.title) : ''
  return {
    title: title ? `${title} — Handpan Schule des Lebens` : FALLBACK_TITLE,
  }
}

export default async function TerminPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const viewer = await currentViewer(supabase)

  const { data, error } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[termine] event read failed', {
      id,
      code: error.code,
      message: error.message,
    })
  }
  if (!data) notFound()

  const event = data as Termin
  const access = hasEventAccess(viewer, event)
  const hint = accessHint(access)
  const reason = access.canJoin ? null : access.reason
  const kindLabel = isEventKind(event.kind) ? KIND_LABELS[event.kind] : null

  // Der einzige Aufruf der Tür-Funktion — und nur, wenn die Anzeige-Logik
  // ohnehin schon zustimmt. Ohne Zugang wird sie gar nicht erst gefragt.
  let zoomUrl: string | null = null
  if (access.canJoin) {
    const { data: url, error: rpcError } = await supabase.rpc('event_zoom_url', {
      p_event_id: id,
    })
    if (rpcError) {
      console.error('[termine] event_zoom_url failed', {
        id,
        code: rpcError.code,
        message: rpcError.message,
      })
    }
    zoomUrl = typeof url === 'string' && url.trim() !== '' ? url : null
  }

  const paragraphs = localized(event.description)
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean)

  return (
    <>
      <style>{TERMIN_CSS}</style>
      <main className="tv-page">
        <div className="tv-wrap">
          <Link href="/termine" className="tv-back">
            ← Alle Termine
          </Link>

          <header className="tv-header">
            {kindLabel ? <p className="tv-tag">{kindLabel}</p> : null}
            <h1 className="tv-title">{localized(event.title)}</h1>
            <p className="tv-when">
              {formatEventDate(event.starts_at)} · {eventTimeLabel(event)}
            </p>
            {event.location ? (
              <p className="tv-place">{event.location}</p>
            ) : null}
          </header>

          {paragraphs.length > 0 ? (
            <section className="tv-body">
              {paragraphs.map((text, index) => (
                <p key={index} className="tv-para">
                  {text}
                </p>
              ))}
            </section>
          ) : null}

          <section className="tv-door">
            {access.canJoin ? (
              zoomUrl ? (
                <div className="tv-cta-row">
                  <a
                    href={zoomUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tv-cta tv-cta--primary"
                  >
                    Zum Raum
                  </a>
                </div>
              ) : event.website_link ? (
                // Kein Raum hinterlegt, aber eine Seite auf handpan.schule:
                // typisch für Kursstarts und Retreats, wo es nichts zu
                // betreten, aber etwas zu lesen gibt.
                <div className="tv-cta-row">
                  <a
                    href={event.website_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tv-cta tv-cta--secondary"
                  >
                    Mehr auf handpan.schule
                  </a>
                </div>
              ) : (
                // Nur wenn ein Raum vorgesehen, aber noch nicht eingetragen ist.
                // Ohne Raum und ohne Seite versprechen wir keine Tür.
                ROOM_KINDS.has(event.kind) ? (
                  <p className="tv-muted">Die Tür öffnet kurz vor Beginn.</p>
                ) : null
              )
            ) : (
              <>
                {hint ? <p className="tv-hint">{hint}</p> : null}

                {reason === 'login' ? (
                  <div className="tv-cta-row">
                    <Link href="/auth/login" className="tv-cta tv-cta--primary">
                      Einloggen
                    </Link>
                    <Link
                      href="/auth/login?mode=signup"
                      className="tv-cta tv-cta--secondary"
                    >
                      Kostenloses Konto
                    </Link>
                  </div>
                ) : null}

                {reason === 'premium' ? (
                  <p className="tv-muted">
                    Der Innere Kreis öffnet am 21. Dezember 2026.
                  </p>
                ) : null}

                {reason === 'program' ? (
                  <div className="tv-cta-row">
                    <Link href="/training" className="tv-cta tv-cta--primary">
                      Zu den Kursen
                    </Link>
                  </div>
                ) : null}
              </>
            )}
          </section>
        </div>
      </main>
    </>
  )
}

const TERMIN_CSS = `
  .tv-page {
    min-height: 100vh;
    min-height: 100dvh;
    background: var(--black);
    color: var(--cream);
    padding: 40px 20px 96px;
    font-family: var(--font-body);
  }
  .tv-wrap {
    max-width: 720px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 28px;
    min-width: 0;
  }

  .tv-back {
    align-self: flex-start;
    font-family: var(--font-ui);
    font-size: 14px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--muted2);
    text-decoration: none;
    padding: 4px 0;
    transition: color 0.15s;
  }
  .tv-back:hover {
    color: var(--amber);
  }

  .tv-header {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }
  .tv-tag {
    margin: 0;
    align-self: flex-start;
    font-family: var(--font-ui);
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--amber);
    border: 1px solid var(--border2);
    border-radius: 999px;
    padding: 3px 12px;
  }
  .tv-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(30px, 6.5vw, 44px);
    letter-spacing: 1.2px;
    line-height: 1.08;
    color: var(--cream);
    overflow-wrap: anywhere;
  }
  .tv-when {
    margin: 0;
    font-family: var(--font-ui);
    font-size: 17px;
    letter-spacing: 0.5px;
    color: var(--amber);
    overflow-wrap: anywhere;
  }
  .tv-place {
    margin: 0;
    font-size: 16px;
    line-height: 1.5;
    color: var(--muted2);
    overflow-wrap: anywhere;
  }

  .tv-body {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
  }
  .tv-para {
    margin: 0;
    font-size: 17px;
    line-height: 1.65;
    color: var(--muted2);
    max-width: 62ch;
    overflow-wrap: anywhere;
  }

  .tv-door {
    border-top: 1px solid var(--border);
    padding-top: 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
  }
  .tv-hint,
  .tv-muted {
    margin: 0;
    font-size: 16px;
    line-height: 1.6;
    color: var(--muted);
    max-width: 56ch;
  }
  .tv-hint {
    color: var(--muted2);
  }

  .tv-cta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    min-width: 0;
  }
  .tv-cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 48px;
    padding: 14px 22px;
    border-radius: 2px;
    font-family: var(--font-ui);
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    text-decoration: none;
    transition: background-color 0.15s, border-color 0.15s, color 0.15s;
  }
  .tv-cta--primary {
    background: var(--amber);
    color: var(--black);
    border: 1px solid var(--amber);
  }
  .tv-cta--primary:hover {
    background: var(--amber2);
    border-color: var(--amber2);
  }
  .tv-cta--secondary {
    background: transparent;
    color: var(--cream);
    border: 1px solid var(--border2);
  }
  .tv-cta--secondary:hover {
    border-color: var(--amber);
    color: var(--amber);
  }

  /* Mobil (iPhone 390x844 ist die Pflichtprobe): Knoepfe voll breit,
     nichts laeuft ueber den Rand. */
  @media (max-width: 480px) {
    .tv-page {
      padding: 28px 14px 80px;
    }
    .tv-wrap {
      gap: 24px;
    }
    .tv-when {
      font-size: 16px;
    }
    .tv-para {
      font-size: 16px;
    }
    .tv-cta-row {
      flex-direction: column;
      align-items: stretch;
    }
    .tv-cta {
      width: 100%;
    }
  }
`
