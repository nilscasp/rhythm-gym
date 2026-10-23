import { describe, expect, test } from 'bun:test'
import {
  LESSON_NEWS_DAYS,
  buildNews,
  heuteNewsSlots,
  relativeDateLabel,
  type NewsEventInput,
  type NewsLessonInput,
  type NewsPostInput,
} from '../app/lib/news'

const NOW = new Date('2026-10-23T10:00:00Z')
const iso = (s: string) => new Date(s).toISOString()

function post(id: string, publishedAt: string, title = `Beitrag ${id}`): NewsPostInput {
  return { id, slug: `beitrag-${id}`, title, publishedAt: iso(publishedAt) }
}

function lesson(
  id: string,
  publishedAt: string,
  program: { id: string; title: string; slug?: string; kind?: 'course' | 'library' },
): NewsLessonInput {
  return {
    id,
    slug: `lektion-${id}`,
    title: `Lektion ${id}`,
    publishedAt: iso(publishedAt),
    programId: program.id,
    programSlug: program.slug ?? program.id,
    programTitle: program.title,
    programKind: program.kind ?? 'course',
  }
}

function event(id: string, startsAt: string): NewsEventInput {
  return { id, title: `Termin ${id}`, startsAt: iso(startsAt), timeLabel: '19:00 – 20:00', href: `/termine/${id}` }
}

const KOMPASS = { id: 'p-kompass', title: 'Handpan Kompass', slug: 'handpan-kompass' }
const AUFZ = { id: 'p-aufz', title: 'Aufzeichnungen', slug: 'aufzeichnungen', kind: 'library' as const }

describe('buildNews — Beiträge (a)', () => {
  test('ohne seen_at ist jeder veröffentlichte Beitrag ungelesen', () => {
    const news = buildNews({ posts: [post('1', '2026-10-20T08:00:00Z')], lessons: [], events: [], seenAt: null, now: NOW })
    expect(news.items).toHaveLength(1)
    expect(news.items[0]).toMatchObject({ kind: 'post', unread: true, href: '/beitraege/beitrag-1' })
    expect(news.unreadCount).toBe(1)
  })
  test('ungelesen nur, wenn nach seen_at veröffentlicht', () => {
    const news = buildNews({
      posts: [post('alt', '2026-10-10T08:00:00Z'), post('neu', '2026-10-22T08:00:00Z')],
      lessons: [],
      events: [],
      seenAt: iso('2026-10-15T00:00:00Z'),
      now: NOW,
    })
    const byId = Object.fromEntries(news.items.map((i) => [i.id, i.unread]))
    expect(byId['post:neu']).toBe(true)
    expect(byId['post:alt']).toBe(false)
    expect(news.unreadCount).toBe(1)
  })
  test('Beiträge mit Datum in der Zukunft erscheinen nicht', () => {
    const news = buildNews({ posts: [post('später', '2026-10-30T08:00:00Z')], lessons: [], events: [], seenAt: null, now: NOW })
    expect(news.items).toHaveLength(0)
  })
})

describe('buildNews — Lektionen (b)', () => {
  test('mehrere Lektionen eines Programms werden zu einem Eintrag', () => {
    const news = buildNews({
      posts: [],
      lessons: [
        lesson('a', '2026-10-20T08:00:00Z', KOMPASS),
        lesson('b', '2026-10-21T08:00:00Z', KOMPASS),
        lesson('c', '2026-10-22T08:00:00Z', KOMPASS),
      ],
      events: [],
      seenAt: null,
      now: NOW,
    })
    expect(news.items).toHaveLength(1)
    expect(news.items[0]).toMatchObject({
      id: 'lessons:p-kompass',
      kind: 'lessons',
      title: '3 neue Lektionen in Handpan Kompass',
      href: '/training/handpan-kompass',
      date: iso('2026-10-22T08:00:00Z'),
      unread: true,
    })
  })
  test('eine einzelne Lektion führt direkt zur Lektion', () => {
    const news = buildNews({ posts: [], lessons: [lesson('a', '2026-10-20T08:00:00Z', KOMPASS)], events: [], seenAt: null, now: NOW })
    expect(news.items[0]).toMatchObject({
      title: 'Neue Lektion in Handpan Kompass',
      detail: 'Lektion a',
      href: '/training/handpan-kompass/lektion-a',
    })
  })
  test('Bibliotheken sprechen von Aufzeichnungen', () => {
    const news = buildNews({
      posts: [],
      lessons: [lesson('x', '2026-10-20T08:00:00Z', AUFZ), lesson('y', '2026-10-21T08:00:00Z', AUFZ)],
      events: [],
      seenAt: null,
      now: NOW,
    })
    expect(news.items[0].title).toBe('2 neue Aufzeichnungen in Aufzeichnungen')
  })
  test(`älter als ${LESSON_NEWS_DAYS} Tage oder in der Zukunft → nicht dabei`, () => {
    const news = buildNews({
      posts: [],
      lessons: [lesson('alt', '2026-09-01T08:00:00Z', KOMPASS), lesson('bald', '2026-10-24T08:00:00Z', KOMPASS)],
      events: [],
      seenAt: null,
      now: NOW,
    })
    expect(news.items).toHaveLength(0)
  })
  test('Gruppe gilt als ungelesen, sobald eine Lektion nach seen_at kam', () => {
    const news = buildNews({
      posts: [],
      lessons: [lesson('a', '2026-10-10T08:00:00Z', KOMPASS), lesson('b', '2026-10-22T08:00:00Z', KOMPASS)],
      events: [],
      seenAt: iso('2026-10-15T00:00:00Z'),
      now: NOW,
    })
    expect(news.items[0].unread).toBe(true)
  })
  test('Gruppe ist gelesen, wenn alles vor seen_at lag', () => {
    const news = buildNews({
      posts: [],
      lessons: [lesson('a', '2026-10-10T08:00:00Z', KOMPASS)],
      events: [],
      seenAt: iso('2026-10-15T00:00:00Z'),
      now: NOW,
    })
    expect(news.items[0].unread).toBe(false)
    expect(news.unreadCount).toBe(0)
  })
})

describe('buildNews — Termine (c)', () => {
  test('nur die nächsten 24 Stunden, nie ungelesen', () => {
    const news = buildNews({
      posts: [],
      lessons: [],
      events: [
        event('bald', '2026-10-23T17:00:00Z'),
        event('morgen-spaet', '2026-10-24T12:00:00Z'),
        event('vorbei', '2026-10-23T08:00:00Z'),
      ],
      seenAt: null,
      now: NOW,
    })
    expect(news.items.map((i) => i.id)).toEqual(['event:bald'])
    expect(news.items[0]).toMatchObject({ kind: 'event', unread: false, detail: 'Live · 19:00 – 20:00' })
    expect(news.unreadCount).toBe(0)
    expect(news.latestUnread).toBeNull()
  })
})

describe('buildNews — Reihenfolge', () => {
  test('Termine zuerst, dann Beiträge und Lektionen neueste zuerst', () => {
    const news = buildNews({
      posts: [post('p', '2026-10-21T08:00:00Z')],
      lessons: [lesson('l', '2026-10-22T08:00:00Z', KOMPASS)],
      events: [event('e', '2026-10-23T18:00:00Z')],
      seenAt: null,
      now: NOW,
    })
    expect(news.items.map((i) => i.kind)).toEqual(['event', 'lessons', 'post'])
    expect(news.latestUnread?.id).toBe('lessons:p-kompass')
    expect(news.unreadCount).toBe(2)
  })
})

describe('heuteNewsSlots', () => {
  test('neuester Beitrag ungelesen → Karte; Leiste zeigt das nächste Ungelesene', () => {
    const news = buildNews({
      posts: [post('neu', '2026-10-21T08:00:00Z')],
      lessons: [lesson('l', '2026-10-22T08:00:00Z', KOMPASS)],
      events: [],
      seenAt: null,
      now: NOW,
    })
    const slots = heuteNewsSlots(news)
    expect(slots.featuredPost?.id).toBe('post:neu')
    expect(slots.bar?.id).toBe('lessons:p-kompass')
  })
  test('nur der Beitrag ist neu → Karte, keine doppelte Leiste', () => {
    const news = buildNews({ posts: [post('neu', '2026-10-21T08:00:00Z')], lessons: [], events: [], seenAt: null, now: NOW })
    const slots = heuteNewsSlots(news)
    expect(slots.featuredPost?.id).toBe('post:neu')
    expect(slots.bar).toBeNull()
  })
  test('neuester Beitrag gelesen → keine Karte, auch wenn ein älterer offen wäre', () => {
    const news = buildNews({
      posts: [post('neu', '2026-10-21T08:00:00Z'), post('alt', '2026-10-01T08:00:00Z')],
      lessons: [],
      events: [],
      seenAt: iso('2026-10-22T00:00:00Z'),
      now: NOW,
    })
    expect(heuteNewsSlots(news)).toEqual({ featuredPost: null, bar: null })
  })
  test('nichts Ungelesenes → nichts', () => {
    const news = buildNews({ posts: [], lessons: [], events: [event('e', '2026-10-23T18:00:00Z')], seenAt: null, now: NOW })
    expect(heuteNewsSlots(news)).toEqual({ featuredPost: null, bar: null })
  })
})

describe('relativeDateLabel', () => {
  test('heute, gestern, vor Tagen (Berliner Kalendertage)', () => {
    expect(relativeDateLabel(iso('2026-10-23T06:00:00Z'), NOW)).toBe('heute')
    // 22.10. 23:30 Berlin (21:30Z) ist gestern
    expect(relativeDateLabel(iso('2026-10-22T21:30:00Z'), NOW)).toBe('gestern')
    expect(relativeDateLabel(iso('2026-10-20T08:00:00Z'), NOW)).toBe('vor 3 Tagen')
  })
  test('Wochen, danach ein Datum', () => {
    expect(relativeDateLabel(iso('2026-10-16T08:00:00Z'), NOW)).toBe('vor einer Woche')
    expect(relativeDateLabel(iso('2026-10-02T08:00:00Z'), NOW)).toBe('vor 3 Wochen')
    expect(relativeDateLabel(iso('2026-09-01T08:00:00Z'), NOW)).toBe('am 01.09.2026')
  })
  test('Zukunft zählt als heute', () => {
    expect(relativeDateLabel(iso('2026-10-24T08:00:00Z'), NOW)).toBe('heute')
  })
})
