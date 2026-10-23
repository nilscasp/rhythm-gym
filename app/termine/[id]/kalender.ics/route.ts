import { createClient } from '../../../lib/supabase/server'
import { buildEventIcs } from '../../../lib/event-ics'
import { localizeHref, type Locale } from '../../../lib/locale'

// ─────────────────────────────────────────────────────────────────────────────
// GET /termine/[id]/kalender.ics — ein Termin als Kalenderdatei.
//
// Öffentlich wie die Terminseite selbst: Titel, Zeit und Beschreibung sieht
// jeder (Migration 0006). Der Zoom-Link steht NICHT darin — EVENT_ICS_COLUMNS
// enthält zoom_url nicht (die Spalte wäre ohnehin gesperrt); stattdessen führt
// der Link auf die Terminseite, wo event_zoom_url() bei jedem Aufruf neu prüft.
// Die Adresse wird aus der Anfrage gebaut, damit jede Marke (data-brand aus
// dem Host) auf ihre eigene Terminseite zeigt.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EVENT_ICS_COLUMNS =
  'id, title, description, starts_at, ends_at, all_day, location, created_at, updated_at'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params
  const url = new URL(request.url)
  const locale: Locale = url.searchParams.get('lang') === 'en' ? 'en' : 'de'

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_ICS_COLUMNS)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[termine] ics read failed', { id, code: error.code, message: error.message })
  }
  if (!data) return new Response('Nicht gefunden', { status: 404 })

  const pageUrl = `${url.origin}${localizeHref(`/termine/${data.id}`, locale)}`
  const body = buildEventIcs(data, { url: pageUrl, locale })

  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="termin-${data.id.slice(0, 8)}.ics"`,
      'Cache-Control': 'public, max-age=300',
    },
  })
}
