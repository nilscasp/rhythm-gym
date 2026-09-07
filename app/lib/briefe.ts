// ─────────────────────────────────────────────────────────────────────────────
// Reine Helfer für den Brief-Eintrag (app/api/briefe/route.ts).
//
// Alles hier ist frei von Next-, Netzwerk- und Zeitabhängigkeiten: Zeit kommt
// als Parameter herein, der Rate-Limit-Speicher als Map. Damit ist der Kern des
// Formular-Endpunkts in `tests/briefe.test.ts` ohne Server testbar.
// ─────────────────────────────────────────────────────────────────────────────

/** Bewusst konservativ: ein @, Punkt in der Domain, keine Leerzeichen/Umbrüche. */
const EMAIL_RE = /^[^\s@,;:<>"'\\]+@[^\s@,;:<>"'\\.]+(?:\.[^\s@,;:<>"'\\.]+)+$/

/** RFC 5321 erlaubt 254 Zeichen für den Umschlag-Pfad — alles darüber ist Unfug. */
const EMAIL_MAX_LENGTH = 254

export function isValidEmail(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const email = value.trim()
  if (email.length === 0 || email.length > EMAIL_MAX_LENGTH) return false
  return EMAIL_RE.test(email)
}

/** Normalisierte Adresse für den Versand an Brevo (getrimmt, klein). */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

/**
 * Honeypot: ein für Menschen unsichtbares Feld `website`. Bots füllen alles aus,
 * was nach einem Formularfeld aussieht — wer hier etwas schreibt, ist keiner.
 */
export function isHoneypotClean(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value !== 'string') return false
  return value.trim().length === 0
}

const SOURCE_MAX_LENGTH = 32
export const DEFAULT_SOURCE = 'landing'

/**
 * Die Quelle landet als Brevo-Attribut (QUELLE) und damit in Nils' Segmenten.
 * Deshalb: nur `[a-z0-9-]`, max. 32 Zeichen, sonst der Default. Kein Weg für
 * Fremdinhalte aus dem Formular in die Mail-Plattform.
 */
export function normalizeSource(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_SOURCE
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SOURCE_MAX_LENGTH)
    .replace(/-+$/g, '')
  return slug.length > 0 ? slug : DEFAULT_SOURCE
}

// ── Rate-Limit ───────────────────────────────────────────────────────────────
// Bewusst nur im Prozessspeicher: Auf Vercel lebt der Zähler pro Lambda-Instanz,
// bremst also einen einzelnen Bot, nicht ein verteiltes Botnetz. Für ein
// Formular ohne Kosten pro Aufruf reicht das; die echte Bremse ist das
// Double-Opt-in bei Brevo. Ein persistenter Zähler wäre erst nötig, wenn hier
// Geld oder Kontingente hängen.

export const RATE_LIMIT_MAX = 5
export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000

/** IP → Zeitstempel der Versuche innerhalb des Fensters. */
export type RateLimitBucket = Map<string, number[]>

export function createRateLimitBucket(): RateLimitBucket {
  return new Map()
}

export interface RateLimitResult {
  allowed: boolean
  /** Verbleibende Versuche im aktuellen Fenster (0, wenn geblockt). */
  remaining: number
  /** Sekunden bis zum nächsten freien Versuch — für den Retry-After-Header. */
  retryAfterSeconds: number
}

export function checkRateLimit(
  bucket: RateLimitBucket,
  key: string,
  now: number = Date.now()
): RateLimitResult {
  const cutoff = now - RATE_LIMIT_WINDOW_MS

  // Aufräumen aller IPs, nicht nur der aktuellen: sonst wächst die Map in einem
  // langlebigen Lambda mit jeder gesehenen Adresse.
  for (const [ip, stamps] of bucket) {
    const fresh = stamps.filter((t) => t > cutoff)
    if (fresh.length === 0) bucket.delete(ip)
    else bucket.set(ip, fresh)
  }

  const hits = bucket.get(key) ?? []
  if (hits.length >= RATE_LIMIT_MAX) {
    const oldest = hits[0] ?? now
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000)
    )
    return { allowed: false, remaining: 0, retryAfterSeconds }
  }

  hits.push(now)
  bucket.set(key, hits)
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX - hits.length,
    retryAfterSeconds: 0,
  }
}

/**
 * Client-IP aus `x-forwarded-for` (Vercel setzt sie als erste Adresse der Liste).
 * Ohne Header ein gemeinsamer Eimer — lieber zu streng als gar kein Limit.
 */
export function clientIpFromHeader(forwardedFor: string | null | undefined): string {
  const first = forwardedFor?.split(',')[0]?.trim()
  return first && first.length > 0 ? first : 'unknown'
}
