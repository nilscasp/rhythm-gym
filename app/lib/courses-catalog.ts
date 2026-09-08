/**
 * Der Katalog der Selbststudium-Kurse (englischer Laden).
 *
 * Warum eine eigene Liste und nicht die `programs`-Tabelle: `programs` trägt
 * den Kursbetrieb (Übungen, Drip, Enrollment). Was ein Kurs KOSTET und ob er
 * öffentlich zu kaufen ist, gehört nicht dorthin — das ist eine Aussage nach
 * außen, die Nils bewusst pflegt. Sobald der Kaufweg über Stripe eingerichtet
 * ist, kommt hier nur `checkoutUrl` dazu; alles andere bleibt.
 *
 * WICHTIG — Stand 2026-09-08: es existiert KEIN englischer Kursinhalt.
 * `content/rhythmusfundament/` ist deutsch, es gibt keine englischen Video-IDs,
 * und die Dub-Pipeline unter `scripts/dub/` ist Werkzeug, kein Ergebnis.
 * Deshalb steht jeder Eintrag auf `preparing`. Ein Kurs wird erst dann
 * `available`, wenn er in der jeweiligen Sprache wirklich lieferbar ist UND
 * `checkoutUrl` auf einen echten Stripe-Link zeigt. Wer hier vorschnell
 * umstellt, verkauft etwas, das niemand ausliefern kann.
 */

export type CourseStatus = 'available' | 'preparing'

export type CatalogCourse = {
  /** Muss `programs.slug` entsprechen — der Stripe-Webhook schreibt darüber das Enrollment. */
  slug: string
  title: Record<'de' | 'en', string>
  summary: Record<'de' | 'en', string>
  /** Was drin ist, in Stichpunkten. */
  bullets: Record<'de' | 'en', readonly string[]>
  priceEur: number
  status: CourseStatus
  /** Stripe Payment-Link. Nur gesetzt, wenn der Kurs wirklich zu kaufen ist. */
  checkoutUrl?: string
}

export const CATALOG: readonly CatalogCourse[] = [
  {
    slug: 'rhythmusfundament',
    title: {
      de: 'Rhythmus Fundament',
      en: 'Rhythm Foundation',
    },
    summary: {
      de: 'Vierzig Tage am Puls. Jeden Tag ein Video, eine Übung, ein Gedanke — bis Rhythmus kein Rätsel mehr ist, sondern Boden.',
      en: 'Forty days at the pulse. Every day one video, one exercise, one thought — until rhythm stops being a riddle and becomes ground.',
    },
    bullets: {
      de: [
        '40 Tage, täglich 10 bis 15 Minuten',
        'Video, Übung und eine Frage für den Weg',
        'Die Rhythmus-Werkstatt zum Mitspielen',
        'Kein Termin, kein Tempo außer deinem',
      ],
      en: [
        '40 days, ten to fifteen minutes each',
        'A video, an exercise and a question for the way',
        'The rhythm workshop to play along',
        'No dates, no pace but your own',
      ],
    },
    priceEur: 399,
    status: 'preparing',
  },
  {
    slug: 'von-anfang-an-spielen',
    title: {
      de: 'Von Anfang an spielen',
      en: 'Playing From the Start',
    },
    summary: {
      de: 'Für alle, die bei null anfangen. Von der ersten Berührung bis zum ersten eigenen Stück.',
      en: 'For everyone starting at zero. From the first touch to your first piece of your own.',
    },
    bullets: {
      de: [
        'Beginnt beim allerersten Schlag',
        'Haltung, Klang, Puls — in dieser Reihenfolge',
        'Keine Vorkenntnisse, keine Noten',
      ],
      en: [
        'Starts at the very first strike',
        'Posture, sound, pulse — in that order',
        'No prior knowledge, no sheet music',
      ],
    },
    priceEur: 450,
    status: 'preparing',
  },
]

/** Kurse, die in dieser Sprache wirklich lieferbar sind. */
export function availableCourses(): readonly CatalogCourse[] {
  return CATALOG.filter((c) => c.status === 'available' && c.checkoutUrl)
}

/** Preis in der Schreibweise der jeweiligen Sprache. */
export function formatPrice(priceEur: number, locale: 'de' | 'en'): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(priceEur)
}
