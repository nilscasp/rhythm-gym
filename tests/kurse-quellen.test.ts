import { describe, expect, test } from 'bun:test'
import {
  elementHeadingFor,
  isAppleDouble,
  lessonKey,
  parseDuration,
  parseElementeTexte,
  parseKompassLesson,
  parseKompassOverview,
  parseKreativTexte,
  parseLandkarte,
  parseVaaTexte,
  restoreUmlauts,
  sessionTitle,
  titleFromFilename,
  titleMatchesFile,
} from '../scripts/lib/kurse-quellen'

describe('isAppleDouble', () => {
  test('._-Dateien, auch mit Pfad', () => {
    expect(isAppleDouble('._hk-l01-skool.md')).toBe(true)
    expect(isAppleDouble('/Volumes/x/Handpan Kompass/._hk-l01.mp4')).toBe(true)
    expect(isAppleDouble('hk-l01-skool.md')).toBe(false)
    expect(isAppleDouble('a._b.md')).toBe(false)
  })
})

describe('lessonKey', () => {
  test('Kompass hk-lNN → lNN', () => {
    expect(lessonKey('handpan-kompass', 'hk-l01-nordstern')).toMatchObject({ slug: 'l01', number: 1, sortOrder: 10, rest: 'nordstern' })
    expect(lessonKey('handpan-kompass', 'hk-l15-improvisation-festhalten')?.slug).toBe('l15')
    expect(lessonKey('handpan-kompass', 'hk-uebersicht')).toBeNull()
  })
  test('Kreativ hkr-lNN → lNN', () => {
    expect(lessonKey('handpan-kreativ', 'hkr-l03-reise-in-die-mitte-der-handpan')).toMatchObject({ slug: 'l03', sortOrder: 30 })
  })
  test('VAA behält die Runde', () => {
    expect(lessonKey('von-anfang-an-spielen', 'vaa3-l01-kompositorische-koerper')).toMatchObject({ slug: 'vaa3-l01', round: 3, number: 1, sortOrder: 310 })
    expect(lessonKey('von-anfang-an-spielen', 'vaa4-l03-ein-tonfeld')).toMatchObject({ slug: 'vaa4-l03', sortOrder: 430 })
  })
  test('Elemente: führende Zahl nur Reihenfolge', () => {
    expect(lessonKey('klang-der-elemente', '01-a1-warum-die-elemente')).toMatchObject({ slug: 'a1', letter: 'a', number: 1, sortOrder: 10 })
    expect(lessonKey('klang-der-elemente', '19-h3-stimmen-aus-der-ersten-runde')).toMatchObject({ slug: 'h3', letter: 'h', number: 3, sortOrder: 190 })
  })
})

describe('Titel aus Dateinamen', () => {
  test('Umlaute nur, wo eindeutig', () => {
    expect(restoreUmlauts('aesthetik')).toBe('ästhetik')
    expect(restoreUmlauts('koerper')).toBe('körper')
    expect(restoreUmlauts('tueroeffner')).toBe('türöffner')
    expect(restoreUmlauts('feuer')).toBe('feuer')
    expect(restoreUmlauts('neue')).toBe('neue')
    expect(restoreUmlauts('quelle')).toBe('quelle')
    expect(restoreUmlauts('zuerst')).toBe('zuerst')
    expect(restoreUmlauts('aktuell')).toBe('aktuell')
  })
  test('Bindestriche → Leerzeichen, Großbuchstabe am Anfang', () => {
    expect(titleFromFilename('welche-identitaet-haelt-dich-vom-spielen-ab')).toBe('Welche identität hält dich vom spielen ab')
    expect(titleFromFilename('feuer-waerme-statt-intensitaet')).toBe('Feuer wärme statt intensität')
  })
  test('titleMatchesFile', () => {
    expect(titleMatchesFile('Für wen spielst du? Dein Nordstern', 'nordstern')).toBe(true)
    expect(titleMatchesFile('Feuer I: Wärme statt Intensität', 'feuer-waerme-statt-intensitaet')).toBe(true)
    expect(titleMatchesFile('Wie halte ich fest, was ich improvisiert habe?', 'improvisation-festhalten')).toBe(true)
    expect(titleMatchesFile('Vom Hauptmotiv zur Landschaft', 'freies-spiel')).toBe(false)
  })
  test('parseDuration', () => {
    expect(parseDuration('7:08')).toBe(428)
    expect(parseDuration('1:02:03')).toBe(3723)
    expect(parseDuration('x')).toBeNull()
  })
})

describe('Skool-Texte', () => {
  test('Kompass-Lektion: Titel ohne „Lektion N:“, Modul als Abschnitt, Art als Untertitel', () => {
    const md = '# Lektion 2: Das Rad der Handpan: Wo stehst du gerade?\n\n**Modul 1 · Ausrichten** · Lektion 2 von 15 · Übung\n\nText.\n\n## Kapitel\n\n- **0:00** A\n'
    const p = parseKompassLesson(md)!
    expect(p.title).toBe('Das Rad der Handpan: Wo stehst du gerade?')
    expect(p.section).toEqual({ number: 1, title: 'Modul 1 · Ausrichten' })
    expect(p.subtitle).toBe('Übung')
    expect(p.body.startsWith('Text.')).toBe(true)
    expect(p.body).toContain('## Kapitel')
  })
  test('Kompass-Übersicht → schlichte Beschreibung bis zur ersten Trennlinie', () => {
    const md = '# Dein Weg\n\n🧭 **15 Lektionen**\n\nIm Kompass.\n\n✨ ***Satz.***\n\n━━━━\n\nRest'
    expect(parseKompassOverview(md)).toBe('🧭 15 Lektionen\n\nIm Kompass.\n\n✨ Satz.')
  })
  test('Elemente: Abschnitte und nummerierte Lektionen', () => {
    const md = [
      '# Klang der Elemente', '', 'Vorspann', '', '---', '', '## Auftakt', '', '### 1 · Warum die Elemente', 'A1', '',
      '### 2 · Geschichten', 'A2', '', '---', '', '## Woche 1 · Feuer', '', '### 1 · Feuer I: Wärme', 'F1', '', '---',
    ].join('\n')
    const t = parseElementeTexte(md)
    expect(t.map((x) => [x.sectionHeading, x.index, x.title, x.body])).toEqual([
      ['Auftakt', 1, 'Warum die Elemente', 'A1'],
      ['Auftakt', 2, 'Geschichten', 'A2'],
      ['Woche 1 · Feuer', 1, 'Feuer I: Wärme', 'F1'],
    ])
    const headings = ['Auftakt', 'Woche 1 · Feuer', 'Woche 4 · Luft', 'Ernte']
    expect(elementHeadingFor('a', headings)).toBe('Auftakt')
    expect(elementHeadingFor('f', headings)).toBe('Woche 1 · Feuer')
    expect(elementHeadingFor('l', headings)).toBe('Woche 4 · Luft')
    expect(elementHeadingFor('h', headings)).toBe('Ernte')
    expect(elementHeadingFor('w', headings)).toBeNull()
  })
  test('Kreativ: Lektionen mit Dauer, Nachschau mit Skool-Titel', () => {
    const md = [
      '# Handpan Kreativ', '', '---', '', '## Nachschau · Session 1 · Die Sprache', '', '**Titel in Skool:** Handpan Kreativ · Session 1 · Die Sprache', '', 'N', '', '---', '',
      '## Lektion 2 · In der Spielhaltung ankommen (9:16)', '', '**Titel in Skool:** 2 · In der Spielhaltung ankommen', '', 'L2', '',
    ].join('\n')
    const { lessons, nachschau } = parseKreativTexte(md)
    expect(lessons.get(2)).toEqual({ title: 'In der Spielhaltung ankommen', body: 'L2', durationSeconds: 556 })
    expect(nachschau.get(1)?.title).toBe('Handpan Kreativ · Session 1 · Die Sprache')
    expect(nachschau.get(1)?.body).toBe('N')
  })
  test('VAA: Session · Lektion', () => {
    const md = '# X\n\n---\n\n## Session 3 · Lektion 1 · Kompositorische Körper\n\nK\n\n---\n\n## Session 4 · Lektion 3 · Ein Tonfeld, eine Geschichte\n\nT\n'
    const t = parseVaaTexte(md)
    expect(t.get('3-1')).toEqual({ title: 'Kompositorische Körper', body: 'K' })
    expect(t.get('4-3')?.title).toBe('Ein Tonfeld, eine Geschichte')
  })
})

describe('LANDKARTE', () => {
  const md = [
    '| `vaa1` | VAA | 1 | 2026-09-26 | 1:40:02 | 1280×720 | galerie | Berührung & Exploration | fertig |',
    '| `hk2` | HK | 2 | 2026-07-08 | 1:15:39 | 640×360 | sprecher | Klein anfangen | plan |',
    '| `vaa1-nachschau` | nachschau | Berührung & Exploration | Themen | 28:41 |',
    '| `thp10-masterclass` | masterclass | Rhythmus ist einfach – drei Bausteine | Rhythmus | 44:28 |',
    '| nicht | relevant |',
  ].join('\n')
  const lk = parseLandkarte(md)
  test('Sitzungen und Stücke', () => {
    expect(lk.sessions.get('vaa1')).toEqual({ series: 'VAA', number: '1', date: '2026-09-26', theme: 'Berührung & Exploration' })
    expect(lk.items.get('thp10-masterclass')).toEqual({ type: 'masterclass', title: 'Rhythmus ist einfach – drei Bausteine' })
  })
  test('sessionTitle', () => {
    expect(sessionTitle(lk, 'vaa1')).toBe('Von Anfang an spielen · Session 1 · Berührung & Exploration')
    expect(sessionTitle(lk, 'hk2')).toBe('Handpan Kompass · Session 2 · Klein anfangen')
    expect(sessionTitle(lk, 'xx1')).toBeNull()
  })
})
