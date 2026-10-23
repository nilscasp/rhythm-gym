import { describe, expect, test } from 'bun:test'
import { isValidSlug, slugify, uniqueSlug } from '../app/lib/slug'

describe('slugify', () => {
  test('Kleinschreibung, Leerzeichen werden zu Bindestrichen', () => {
    expect(slugify('Mein erster Beitrag')).toBe('mein-erster-beitrag')
  })
  test('Umlaute und ß werden ausgeschrieben', () => {
    expect(slugify('Über Größe und Mäßigung')).toBe('ueber-groesse-und-maessigung')
    expect(slugify('ÄÖÜ')).toBe('aeoeue')
  })
  test('Akzente fallen weg, Satzzeichen werden zu Trennern', () => {
    expect(slugify('Café, Crème & Brûlée!')).toBe('cafe-creme-brulee')
    expect(slugify('Frage: Was ist „Groove“?')).toBe('frage-was-ist-groove')
  })
  test('keine doppelten oder randständigen Bindestriche', () => {
    expect(slugify('  --Hallo   --  Welt--  ')).toBe('hallo-welt')
  })
  test('Zahlen bleiben', () => {
    expect(slugify('Woche 43 · 2026')).toBe('woche-43-2026')
  })
  test('nichts Brauchbares → leerer String', () => {
    expect(slugify('!!!')).toBe('')
    expect(slugify('')).toBe('')
  })
  test('höchstens 80 Zeichen, ohne Bindestrich am Ende', () => {
    const s = slugify('wort '.repeat(40))
    expect(s.length).toBeLessThanOrEqual(80)
    expect(s.endsWith('-')).toBe(false)
  })
  test('Ergebnis ist immer ein gültiger Slug (oder leer)', () => {
    for (const t of ['Ä b C', 'x', 'Klang & Stille', 'a—b–c']) {
      expect(isValidSlug(slugify(t))).toBe(true)
    }
  })
})

describe('isValidSlug', () => {
  test('erlaubt Kleinbuchstaben, Ziffern, einfache Bindestriche', () => {
    expect(isValidSlug('ein-slug-2')).toBe(true)
  })
  test('verbietet Großbuchstaben, Leerzeichen, doppelte/randständige Bindestriche', () => {
    expect(isValidSlug('Ein-Slug')).toBe(false)
    expect(isValidSlug('ein slug')).toBe(false)
    expect(isValidSlug('ein--slug')).toBe(false)
    expect(isValidSlug('-slug')).toBe(false)
    expect(isValidSlug('')).toBe(false)
  })
})

describe('uniqueSlug', () => {
  test('frei → unverändert', () => {
    expect(uniqueSlug('klang', new Set())).toBe('klang')
  })
  test('belegt → -2, -3 …', () => {
    expect(uniqueSlug('klang', new Set(['klang']))).toBe('klang-2')
    expect(uniqueSlug('klang', new Set(['klang', 'klang-2']))).toBe('klang-3')
  })
  test('leerer Grundwert → „beitrag“', () => {
    expect(uniqueSlug('', new Set())).toBe('beitrag')
    expect(uniqueSlug('', new Set(['beitrag']))).toBe('beitrag-2')
  })
})
