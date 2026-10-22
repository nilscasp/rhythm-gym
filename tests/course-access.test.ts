import { describe, expect, test } from 'bun:test'
import {
  berlinToday,
  formatDateDE,
  isLessonUnlocked,
  lessonUnlockLabel,
  resolveAccess,
  type ResolveAccessInput,
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

// ── Migration 0010 · Zugriff über Enrollment, Abo-Stufe oder Admin ──────────

const TODAY = '2026-10-22'
const base: ResolveAccessInput = {
  isAdmin: false,
  plan: 'free',
  includedInPlan: null,
  enrollment: null,
  today: TODAY,
  totalDays: 366,
}

describe('resolveAccess', () => {
  test('aktives Enrollment mit Drip → Zugang, Drip zählt', () => {
    const r = resolveAccess({
      ...base,
      enrollment: { status: 'active', drip_start_date: '2026-10-20' },
    })
    expect(r.hasAccess).toBe(true)
    expect(r.source).toBe('enrollment')
    expect(r.enrolled).toBe(true)
    expect(r.maxUnlockedDay).toBe(3)
    expect(r.dripStartDate).toBe('2026-10-20')
  })

  test('Status null gilt als aktiv (wie coalesce in SQL)', () => {
    const r = resolveAccess({ ...base, enrollment: { status: null, drip_start_date: null } })
    expect(r.hasAccess).toBe(true)
    expect(r.maxUnlockedDay).toBe(366)
  })

  test('cancelled → kein Zugang, aber enrolled bleibt (RF-Semantik)', () => {
    const r = resolveAccess({
      ...base,
      enrollment: { status: 'cancelled', drip_start_date: null },
    })
    expect(r.hasAccess).toBe(false)
    expect(r.source).toBeNull()
    expect(r.enrolled).toBe(true)
  })

  test('Premium-Kurs: free nein, premium ja, vip ja', () => {
    const course = { ...base, includedInPlan: 'premium' }
    expect(resolveAccess({ ...course, plan: 'free' }).hasAccess).toBe(false)
    const premium = resolveAccess({ ...course, plan: 'premium' })
    expect(premium.hasAccess).toBe(true)
    expect(premium.source).toBe('plan')
    expect(premium.maxUnlockedDay).toBe(366)
    expect(premium.dripStartDate).toBeNull()
    expect(resolveAccess({ ...course, plan: 'vip' }).source).toBe('plan')
  })

  test('VIP-Kurs mit Premium → kein Zugang', () => {
    const r = resolveAccess({ ...base, includedInPlan: 'vip', plan: 'premium' })
    expect(r.hasAccess).toBe(false)
    expect(r.includedInPlan).toBe('vip')
  })

  test('Kurs ohne Abo-Stufe (null) mit VIP → kein Zugang', () => {
    const r = resolveAccess({ ...base, includedInPlan: null, plan: 'vip' })
    expect(r.hasAccess).toBe(false)
    expect(r.source).toBeNull()
  })

  test('Enrollment + Abo → Quelle enrollment, Abo hebt den Drip auf', () => {
    const r = resolveAccess({
      ...base,
      includedInPlan: 'premium',
      plan: 'premium',
      enrollment: { status: 'active', drip_start_date: '2026-10-20' },
    })
    expect(r.source).toBe('enrollment')
    expect(r.maxUnlockedDay).toBe(366)
  })

  test('Admin ohne Enrollment → alles offen', () => {
    const r = resolveAccess({ ...base, isAdmin: true })
    expect(r.hasAccess).toBe(true)
    expect(r.source).toBe('admin')
    expect(r.maxUnlockedDay).toBe(366)
  })

  test('Admin mit aktivem Drip-Enrollment → Drip gilt (RF unverändert)', () => {
    const r = resolveAccess({
      ...base,
      isAdmin: true,
      totalDays: 44,
      enrollment: { status: 'active', drip_start_date: '2026-10-20' },
    })
    expect(r.source).toBe('enrollment')
    expect(r.maxUnlockedDay).toBe(3)
  })

  test('unbekannter Plan-Wert im Kurs zählt nicht als Abo', () => {
    const r = resolveAccess({ ...base, includedInPlan: 'gold', plan: 'vip' })
    expect(r.hasAccess).toBe(false)
    expect(r.includedInPlan).toBeNull()
  })
})

describe('isLessonUnlocked', () => {
  test('ohne Zugang immer zu', () => {
    expect(isLessonUnlocked({ unlock_day: null }, { hasAccess: false, maxUnlockedDay: 366 })).toBe(false)
  })
  test('ohne unlock_day sofort offen', () => {
    expect(isLessonUnlocked({ unlock_day: null }, { hasAccess: true, maxUnlockedDay: 0 })).toBe(true)
  })
  test('Drip: offen bis maxUnlockedDay', () => {
    const access = { hasAccess: true, maxUnlockedDay: 3 }
    expect(isLessonUnlocked({ unlock_day: 3 }, access)).toBe(true)
    expect(isLessonUnlocked({ unlock_day: 4 }, access)).toBe(false)
  })
})

describe('lessonUnlockLabel', () => {
  test('Datum aus Drip-Start + unlock_day', () => {
    expect(lessonUnlockLabel({ unlock_day: 8 }, { dripStartDate: '2026-10-20' })).toBe('27.10.2026')
  })
  test('ohne Drip oder ohne unlock_day → null', () => {
    expect(lessonUnlockLabel({ unlock_day: 8 }, { dripStartDate: null })).toBeNull()
    expect(lessonUnlockLabel({ unlock_day: null }, { dripStartDate: '2026-10-20' })).toBeNull()
  })
})
