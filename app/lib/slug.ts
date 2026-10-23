// ─────────────────────────────────────────────────────────────────────────────
// Slugs für Beiträge (Migration 0011, posts.slug). Rein und getestet
// (tests/slug.test.ts). Dieselbe Form prüft der Check posts_slug_format in SQL.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_LENGTH = 80
const FALLBACK = 'beitrag'
const VALID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const REPLACEMENTS: Record<string, string> = {
  ä: 'ae',
  ö: 'oe',
  ü: 'ue',
  ß: 'ss',
}

/** „Über Größe“ → „ueber-groesse“. Nichts Brauchbares → ''. */
export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[äöüß]/g, (ch) => REPLACEMENTS[ch] ?? ch)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (base.length <= MAX_LENGTH) return base
  return base.slice(0, MAX_LENGTH).replace(/-+$/g, '')
}

export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= MAX_LENGTH && VALID.test(slug)
}

/** Erster freier Slug: base, base-2, base-3 … Leerer Grundwert → „beitrag“. */
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  const root = base || FALLBACK
  if (!taken.has(root)) return root
  for (let n = 2; ; n++) {
    const suffix = `-${n}`
    const candidate = `${root.slice(0, MAX_LENGTH - suffix.length).replace(/-+$/g, '')}${suffix}`
    if (!taken.has(candidate)) return candidate
  }
}
