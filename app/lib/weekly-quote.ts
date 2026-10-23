// ─────────────────────────────────────────────────────────────────────────────
// Gedanke der Woche — vorläufige Quelle für die Startseite der Schule.
//
// Nils füllt diese Liste selbst. Hier stehen ausschließlich Sätze von Nils,
// nie erfundene oder fremde Zitate. Gewählt wird nach ISO-Kalenderwoche
// (Europe/Berlin) modulo Länge — dieselbe Woche zeigt allen denselben Satz.
// Abschnitt E (Plans/umzug-von-skool.md) ersetzt die Liste später durch eine
// Tabelle mit Coach-Formular.
// ─────────────────────────────────────────────────────────────────────────────

export type WeeklyQuote = {
  text: string
  author: string
}

export const WEEKLY_QUOTES: readonly WeeklyQuote[] = [
  {
    text: 'Du lernst das Handwerk, das dich trägt. Und du findest den Klang, der aus dir kommt.',
    author: 'Nils',
  },
]

/** Satz für eine Kalenderwoche — null, wenn die Liste leer ist. */
export function quoteForWeek(
  week: number,
  quotes: readonly WeeklyQuote[] = WEEKLY_QUOTES,
): WeeklyQuote | null {
  if (quotes.length === 0 || !Number.isFinite(week)) return null
  const index = ((Math.trunc(week) % quotes.length) + quotes.length) % quotes.length
  return quotes[index]
}
