import { describe, expect, test } from 'bun:test'
import {
  SCHULE_BOTTOM_NAV,
  SCHULE_NAV,
  activeSchuleNav,
  showsSchuleAppNav,
} from '../app/lib/schule-nav'

describe('SCHULE_NAV', () => {
  test('sechs Punkte in der vereinbarten Reihenfolge', () => {
    expect(SCHULE_NAV.map((i) => i.href)).toEqual([
      '/training',
      '/training/kurse',
      '/tool',
      '/termine',
      '/miteinander',
      '/mein-weg',
    ])
  })
  test('unten mobil: fünf Punkte ohne „Mein Weg“', () => {
    expect(SCHULE_BOTTOM_NAV.map((i) => i.key)).toEqual([
      'heute',
      'kurse',
      'ueben',
      'live',
      'miteinander',
    ])
  })
  test('Glossar und Patterns stehen nicht in der Schule-Navigation', () => {
    const hrefs = SCHULE_NAV.map((i) => i.href)
    expect(hrefs).not.toContain('/glossar')
    expect(hrefs).not.toContain('/patterns')
  })
})

describe('activeSchuleNav', () => {
  test('/training ist Heute, nur exakt', () => {
    expect(activeSchuleNav('/training')).toBe('heute')
    expect(activeSchuleNav('/training/')).toBe('heute')
  })
  test('Kursliste und jeder Kursraum gehören zu Kurse', () => {
    expect(activeSchuleNav('/training/kurse')).toBe('kurse')
    expect(activeSchuleNav('/training/handpan-kompass')).toBe('kurse')
    expect(activeSchuleNav('/training/rhythmusfundament/tag/3')).toBe('kurse')
  })
  test('Beiträge gehören zu Heute', () => {
    expect(activeSchuleNav('/beitraege')).toBe('heute')
    expect(activeSchuleNav('/beitraege/ein-gruss')).toBe('heute')
  })
  test('Üben, Live, Miteinander, Mein Weg', () => {
    expect(activeSchuleNav('/tool')).toBe('ueben')
    expect(activeSchuleNav('/termine')).toBe('live')
    expect(activeSchuleNav('/termine/abc')).toBe('live')
    expect(activeSchuleNav('/miteinander')).toBe('miteinander')
    expect(activeSchuleNav('/mein-weg')).toBe('mein-weg')
    expect(activeSchuleNav('/settings')).toBe('mein-weg')
  })
  test('englisches Präfix wird ignoriert', () => {
    expect(activeSchuleNav('/en/termine')).toBe('live')
    expect(activeSchuleNav('/en/training')).toBe('heute')
  })
  test('kein Treffer → null (kein Präfix-Fehlgriff)', () => {
    expect(activeSchuleNav('/coach')).toBeNull()
    expect(activeSchuleNav('/glossar')).toBeNull()
    expect(activeSchuleNav('/toolbox')).toBeNull()
    expect(activeSchuleNav('/trainingsplan')).toBeNull()
    expect(activeSchuleNav(null)).toBeNull()
  })
})

describe('showsSchuleAppNav', () => {
  test('Landing, Laden, Login und Pflichtseiten bekommen keine App-Navigation', () => {
    for (const p of ['/', '/en', '/kurse', '/en/kurse', '/tag-1', '/impressum', '/datenschutz', '/auth/login']) {
      expect(showsSchuleAppNav(p)).toBe(false)
    }
  })
  test('App-Seiten bekommen sie', () => {
    for (const p of ['/training', '/training/kurse', '/tool', '/termine', '/mein-weg', '/beitraege/x', '/coach', '/glossar']) {
      expect(showsSchuleAppNav(p)).toBe(true)
    }
  })
})
