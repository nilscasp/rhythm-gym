// ─────────────────────────────────────────────────────────────────────────────
// Die WhatsApp-Community der Schule. Gespräch läuft dort, nicht auf der
// Plattform (Plans/umzug-von-skool.md). Leer = Knopf ausblenden und
// „Link folgt“ zeigen — Nils trägt den Einladungslink hier ein.
// Kursgruppen je Kurs stehen nicht hier, sondern in programs.whatsapp_url
// (Migration 0010, Herausgabe über program_whatsapp_url()).
// ─────────────────────────────────────────────────────────────────────────────

export const WHATSAPP_COMMUNITY_URL: string = ''

/** Gültiger https-Link oder null. */
export function communityUrl(): string | null {
  const url = WHATSAPP_COMMUNITY_URL.trim()
  return /^https:\/\//.test(url) ? url : null
}
