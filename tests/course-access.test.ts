import { describe, expect, test } from 'bun:test'
import {
  berlinToday,
  formatDateDE,
  unlockDateForDay,
  unlockedThroughDay,
} from '../app/lib/course-access'

describe('unlockedThroughDay', () => {
  test('ohne Drip-Datum ist alles offen', () => {
    expect(unlockedThroughDay(null, '2026-09-02', 40)).toBe(40)
  })
  test('vor dem Start ist nichts offen', () => {
    expect(unlockedThroughDay('2026-09-12', '2026-09-11', 40)).toBe(0)
    expect(unlockedThroughDay('2026-09-12', '2026-01-01', 40)).toBe(0)
  })
  test('am Starttag ist Tag 1 offen', () => {
    expect(unlockedThroughDay('2026-09-12', '2026-09-12', 40)).toBe(1)
  })
  test('ein Tag pro Kalendertag, inkl. Wochenende', () => {
    expect(unlockedThroughDay('2026-09-12', '2026-09-13', 40)).toBe(2)
    expect(unlockedThroughDay('2026-09-12', '2026-09-21', 40)).toBe(10)
  })
  test('Tag 40 am 21.10., danach Clamp', () => {
    expect(unlockedThroughDay('2026-09-12', '2026-10-21', 40)).toBe(40)
    expect(unlockedThroughDay('2026-09-12', '2026-12-01', 40)).toBe(40)
  })
  test('Sommerzeit-Wechsel (25.10.2026) erzeugt keinen Off-by-one', () => {
    expect(unlockedThroughDay('2026-10-20', '2026-10-29', 40)).toBe(10)
  })
  test('Default-Kurslänge ist 44 (Tag 41–44 folgen): Tag 44 am 25.10., danach Clamp', () => {
    expect(unlockedThroughDay('2026-09-12', '2026-10-21')).toBe(40)
    expect(unlockedThroughDay('2026-09-12', '2026-10-22')).toBe(41)
    expect(unlockedThroughDay('2026-09-12', '2026-10-25')).toBe(44)
    expect(unlockedThroughDay('2026-09-12', '2026-11-30')).toBe(44)
    expect(unlockDateForDay('2026-09-12', 44)).toBe('2026-10-25')
  })
  test('unparsebares Datum schließt (fail closed), öffnet nie via NaN', () => {
    expect(unlockedThroughDay('kaputt', '2026-09-12', 40)).toBe(0)
  })
})

describe('unlockDateForDay', () => {
  test('Tag 1 = Startdatum, Tag 40 = +39 Tage', () => {
    expect(unlockDateForDay('2026-09-12', 1)).toBe('2026-09-12')
    expect(unlockDateForDay('2026-09-12', 40)).toBe('2026-10-21')
  })
  test('über den DST-Wechsel hinweg', () => {
    expect(unlockDateForDay('2026-10-20', 10)).toBe('2026-10-29')
  })
})

describe('berlinToday', () => {
  test('nutzt Berlin-Kalendertag, nicht UTC', () => {
    // 2026-09-12 23:30 UTC = 2026-09-13 01:30 Berlin (CEST)
    expect(berlinToday(new Date('2026-09-12T23:30:00Z'))).toBe('2026-09-13')
    // 2026-09-12 21:59 UTC = 2026-09-12 23:59 Berlin
    expect(berlinToday(new Date('2026-09-12T21:59:00Z'))).toBe('2026-09-12')
  })
})

describe('formatDateDE', () => {
  test('ISO → DD.MM.YYYY', () => {
    expect(formatDateDE('2026-09-12')).toBe('12.09.2026')
  })
})
