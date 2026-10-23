import type { PaidPlan } from './plan'

// ─────────────────────────────────────────────────────────────────────────────
// Die zwei Abo-Stufen der Schule — Namen und Inhalt an EINER Stelle.
//
// Anzeigenamen vorerst „Stufe 1“ und „Stufe 2“ (Schul-Gedächtnis,
// 23.10.2026): die alten Namen fallen weg, die neuen stehen noch nicht fest.
// Wenn sie feststehen, ändert sich nur TIER_NAMES. Kein sichtbarer Text im
// Code schreibt einen Stufennamen selbst aus — immer über diese Datei.
//
// Inhalt nach Wissen/Kurse/community.md (Stand 23.10.2026): der Weg in fünf
// Schritten (Regelmäßigkeit · Ausrichtung · Emotion · Freiheit ·
// Wahrhaftigkeit); Stufe 1 = Persönlichkeit, Stufe 2 = Seele. Freie Sessions
// (Meditation, Kreativ-Treffen, Rhythm Gym, Projekttermine) gehören bewusst
// NICHT in die Beschreibung (Nils, 22.10.2026).
//
// Der technische Schlüssel (`premium` | `vip`) bleibt unverändert — er steht in
// profiles.plan, in den Stripe-Metadaten (`tier`) und in den Lookup-Keys.
// ─────────────────────────────────────────────────────────────────────────────

export const TIER_NAMES: Record<PaidPlan, string> = {
  premium: 'Stufe 1',
  vip: 'Stufe 2',
}

/** Reihenfolge auf der Seite: erst das Fundament, dann die Vertiefung. */
export const TIER_ORDER: readonly PaidPlan[] = ['premium', 'vip']

/** Ein Punkt der Leistungsliste, optional mit Unterpunkten. */
export type TierItem = string | { text: string; sub: readonly string[] }

export interface TierContent {
  /** Name der Hälfte des Wegs: Persönlichkeit / Seele. */
  essence: string
  /** Die Schritte des Wegs in dieser Stufe. */
  steps: readonly string[]
  /** Worum es geht, in einem Satz. */
  theme: string
  /** Was drin ist — nur, was community.md beschreibt. */
  items: readonly TierItem[]
  /** Wie es sich anfühlen darf. */
  feeling: string
}

export const TIER_CONTENT: Record<PaidPlan, TierContent> = {
  premium: {
    essence: 'Persönlichkeit',
    steps: ['Regelmäßigkeit', 'Ausrichtung', 'Emotion'],
    theme:
      'Das Fundament: eine regelmäßige Praxis entwickeln, Klarheit darüber, was du übst, und Freude am Üben. So findest du Selbstvertrauen, verstehst, wie Lernen funktioniert, und gehst den direktesten Weg zu deinem eigenen Stil.',
    items: [
      'Ein Live-Call im Monat: die Handpan Kompass Session',
      'Jede Woche ein Video mit Lerninhalten und Impulsen',
      'Die Kurse Handpan Kompass, Elemente und Handpan Kreativ',
      'Alle Lektionen und Materialien, die in der Gemeinschaft entstehen',
      `Die Aufnahmen der Live-Calls in der Bibliothek, auch der Calls aus ${TIER_NAMES.vip}`,
      'Der Bereich „No Extra Time“ mit den Podcast-Aufnahmen',
    ],
    feeling: 'Beständigkeit, Sicherheit, Selbstvertrauen.',
  },
  vip: {
    essence: 'Seele',
    steps: ['Emotion', 'Freiheit', 'Wahrhaftigkeit'],
    theme: `Baut auf ${TIER_NAMES.premium} auf: Verbindung zu deinem eigenen Gefühl, kreative Freiheit und die Verwandlung deiner Identität. Für alle, die schon viel verinnerlicht haben und sich nach echtem Ausdruck sehnen.`,
    items: [
      `Alles aus ${TIER_NAMES.premium}`,
      {
        text: 'Ein zweiter Live-Call im Monat, der tiefer geht, in zwei Richtungen:',
        sub: [
          'Blockaden lösen, die dich davon abhalten, in den Spielfluss zu kommen und am Instrument dranzubleiben',
          'Tiefer in die Seele eintauchen und sie mit deinem Spiel verbinden: künstlerischer, kreativer Ausdruck ohne Grenzen',
        ],
      },
    ],
    feeling: 'Tiefe Freiheit, Kreativität, Seelenausdruck.',
  },
}

/** Name einer bezahlten Stufe; für free gibt es keinen Stufennamen. */
export function tierName(plan: PaidPlan): string {
  return TIER_NAMES[plan]
}
