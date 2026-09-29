import { describe, expect, test } from 'bun:test'
import { chapterIndexAt, loopStep } from '../app/training/rhythmusfundament/_components/practice-loop'

// Kapitel wie Tag 1: Ende eines Kapitels = Start des nächsten, letztes endet mit dem Video.
const chapters = [
  { label: 'Einführung', start: 0 },
  { label: 'R – L', start: 260 },
  { label: 'L – R', start: 363 },
  { label: 'Paradiddle', start: 697 },
]
const DURATION = 934.85

describe('chapterIndexAt', () => {
  test('findet das Kapitel zur Zeit', () => {
    expect(chapterIndexAt(chapters, 10)).toBe(0)
    expect(chapterIndexAt(chapters, 300)).toBe(1)
    expect(chapterIndexAt(chapters, 900)).toBe(3)
  })
})

describe('loopStep', () => {
  test('springt am Kapitelende zurück an den Start', () => {
    expect(loopStep(chapters, 1, 362.8, DURATION)).toEqual({ loopIndex: 1, seekTo: 260 })
  })

  test('kurz vor dem Ende bleibt die Schleife im Kapitel (Regression)', () => {
    // 362.6 liegt in der 0,5-s-Toleranz des nächsten Kapitels, darf die Schleife aber nicht verschieben.
    expect(loopStep(chapters, 1, 362.6, DURATION)).toEqual({ loopIndex: 1 })
  })

  test('mitten im Kapitel passiert nichts', () => {
    expect(loopStep(chapters, 1, 300, DURATION)).toEqual({ loopIndex: 1 })
  })

  test('wer weit wegspult, nimmt die Schleife mit', () => {
    expect(loopStep(chapters, 1, 30, DURATION)).toEqual({ loopIndex: 0 })
    expect(loopStep(chapters, 1, 700, DURATION)).toEqual({ loopIndex: 3 })
  })

  test('letztes Kapitel schleift kurz vor dem Videoende', () => {
    expect(loopStep(chapters, 3, 934.2, DURATION)).toEqual({ loopIndex: 3, seekTo: 697 })
  })

  test('ohne bekannte Dauer greift die Schleife im letzten Kapitel nicht', () => {
    expect(loopStep(chapters, 3, 800, 0)).toEqual({ loopIndex: 3 })
  })
})
