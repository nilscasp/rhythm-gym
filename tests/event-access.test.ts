import { describe, expect, test } from 'bun:test'
import {
  ANONYMOUS,
  accessHint,
  berlinDate,
  formatEventDate,
  formatEventTime,
  groupByMonth,
  hasEventAccess,
  isEventKind,
  isEventVisibility,
  localized,
  monthLabel,
  type Viewer,
} from '../app/lib/event-access'

const guest = ANONYMOUS
const member: Viewer = { isAuthenticated: true, isPremium: false, enrolledProgramIds: [] }
const circle: Viewer = { isAuthenticated: true, isPremium: true, enrolledProgramIds: [] }
const student: Viewer = {
  isAuthenticated: true,
  isPremium: false,
  enrolledProgramIds: ['prog-rf'],
}

describe('hasEventAccess', () => {
  test('öffentliche Termine stehen allen offen, auch ausgeloggt', () => {
    const event = { visibility: 'public', program_id: null }
    expect(hasEventAccess(guest, event).canJoin).toBe(true)
    expect(hasEventAccess(member, event).canJoin).toBe(true)
  })

  test('members: Ausgeloggte werden zur Anmeldung geschickt', () => {
    const event = { visibility: 'members', program_id: null }
    const access = hasEventAccess(guest, event)
    expect(access.canJoin).toBe(false)
    expect(access.canJoin === false && access.reason).toBe('login')
    expect(hasEventAccess(member, event).canJoin).toBe(true)
  })

  test('premium: nur der Innere Kreis kommt durch', () => {
    const event = { visibility: 'premium', program_id: null }
    expect(hasEventAccess(member, event).canJoin).toBe(false)
    expect(hasEventAccess(circle, event).canJoin).toBe(true)
  })

  test('program: nur wer im Kurs eingeschrieben ist', () => {
    const event = { visibility: 'program', program_id: 'prog-rf' }
    expect(hasEventAccess(student, event).canJoin).toBe(true)
    const denied = hasEventAccess(member, event)
    expect(denied.canJoin).toBe(false)
    expect(denied.canJoin === false && denied.reason).toBe('program')
    expect(denied.canJoin === false && denied.programId).toBe('prog-rf')
  })

  test('program ohne program_id bleibt zu — auch für Eingeschriebene', () => {
    const event = { visibility: 'program', program_id: null }
    expect(hasEventAccess(student, event).canJoin).toBe(false)
  })

  test('ein unbekannter visibility-Wert fällt auf members zurück, nicht auf offen', () => {
    const event = { visibility: 'quatsch', program_id: null }
    expect(hasEventAccess(guest, event).canJoin).toBe(false)
    expect(hasEventAccess(member, event).canJoin).toBe(true)
  })

  test('der Hinweis am Termin nennt den Grund und schweigt bei offener Tür', () => {
    expect(accessHint({ canJoin: true })).toBeNull()
    expect(accessHint({ canJoin: false, reason: 'premium' })).toContain('Inneren Kreis')
    expect(accessHint({ canJoin: false, reason: 'login' })).toContain('an')
  })
})

describe('localized', () => {
  test('nimmt die gewünschte Sprache', () => {
    expect(localized({ de: 'Fragerunde', en: 'Q&A' }, 'en')).toBe('Q&A')
  })

  test('fällt auf Deutsch zurück, wenn die Sprache fehlt', () => {
    expect(localized({ de: 'Fragerunde' }, 'en')).toBe('Fragerunde')
  })

  test('nimmt irgendeinen vorhandenen Wert, statt leer zu bleiben', () => {
    expect(localized({ fr: 'Rencontre' }, 'de')).toBe('Rencontre')
  })

  test('überspringt leere Werte', () => {
    expect(localized({ de: '   ', en: 'Q&A' }, 'de')).toBe('Q&A')
  })

  test('verträgt einen reinen String und leere Eingaben', () => {
    expect(localized('Retreat')).toBe('Retreat')
    expect(localized(null)).toBe('')
    expect(localized({})).toBe('')
  })
})

describe('Zeit in Berliner Zone', () => {
  // 26.9.2026, 17:00 UTC = 19:00 Berlin (Sommerzeit)
  const sommer = '2026-09-26T17:00:00.000Z'
  // 21.12.2026, 18:00 UTC = 19:00 Berlin (Winterzeit)
  const winter = '2026-12-21T18:00:00.000Z'

  test('zeigt Berliner Uhrzeit, nicht UTC', () => {
    expect(formatEventTime(sommer)).toBe('19:00')
    expect(formatEventTime(winter)).toBe('19:00')
  })

  test('Zeitspanne mit Ende', () => {
    expect(formatEventTime(sommer, '2026-09-26T18:30:00.000Z')).toBe('19:00 – 20:30')
  })

  test('Datum mit Wochentag', () => {
    expect(formatEventDate(sommer)).toContain('26. September')
  })

  test('berlinDate liefert das Datum der Berliner Zone', () => {
    expect(berlinDate(sommer)).toBe('2026-09-26')
    // 22:30 UTC ist in Berlin schon der Folgetag
    expect(berlinDate('2026-09-26T22:30:00.000Z')).toBe('2026-09-27')
  })

  test('Monatsbeschriftung', () => {
    expect(monthLabel(winter)).toBe('Dezember 2026')
  })
})

describe('groupByMonth', () => {
  test('gruppiert nach Monat und behält die Reihenfolge', () => {
    const groups = groupByMonth([
      { starts_at: '2026-09-26T17:00:00.000Z' },
      { starts_at: '2026-09-30T17:00:00.000Z' },
      { starts_at: '2026-10-02T17:00:00.000Z' },
    ])
    expect(groups.map((g) => g.label)).toEqual(['September 2026', 'Oktober 2026'])
    expect(groups[0].events).toHaveLength(2)
    expect(groups[1].events).toHaveLength(1)
  })

  test('leere Liste ergibt keine Gruppen', () => {
    expect(groupByMonth([])).toEqual([])
  })
})

describe('Wächter', () => {
  test('erkennt gültige Arten und Sichtbarkeiten', () => {
    expect(isEventKind('qa')).toBe(true)
    expect(isEventKind('party')).toBe(false)
    expect(isEventVisibility('program')).toBe(true)
    expect(isEventVisibility('secret')).toBe(false)
  })
})
