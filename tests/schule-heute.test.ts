import { describe, expect, test } from 'bun:test'
import {
  activeDayCount,
  greetingDateLabel,
  isoWeek,
  weekDays,
  weekDots,
} from '../app/lib/schule-heute'
import { WEEKLY_QUOTES, quoteForWeek } from '../app/lib/weekly-quote'

describe('isoWeek', () => {
  test('gewöhnliche Woche', () => {
    expect(isoWeek('2026-10-23')).toBe(43)
    expect(isoWeek('2026-10-19')).toBe(43) // Montag
    expect(isoWeek('2026-10-25')).toBe(43) // Sonntag
    expect(isoWeek('2026-10-26')).toBe(44)
  })
  test('Jahreswechsel nach ISO 8601', () => {
    expect(isoWeek('2026-01-01')).toBe(1) // Donnerstag → KW 1
    expect(isoWeek('2021-01-01')).toBe(53) // Freitag → KW 53 des Vorjahres
    expect(isoWeek('2024-12-30')).toBe(1) // Montag → KW 1 des Folgejahres
    expect(isoWeek('2020-12-31')).toBe(53)
  })
})

describe('weekDays', () => {
  test('Montag bis Sonntag um das Datum herum', () => {
    expect(weekDays('2026-10-23')).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ])
  })
  test('Sonntag gehört zur laufenden Woche, nicht zur nächsten', () => {
    expect(weekDays('2026-10-25')[0]).toBe('2026-10-19')
  })
  test('über Monats- und Jahresgrenzen', () => {
    expect(weekDays('2027-01-01')).toEqual([
      '2026-12-28',
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
      '2027-01-03',
    ])
  })
})

describe('weekDots', () => {
  test('füllt nur Tage dieser Woche mit Aktivität', () => {
    const dots = weekDots('2026-10-23', ['2026-10-18', '2026-10-19', '2026-10-21', '2026-10-23'])
    expect(dots.map((d) => d.label)).toEqual(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'])
    expect(dots.map((d) => d.active)).toEqual([true, false, true, false, true, false, false])
    expect(dots.map((d) => d.isToday)).toEqual([false, false, false, false, true, false, false])
    expect(dots.map((d) => d.isFuture)).toEqual([false, false, false, false, false, true, true])
    expect(activeDayCount(dots)).toBe(3)
  })
  test('doppelte und zeitbehaftete Einträge zählen einmal', () => {
    const dots = weekDots('2026-10-23', ['2026-10-20', '2026-10-20', '2026-10-20T10:00:00Z'])
    expect(activeDayCount(dots)).toBe(1)
  })
  test('leere Aktivität', () => {
    expect(activeDayCount(weekDots('2026-10-23', []))).toBe(0)
  })
})

describe('greetingDateLabel', () => {
  test('Wochentag und Datum auf Deutsch in Berliner Zeit', () => {
    expect(greetingDateLabel(new Date('2026-10-22T12:00:00Z'))).toBe('Donnerstag, 22. Oktober')
  })
  test('nach Mitternacht Berlin zählt schon der neue Tag', () => {
    // 22:30 UTC = 00:30 in Berlin (Sommerzeit bis 25.10.)
    expect(greetingDateLabel(new Date('2026-10-22T22:30:00Z'))).toBe('Freitag, 23. Oktober')
  })
})

describe('quoteForWeek', () => {
  test('enthält nur Nils’ Satz, keinen erfundenen', () => {
    expect(WEEKLY_QUOTES.length).toBe(1)
    expect(WEEKLY_QUOTES[0].text).toBe(
      'Du lernst das Handwerk, das dich trägt. Und du findest den Klang, der aus dir kommt.',
    )
  })
  test('wählt nach Kalenderwoche modulo Länge', () => {
    const list = [
      { text: 'a', author: 'Nils' },
      { text: 'b', author: 'Nils' },
      { text: 'c', author: 'Nils' },
    ]
    expect(quoteForWeek(1, list)?.text).toBe('b')
    expect(quoteForWeek(3, list)?.text).toBe('a')
    expect(quoteForWeek(43, list)?.text).toBe('b')
  })
  test('Standardliste: jede Woche derselbe Satz', () => {
    expect(quoteForWeek(43)?.text).toBe(WEEKLY_QUOTES[0].text)
  })
  test('leere Liste → null', () => {
    expect(quoteForWeek(10, [])).toBeNull()
  })
})
