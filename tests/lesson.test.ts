import { describe, expect, test } from 'bun:test'
import { nextOpenLesson } from '../app/lib/course-progress'
import { toMarkdownBodyDialect } from '../app/lib/lesson-markdown'

describe('nextOpenLesson', () => {
  const lessons = [
    { id: 'a', open: true },
    { id: 'b', open: true },
    { id: 'c', open: false },
  ]
  const isOpen = (l: { open: boolean }) => l.open

  test('erste offene, nicht abgehakte in Reihenfolge', () => {
    expect(nextOpenLesson(lessons, new Set(), isOpen)?.id).toBe('a')
    expect(nextOpenLesson(lessons, new Set(['a']), isOpen)?.id).toBe('b')
  })
  test('gesperrte zählen nicht — alles Offene erledigt → null', () => {
    expect(nextOpenLesson(lessons, new Set(['a', 'b']), isOpen)).toBeNull()
  })
  test('Lücken zuerst', () => {
    expect(nextOpenLesson(lessons, new Set(['b']), isOpen)?.id).toBe('a')
  })
})

describe('toMarkdownBodyDialect', () => {
  test('leer bleibt leer', () => {
    expect(toMarkdownBodyDialect(null)).toBe('')
    expect(toMarkdownBodyDialect('')).toBe('')
  })
  test('Haupttitel weg, Überschriften → ◆-Abschnitte, Listen → ▸', () => {
    const md = '# Titel\n\nEinleitung\n\n## Übung\n- eins\n* zwei\n\n---\nSchluss'
    expect(toMarkdownBodyDialect(md)).toBe(
      'Einleitung\n\n⸻\n◆ **Übung**\n▸ eins\n▸ zwei\n\n⸻\nSchluss',
    )
  })
  test('erste ##-Überschrift wird nicht verschluckt', () => {
    expect(toMarkdownBodyDialect('## Start\nText')).toBe('◆ **Start**\nText')
  })
  test('fett/kursiv bleiben unverändert', () => {
    expect(toMarkdownBodyDialect('Ein **fetter** und *kursiver* Satz')).toBe(
      'Ein **fetter** und *kursiver* Satz',
    )
  })
})
