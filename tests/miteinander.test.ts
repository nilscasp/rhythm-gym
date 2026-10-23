import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'bun:test'
import {
  addDays,
  berlinToday,
  challengeTiming,
  dateRangeLabel,
  durationLabel,
  errorCodeFrom,
  initialOf,
  isWhatsappGroupUrl,
  meetupDateBox,
  messageFor,
  normalizePhone,
  normalizeWhatsappGroupUrl,
  openForLabel,
  parseChallengeForm,
  parseContactForm,
  parseMeetupForm,
  peopleCountLabel,
  spotsLabel,
  validateConnectionMessage,
  waMeUrl,
} from '../app/lib/miteinander'

describe('normalizePhone', () => {
  test('leer heißt: keine Nummer', () => {
    expect(normalizePhone('')).toEqual({ ok: true, value: null })
    expect(normalizePhone('   ')).toEqual({ ok: true, value: null })
  })

  test('Leerzeichen fallen weg, + bleibt', () => {
    expect(normalizePhone('+49 176 1234 5678')).toEqual({ ok: true, value: '+4917612345678' })
  })

  test('00 am Anfang wird zu +', () => {
    expect(normalizePhone('0043 664 1234567')).toEqual({ ok: true, value: '+436641234567' })
  })

  test('ohne Ländervorwahl: Hinweis statt Raten', () => {
    expect(normalizePhone('0176 12345678')).toEqual({ ok: false, error: 'phone_country' })
    expect(normalizePhone('17612345678')).toEqual({ ok: false, error: 'phone_country' })
  })

  test('nur Ziffern, + und Leerzeichen sind erlaubt', () => {
    expect(normalizePhone('+49-176-12345678')).toEqual({ ok: false, error: 'phone_format' })
    expect(normalizePhone('+49 (176) 1234')).toEqual({ ok: false, error: 'phone_format' })
    expect(normalizePhone('+49 176 abc')).toEqual({ ok: false, error: 'phone_format' })
    expect(normalizePhone('+49 +176 123456')).toEqual({ ok: false, error: 'phone_format' })
  })

  test('Länge wie E.164: 7 bis 15 Ziffern, keine 0 nach dem +', () => {
    expect(normalizePhone('+49 123')).toEqual({ ok: false, error: 'phone_format' })
    expect(normalizePhone('+1234567890123456')).toEqual({ ok: false, error: 'phone_format' })
    expect(normalizePhone('+0 176 1234567')).toEqual({ ok: false, error: 'phone_format' })
    expect(normalizePhone('+41 79 123 45 67')).toEqual({ ok: true, value: '+41791234567' })
  })
})

describe('waMeUrl', () => {
  test('ohne +', () => {
    expect(waMeUrl('+4917612345678')).toBe('https://wa.me/4917612345678')
  })
})

describe('WhatsApp-Gruppenlink', () => {
  test('Einladungslink wird erkannt, Zusätze fallen weg', () => {
    expect(normalizeWhatsappGroupUrl(' https://chat.whatsapp.com/AbCdEf123456 ')).toBe(
      'https://chat.whatsapp.com/AbCdEf123456',
    )
    expect(normalizeWhatsappGroupUrl('https://chat.whatsapp.com/AbCdEf123456?mode=ac_t')).toBe(
      'https://chat.whatsapp.com/AbCdEf123456',
    )
    expect(normalizeWhatsappGroupUrl('https://chat.whatsapp.com/AbCdEf123456/')).toBe(
      'https://chat.whatsapp.com/AbCdEf123456',
    )
  })

  test('andere Links nicht', () => {
    expect(isWhatsappGroupUrl('http://chat.whatsapp.com/AbCdEf123456')).toBe(false)
    expect(isWhatsappGroupUrl('https://chat.whatsapp.com.evil.de/AbCdEf123456')).toBe(false)
    expect(isWhatsappGroupUrl('https://wa.me/4917612345678')).toBe(false)
    expect(isWhatsappGroupUrl('javascript:alert(1)')).toBe(false)
    expect(normalizeWhatsappGroupUrl('https://example.com')).toBeNull()
  })
})

describe('openForLabel', () => {
  test('Reihenfolge fest, unbekanntes fällt weg', () => {
    expect(openForLabel(['challenge', 'partner'])).toBe('Offen für Übe-Partner und Challenges')
    expect(openForLabel(['meetup'])).toBe('Offen für Treffen')
    expect(openForLabel(['partner', 'meetup', 'challenge', 'x'])).toBe(
      'Offen für Übe-Partner, Treffen und Challenges',
    )
    expect(openForLabel([])).toBeNull()
  })
})

describe('initialOf', () => {
  test('erster Buchstabe groß, Ersatz bei leer', () => {
    expect(initialOf('anna')).toBe('A')
    expect(initialOf('  ömer')).toBe('Ö')
    expect(initialOf('')).toBe('·')
  })
})

describe('validateConnectionMessage', () => {
  test('1 bis 300 Zeichen', () => {
    expect(validateConnectionMessage('  Hallo  ')).toEqual({ ok: true, value: 'Hallo' })
    expect(validateConnectionMessage('   ')).toEqual({ ok: false, error: 'message_length' })
    expect(validateConnectionMessage('x'.repeat(301))).toEqual({ ok: false, error: 'message_length' })
    expect(validateConnectionMessage('x'.repeat(300)).ok).toBe(true)
  })
})

describe('parseContactForm', () => {
  const base = { display_name: '', phone: '', region: '', about: '', visible: false, open_for: [] as string[] }

  test('leer ist gültig', () => {
    expect(parseContactForm(base)).toEqual({
      ok: true,
      value: { display_name: null, phone: null, region: null, about: null, visible: false, open_for: [] },
    })
  })

  test('normalisiert Nummer, filtert offen-für', () => {
    const r = parseContactForm({
      ...base,
      display_name: ' Anna ',
      phone: '+49 176 12345678',
      region: ' Raum München ',
      visible: true,
      open_for: ['meetup', 'partner', 'quatsch', 'meetup'],
    })
    expect(r).toEqual({
      ok: true,
      value: {
        display_name: 'Anna',
        phone: '+4917612345678',
        region: 'Raum München',
        about: null,
        visible: true,
        open_for: ['partner', 'meetup'],
      },
    })
  })

  test('Längen', () => {
    expect(parseContactForm({ ...base, about: 'x'.repeat(501) })).toEqual({ ok: false, error: 'about_long' })
    expect(parseContactForm({ ...base, region: 'x'.repeat(81) })).toEqual({ ok: false, error: 'region_long' })
    expect(parseContactForm({ ...base, display_name: 'x'.repeat(61) })).toEqual({ ok: false, error: 'name_long' })
    expect(parseContactForm({ ...base, phone: '0176' })).toEqual({ ok: false, error: 'phone_country' })
  })
})

describe('Datum', () => {
  test('berlinToday nimmt die Berliner Uhr', () => {
    // 23:30 UTC am 23.10. ist in Berlin schon der 24.10. (MESZ)
    expect(berlinToday(new Date('2026-10-23T22:30:00Z'))).toBe('2026-10-24')
    expect(berlinToday(new Date('2026-10-23T10:00:00Z'))).toBe('2026-10-23')
  })

  test('addDays über Monatsgrenzen', () => {
    expect(addDays('2026-11-02', 29)).toBe('2026-12-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  test('Zeitraum und Dauer', () => {
    expect(dateRangeLabel('2026-11-02', '2026-12-01')).toBe('Mo, 2. Nov. bis Di, 1. Dez.')
    expect(durationLabel('2026-11-02', '2026-12-01')).toBe('30 Tage')
    expect(durationLabel('2026-11-02', '2026-11-08')).toBe('1 Woche')
    expect(durationLabel('2026-11-02', '2026-11-22')).toBe('3 Wochen')
    expect(durationLabel('2026-11-02', '2026-11-02')).toBe('1 Tag')
  })

  test('challengeTiming', () => {
    expect(challengeTiming('2026-11-02', '2026-12-01', '2026-10-23')).toBe('startet Mo, 2. Nov.')
    expect(challengeTiming('2026-10-19', '2026-11-08', '2026-10-23')).toBe('läuft bis So, 8. Nov.')
    expect(challengeTiming('2026-10-01', '2026-10-10', '2026-10-23')).toBe('vorbei')
    expect(challengeTiming('2026-10-23', '2026-10-30', '2026-10-23')).toBe('läuft bis Fr, 30. Okt.')
  })

  test('meetupDateBox in Berliner Zeit', () => {
    expect(meetupDateBox('2026-10-31T13:00:00Z')).toEqual({
      day: '31',
      month: 'Okt',
      weekday: 'Sa',
      time: '14:00',
      long: 'Sa, 31. Okt. · 14:00',
    })
  })
})

describe('Zahlen', () => {
  test('peopleCountLabel', () => {
    expect(peopleCountLabel(1, 'challenge')).toBe('1 dabei')
    expect(peopleCountLabel(4, 'challenge')).toBe('4 dabei')
    expect(peopleCountLabel(1, 'meetup')).toBe('1 kommt')
    expect(peopleCountLabel(3, 'meetup')).toBe('3 kommen')
  })

  test('spotsLabel', () => {
    expect(spotsLabel(3, null)).toBeNull()
    expect(spotsLabel(3, 7)).toBe('noch 4 Plätze')
    expect(spotsLabel(6, 7)).toBe('noch 1 Platz')
    expect(spotsLabel(7, 7)).toBe('ausgebucht')
  })
})

describe('parseChallengeForm', () => {
  const TODAY = '2026-10-23'
  const base = {
    title: '30 Tage, jeden Tag 15 Minuten',
    description: '',
    area: 'rhythmik',
    starts_on: '2026-11-02',
    duration_days: '30',
    ends_on: '',
    max_members: '',
    whatsapp_url: '',
  }

  test('Dauer ergibt das Ende (Starttag zählt mit)', () => {
    const r = parseChallengeForm(base, TODAY)
    expect(r).toEqual({
      ok: true,
      value: {
        title: '30 Tage, jeden Tag 15 Minuten',
        description: null,
        area: 'rhythmik',
        starts_on: '2026-11-02',
        ends_on: '2026-12-01',
        max_members: null,
        whatsapp_url: null,
      },
    })
  })

  test('eigenes Ende geht vor', () => {
    const r = parseChallengeForm({ ...base, ends_on: '2026-12-21' }, TODAY)
    expect(r.ok && r.value.ends_on).toBe('2026-12-21')
  })

  test('Fehler', () => {
    expect(parseChallengeForm({ ...base, title: ' ' }, TODAY)).toEqual({ ok: false, error: 'title_missing' })
    expect(parseChallengeForm({ ...base, title: 'x'.repeat(121) }, TODAY)).toEqual({ ok: false, error: 'title_long' })
    expect(parseChallengeForm({ ...base, area: 'jazz' }, TODAY)).toEqual({ ok: false, error: 'area_invalid' })
    expect(parseChallengeForm({ ...base, starts_on: '2026-02-30' }, TODAY)).toEqual({ ok: false, error: 'date_invalid' })
    expect(parseChallengeForm({ ...base, starts_on: '2026-10-01' }, TODAY)).toEqual({ ok: false, error: 'date_past' })
    expect(parseChallengeForm({ ...base, duration_days: '5' }, TODAY)).toEqual({ ok: false, error: 'duration_invalid' })
    expect(parseChallengeForm({ ...base, ends_on: '2026-11-01' }, TODAY)).toEqual({ ok: false, error: 'end_before_start' })
    expect(parseChallengeForm({ ...base, ends_on: '2028-01-01' }, TODAY)).toEqual({ ok: false, error: 'range_long' })
    expect(parseChallengeForm({ ...base, max_members: '1' }, TODAY)).toEqual({ ok: false, error: 'max_invalid' })
    expect(parseChallengeForm({ ...base, max_members: 'viele' }, TODAY)).toEqual({ ok: false, error: 'max_invalid' })
    expect(parseChallengeForm({ ...base, whatsapp_url: 'https://example.com' }, TODAY)).toEqual({
      ok: false,
      error: 'whatsapp_invalid',
    })
    expect(parseChallengeForm({ ...base, description: 'x'.repeat(1001) }, TODAY)).toEqual({
      ok: false,
      error: 'description_long',
    })
  })

  test('beim Bearbeiten darf der Start schon vorbei sein', () => {
    const r = parseChallengeForm({ ...base, starts_on: '2026-10-19', duration_days: '21' }, TODAY, {
      allowPastStart: true,
    })
    expect(r.ok && r.value.ends_on).toBe('2026-11-08')
  })

  test('Platzzahl und Link', () => {
    const r = parseChallengeForm(
      { ...base, max_members: '8', whatsapp_url: 'https://chat.whatsapp.com/AbCdEf123456?x=1' },
      TODAY,
    )
    expect(r.ok && r.value.max_members).toBe(8)
    expect(r.ok && r.value.whatsapp_url).toBe('https://chat.whatsapp.com/AbCdEf123456')
  })
})

describe('parseMeetupForm', () => {
  const NOW = new Date('2026-10-23T10:00:00Z')
  const base = {
    title: 'Spielen im Englischen Garten',
    description: '',
    region: 'München',
    place_hint: 'am Monopteros',
    exact_place: '',
    date: '2026-10-31',
    time: '14:00',
    max_people: '',
    online: false,
  }

  test('Berliner Zeit wird UTC', () => {
    const r = parseMeetupForm(base, NOW)
    expect(r).toEqual({
      ok: true,
      value: {
        title: 'Spielen im Englischen Garten',
        description: null,
        region: 'München',
        place_hint: 'am Monopteros',
        exact_place: null,
        starts_at: '2026-10-31T13:00:00.000Z',
        max_people: null,
        online: false,
      },
    })
  })

  test('Fehler', () => {
    expect(parseMeetupForm({ ...base, date: '2026-10-20' }, NOW)).toEqual({ ok: false, error: 'date_past' })
    expect(parseMeetupForm({ ...base, time: '25:00' }, NOW)).toEqual({ ok: false, error: 'time_invalid' })
    expect(parseMeetupForm({ ...base, date: '' }, NOW)).toEqual({ ok: false, error: 'date_invalid' })
    expect(parseMeetupForm({ ...base, place_hint: 'x'.repeat(121) }, NOW)).toEqual({ ok: false, error: 'place_long' })
    expect(parseMeetupForm({ ...base, exact_place: 'x'.repeat(301) }, NOW)).toEqual({ ok: false, error: 'place_long' })
    expect(parseMeetupForm({ ...base, max_people: '1' }, NOW)).toEqual({ ok: false, error: 'max_invalid' })
    expect(parseMeetupForm({ ...base, date: '2028-01-01' }, NOW)).toEqual({ ok: false, error: 'date_far' })
  })
})

describe('Fehlermeldungen', () => {
  test('Code aus der Datenbank wird erkannt', () => {
    expect(errorCodeFrom({ message: 'too_many_open' })).toBe('too_many_open')
    expect(errorCodeFrom({ message: 'duplicate key value violates unique constraint' })).toBe('unknown')
    expect(errorCodeFrom(null)).toBe('unknown')
  })

  test('alle Codes aus 0013 haben einen Text', () => {
    const sql = readFileSync(join(import.meta.dir, '../supabase/migrations/0013_miteinander.sql'), 'utf8')
    const codes = [...sql.matchAll(/raise exception '([a-z_]+)'/g)].map((m) => m[1])
    expect(codes.length).toBeGreaterThan(10)
    for (const code of new Set(codes)) {
      expect(errorCodeFrom({ message: code })).toBe(code as never)
    }
  })

  test('jede Meldung ist ein Satz, unbekannt hat einen Ersatz', () => {
    expect(messageFor('full')).toMatch(/\.$/)
    expect(messageFor('gibt-es-nicht')).toBe(messageFor('unknown'))
    expect(messageFor(null)).toBeNull()
  })
})
