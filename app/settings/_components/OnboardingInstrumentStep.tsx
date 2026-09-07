'use client'

import { InstrumentPicker } from './InstrumentPicker'

// ─────────────────────────────────────────────────────────────────────────────
// OnboardingInstrumentStep — zweiter Onboarding-Schritt: Instrument wählen.
//
// Der Weg selbst (Template-Grid → Builder → Speichern) liegt in
// InstrumentPicker, weil ihn die Einstellungen genauso brauchen. Hier bleibt
// bewusst nichts übrig: kein `return_to`, also speichert die Action wie bisher
// und schickt weiter ins Training. Kein „Abbrechen" — im Onboarding gibt es
// nichts, wohin man abbrechen könnte.
// ─────────────────────────────────────────────────────────────────────────────

export function OnboardingInstrumentStep() {
  return <InstrumentPicker />
}
