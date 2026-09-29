// Brücke Video → DayPlayer: „Selbst üben" im Kapitel wählt das Preset im
// Player. Ein Window-Event statt Context, weil Video und Player getrennte
// Client-Inseln in einer Server-Seite sind.

export const SELECT_PRESET_EVENT = 'rg:select-preset'

export interface SelectPresetDetail {
  presetId: string
}

export function requestPreset(presetId: string) {
  window.dispatchEvent(
    new CustomEvent<SelectPresetDetail>(SELECT_PRESET_EVENT, { detail: { presetId } }),
  )
}
