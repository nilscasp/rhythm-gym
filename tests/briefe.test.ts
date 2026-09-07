import { describe, expect, test } from 'bun:test'
import {
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  checkRateLimit,
  createRateLimitBucket,
  isHoneypotClean,
  isValidEmail,
  normalizeSource,
} from '../app/lib/briefe'

describe('isValidEmail', () => {
  test('akzeptiert normale Adressen', () => {
    expect(isValidEmail('nils@handpan.schule')).toBe(true)
    expect(isValidEmail('a.b-c+tag@sub.example.co.uk')).toBe(true)
    expect(isValidEmail('  nils@handpan.schule  ')).toBe(true)
  })
  test('lehnt Unfug ab', () => {
    expect(isValidEmail('nils')).toBe(false)
    expect(isValidEmail('nils@')).toBe(false)
    expect(isValidEmail('@handpan.schule')).toBe(false)
    expect(isValidEmail('nils@handpan')).toBe(false)
    expect(isValidEmail('nils @handpan.schule')).toBe(false)
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail(undefined)).toBe(false)
    expect(isValidEmail(null)).toBe(false)
    expect(isValidEmail(42)).toBe(false)
  })
  test('lehnt absurd lange Adressen ab', () => {
    expect(isValidEmail(`${'a'.repeat(320)}@example.com`)).toBe(false)
  })
  test('lehnt Zeilenumbrüche ab (Header-Injection)', () => {
    expect(isValidEmail('nils@handpan.schule\nbcc: x@y.de')).toBe(false)
  })
})

describe('isHoneypotClean', () => {
  test('leer, fehlend oder nur Leerzeichen ist sauber', () => {
    expect(isHoneypotClean('')).toBe(true)
    expect(isHoneypotClean(undefined)).toBe(true)
    expect(isHoneypotClean(null)).toBe(true)
    expect(isHoneypotClean('   ')).toBe(true)
  })
  test('ausgefülltes Feld ist ein Bot', () => {
    expect(isHoneypotClean('https://spam.example')).toBe(false)
    expect(isHoneypotClean(1)).toBe(false)
  })
})

describe('normalizeSource', () => {
  test('gültige Slugs bleiben', () => {
    expect(normalizeSource('tag1')).toBe('tag1')
    expect(normalizeSource('landing-schule')).toBe('landing-schule')
  })
  test('Großschreibung und Whitespace werden gebändigt', () => {
    expect(normalizeSource('  Tag1  ')).toBe('tag1')
    expect(normalizeSource('Landing Schule')).toBe('landing-schule')
  })
  test('Unbrauchbares fällt auf landing zurück', () => {
    expect(normalizeSource(undefined)).toBe('landing')
    expect(normalizeSource('')).toBe('landing')
    expect(normalizeSource('!!!')).toBe('landing')
    expect(normalizeSource(7)).toBe('landing')
  })
  test('kürzt auf 32 Zeichen', () => {
    expect(normalizeSource('a'.repeat(80))).toHaveLength(32)
  })
})

describe('checkRateLimit', () => {
  test(`lässt ${RATE_LIMIT_MAX} Versuche durch, blockt den nächsten`, () => {
    const bucket = createRateLimitBucket()
    const now = 1_000_000
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      expect(checkRateLimit(bucket, '1.2.3.4', now + i).allowed).toBe(true)
    }
    expect(checkRateLimit(bucket, '1.2.3.4', now + RATE_LIMIT_MAX).allowed).toBe(false)
  })

  test('nach dem Fenster ist wieder frei', () => {
    const bucket = createRateLimitBucket()
    const now = 1_000_000
    for (let i = 0; i < RATE_LIMIT_MAX; i++) checkRateLimit(bucket, '1.2.3.4', now)
    expect(checkRateLimit(bucket, '1.2.3.4', now).allowed).toBe(false)
    expect(
      checkRateLimit(bucket, '1.2.3.4', now + RATE_LIMIT_WINDOW_MS + 1).allowed
    ).toBe(true)
  })

  test('zählt pro IP getrennt', () => {
    const bucket = createRateLimitBucket()
    const now = 1_000_000
    for (let i = 0; i < RATE_LIMIT_MAX; i++) checkRateLimit(bucket, '1.2.3.4', now)
    expect(checkRateLimit(bucket, '1.2.3.4', now).allowed).toBe(false)
    expect(checkRateLimit(bucket, '5.6.7.8', now).allowed).toBe(true)
  })

  test('räumt alte IPs auf, statt unbegrenzt zu wachsen', () => {
    const bucket = createRateLimitBucket()
    checkRateLimit(bucket, 'alt', 1_000)
    checkRateLimit(bucket, 'neu', 1_000 + RATE_LIMIT_WINDOW_MS + 1)
    expect(bucket.has('alt')).toBe(false)
    expect(bucket.has('neu')).toBe(true)
  })
})
