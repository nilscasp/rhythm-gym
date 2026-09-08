import 'server-only'
import { headers } from 'next/headers'
import { DEFAULT_LOCALE, LOCALE_HEADER, isLocale, type Locale } from '../app/lib/locale'
import { messagesFor, type Messages } from './index'

/**
 * Der Zugang zu den Texten für Server Components.
 *
 * Getrennt von `messages/index.ts`, weil dort auch Client Components lesen —
 * `next/headers` darf dort nicht auftauchen. `server-only` macht daraus einen
 * verständlichen Fehler beim Bauen, falls das jemals jemand importiert, der im
 * Browser läuft.
 */

/**
 * Sprache aus dem Request-Header, den `proxy.ts` gesetzt hat. Gleiches Muster
 * wie `currentBrand()` in `layout.tsx`.
 */
export async function currentLocale(): Promise<Locale> {
  const value = (await headers()).get(LOCALE_HEADER)
  return isLocale(value) ? value : DEFAULT_LOCALE
}

/** Sprache und passende Texte in einem Zug — der übliche Einstieg in Seiten. */
export async function getMessages(): Promise<{ locale: Locale; t: Messages }> {
  const locale = await currentLocale()
  return { locale, t: messagesFor(locale) }
}
