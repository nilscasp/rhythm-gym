import { describe, expect, test } from 'bun:test'
import { checkTab, errorCodeFrom, messageFor, metaOf } from '../app/lib/lieder'
import { activeSchuleNav } from '../app/lib/schule-nav'
import { gridToString, index, parseGrid, parseSong, songToSource, type SongSource } from '../app/lib/lieder/model'

const tab: SongSource = {
  id: 'x',
  title: 'Abendlied',
  artist: '',
  difficulty: 'Leicht',
  handpan: 'd-kurd-9',
  bpm: 66,
  beats: 3,
  sub: 2,
  sections: [{ name: 'Strophe', measures: [{ R: '5 . . . 3 .', L: '. . 4 . . .' }] }],
}

describe('checkTab', () => {
  test('nimmt einen gültigen Tab an und schreibt ihn neu aus', () => {
    const r = checkTab(tab)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.source.sections[0].measures[0].R).toBe('5 . . . 3 .')
  })
  test('weist Notepan-Importe zum Ausprobieren ab', () => {
    expect(checkTab({ ...tab, privat: true })).toEqual({ ok: false, error: 'privat_song' })
  })
  test('weist Unsinn ab', () => {
    expect(checkTab(null)).toEqual({ ok: false, error: 'invalid_data' })
    expect(checkTab({ title: 'x' })).toEqual({ ok: false, error: 'invalid_data' })
  })
})

describe('Fehler und Kennzahlen', () => {
  test('Code aus der Datenbankmeldung', () => {
    expect(errorCodeFrom({ message: 'too_many_pending' })).toBe('too_many_pending')
    expect(errorCodeFrom({ message: 'irgendwas' })).toBe('unknown')
    expect(messageFor('not_member')).toContain('Mitgliedschaft')
  })
  test('metaOf liest Handpan, Tempo und Takte', () => {
    const m = metaOf(parseSong(tab))
    expect(m).toMatchObject({ handpan: 'D Kurd 9', bpm: 66, measures: 1, difficulty: 'Leicht' })
  })
})

describe('Modell', () => {
  test('Raster-Rundreise', () => {
    for (const g of ['4 4 4:3 4', '4 3 6 4', '4 4 4 4 4']) expect(gridToString(parseGrid(g))).toBe(g)
  })
  test('Tempowechsel in der Zeitachse', () => {
    const s = parseSong({ ...tab, beats: 4, sub: 1, bpm: 60, tempos: [{ measure: 0, beat: 0, bpm: 60 }, { measure: 1, beat: 0, bpm: 120 }], sections: [{ name: 'A', measures: [{ R: '1 . . .', L: '' }, { R: '1 . . .', L: '' }] }] })
    expect(index(s).sec[8]).toBeCloseTo(6)
    expect(parseSong(songToSource(s)).measures).toEqual(s.measures)
  })
})

test('/lieder gehört in der Navigation zu „Üben“', () => {
  expect(activeSchuleNav('/lieder')).toBe('ueben')
  expect(activeSchuleNav('/lieder/abc')).toBe('ueben')
})

describe('Grenzen gegen überlange Tabs', () => {
  test('zu viele Wiederholungen oder Takte werden abgewiesen', () => {
    expect(checkTab({ ...tab, sections: [{ name: 'A', repeat: 100000, measures: tab.sections[0].measures }] })).toEqual({ ok: false, error: 'invalid_data' })
    expect(checkTab({ ...tab, beats: 1e6 })).toEqual({ ok: false, error: 'invalid_data' })
    expect(checkTab({ ...tab, sections: [{ name: 'A', measures: [{ R: '', L: '', grid: '999999' }] }] })).toEqual({ ok: false, error: 'invalid_data' })
  })
  test('Fehlercode „changed“ hat einen Text', () => {
    expect(messageFor('changed')).toContain('geändert')
  })
})
