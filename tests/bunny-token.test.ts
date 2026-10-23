import { describe, expect, test } from 'bun:test'
import {
  BUNNY_TOKEN_TTL_SECONDS,
  bunnyEmbedUrl,
  signBunnyEmbed,
} from '../app/lib/bunny-token'

// Vektor unabhängig mit der Shell berechnet:
//   printf '%s' 'test-key-123' '0f1e2d3c-aaaa-bbbb-cccc-1234567890ab' '1767225600' | shasum -a 256
const KEY = 'test-key-123'
const VIDEO = '0f1e2d3c-aaaa-bbbb-cccc-1234567890ab'
const EXPIRES = 1767225600
const EXPECTED = '4632f8c91b6d536ce778e5a42d55e89ee9e5b87206e465b08fcced4135d45c53'

describe('signBunnyEmbed', () => {
  test('sha256_hex(tokenKey + videoId + expires) — bekannter Vektor', () => {
    expect(signBunnyEmbed(VIDEO, EXPIRES, KEY)).toBe(EXPECTED)
  })

  test('anderes Ablaufdatum ergibt anderen Token', () => {
    expect(signBunnyEmbed(VIDEO, EXPIRES + 1, KEY)).not.toBe(EXPECTED)
  })

  test('Ablauf muss eine ganze Zahl sein', () => {
    expect(() => signBunnyEmbed(VIDEO, 1.5, KEY)).toThrow()
  })

  test('leerer Schlüssel wird abgelehnt', () => {
    expect(() => signBunnyEmbed(VIDEO, EXPIRES, '')).toThrow()
  })
})

describe('bunnyEmbedUrl', () => {
  const base = { libraryId: '670773', videoId: VIDEO }

  test('ohne Schlüssel: unsignierte URL wie bisher', () => {
    const url = new URL(bunnyEmbedUrl({ ...base, tokenKey: undefined }))
    expect(url.origin + url.pathname).toBe(
      `https://iframe.mediadelivery.net/embed/670773/${VIDEO}`,
    )
    expect(url.searchParams.get('token')).toBeNull()
    expect(url.searchParams.get('expires')).toBeNull()
    expect(url.searchParams.get('showSpeed')).toBe('true')
    expect(url.searchParams.get('autoplay')).toBe('false')
  })

  test('mit Schlüssel: token + expires (jetzt + 6 h)', () => {
    const nowSeconds = EXPIRES - BUNNY_TOKEN_TTL_SECONDS
    const url = new URL(bunnyEmbedUrl({ ...base, tokenKey: KEY, nowSeconds }))
    expect(url.searchParams.get('expires')).toBe(String(EXPIRES))
    expect(url.searchParams.get('token')).toBe(EXPECTED)
    expect(url.searchParams.get('showSpeed')).toBe('true')
  })

  test('Gültigkeit 6 Stunden', () => {
    expect(BUNNY_TOKEN_TTL_SECONDS).toBe(6 * 60 * 60)
  })

  test('Bruchteile der aktuellen Zeit werden abgerundet', () => {
    const nowSeconds = EXPIRES - BUNNY_TOKEN_TTL_SECONDS + 0.9
    const url = new URL(bunnyEmbedUrl({ ...base, tokenKey: KEY, nowSeconds }))
    expect(url.searchParams.get('expires')).toBe(String(EXPIRES))
  })

  test('Video-ID wird URL-kodiert', () => {
    const url = bunnyEmbedUrl({ libraryId: '670773', videoId: 'a/b', tokenKey: undefined })
    expect(url).toContain('/embed/670773/a%2Fb?')
  })
})
