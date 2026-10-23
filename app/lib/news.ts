// ─────────────────────────────────────────────────────────────────────────────
// Neuigkeiten (Plans/umzug-von-skool.md, Abschnitt E). Werden BERECHNET, nicht
// gespeichert. Gespeichert ist nur, wann jemand zuletzt hingeschaut hat
// (news_state.seen_at, Migration 0011).
//
// Quellen — alle schon auf das gefiltert, was die Person sehen darf
// (RLS für Beiträge, course-access.ts für Lektionen, hasEventAccess für
// Termine; siehe app/lib/news-load.ts):
//   (a) veröffentlichte Beiträge von Nils
//   (b) Lektionen/Aufzeichnungen der letzten 30 Tage, je Programm gebündelt
//   (c) Termine in den nächsten 24 Stunden
// Ungelesen = (a)/(b) nach seen_at. (c) steht nur in der Liste.
//
// Rein und getestet (tests/news.test.ts). Keine Imports mit Laufzeitcode:
// die Typen reisen bis in die Glocke (Client).
// ─────────────────────────────────────────────────────────────────────────────

export const LESSON_NEWS_DAYS = 30
export const EVENT_NEWS_HOURS = 24

const DAY_MS = 86_400_000

export type NewsPostInput = {
  id: string
  slug: string
  title: string
  /** ISO-Zeitpunkt */
  publishedAt: string
}

export type NewsLessonInput = {
  id: string
  slug: string
  title: string
  publishedAt: string
  programId: string
  programSlug: string
  programTitle: string
  programKind: 'course' | 'library'
}

export type NewsEventInput = {
  id: string
  title: string
  startsAt: string
  /** „19:00 – 20:00“ — fertig formatiert vom Aufrufer */
  timeLabel: string
  href: string
}

export type NewsKind = 'post' | 'lessons' | 'event'

export type NewsItem = {
  id: string
  kind: NewsKind
  title: string
  detail: string | null
  href: string
  /** ISO — Veröffentlichung bzw. Beginn des Termins */
  date: string
  /** „gestern“, „vor 3 Tagen“ — leer bei Terminen (die tragen die Uhrzeit in detail) */
  when: string
  unread: boolean
}

export type News = {
  items: NewsItem[]
  unreadCount: number
  /** Neuester ungelesener Eintrag (nie ein Termin) */
  latestUnread: NewsItem | null
}

export const EMPTY_NEWS: News = { items: [], unreadCount: 0, latestUnread: null }

function time(iso: string): number {
  return new Date(iso).getTime()
}

function isAfterSeen(iso: string, seenAt: string | null): boolean {
  return seenAt === null || time(iso) > time(seenAt)
}

export function buildNews(input: {
  posts: readonly NewsPostInput[]
  lessons: readonly NewsLessonInput[]
  events: readonly NewsEventInput[]
  seenAt: string | null
  now: Date
}): News {
  const now = input.now.getTime()
  const lessonFrom = now - LESSON_NEWS_DAYS * DAY_MS
  const eventUntil = now + EVENT_NEWS_HOURS * 3_600_000

  // (a) Beiträge
  const posts: NewsItem[] = input.posts
    .filter((p) => time(p.publishedAt) <= now)
    .map((p) => ({
      id: `post:${p.id}`,
      kind: 'post',
      title: p.title,
      detail: 'Beitrag von Nils',
      href: `/beitraege/${p.slug}`,
      date: p.publishedAt,
      when: relativeDateLabel(p.publishedAt, input.now),
      unread: isAfterSeen(p.publishedAt, input.seenAt),
    }))

  // (b) Lektionen, je Programm gebündelt
  const groups = new Map<string, NewsLessonInput[]>()
  for (const l of input.lessons) {
    const t = time(l.publishedAt)
    if (!(t > lessonFrom && t <= now)) continue
    const list = groups.get(l.programId) ?? []
    list.push(l)
    groups.set(l.programId, list)
  }
  const lessons: NewsItem[] = [...groups.values()].map((list) => {
    const sorted = [...list].sort((a, b) => time(b.publishedAt) - time(a.publishedAt))
    const newest = sorted[0]
    const n = sorted.length
    const library = newest.programKind === 'library'
    const one = library ? 'Neue Aufzeichnung' : 'Neue Lektion'
    const many = library ? 'neue Aufzeichnungen' : 'neue Lektionen'
    const base = `/training/${newest.programSlug}`
    return {
      id: `lessons:${newest.programId}`,
      kind: 'lessons',
      title: n === 1 ? `${one} in ${newest.programTitle}` : `${n} ${many} in ${newest.programTitle}`,
      detail: n === 1 ? newest.title : `Zuletzt: ${newest.title}`,
      href: n === 1 ? `${base}/${newest.slug}` : base,
      date: newest.publishedAt,
      when: relativeDateLabel(newest.publishedAt, input.now),
      unread: sorted.some((l) => isAfterSeen(l.publishedAt, input.seenAt)),
    }
  })

  // (c) Termine der nächsten 24 Stunden — nie „ungelesen“
  const events: NewsItem[] = input.events
    .filter((e) => {
      const t = time(e.startsAt)
      return t >= now && t <= eventUntil
    })
    .sort((a, b) => time(a.startsAt) - time(b.startsAt))
    .map((e) => ({
      id: `event:${e.id}`,
      kind: 'event',
      title: e.title,
      detail: `Live · ${e.timeLabel}`,
      href: e.href,
      date: e.startsAt,
      when: '',
      unread: false,
    }))

  const dated = [...posts, ...lessons].sort((a, b) => time(b.date) - time(a.date))
  const items = [...events, ...dated]
  return {
    items,
    unreadCount: items.filter((i) => i.unread).length,
    latestUnread: dated.find((i) => i.unread) ?? null,
  }
}

/**
 * Was „Heute“ oben zeigt: die Karte für den neuesten Beitrag (nur wenn er
 * ungelesen ist) und die schmale Leiste mit dem neuesten anderen Ungelesenen.
 * Ist der Beitrag das einzige Neue, bleibt die Leiste weg — sonst stünde er
 * zweimal untereinander.
 */
export function heuteNewsSlots(news: News): { featuredPost: NewsItem | null; bar: NewsItem | null } {
  const newestPost = news.items.find((i) => i.kind === 'post') ?? null
  const featuredPost = newestPost?.unread ? newestPost : null
  const bar =
    news.items.find((i) => i.unread && i.kind !== 'event' && i.id !== featuredPost?.id) ?? null
  return { featuredPost, bar }
}

// ── Datum ────────────────────────────────────────────────────────────────────

function berlinDay(ms: number): { key: number; label: string } {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date(ms))
    .split('-')
  return { key: Math.floor(Date.UTC(+y, +m - 1, +d) / DAY_MS), label: `${d}.${m}.${y}` }
}

/** „heute“, „gestern“, „vor 3 Tagen“, „vor einer Woche“, „am 01.09.2026“. */
export function relativeDateLabel(iso: string, now: Date = new Date()): string {
  const then = berlinDay(time(iso))
  const today = berlinDay(now.getTime())
  const days = today.key - then.key
  if (days <= 0) return 'heute'
  if (days === 1) return 'gestern'
  if (days < 7) return `vor ${days} Tagen`
  if (days < 28) {
    const weeks = Math.floor(days / 7)
    return weeks === 1 ? 'vor einer Woche' : `vor ${weeks} Wochen`
  }
  return `am ${then.label}`
}
