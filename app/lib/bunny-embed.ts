import 'server-only'
import { bunnyEmbedUrl } from './bunny-token'

// ─────────────────────────────────────────────────────────────────────────────
// Server-Helfer: fertige Bunny-Embed-URL für BunnyVideoEmbed.
//
// Nur aufrufen, NACHDEM die Seite den Zugriff geprüft hat — die URL ist
// 6 Stunden lang ein Schlüssel zum Video. Alle heutigen Aufrufer rendern das
// Video ohnehin nur im Zugriffs-Zweig (Kurs-Lektion, Rhythmus-Fundament-Tag,
// Beitrag per RLS, /tag-1 als bewusst öffentliches Geschenk).
//
// BUNNY_TOKEN_KEY fehlt → unsignierte URL wie bisher + einmalige Warnung im
// Server-Log. So bricht nichts, bevor Nils den Schlüssel einträgt.
// Gibt null zurück, wenn keine Library-ID gesetzt ist (BunnyVideoEmbed zeigt
// dann in Entwicklung den Hinweis).
// ─────────────────────────────────────────────────────────────────────────────

let warnedMissingKey = false

export function bunnyEmbedSrc(videoId: string, libraryId?: string): string | null {
  const lib = libraryId ?? process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID
  if (!lib) return null
  const tokenKey = process.env.BUNNY_TOKEN_KEY?.trim() || undefined
  if (!tokenKey && !warnedMissingKey) {
    warnedMissingKey = true
    console.warn('[bunny] BUNNY_TOKEN_KEY nicht gesetzt — Videos werden unsigniert eingebettet (siehe docs/bunny-schutz.md).')
  }
  return bunnyEmbedUrl({ libraryId: lib, videoId, tokenKey })
}
