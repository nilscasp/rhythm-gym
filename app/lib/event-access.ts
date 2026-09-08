import type { Database, Json } from './supabase/database.types'
import type { Locale } from './locale'

// ─────────────────────────────────────────────────────────────────────────────
// Termine — Zugriff, Sprache, Darstellung (Phasenplan v2 §4)
//
// Titel, Beschreibung und Zeit sind für alle sichtbar: der Kalender ist auch
// ein Schaufenster. Die Zoom-Tür hängt an `visibility`.
//
// Diese Datei entscheidet, WAS DIE OBERFLÄCHE ZEIGT — die Tür selbst gibt
// ausschließlich die SQL-Funktion `event_zoom_url()` heraus (SECURITY DEFINER,
// Migration 0006). Wenn hier je ein Fehler steckt, sieht jemand einen Knopf,
// der nicht funktioniert; er kommt trotzdem nicht durch die Tür.
// Dieselbe Aufteilung wie bei Kursen: `course-access.ts` rechnet, RLS und
// `redeem_access_code` halten.
// ─────────────────────────────────────────────────────────────────────────────

export const EVENT_TIMEZONE = 'Europe/Berlin'

export type EventRow = Database['public']['Tables']['events']['Row']

/** Termin ohne die Zoom-Tür — genau das, was anon und authenticated lesen dürfen. */
export type PublicEvent = Omit<EventRow, 'zoom_url'>

export const EVENT_KINDS = [
  'live_training',
  'qa',
  'workshop',
  'retreat',
  'community',
] as const
export type EventKind = (typeof EVENT_KINDS)[number]

export const EVENT_VISIBILITIES = ['public', 'members', 'premium', 'program'] as const
export type EventVisibility = (typeof EVENT_VISIBILITIES)[number]

/**
 * Deutsche Bezeichnungen — Rückfall für Stellen ohne Sprachkontext
 * (z. B. die Website-Schnittstelle). Die Oberfläche nimmt `messages/*`.
 */
export const KIND_LABELS: Record<EventKind, string> = {
  live_training: 'Live-Training',
  qa: 'Fragerunde',
  workshop: 'Workshop',
  retreat: 'Retreat',
  community: 'Gemeinsam',
}

/** Kurzform für die Termine-Leiste auf handpan.schule (deren `type`-Feld). */
export const KIND_WEBSITE_TYPE: Record<EventKind, string> = {
  live_training: 'kurs',
  qa: 'community',
  workshop: 'workshop',
  retreat: 'retreat',
  community: 'community',
}

export function isEventKind(value: unknown): value is EventKind {
  return typeof value === 'string' && (EVENT_KINDS as readonly string[]).includes(value)
}

export function isEventVisibility(value: unknown): value is EventVisibility {
  return (
    typeof value === 'string' && (EVENT_VISIBILITIES as readonly string[]).includes(value)
  )
}

// ── Sprache ──────────────────────────────────────────────────────────────────
// `title` und `description` sind jsonb: {"de": "…", "en": "…"}. Bis next-intl
// steht (KW38), liest alles `de`. Fallback-Kette, damit ein halb gepflegter
// Termin nie als leere Zeile erscheint: gewünschte Sprache → de → en → erster
// vorhandener Wert. Ein reiner String wird ebenfalls akzeptiert, falls ein
// Termin je ohne Sprachobjekt angelegt wird.

export function localized(value: Json | null | undefined, locale = 'de'): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value !== 'object' || Array.isArray(value)) return ''

  const map = value as Record<string, Json | undefined>
  for (const key of [locale, 'de', 'en']) {
    const candidate = map[key]
    if (typeof candidate === 'string' && candidate.trim() !== '') return candidate
  }
  for (const candidate of Object.values(map)) {
    if (typeof candidate === 'string' && candidate.trim() !== '') return candidate
  }
  return ''
}

// ── Zugriff ──────────────────────────────────────────────────────────────────

export type Viewer = {
  isAuthenticated: boolean
  isPremium: boolean
  /** program_ids mit aktivem Enrollment */
  enrolledProgramIds: readonly string[]
}

export const ANONYMOUS: Viewer = {
  isAuthenticated: false,
  isPremium: false,
  enrolledProgramIds: [],
}

export type EventAccess =
  | { canJoin: true }
  | { canJoin: false; reason: 'login' | 'premium' | 'program'; programId?: string }

/**
 * Darf diese Person die Zoom-Tür sehen? Spiegelt `event_zoom_url()` aus
 * Migration 0006 — beide müssen zusammen geändert werden.
 */
export function hasEventAccess(
  viewer: Viewer,
  event: Pick<PublicEvent, 'visibility' | 'program_id'>,
): EventAccess {
  const visibility = isEventVisibility(event.visibility) ? event.visibility : 'members'

  if (visibility === 'public') return { canJoin: true }
  if (!viewer.isAuthenticated) return { canJoin: false, reason: 'login' }
  if (visibility === 'members') return { canJoin: true }

  if (visibility === 'premium') {
    return viewer.isPremium ? { canJoin: true } : { canJoin: false, reason: 'premium' }
  }

  // visibility === 'program'
  if (!event.program_id) return { canJoin: false, reason: 'program' }
  return viewer.enrolledProgramIds.includes(event.program_id)
    ? { canJoin: true }
    : { canJoin: false, reason: 'program', programId: event.program_id }
}

// ── Zeit ─────────────────────────────────────────────────────────────────────
// Alles wird als timestamptz gespeichert und in Berliner Zeit angezeigt — wie
// beim Drip. Der Server kann in einer anderen Zone stehen, darum immer explizit.

/** Intl-Kennung je Sprache. Die Zeitzone bleibt immer Berlin. */
function tag(locale: Locale): string {
  return locale === 'en' ? 'en-GB' : 'de-DE'
}

function parts(
  date: Date,
  options: Intl.DateTimeFormatOptions,
  locale: Locale = 'de',
): string {
  return new Intl.DateTimeFormat(tag(locale), {
    timeZone: EVENT_TIMEZONE,
    ...options,
  }).format(date)
}

/** „Fr., 26. September" bzw. „Sat, 26 September" */
export function formatEventDate(startsAt: string, locale: Locale = 'de'): string {
  return parts(
    new Date(startsAt),
    { weekday: 'short', day: 'numeric', month: 'long' },
    locale,
  )
}

/** „19:00" bzw. „19:00 – 20:30" */
export function formatEventTime(
  startsAt: string,
  endsAt?: string | null,
  locale: Locale = 'de',
): string {
  const clock = { hour: '2-digit', minute: '2-digit' } as const
  const start = parts(new Date(startsAt), clock, locale)
  if (!endsAt) return start
  const end = parts(new Date(endsAt), clock, locale)
  return `${start} – ${end}`
}

/**
 * Zeitzeile für die Anzeige. Ganztägige Termine haben keine Uhrzeit — dann
 * steht dort nichts statt einer erfundenen Stunde.
 */
export function eventTimeLabel(
  event: { starts_at: string; ends_at?: string | null; all_day?: boolean | null },
  options: { locale?: Locale; allDayLabel?: string } = {},
): string {
  const locale = options.locale ?? 'de'
  if (event.all_day) return options.allDayLabel ?? 'ganztägig'
  return formatEventTime(event.starts_at, event.ends_at, locale)
}

/** Schlüssel und Beschriftung für die Monatsgruppen der Liste. */
export function monthKey(startsAt: string): string {
  return parts(new Date(startsAt), { year: 'numeric', month: '2-digit' })
}

export function monthLabel(startsAt: string, locale: Locale = 'de'): string {
  return parts(new Date(startsAt), { month: 'long', year: 'numeric' }, locale)
}

/** ISO-Datum in Berliner Zeit (YYYY-MM-DD) — Schema der Website-Leiste. */
export function berlinDate(startsAt: string): string {
  const d = new Date(startsAt)
  const y = parts(d, { year: 'numeric' })
  const m = parts(d, { month: '2-digit' })
  const day = parts(d, { day: '2-digit' })
  return `${y}-${m}-${day}`
}

/** Gruppiert aufsteigend sortierte Termine nach Monat, Reihenfolge bleibt erhalten. */
export function groupByMonth<T extends { starts_at: string }>(
  events: readonly T[],
  locale: Locale = 'de',
): { key: string; label: string; events: T[] }[] {
  const groups: { key: string; label: string; events: T[] }[] = []
  for (const event of events) {
    const key = monthKey(event.starts_at)
    const last = groups[groups.length - 1]
    if (last && last.key === key) {
      last.events.push(event)
    } else {
      groups.push({ key, label: monthLabel(event.starts_at, locale), events: [event] })
    }
  }
  return groups
}
