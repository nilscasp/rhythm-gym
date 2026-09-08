/**
 * Sprache = zweite Darstellungsschicht, genau wie die Marke.
 *
 * Die Entscheidung fällt einmal in `proxy.ts` und reist als Request-Header
 * `x-locale` zu den Server Components — dasselbe Muster wie `x-brand`, das
 * sich in KW37 bewährt hat.
 *
 * URL-Form (Phasenplan v2 §3): Deutsch bleibt präfixfrei, damit KEINE
 * bestehende Adresse bricht. Englisch bekommt `/en` davor:
 *
 *   /termine        → Deutsch
 *   /en/termine     → Englisch, intern auf /termine umgeschrieben
 *
 * Abweichung vom Plan, bewusst und dokumentiert: der Plan nannte `next-intl`.
 * Dessen Middleware will das Routing besitzen und hätte den gesamten
 * `app/`-Baum unter ein `[locale]`-Segment gezwungen — mitten durch die
 * Marken- und Auth-Schleuse, die hier bereits im selben Durchgang arbeitet.
 * Diese Schicht erreicht dieselbe URL-Form ohne Umbau. Die Nachrichten liegen
 * als verschachtelte Objekte vor, next-intl kann sie später übernehmen.
 */

export type Locale = 'de' | 'en'

export const LOCALES: readonly Locale[] = ['de', 'en'] as const

/** Request-Header, der die Entscheidung aus `proxy.ts` ins Layout trägt. */
export const LOCALE_HEADER = 'x-locale'

/** Deutsch ist die Sprache ohne Präfix. */
export const DEFAULT_LOCALE: Locale = 'de'

export function isLocale(value: unknown): value is Locale {
  return value === 'de' || value === 'en'
}

/**
 * Trennt ein Sprachpräfix vom Pfad.
 *
 * `/en/termine` → `{ locale: 'en', pathname: '/termine' }`
 * `/termine`    → `{ locale: null,  pathname: '/termine' }`
 * `/en`         → `{ locale: 'en', pathname: '/' }`
 *
 * `locale: null` heißt „im Pfad stand nichts" — nicht „Deutsch". Nur so kann
 * die aufrufende Stelle danach noch andere Quellen befragen.
 */
export function splitLocalePath(pathname: string): {
  locale: Locale | null
  pathname: string
} {
  const match = /^\/([a-z]{2})(?=\/|$)/.exec(pathname)
  if (!match || !isLocale(match[1])) return { locale: null, pathname }

  const rest = pathname.slice(match[0].length)
  return { locale: match[1], pathname: rest === '' ? '/' : rest }
}

/**
 * Bestimmt die Sprache. Reihenfolge: Präfix im Pfad gewinnt (die Adresse ist
 * das Versprechen), sonst der Wunsch des Browsers, sonst Deutsch.
 *
 * Kein Cookie-Override: die Sprache steht in der Adresse, damit ein geteilter
 * Link bei allen gleich aussieht.
 */
export function resolveLocale(
  pathname: string,
  acceptLanguage?: string | null,
): { locale: Locale; pathname: string; fromPath: boolean } {
  const split = splitLocalePath(pathname)
  if (split.locale) {
    return { locale: split.locale, pathname: split.pathname, fromPath: true }
  }
  return {
    locale: preferredLocale(acceptLanguage),
    pathname: split.pathname,
    fromPath: false,
  }
}

/**
 * Liest die erste unterstützte Sprache aus einem Accept-Language-Header.
 * Gewichte (`;q=`) werden berücksichtigt, Regionen abgeschnitten (`en-GB` → `en`).
 */
export function preferredLocale(acceptLanguage?: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE

  const entries = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';')
      const q = params
        .map((p) => /^\s*q=([0-9.]+)\s*$/.exec(p))
        .find(Boolean)
      const weight = q ? Number.parseFloat(q[1]) : 1
      return {
        tag: tag.trim().toLowerCase().split('-')[0],
        weight: Number.isFinite(weight) ? weight : 0,
      }
    })
    .filter((entry) => entry.tag !== '' && entry.weight > 0)
    .sort((a, b) => b.weight - a.weight)

  for (const entry of entries) {
    if (isLocale(entry.tag)) return entry.tag
  }
  return DEFAULT_LOCALE
}

/**
 * Baut eine interne Adresse in der gegebenen Sprache.
 * Deutsch bleibt präfixfrei, Englisch bekommt `/en` davor.
 * Externe Adressen und Anker bleiben unberührt.
 */
export function localizeHref(href: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return href
  if (!href.startsWith('/')) return href
  if (href.startsWith('//')) return href

  const { locale: existing, pathname } = splitLocalePath(href)
  if (existing) return href
  return pathname === '/' ? '/en' : `/en${pathname}`
}

/** Gegenstück: dieselbe Seite in der anderen Sprache. */
export function switchLocaleHref(pathname: string, target: Locale): string {
  const { pathname: bare } = splitLocalePath(pathname)
  return localizeHref(bare, target)
}
