import { describe, expect, test } from 'bun:test'
import {
  backPath,
  connectionWith,
  countBy,
  firstName,
  ilikeTerm,
  insertErrorCode,
  isFuture,
  isUuid,
  matchesRegion,
  withParam,
  type ConnectionRow,
} from '../app/lib/miteinander-view'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'

describe('isUuid', () => {
  test('erkennt UUIDs', () => {
    expect(isUuid(A)).toBe(true)
    expect(isUuid(A.toUpperCase())).toBe(true)
  })
  test('lehnt anderes ab', () => {
    expect(isUuid('neu')).toBe(false)
    expect(isUuid('')).toBe(false)
    expect(isUuid(null)).toBe(false)
    expect(isUuid(`${A}x`)).toBe(false)
  })
})

describe('withParam', () => {
  test('hängt den Parameter an', () => {
    expect(withParam('/miteinander', 'fehler', 'full')).toBe('/miteinander?fehler=full')
  })
  test('setzt ihn vor die Sprungmarke', () => {
    expect(withParam('/mein-weg#anfragen', 'fehler', 'not_found')).toBe('/mein-weg?fehler=not_found#anfragen')
  })
  test('ersetzt vorhandene Parameter', () => {
    expect(withParam('/mein-weg?fehler=x#kontakt', 'gespeichert', '1')).toBe('/mein-weg?gespeichert=1#kontakt')
  })
})

describe('backPath', () => {
  test('erlaubt Mein Weg und Miteinander', () => {
    expect(backPath('/mein-weg#anfragen', '/x')).toBe('/mein-weg#anfragen')
    expect(backPath(`/miteinander/mensch/${A}`, '/x')).toBe(`/miteinander/mensch/${A}`)
    expect(backPath('/miteinander', '/x')).toBe('/miteinander')
  })
  test('weist fremde Ziele ab', () => {
    expect(backPath('https://evil.example', '/mein-weg')).toBe('/mein-weg')
    expect(backPath('//evil.example/mein-weg', '/mein-weg')).toBe('/mein-weg')
    expect(backPath('/coach', '/mein-weg')).toBe('/mein-weg')
    expect(backPath('/mein-weg?x=1', '/mein-weg')).toBe('/mein-weg')
    expect(backPath('/miteinander/../coach', '/mein-weg')).toBe('/mein-weg')
    expect(backPath(null, '/mein-weg')).toBe('/mein-weg')
  })
})

describe('insertErrorCode', () => {
  test('bildet too_many_open je Art ab', () => {
    expect(insertErrorCode({ message: 'too_many_open' }, 'challenge')).toBe('too_many_challenges')
    expect(insertErrorCode({ message: 'too_many_open' }, 'meetup')).toBe('too_many_meetups')
  })
  test('lässt andere Codes durch', () => {
    expect(insertErrorCode({ message: 'blocked' }, 'challenge')).toBe('blocked')
    expect(insertErrorCode({ message: 'closed_by_admin' }, 'meetup')).toBe('closed_by_admin')
  })
  test('Unbekanntes wird unknown', () => {
    expect(insertErrorCode({ message: 'new row violates row-level security policy' }, 'meetup')).toBe('unknown')
    expect(insertErrorCode(null, 'meetup')).toBe('unknown')
  })
})

function row(partial: Partial<ConnectionRow>): ConnectionRow {
  return {
    id: 'r1',
    direction: 'out',
    other_user: B,
    other_name: 'Bea',
    message: 'Hallo',
    status: 'pending',
    created_at: '2026-10-01T10:00:00Z',
    answered_at: null,
    ...partial,
  }
}

describe('connectionWith', () => {
  test('ohne Zeilen: keine Verbindung', () => {
    expect(connectionWith([], B)).toEqual({ state: 'none', requestId: null, message: null })
  })
  test('nur Zeilen zu anderen Personen zählen nicht', () => {
    expect(connectionWith([row({ other_user: A })], B).state).toBe('none')
  })
  test('eigene offene Anfrage', () => {
    expect(connectionWith([row({ id: 'p' })], B)).toEqual({ state: 'pending_out', requestId: 'p', message: 'Hallo' })
  })
  test('offene Anfrage an mich', () => {
    expect(connectionWith([row({ id: 'q', direction: 'in', message: 'Hi' })], B)).toEqual({
      state: 'pending_in',
      requestId: 'q',
      message: 'Hi',
    })
  })
  test('angenommen geht vor allem anderen', () => {
    const rows = [row({ id: 'old', status: 'declined' }), row({ id: 'ok', status: 'accepted', direction: 'in' })]
    expect(connectionWith(rows, B)).toEqual({ state: 'connected', requestId: 'ok', message: null })
  })
  test('abgelehnt oder zurückgezogen: wieder offen für eine Anfrage', () => {
    expect(connectionWith([row({ status: 'declined' })], B).state).toBe('none')
    expect(connectionWith([row({ status: 'withdrawn' })], B).state).toBe('none')
  })
})

describe('countBy', () => {
  test('zählt je Schlüssel', () => {
    const m = countBy([{ k: 'a' }, { k: 'b' }, { k: 'a' }], (r) => r.k)
    expect(m.get('a')).toBe(2)
    expect(m.get('b')).toBe(1)
    expect(m.get('c')).toBeUndefined()
  })
})

describe('matchesRegion', () => {
  test('leer passt immer', () => {
    expect(matchesRegion(null, '')).toBe(true)
    expect(matchesRegion('Raum München', '  ')).toBe(true)
  })
  test('Teilstring ohne Groß/klein', () => {
    expect(matchesRegion('Raum München', 'münch')).toBe(true)
    expect(matchesRegion('Raum München', 'Berlin')).toBe(false)
    expect(matchesRegion(null, 'Berlin')).toBe(false)
  })
})

describe('ilikeTerm', () => {
  test('Platzhalter werden Text', () => {
    expect(ilikeTerm('a_b%c')).toBe('a\\_b\\%c')
  })
  test('Zeichen, die einen PostgREST-or-Filter sprengen, fallen weg', () => {
    expect(ilikeTerm('anna,(x).y')).toBe('annax.y')
    expect(ilikeTerm('  lisa  ')).toBe('lisa')
  })
  test('kürzt lange Eingaben', () => {
    expect(ilikeTerm('x'.repeat(200)).length).toBe(80)
  })
})

describe('isFuture', () => {
  test('vorher und nachher', () => {
    const now = new Date('2026-10-23T10:00:00Z')
    expect(isFuture('2026-10-23T10:00:01Z', now)).toBe(true)
    expect(isFuture('2026-10-23T09:59:59Z', now)).toBe(false)
  })
})

describe('firstName', () => {
  test('erster Teil des Namens', () => {
    expect(firstName('Anna Maria Muster')).toBe('Anna')
    expect(firstName('  Lisa ')).toBe('Lisa')
  })
  test('leer', () => {
    expect(firstName(null)).toBe('')
    expect(firstName('')).toBe('')
  })
})
