import { describe, expect, test } from 'bun:test'
import { loginNextFor, safeLoginNext } from '../app/lib/login-next'

describe('Rückkehr nach dem Login', () => {
  test('nur Ziele aus der festen Liste', () => {
    expect(safeLoginNext('/mitgliedschaft')).toBe('/mitgliedschaft')
    expect(safeLoginNext('//evil.example')).toBe('/training')
    expect(safeLoginNext('https://evil.example/mitgliedschaft')).toBe('/training')
    expect(safeLoginNext('/mitgliedschaft/../coach')).toBe('/training')
    expect(safeLoginNext(null)).toBe('/training')
  })

  test('Auth-Schleuse: Mitgliedschaft und Unterseiten führen über den Login zurück', () => {
    expect(loginNextFor('/mitgliedschaft')).toBe('/mitgliedschaft')
    expect(loginNextFor('/mitgliedschaft/danke')).toBe('/mitgliedschaft')
    expect(loginNextFor('/mitgliedschaftx')).toBeNull()
    expect(loginNextFor('/training')).toBeNull()
  })
})
