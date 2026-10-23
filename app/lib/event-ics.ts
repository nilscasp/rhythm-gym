import type { Json } from './supabase/database.types'
import type { Locale } from './locale'
import { EVENT_TIMEZONE, localized } from './event-access'

// ─────────────────────────────────────────────────────────────────────────────
// Kalender-Export (RFC 5545) — Abschnitt H.
//
// Rein und testbar (tests/live-ergaenzungen.test.ts). Zwei Regeln:
//   · Der Zoom-Link steht NIE in der Datei. Die Eingabe-Form kennt gar kein
//     zoom_url-Feld; stattdessen steht der Link auf die Terminseite in URL und
//     DESCRIPTION — dort entscheidet event_zoom_url() bei jedem Aufruf neu.
//   · Zeiten in UTC (…Z), ganztägige Termine als DATE in Berliner Zeit.
// ─────────────────────────────────────────────────────────────────────────────

export type IcsEvent = {
  id: string
  title: Json
  description: Json | null
  starts_at: string
  ends_at: string | null
  all_day: boolean | null
  location: string | null
  updated_at?: string | null
  created_at?: string | null
}

const PRODID = '-//Handpan Schule des Lebens//Termine//DE'
const UID_DOMAIN = 'handpan.schule'
const DEFAULT_DURATION_MS = 60 * 60 * 1000

const LINK_LABEL: Record<Locale, string> = {
  de: 'Zum Raum und allen Infos:',
  en: 'Room link and details:',
}

/** TEXT-Werte escapen (RFC 5545 §3.3.11). */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
}

/** Zeile nach 75 Oktetten falten (UTF-8, ohne Zeichen zu zerschneiden). */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder()
  const out: string[] = []
  let current = ''
  let currentBytes = 0
  for (const char of line) {
    const bytes = encoder.encode(char).length
    // Folgezeilen beginnen mit einem Leerzeichen, das mitzählt.
    const limit = out.length === 0 ? 75 : 74
    if (currentBytes + bytes > limit) {
      out.push(current)
      current = ''
      currentBytes = 0
    }
    current += char
    currentBytes += bytes
  }
  out.push(current)
  return out.join('\r\n ')
}

function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** YYYYMMDD in Berliner Zeit. */
function berlinDay(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .replace(/-/g, '')
}

function nextDay(yyyymmdd: string): string {
  const y = Number(yyyymmdd.slice(0, 4))
  const m = Number(yyyymmdd.slice(4, 6))
  const d = Number(yyyymmdd.slice(6, 8))
  const date = new Date(Date.UTC(y, m - 1, d + 1))
  return date.toISOString().slice(0, 10).replace(/-/g, '')
}

function veventLines(
  event: IcsEvent,
  options: { url: string; locale: Locale; now: Date },
): string[] {
  const start = new Date(event.starts_at)
  const end = event.ends_at
    ? new Date(event.ends_at)
    : new Date(start.getTime() + DEFAULT_DURATION_MS)

  const lines = [
    'BEGIN:VEVENT',
    `UID:${event.id}@${UID_DOMAIN}`,
    `DTSTAMP:${utcStamp(options.now)}`,
  ]

  if (event.all_day) {
    const first = berlinDay(start)
    const last = berlinDay(end)
    lines.push(`DTSTART;VALUE=DATE:${first}`)
    // DTEND ist exklusiv: der Tag nach dem letzten Kalendertag.
    lines.push(`DTEND;VALUE=DATE:${nextDay(last < first ? first : last)}`)
  } else {
    lines.push(`DTSTART:${utcStamp(start)}`)
    lines.push(`DTEND:${utcStamp(end)}`)
  }

  const modified = event.updated_at ?? event.created_at
  if (modified) lines.push(`LAST-MODIFIED:${utcStamp(new Date(modified))}`)

  const title = localized(event.title, options.locale) || 'Termin'
  lines.push(`SUMMARY:${escapeIcsText(title)}`)

  const text = localized(event.description, options.locale).trim()
  const description = [text, `${LINK_LABEL[options.locale]} ${options.url}`]
    .filter(Boolean)
    .join('\n\n')
  lines.push(`DESCRIPTION:${escapeIcsText(description)}`)

  if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`)
  lines.push(`URL:${options.url}`)
  lines.push('END:VEVENT')
  return lines
}

function serialize(lines: string[]): string {
  return lines.map(foldIcsLine).join('\r\n') + '\r\n'
}

/** Ein einzelner Termin als .ics-Datei. */
export function buildEventIcs(
  event: IcsEvent,
  options: { url: string; locale: Locale; now?: Date },
): string {
  const now = options.now ?? new Date()
  return serialize([
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...veventLines(event, { url: options.url, locale: options.locale, now }),
    'END:VCALENDAR',
  ])
}

/** Mehrere Termine als ein Kalender (öffentlicher Abo-Feed). */
export function buildCalendar(
  events: readonly IcsEvent[],
  options: { urlFor: (id: string) => string; locale: Locale; now?: Date; name: string },
): string {
  const now = options.now ?? new Date()
  return serialize([
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(options.name)}`,
    `X-WR-TIMEZONE:${EVENT_TIMEZONE}`,
    ...events.flatMap((event) =>
      veventLines(event, { url: options.urlFor(event.id), locale: options.locale, now }),
    ),
    'END:VCALENDAR',
  ])
}
