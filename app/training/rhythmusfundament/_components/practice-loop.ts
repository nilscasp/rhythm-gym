// Kapitel- und Schleifenlogik der Übe-Station — rein, damit sie ohne
// Videowiedergabe testbar ist (tests/practice-loop.test.ts).

import type { VideoChapter } from '../../../../data/rhythmusfundament-days';

/** Index des Kapitels, in dem `seconds` liegt; -1 vor dem ersten. */
export function chapterIndexAt(chapters: readonly VideoChapter[], seconds: number): number {
  let idx = -1;
  chapters.forEach((c, i) => {
    if (seconds >= c.start - 0.5) idx = i;
  });
  return idx;
}

export function chapterEnd(chapters: readonly VideoChapter[], i: number, duration: number): number {
  return chapters[i].end ?? chapters[i + 1]?.start ?? duration;
}

/**
 * Ein timeupdate-Schritt bei aktiver Schleife: am Kapitelende zurück zum
 * Start; wer deutlich aus dem Kapitel herausspult, nimmt die Schleife ins
 * neue Kapitel mit. Kurz vor dem Ende zählt nicht als Spulen, sonst wanderte
 * die Schleife ins nächste Kapitel, bevor sie greift.
 */
export function loopStep(
  chapters: readonly VideoChapter[],
  loopIndex: number,
  seconds: number,
  duration: number,
): { loopIndex: number; seekTo?: number } {
  const start = chapters[loopIndex].start;
  const end = chapterEnd(chapters, loopIndex, duration);
  // Das letzte Kapitel endet mit dem Video; dort meldet der Player selten
  // eine Zeit jenseits von end - 0.3, daher etwas mehr Vorlauf.
  const lead = end >= duration - 0.01 ? 0.8 : 0.3;
  if (end > start && seconds >= end - lead && seconds < end + 2) {
    return { loopIndex, seekTo: start };
  }
  if (seconds < start - 2 || seconds >= end + 2) {
    const here = chapterIndexAt(chapters, seconds);
    if (here >= 0) return { loopIndex: here };
  }
  return { loopIndex };
}
