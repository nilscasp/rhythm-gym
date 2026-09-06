import { describe, expect, test } from 'bun:test'
import { BRAND_COOKIE, BRAND_HEADER, BRAND_META, isBrand, resolveBrand } from '../app/lib/brand'

describe('resolveBrand — Host', () => {
  test('ISC-2: app.handpan.schule ohne Cookie → schule', () => {
    expect(resolveBrand('app.handpan.schule', undefined)).toBe('schule')
  })
  test('ISC-3: www.rhythmgym.io ohne Cookie → gym', () => {
    expect(resolveBrand('www.rhythmgym.io', undefined)).toBe('gym')
  })
  test('jede handpan.schule-Adresse zählt, auch mit Port', () => {
    expect(resolveBrand('handpan.schule', null)).toBe('schule')
    expect(resolveBrand('app.handpan.schule:3000', null)).toBe('schule')
    expect(resolveBrand('APP.HANDPAN.SCHULE', null)).toBe('schule')
  })
  test('fehlender Host fällt auf gym zurück', () => {
    expect(resolveBrand(null, null)).toBe('gym')
    expect(resolveBrand(undefined, undefined)).toBe('gym')
    expect(resolveBrand('', '')).toBe('gym')
  })
})

describe('resolveBrand — Cookie nur auf unbekannten Hosts', () => {
  test('ISC-4: localhost + Cookie schule → schule', () => {
    expect(resolveBrand('localhost:3000', 'schule')).toBe('schule')
  })
  test('Vercel-Preview + Cookie schule → schule', () => {
    expect(resolveBrand('rhythm-gym-git-main.vercel.app', 'schule')).toBe('schule')
  })
  test('ISC-5 (refined): Produktions-Host schlägt das Cookie', () => {
    expect(resolveBrand('app.handpan.schule', 'gym')).toBe('schule')
    expect(resolveBrand('www.rhythmgym.io', 'schule')).toBe('gym')
  })
  test('ungültiges Cookie wird ignoriert, dann entscheidet der Host', () => {
    expect(resolveBrand('app.handpan.schule', 'kaputt')).toBe('schule')
    expect(resolveBrand('localhost:3000', 'SCHULE')).toBe('gym')
    expect(resolveBrand('localhost:3000', 'kaputt')).toBe('gym')
  })
})

describe('isBrand', () => {
  test('erkennt nur die beiden Marken', () => {
    expect(isBrand('gym')).toBe(true)
    expect(isBrand('schule')).toBe(true)
    expect(isBrand('Gym')).toBe(false)
    expect(isBrand(null)).toBe(false)
    expect(isBrand(undefined)).toBe(false)
  })
})

describe('Konstanten & Meta', () => {
  test('Header- und Cookie-Namen sind stabil', () => {
    expect(BRAND_HEADER).toBe('x-brand')
    expect(BRAND_COOKIE).toBe('brand')
  })
  test('ISC-29: Titel und Wortmarke je Marke', () => {
    expect(BRAND_META.gym.title).toBe('Rhythm Gym — Train Your Rhythm')
    expect(BRAND_META.schule.title).toBe('Handpan Schule des Lebens')
    expect(BRAND_META.gym.wordmark).toBe('RHYTHMGYM')
    expect(BRAND_META.schule.wordmark).toBe('Handpan Schule des Lebens')
  })
  test('ISC-28: Schul-Beschreibung ohne Marketing-Anglizismen', () => {
    for (const wort of ['Premium', 'User', 'Plan', 'Module', 'Subscriber', 'Customer']) {
      expect(BRAND_META.schule.description).not.toContain(wort)
    }
  })
})
