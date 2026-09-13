import { describe, expect, test } from 'bun:test'
import {
  isDayCompletable,
  nextOpenDay,
  progressPercent,
} from '../app/lib/course-progress'

const AVAILABLE = Array.from({ length: 40 }, (_, i) => i + 1) // Tag 1–40 hochgeladen

describe('progressPercent', () => {
  test('leerer Kurs ist 0, nie NaN', () => {
    expect(progressPercent(0, 0)).toBe(0)
    expect(progressPercent(5, 0)).toBe(0)
  })
  test('rundet kaufmännisch', () => {
    expect(progressPercent(1, 44)).toBe(2)
    expect(progressPercent(22, 44)).toBe(50)
    expect(progressPercent(7, 44)).toBe(16)
  })
  test('clamp auf 0–100', () => {
    expect(progressPercent(50, 44)).toBe(100)
    expect(progressPercent(-3, 44)).toBe(0)
  })
})

describe('isDayCompletable', () => {
  test('offener, vorhandener Tag ja', () => {
    expect(isDayCompletable(3, 10, AVAILABLE)).toBe(true)
    expect(isDayCompletable(10, 10, AVAILABLE)).toBe(true)
  })
  test('gesperrter Tag nein (Drip)', () => {
    expect(isDayCompletable(11, 10, AVAILABLE)).toBe(false)
  })
  test('nicht hochgeladener Tag nein, auch wenn Drip ihn freigäbe', () => {
    expect(isDayCompletable(41, 44, AVAILABLE)).toBe(false)
  })
  test('Unsinn nein', () => {
    expect(isDayCompletable(0, 44, AVAILABLE)).toBe(false)
    expect(isDayCompletable(-1, 44, AVAILABLE)).toBe(false)
    expect(isDayCompletable(2.5, 44, AVAILABLE)).toBe(false)
    expect(isDayCompletable(Number.NaN, 44, AVAILABLE)).toBe(false)
  })
})

describe('nextOpenDay', () => {
  test('nichts abgehakt → Tag 1', () => {
    expect(nextOpenDay(new Set(), 10, AVAILABLE)).toBe(1)
  })
  test('Lücken zuerst: 1 und 3 fertig → 2', () => {
    expect(nextOpenDay(new Set([1, 3]), 10, AVAILABLE)).toBe(2)
  })
  test('alles Offene fertig → null', () => {
    expect(nextOpenDay(new Set([1, 2, 3]), 3, AVAILABLE)).toBeNull()
  })
  test('vor Kursstart (nichts frei) → null', () => {
    expect(nextOpenDay(new Set(), 0, AVAILABLE)).toBeNull()
  })
  test('nicht hochgeladene Tage werden nie vorgeschlagen', () => {
    const all40 = new Set(AVAILABLE)
    expect(nextOpenDay(all40, 44, AVAILABLE)).toBeNull()
  })
})
