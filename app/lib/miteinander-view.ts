import { errorCodeFrom, type MiteinanderError } from './miteinander'

// ─────────────────────────────────────────────────────────────────────────────
// Miteinander — kleine reine Helfer für Seiten und Server Actions
// (Adressen bauen, Rückwege prüfen, Verbindungsstatus ableiten). Getestet in
// tests/miteinander-view.test.ts. Validierung und Texte stehen in
// app/lib/miteinander.ts.
// ─────────────────────────────────────────────────────────────────────────────

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value)
}

/** Setzt genau einen Parameter (alte fallen weg), die Sprungmarke bleibt hinten. */
export function withParam(path: string, key: string, value: string): string {
  const hashAt = path.indexOf('#')
  const hash = hashAt >= 0 ? path.slice(hashAt) : ''
  const beforeHash = hashAt >= 0 ? path.slice(0, hashAt) : path
  const base = beforeHash.split('?')[0]
  return `${base}?${new URLSearchParams({ [key]: value }).toString()}${hash}`
}

// Nur eigene Seiten unter /mein-weg und /miteinander, ohne Query, ohne „..“.
const BACK = /^\/(mein-weg|miteinander)(\/[A-Za-z0-9-]+)*(#[a-z-]+)?$/

/** Rückweg aus einem Formularfeld — alles Fremde wird zum Standard. */
export function backPath(raw: unknown, fallback: string): string {
  return typeof raw === 'string' && BACK.test(raw) ? raw : fallback
}

/** Fehler beim Anlegen: „too_many_open“ heißt je nach Art etwas anderes. */
export function insertErrorCode(
  error: { message?: string | null } | null | undefined,
  kind: 'challenge' | 'meetup',
): MiteinanderError {
  const code = errorCodeFrom(error)
  if (code === 'too_many_open') return kind === 'challenge' ? 'too_many_challenges' : 'too_many_meetups'
  return code
}

/** Eine Zeile aus my_connection_requests() (0013). */
export type ConnectionRow = {
  id: string
  direction: string
  other_user: string
  other_name: string
  message: string
  status: string
  created_at: string
  answered_at: string | null
}

export type ConnectionState = 'none' | 'pending_out' | 'pending_in' | 'connected'

/**
 * Wie stehe ich zu dieser Person? Angenommen geht vor offen. Abgelehnt oder
 * zurückgezogen zählt als „keine Verbindung“ — ob eine neue Anfrage geht,
 * entscheidet die Datenbank (Abkühlzeiten) und meldet es freundlich.
 */
export function connectionWith(
  rows: readonly ConnectionRow[],
  otherUser: string,
): { state: ConnectionState; requestId: string | null; message: string | null } {
  const mine = rows.filter((r) => r.other_user === otherUser)
  const accepted = mine.find((r) => r.status === 'accepted')
  if (accepted) return { state: 'connected', requestId: accepted.id, message: null }
  const pending = mine.find((r) => r.status === 'pending')
  if (pending) {
    return {
      state: pending.direction === 'in' ? 'pending_in' : 'pending_out',
      requestId: pending.id,
      message: pending.message,
    }
  }
  return { state: 'none', requestId: null, message: null }
}

export function countBy<T>(rows: readonly T[], key: (row: T) => string): Map<string, number> {
  const map = new Map<string, number>()
  for (const r of rows) {
    const k = key(r)
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  return map
}

/** Region-Filter der Menschen-Suche: Teilstring, ohne Groß/klein. Leer passt immer. */
export function matchesRegion(region: string | null | undefined, filter: string): boolean {
  const f = filter.trim().toLocaleLowerCase('de-DE')
  if (!f) return true
  return (region ?? '').toLocaleLowerCase('de-DE').includes(f)
}

/** Vorname wie in member_display_name (0013): erster Teil von full_name. */
export function firstName(fullName: string | null | undefined): string {
  return (fullName ?? '').trim().split(/\s+/)[0] ?? ''
}
