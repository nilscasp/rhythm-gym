// ─────────────────────────────────────────────────────────────────────────────
// handpan-mapping — geteilte Tonfeld-Auflösung (Audio ⇄ Visualisierung)
//
// Single Source of Truth dafür, WELCHES Tonfeld (0-basiert, 0..7) bei einem
// gegebenen Step + Hand getroffen wird. Bisher lebte diese Logik nur im
// HandpanVisualizer (resolveTonfeldSpotId). DayPlayer (Audio) und Visualizer
// importieren jetzt beide diese Funktion, damit Klang und Glow deckungsgleich
// bleiben — und damit die geplante Stufe-3-Notennotation später nur EINE Stelle
// erweitern muss.
//
//   R-Hand → rotiert durch T1, T3, T5, T7 (Indizes 0,2,4,6)
//   L-Hand → rotiert durch T2, T4, T6, T8 (Indizes 1,3,5,7)
//   frei / keine Hand → läuft alle 8 der Reihe nach durch
// ─────────────────────────────────────────────────────────────────────────────

export const TONFIELD_SLOTS = 8;

const R_TONFIELD_ROTATION: readonly number[] = [0, 2, 4, 6];
const L_TONFIELD_ROTATION: readonly number[] = [1, 3, 5, 7];

/**
 * 0-basierter Tonfeld-Index (0..7) für einen Step + Hand.
 * Spiegelt exakt das Verhalten von HandpanVisualizer.resolveTonfeldSpotId,
 * nur als Index statt als "T{n}"-String.
 */
export function resolveTonfieldIndex(
  stepIndex: number,
  hand: string | null | undefined,
): number {
  if (hand === 'R') {
    return R_TONFIELD_ROTATION[Math.floor(stepIndex / 2) % R_TONFIELD_ROTATION.length];
  }
  if (hand === 'L') {
    return L_TONFIELD_ROTATION[Math.floor(stepIndex / 2) % L_TONFIELD_ROTATION.length];
  }
  return stepIndex % TONFIELD_SLOTS;
}
