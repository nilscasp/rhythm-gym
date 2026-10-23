import { createClient } from '../../lib/supabase/server'
import { buildCalendar } from '../../lib/event-ics'
import { localizeHref, type Locale } from '../../lib/locale'

// ─────────────────────────────────────────────────────────────────────────────
// GET /termine/abo.ics — öffentlicher Abo-Feed aller Termine.
//
// Geht ohne Geheimnis in der URL, weil der Feed nur enthält, was /termine
// ohnehin jedem zeigt: Titel, Zeit, Beschreibung, Ort — für ALLE Termine,
// unabhängig von der Stufe. Kein Zoom-Link, keine Personendaten.
// Bewusst NICHT gebaut: ein persönlicher Feed („nur meine Termine“). Der
// bräuchte ein Token in der URL (Kalender-Apps schicken keine Cookies) — das
// lassen wir weg.
// Zeitraum: 30 Tage zurück bis alles Kommende, höchstens 200 Termine.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FEED_COLUMNS =
  'id, title, description, starts_at, ends_at, all_day, location, created_at, updated_at'
const PAST_DAYS = 30
const MAX_EVENTS = 200

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const locale: Locale = url.searchParams.get('lang') === 'en' ? 'en' : 'de'
  const since = new Date(Date.now() - PAST_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('events')
    .select(FEED_COLUMNS)
    // Der Feed wird von Kalenderdiensten gespiegelt: nur offene Termine.
    .in('visibility', ['public', 'members'])
    .gte('starts_at', since)
    .order('starts_at', { ascending: true })
    .limit(MAX_EVENTS)

  if (error) {
    console.error('[termine] feed read failed', { code: error.code, message: error.message })
    return new Response('Termine gerade nicht verfügbar', { status: 503 })
  }

  const body = buildCalendar(data ?? [], {
    urlFor: (id) => `${url.origin}${localizeHref(`/termine/${id}`, locale)}`,
    locale,
    name: locale === 'en' ? 'Handpan Schule des Lebens — Events' : 'Handpan Schule des Lebens — Termine',
  })

  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="termine.ics"',
      'Cache-Control': 'public, max-age=900',
    },
  })
}
