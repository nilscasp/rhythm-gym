import { describe, expect, test } from 'bun:test'
import {
  DEFAULT_LOCALE,
  isLocale,
  localizeHref,
  preferredLocale,
  resolveLocale,
  splitLocalePath,
  switchLocaleHref,
} from '../app/lib/locale'

describe('splitLocalePath', () => {
  test('trennt ein bekanntes Präfix ab', () => {
    expect(splitLocalePath('/en/termine')).toEqual({ locale: 'en', pathname: '/termine' })
  })

  test('nacktes Präfix wird zur Wurzel', () => {
    expect(splitLocalePath('/en')).toEqual({ locale: 'en', pathname: '/' })
  })

  test('Deutsch hat kein Präfix', () => {
    expect(splitLocalePath('/termine')).toEqual({ locale: null, pathname: '/termine' })
  })

  test('unbekannte Sprachen bleiben Teil des Pfads', () => {
    expect(splitLocalePath('/fr/termine')).toEqual({ locale: null, pathname: '/fr/termine' })
  })

  test('greift nicht in einen längeren Abschnitt hinein', () => {
    // /english-notes darf nicht als Sprache „en" gelesen werden
    expect(splitLocalePath('/english-notes')).toEqual({
      locale: null,
      pathname: '/english-notes',
    })
  })
})

describe('preferredLocale', () => {
  test('nimmt die erste unterstützte Sprache', () => {
    expect(preferredLocale('en-GB,en;q=0.9')).toBe('en')
  })

  test('achtet auf die Gewichtung', () => {
    expect(preferredLocale('fr;q=0.9,en;q=0.8,de;q=1.0')).toBe('de')
  })

  test('überspringt nicht unterstützte Sprachen', () => {
    expect(preferredLocale('ja,zh;q=0.8')).toBe('de')
  })

  test('ohne Header bleibt es bei Deutsch', () => {
    expect(preferredLocale(null)).toBe(DEFAULT_LOCALE)
    expect(preferredLocale('')).toBe(DEFAULT_LOCALE)
  })

  test('ignoriert Einträge mit Gewicht null', () => {
    expect(preferredLocale('en;q=0')).toBe('de')
  })
})

describe('resolveLocale', () => {
  test('die Adresse schlägt den Browserwunsch', () => {
    const result = resolveLocale('/en/termine', 'de-DE,de;q=0.9')
    expect(result).toEqual({ locale: 'en', pathname: '/termine', fromPath: true })
  })

  test('ohne Präfix entscheidet der Browser', () => {
    const result = resolveLocale('/termine', 'en-US,en;q=0.9')
    expect(result).toEqual({ locale: 'en', pathname: '/termine', fromPath: false })
  })

  test('ohne alles bleibt Deutsch', () => {
    expect(resolveLocale('/termine', null).locale).toBe('de')
  })
})

describe('localizeHref', () => {
  test('Deutsch bleibt unverändert', () => {
    expect(localizeHref('/termine', 'de')).toBe('/termine')
  })

  test('Englisch bekommt das Präfix', () => {
    expect(localizeHref('/termine', 'en')).toBe('/en/termine')
    expect(localizeHref('/', 'en')).toBe('/en')
  })

  test('doppelt kein Präfix', () => {
    expect(localizeHref('/en/termine', 'en')).toBe('/en/termine')
  })

  test('externe Adressen und Anker bleiben unberührt', () => {
    expect(localizeHref('https://handpan.schule/', 'en')).toBe('https://handpan.schule/')
    expect(localizeHref('#briefe', 'en')).toBe('#briefe')
    expect(localizeHref('//example.org/x', 'en')).toBe('//example.org/x')
  })
})

describe('switchLocaleHref', () => {
  test('wechselt in beide Richtungen auf derselben Seite', () => {
    expect(switchLocaleHref('/termine', 'en')).toBe('/en/termine')
    expect(switchLocaleHref('/en/termine', 'de')).toBe('/termine')
    expect(switchLocaleHref('/en', 'de')).toBe('/')
    expect(switchLocaleHref('/', 'en')).toBe('/en')
  })
})

describe('isLocale', () => {
  test('erkennt nur die zwei Startsprachen', () => {
    expect(isLocale('de')).toBe(true)
    expect(isLocale('en')).toBe(true)
    expect(isLocale('fr')).toBe(false)
    expect(isLocale(null)).toBe(false)
  })
})
