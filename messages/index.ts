import { DEFAULT_LOCALE, type Locale } from '../app/lib/locale'
import { de, type Messages } from './de'
import { en } from './en'

/**
 * Die Texte selbst — bewusst OHNE `next/headers`.
 *
 * Diese Datei wird auch von Client Components geladen (die Navigation läuft im
 * Browser). Stünde hier ein Server-Aufruf, zöge ihn der Browser-Bundle mit und
 * der Build bricht. Alles, was den Request kennt, liegt in `messages/server.ts`.
 */

const MESSAGES: Record<Locale, Messages> = { de, en }

export type { Messages }
export { DEFAULT_LOCALE }

/** Texte einer bestimmten Sprache — für Stellen, die die Sprache schon kennen. */
export function messagesFor(locale: Locale): Messages {
  return MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE]
}
