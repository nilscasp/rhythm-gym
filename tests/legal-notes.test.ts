import { describe, expect, test } from 'bun:test'
import { PURCHASE_NOTE, purchaseNoteSegments } from '../app/lib/legal-notes'

describe('PURCHASE_NOTE', () => {
  test('nennt AGB und Datenschutz als Linkwörter', () => {
    expect(PURCHASE_NOTE.text).toContain(PURCHASE_NOTE.links.agb.word)
    expect(PURCHASE_NOTE.text).toContain(PURCHASE_NOTE.links.datenschutz.word)
  })

  test('Linkziele', () => {
    expect(PURCHASE_NOTE.links.agb.href).toBe('/agb')
    expect(PURCHASE_NOTE.links.datenschutz.href).toBe('/datenschutz')
  })

  test('höchstens zwei Zeilen — kurz gehalten', () => {
    expect(PURCHASE_NOTE.text.length).toBeLessThanOrEqual(240)
  })

  test('kein Tabu-Wort „Premium“', () => {
    expect(PURCHASE_NOTE.text.toLowerCase()).not.toContain('premium')
  })
})

describe('purchaseNoteSegments', () => {
  test('Segmente ergeben zusammen genau den Text', () => {
    const joined = purchaseNoteSegments().map((s) => s.text).join('')
    expect(joined).toBe(PURCHASE_NOTE.text)
  })

  test('genau zwei Links in Textreihenfolge', () => {
    const links = purchaseNoteSegments().filter((s) => s.href)
    expect(links.map((s) => s.href)).toEqual(['/agb', '/datenschutz'])
  })

  test('fehlt ein Linkwort, bleibt es reiner Text', () => {
    const segs = purchaseNoteSegments('Nur Text ohne Links.')
    expect(segs).toEqual([{ text: 'Nur Text ohne Links.' }])
  })
})
