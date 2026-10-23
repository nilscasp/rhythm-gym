import { describe, expect, test } from 'bun:test'
import {
  ANONYMOUS,
  QUESTION_MAX_LENGTH,
  canAskQuestion,
  hasEventAccess,
  normalizeQuestion,
  recordingGate,
  type Viewer,
} from '../app/lib/event-access'
import { resolveAccess } from '../app/lib/course-access'
import { buildCalendar, buildEventIcs, escapeIcsText, foldIcsLine } from '../app/lib/event-ics'

// ─────────────────────────────────────────────────────────────────────────────
// Abschnitt H: Aufzeichnungen, Frage vorab, Kalender-Export.
// ─────────────────────────────────────────────────────────────────────────────

const member: Viewer = { isAuthenticated: true, isPremium: false, isVip: false, enrolledProgramIds: [] }
const stufe1: Viewer = { isAuthenticated: true, isPremium: true, isVip: false, enrolledProgramIds: [] }
const stufe2: Viewer = { isAuthenticated: true, isPremium: true, isVip: true, enrolledProgramIds: [] }

const NOW = new Date('2026-11-01T12:00:00Z')
const vipCall = {
  visibility: 'vip',
  program_id: null,
  starts_at: '2026-11-05T18:00:00Z',
}

describe('VIP-Call: Teilnahme Stufe 2, Aufzeichnung ab Stufe 1', () => {
  test('Teilnahme: nur Stufe 2', () => {
    expect(hasEventAccess(stufe1, vipCall).canJoin).toBe(false)
    expect(hasEventAccess(stufe2, vipCall).canJoin).toBe(true)
  })

  test('Aufzeichnung in der Bibliothek „VIP-Calls“ (included_in_plan premium) sieht Stufe 1', () => {
    const base = { isAdmin: false, enrollment: null, today: '2026-11-10', totalDays: 366 }
    const s1 = resolveAccess({ ...base, plan: 'premium', includedInPlan: 'premium' })
    const free = resolveAccess({ ...base, plan: 'free', includedInPlan: 'premium' })
    expect(recordingGate(member, s1, 'premium')).toEqual({ canWatch: true })
    expect(recordingGate(member, free, 'premium')).toEqual({ canWatch: false, reason: 'premium' })
  })

  test('Aufzeichnung: ausgeloggt → login, Stufe-2-Bibliothek → vip, ohne Abo-Stufe → program', () => {
    const closed = { hasAccess: false }
    expect(recordingGate(ANONYMOUS, closed, 'premium')).toEqual({ canWatch: false, reason: 'login' })
    expect(recordingGate(stufe1, closed, 'vip')).toEqual({ canWatch: false, reason: 'vip' })
    expect(recordingGate(member, closed, null)).toEqual({ canWatch: false, reason: 'program' })
    expect(recordingGate(member, undefined, 'premium')).toEqual({ canWatch: false, reason: 'premium' })
  })
})

describe('Frage vorab', () => {
  test('nur mit Zugang und nur vor Beginn', () => {
    expect(canAskQuestion(stufe2, vipCall, NOW)).toBe(true)
    expect(canAskQuestion(stufe1, vipCall, NOW)).toBe(false)
    expect(canAskQuestion(stufe2, { ...vipCall, starts_at: '2026-10-30T18:00:00Z' }, NOW)).toBe(false)
  })

  test('öffentlicher Termin: Gäste fragen nicht (kein Konto, keine Frage)', () => {
    const open = { visibility: 'public', program_id: null, starts_at: '2026-11-05T18:00:00Z' }
    expect(canAskQuestion(ANONYMOUS, open, NOW)).toBe(false)
    expect(canAskQuestion(member, open, NOW)).toBe(true)
  })

  test('Text wird getrimmt und geprüft', () => {
    expect(normalizeQuestion('  Wie übe ich Ghost Notes?  ')).toBe('Wie übe ich Ghost Notes?')
    expect(normalizeQuestion('  a ')).toBeNull()
    expect(normalizeQuestion('x'.repeat(QUESTION_MAX_LENGTH + 1))).toBeNull()
    expect(normalizeQuestion(null)).toBeNull()
  })
})

describe('Kalender-Export (.ics)', () => {
  const event = {
    id: '11111111-2222-3333-4444-555555555555',
    title: { de: 'VIP-Call; Fragen, Antworten' },
    description: { de: 'Zeile eins\nZeile zwei' },
    starts_at: '2026-11-05T18:00:00Z',
    ends_at: '2026-11-05T19:30:00Z',
    all_day: false,
    location: 'Zoom',
    updated_at: '2026-10-20T08:00:00Z',
    created_at: '2026-10-01T08:00:00Z',
  }
  const url = 'https://app.handpan.schule/termine/11111111-2222-3333-4444-555555555555'

  test('Grundgerüst, UTC-Zeiten, UID, Link auf die Terminseite', () => {
    const ics = buildEventIcs(event, { url, locale: 'de', now: NOW })
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics).toContain('\r\nVERSION:2.0\r\n')
    expect(ics).toContain('\r\nUID:11111111-2222-3333-4444-555555555555@handpan.schule\r\n')
    expect(ics).toContain('\r\nDTSTART:20261105T180000Z\r\n')
    expect(ics).toContain('\r\nDTEND:20261105T193000Z\r\n')
    expect(ics).toContain('\r\nDTSTAMP:20261101T120000Z\r\n')
    expect(ics).toContain('\r\nSUMMARY:VIP-Call\\; Fragen\\, Antworten\r\n')
    expect(ics).toContain(`\r\nURL:${url}\r\n`)
    // Jede Zeile endet mit CRLF, keine nackten LF.
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n')
  })

  test('Zoom-Link landet nie in der Datei', () => {
    const withZoom = { ...event, zoom_url: 'https://zoom.us/j/123', location: 'Zoom' }
    const ics = buildEventIcs(withZoom, { url, locale: 'de', now: NOW })
    expect(ics).not.toContain('zoom.us')
  })

  test('Beschreibung enthält Text und Link, Zeilenumbrüche als \\n', () => {
    const unfolded = buildEventIcs(event, { url, locale: 'de', now: NOW }).replace(/\r\n /g, '')
    expect(unfolded).toContain('DESCRIPTION:Zeile eins\\nZeile zwei\\n\\nZum Raum und allen Infos: ')
  })

  test('ohne Ende: eine Stunde', () => {
    const ics = buildEventIcs({ ...event, ends_at: null }, { url, locale: 'de', now: NOW })
    expect(ics).toContain('\r\nDTEND:20261105T190000Z\r\n')
  })

  test('ganztägig: DATE-Werte in Berliner Zeit, Ende exklusiv', () => {
    const ics = buildEventIcs(
      { ...event, all_day: true, starts_at: '2026-11-04T23:00:00Z', ends_at: '2026-11-06T22:59:00Z' },
      { url, locale: 'de', now: NOW },
    )
    expect(ics).toContain('\r\nDTSTART;VALUE=DATE:20261105\r\n')
    expect(ics).toContain('\r\nDTEND;VALUE=DATE:20261107\r\n')
  })

  test('Escaping und Falten nach 75 Oktetten (UTF-8)', () => {
    expect(escapeIcsText('a\\b;c,d\ne')).toBe('a\\\\b\\;c\\,d\\ne')
    const long = 'SUMMARY:' + 'ü'.repeat(60)
    const folded = foldIcsLine(long)
    for (const line of folded.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    }
    expect(folded.replace(/\r\n /g, '')).toBe(long)
  })

  test('Abo-Feed: mehrere VEVENTs in einem Kalender', () => {
    const feed = buildCalendar(
      [event, { ...event, id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' }],
      { urlFor: (id) => `https://app.handpan.schule/termine/${id}`, locale: 'de', now: NOW, name: 'Termine' },
    )
    expect(feed.match(/BEGIN:VEVENT/g)?.length).toBe(2)
    expect(feed).toContain('\r\nX-WR-CALNAME:Termine\r\n')
  })
})
