/**
 * Marke = Darstellungsschicht. Eine App, eine Datenbank, zwei Bühnen:
 * `gym` (rhythmgym.io) und `schule` (lernen.handpan.schule).
 *
 * Die Entscheidung fällt genau einmal — in `proxy.ts` — und reist als
 * Request-Header `x-brand` zu den Server Components weiter. Alles darunter
 * (Routen, Zugriffslogik, Datenmodell) ist markenneutral.
 */

export type Brand = 'gym' | 'schule'

/** Request-Header, der die Entscheidung aus `proxy.ts` ins Layout trägt. */
export const BRAND_HEADER = 'x-brand'

/** Cookie-Override — erlaubt lokales Testen beider Marken ohne DNS. */
export const BRAND_COOKIE = 'brand'

/** Default, wenn weder Cookie noch Host etwas sagen. */
export const DEFAULT_BRAND: Brand = 'gym'

/** Host-Fragmente der Produktions-Domains (Subdomain und Port egal). */
const SCHULE_HOST = 'handpan.schule'
const GYM_HOST = 'rhythmgym.io'

export function isBrand(value: unknown): value is Brand {
  return value === 'gym' || value === 'schule'
}

/**
 * Bestimmt die Marke aus Host und Cookie.
 *
 * Reihenfolge: eine bekannte Produktions-Domain gewinnt immer — ein Besucher
 * soll auf lernen.handpan.schule kein Fremdbranding per Cookie erzeugen können.
 * Nur auf unbekannten Hosts (localhost, *.vercel.app-Previews) entscheidet ein
 * gültiges Cookie; sonst Gym. Ungültige Cookie-Werte werden ignoriert.
 */
export function resolveBrand(
  host: string | null | undefined,
  cookie: string | null | undefined
): Brand {
  const h = host?.toLowerCase() ?? ''
  if (h.includes(SCHULE_HOST)) return 'schule'
  if (h.includes(GYM_HOST)) return 'gym'
  if (isBrand(cookie)) return cookie
  return DEFAULT_BRAND
}

/** Titel, Beschreibung und Wortmarke je Marke — Quelle für generateMetadata, Logo und Footer. */
export const BRAND_META: Record<
  Brand,
  { title: string; description: string; wordmark: string; origin: string }
> = {
  gym: {
    title: 'Rhythm Gym — Train Your Rhythm',
    description:
      'Tägliches Rhythmus-Training für Handpan-Spieler. Glossar, Patterns und ein Tool zum Üben.',
    wordmark: 'RHYTHMGYM',
    origin: 'https://www.rhythmgym.io',
  },
  schule: {
    title: 'Handpan Schule des Lebens',
    description:
      'Dein Ort zum Üben — Kurse, Termine und Werkzeuge der Handpan Schule des Lebens.',
    wordmark: 'Handpan Schule des Lebens',
    origin: 'https://lernen.handpan.schule',
  },
}
