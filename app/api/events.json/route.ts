import { NextResponse } from 'next/server'
import { createClient } from '../../lib/supabase/server'
import {
  KIND_WEBSITE_TYPE,
  berlinDate,
  formatEventTime,
  isEventKind,
  localized,
  type PublicEvent,
} from '../../lib/event-access'

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/events.json?locale=de — Termine für die Leiste auf handpan.schule
//
// Die Website pflegt ihre Termine bis heute in einer statischen events.json.
// Ab jetzt liefert die App dieselben Daten im GLEICHEN Schema, damit die
// Sidebar unverändert weiterläuft und Nils Termine nur noch an einer Stelle
// pflegt (Phasenplan v2 §4).
//
// Schema pro Eintrag, exakt wie bisher:
//   { title, date: 'YYYY-MM-DD', time: '19:00', type, location?, link }
//
// Öffentlich und ohne Konto abrufbar — es sind dieselben Angaben, die auf
// /termine stehen. `zoom_url` wird nie ausgeliefert: die Spalte ist für
// anon/authenticated gesperrt (Migration 0006) und steht in keinem Select.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** So lange darf ein Zwischenspeicher die Liste halten. */
const CACHE_SECONDS = 300

const SCHOOL_ORIGIN = 'https://lernen.handpan.schule'

type WebsiteEvent = {
  title: string
  date: string
  time: string
  type: string
  location?: string
  link: string
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const localeParam = url.searchParams.get('locale') ?? 'de'
  // Nur Sprachkürzel durchlassen, damit nichts Fremdes in die Auswahl gerät.
  const locale = /^[a-z]{2}$/.test(localeParam) ? localeParam : 'de'

  const supabase = await createClient()

  // Ab heute, aufsteigend. Ohne zoom_url — die Spalte ist gesperrt.
  const { data, error } = await supabase
    .from('events')
    .select(
      'id, title, description, starts_at, ends_at, kind, location, program_id, visibility, series_id, all_day, website_link, created_at, updated_at',
    )
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(50)

  if (error) {
    // Die Website hat einen eigenen Fehlertext; ein leeres Array wäre eine Lüge
    // („keine Termine geplant"), darum ein ehrlicher Fehlerstatus.
    console.error('[api/events.json] Termine konnten nicht gelesen werden:', error.message)
    return NextResponse.json({ error: 'events_unavailable' }, { status: 503 })
  }

  const events: WebsiteEvent[] = (data ?? []).map((row) => {
    const event = row as PublicEvent
    const kind = isEventKind(event.kind) ? event.kind : 'community'
    return {
      title: localized(event.title, locale),
      date: berlinDate(event.starts_at),
      // Ganztägige Termine liefern einen leeren Zeit-String — genau wie die
      // bisherige events.json es für „The Handpan Path" tat.
      time: event.all_day ? '' : formatEventTime(event.starts_at),
      type: KIND_WEBSITE_TYPE[kind],
      ...(event.location ? { location: event.location } : {}),
      link: event.website_link || `${SCHOOL_ORIGIN}/termine/${event.id}`,
    }
  })

  return NextResponse.json(events, {
    headers: {
      // handpan.schule liegt auf GitHub Pages, also eine andere Herkunft.
      'access-control-allow-origin': '*',
      'cache-control': `public, max-age=60, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=600`,
    },
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-max-age': '86400',
    },
  })
}
