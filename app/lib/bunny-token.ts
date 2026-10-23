// ─────────────────────────────────────────────────────────────────────────────
// Bunny Stream — signierte Embed-URLs (Token-Authentifizierung).
//
//   https://iframe.mediadelivery.net/embed/{library}/{videoId}
//     ?token={sha256_hex(tokenKey + videoId + expires)}&expires={unix}
//
// Reine Funktionen, nur serverseitig benutzen (Node `crypto`, der Schlüssel
// darf nie in den Browser). Den Env-Zugriff kapselt `bunny-embed.ts`.
// Ohne Schlüssel liefert `bunnyEmbedUrl` die bisherige unsignierte URL.
// Einrichtung und Reihenfolge: docs/bunny-schutz.md.
// ─────────────────────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto'

/** Gültigkeit einer signierten URL: 6 Stunden ab Seitenaufruf. */
export const BUNNY_TOKEN_TTL_SECONDS = 6 * 60 * 60

/** Player-Optionen, wie sie BunnyVideoEmbed seit jeher anhängt. */
const PLAYER_PARAMS: ReadonlyArray<[string, string]> = [
  ['autoplay', 'false'],
  ['loop', 'false'],
  ['muted', 'false'],
  ['preload', 'true'],
  ['responsive', 'true'],
  ['showSpeed', 'true'],
]

/** sha256_hex(tokenKey + videoId + expires) — Bunnys Embed-Token. */
export function signBunnyEmbed(videoId: string, expiresUnix: number, tokenKey: string): string {
  if (!tokenKey) throw new Error('signBunnyEmbed: tokenKey fehlt')
  if (!videoId) throw new Error('signBunnyEmbed: videoId fehlt')
  if (!Number.isInteger(expiresUnix) || expiresUnix <= 0) {
    throw new Error('signBunnyEmbed: expiresUnix muss eine positive ganze Zahl sein')
  }
  return createHash('sha256').update(tokenKey + videoId + String(expiresUnix)).digest('hex')
}

interface EmbedUrlInput {
  libraryId: string
  videoId: string
  /** Leer/undefined → unsignierte URL (Übergang, bevor der Schlüssel gesetzt ist). */
  tokenKey: string | undefined
  /** Für Tests; Standard: jetzt. */
  nowSeconds?: number
  ttlSeconds?: number
}

export function bunnyEmbedUrl({
  libraryId,
  videoId,
  tokenKey,
  nowSeconds = Date.now() / 1000,
  ttlSeconds = BUNNY_TOKEN_TTL_SECONDS,
}: EmbedUrlInput): string {
  const params = new URLSearchParams(PLAYER_PARAMS as [string, string][])
  if (tokenKey) {
    const expires = Math.floor(nowSeconds) + ttlSeconds
    params.set('token', signBunnyEmbed(videoId, expires, tokenKey))
    params.set('expires', String(expires))
  }
  return `https://iframe.mediadelivery.net/embed/${encodeURIComponent(libraryId)}/${encodeURIComponent(videoId)}?${params.toString()}`
}
