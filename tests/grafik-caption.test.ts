import { describe, expect, test } from 'bun:test'
import { grafikCaption } from '../app/training/rhythmusfundament/_components/grafik-caption'

describe('grafikCaption', () => {
  test('Übung mit Buchstabe und Titel', () => {
    expect(grafikCaption('/x/overview_tag21_uebung_b_vier_mal_zwei.png')).toBe('Übung B · Vier mal Zwei')
  })
  test('Teil mit Nummer, Versionssuffix fällt weg', () => {
    expect(grafikCaption('overview_tag26_teil_1_v1.png')).toBe('Teil 1')
  })
  test('Titel ohne Kopf, Umlaute aus ae/oe/ue', () => {
    expect(grafikCaption('overview_tag13_vom_zaehlen_zum_fuellen.png')).toBe('Vom Zählen zum Füllen')
    expect(grafikCaption('moeglichkeitsraum_wirklich.png')).toBe('Möglichkeitsraum wirklich')
  })
  test('ue nach e bleibt (neue)', () => {
    expect(grafikCaption('overview_tag99_der_neue_bogen.png')).toBe('Der neue Bogen')
  })
  test('Dateien ohne Präfix', () => {
    expect(grafikCaption('tag23_tonleiter_wandern.png')).toBe('Tonleiter wandern')
  })
})
