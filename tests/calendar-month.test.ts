import { describe, expect, test } from 'bun:test'
import {
  addDays,
  dayTitle,
  groupByDay,
  monthKeyOf,
  monthMatrix,
  monthTitle,
  shiftMonth,
  weekdayLabels,
} from '../app/lib/calendar-month'

describe('monthKeyOf / addDays', () => {
  test('Monatsschlüssel aus einem Datum', () => {
    expect(monthKeyOf('2026-09-26')).toBe('2026-09')
  })
  test('Tage addieren über Monatsgrenzen', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })
  test('Sommerzeit-Wechsel verschiebt kein Datum', () => {
    // 25.10.2026 ist der Rückstellungs-Sonntag.
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25')
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26')
  })
})

describe('shiftMonth', () => {
  test('innerhalb des Jahres', () => {
    expect(shiftMonth('2026-09', 1)).toBe('2026-10')
    expect(shiftMonth('2026-09', -1)).toBe('2026-08')
  })
  test('über den Jahreswechsel', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
  })
  test('mehrere Jahre', () => {
    expect(shiftMonth('2026-09', 16)).toBe('2028-01')
    expect(shiftMonth('2026-09', -21)).toBe('2024-12')
  })
  test('kein Rollover-Fehler bei langen Monaten', () => {
    // Date.setMonth() macht aus dem 31. Januar den 3. März — hier nicht.
    expect(shiftMonth('2026-01', 1)).toBe('2026-02')
  })
})

describe('monthMatrix', () => {
  test('September 2026 beginnt am Montag, dem 31. August', () => {
    const weeks = monthMatrix('2026-09')
    expect(weeks[0][0].date).toBe('2026-08-31')
    expect(weeks[0][0].inMonth).toBe(false)
    expect(weeks[0][1].date).toBe('2026-09-01')
    expect(weeks[0][1].inMonth).toBe(true)
  })
  test('jede Woche hat sieben Tage und endet sonntags', () => {
    const weeks = monthMatrix('2026-09')
    for (const week of weeks) expect(week.length).toBe(7)
    const last = weeks[weeks.length - 1][6]
    expect(new Date(`${last.date}T12:00:00Z`).getUTCDay()).toBe(0)
  })
  test('alle Tage des Monats kommen genau einmal vor', () => {
    const inMonth = monthMatrix('2026-09')
      .flat()
      .filter((c) => c.inMonth)
      .map((c) => c.day)
    expect(inMonth.length).toBe(30)
    expect(inMonth[0]).toBe(1)
    expect(inMonth[29]).toBe(30)
  })
  test('Schaltjahr: Februar 2028 endet am 29.', () => {
    const days = monthMatrix('2028-02').flat().filter((c) => c.inMonth)
    expect(days.length).toBe(29)
    expect(days[28].date).toBe('2028-02-29')
  })
  test('kein Schaltjahr: Februar 2026 endet am 28.', () => {
    const days = monthMatrix('2026-02').flat().filter((c) => c.inMonth)
    expect(days.length).toBe(28)
  })
  test('Monat, der an einem Sonntag beginnt, bekommt eine volle Vorwoche', () => {
    // 1. Februar 2026 ist ein Sonntag.
    const weeks = monthMatrix('2026-02')
    expect(weeks[0][0].date).toBe('2026-01-26')
    expect(weeks[0][6].date).toBe('2026-02-01')
  })
  test('Dezember 2026 läuft sauber ins neue Jahr', () => {
    const weeks = monthMatrix('2026-12')
    const last = weeks[weeks.length - 1]
    expect(last[6].date.startsWith('2027-01')).toBe(true)
  })
})

describe('Beschriftungen', () => {
  test('Wochentage beginnen montags', () => {
    expect(weekdayLabels('de')[0]).toBe('Mo')
    expect(weekdayLabels('de')[6]).toBe('So')
    expect(weekdayLabels('en')[0]).toBe('Mon')
    expect(weekdayLabels('en')[6]).toBe('Sun')
  })
  test('Monatstitel in beiden Sprachen', () => {
    expect(monthTitle('2026-09', 'de')).toBe('September 2026')
    expect(monthTitle('2026-05', 'de')).toBe('Mai 2026')
    expect(monthTitle('2026-05', 'en')).toBe('May 2026')
  })
  test('Tagestitel nennt den Wochentag', () => {
    expect(dayTitle('2026-09-13', 'de')).toContain('Sonntag')
    expect(dayTitle('2026-09-13', 'de')).toContain('13')
    expect(dayTitle('2026-09-13', 'en')).toContain('Sunday')
  })
})

describe('groupByDay', () => {
  const single = { id: 'a', startDate: '2026-09-11', endDate: '2026-09-11' }
  const alsoFriday = { id: 'b', startDate: '2026-09-11', endDate: '2026-09-11' }
  const retreat = { id: 'c', startDate: '2026-11-07', endDate: '2026-11-09' }

  test('ordnet einen Termin seinem Tag zu', () => {
    const map = groupByDay([single])
    expect(map.get('2026-09-11')?.map((e) => e.id)).toEqual(['a'])
    expect(map.get('2026-09-12')).toBeUndefined()
  })
  test('mehrere Termine am selben Tag behalten die Reihenfolge', () => {
    const map = groupByDay([single, alsoFriday])
    expect(map.get('2026-09-11')?.map((e) => e.id)).toEqual(['a', 'b'])
  })
  test('mehrtägiger Termin erscheint an jedem Tag der Spanne', () => {
    const map = groupByDay([retreat])
    expect(map.get('2026-11-07')?.map((e) => e.id)).toEqual(['c'])
    expect(map.get('2026-11-08')?.map((e) => e.id)).toEqual(['c'])
    expect(map.get('2026-11-09')?.map((e) => e.id)).toEqual(['c'])
    expect(map.get('2026-11-10')).toBeUndefined()
  })
  test('Ende vor Beginn erzeugt trotzdem genau einen Tag', () => {
    const map = groupByDay([{ id: 'd', startDate: '2026-09-11', endDate: '2026-09-01' }])
    expect(map.get('2026-09-11')?.length).toBe(1)
    expect(map.size).toBe(1)
  })
  test('absurd lange Spanne wird gekappt', () => {
    const map = groupByDay([{ id: 'e', startDate: '2026-01-01', endDate: '2030-01-01' }])
    expect(map.size).toBe(93)
  })
})
