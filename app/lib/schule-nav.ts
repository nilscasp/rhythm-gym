import { splitLocalePath } from './locale'

// ─────────────────────────────────────────────────────────────────────────────
// Navigation der Marke schule (Plans/umzug-von-skool.md, Abschnitt D):
// Heute · Kurse · Üben · Live · Miteinander · Mein Weg.
//
// Rein und getestet (tests/schule-nav.test.ts). Die Darstellung steht in
// components/SchuleNav.tsx; die Marke gym benutzt das hier nie.
// ─────────────────────────────────────────────────────────────────────────────

export type SchuleNavKey = 'heute' | 'kurse' | 'ueben' | 'live' | 'miteinander' | 'mein-weg'

export type SchuleNavItem = { key: SchuleNavKey; href: string }

export const SCHULE_NAV: readonly SchuleNavItem[] = [
  { key: 'heute', href: '/training' },
  { key: 'kurse', href: '/training/kurse' },
  { key: 'ueben', href: '/tool' },
  { key: 'live', href: '/termine' },
  { key: 'miteinander', href: '/miteinander' },
  { key: 'mein-weg', href: '/mein-weg' },
]

/** Mobil unten: alles außer „Mein Weg“ (das ist der Profil-Knopf oben rechts). */
export const SCHULE_BOTTOM_NAV: readonly SchuleNavItem[] = SCHULE_NAV.filter(
  (i) => i.key !== 'mein-weg',
)

/** Pfad oder Unterpfad — „/tool“ trifft „/tool/x“, aber nicht „/toolbox“. */
function within(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + '/')
}

/** Welcher Punkt ist aktiv? null = keiner (z. B. /coach, /glossar). */
export function activeSchuleNav(pathname: string | null | undefined): SchuleNavKey | null {
  if (!pathname) return null
  const raw = splitLocalePath(pathname).pathname
  const path = raw.length > 1 ? raw.replace(/\/+$/, '') : raw

  if (path === '/training') return 'heute'
  if (within(path, '/beitraege')) return 'heute'
  // Kursliste und jeder Kursraum (/training/<kurs>/…) gehören zu „Kurse“.
  if (path.startsWith('/training/')) return 'kurse'
  if (within(path, '/tool')) return 'ueben'
  if (within(path, '/termine')) return 'live'
  if (within(path, '/miteinander')) return 'miteinander'
  if (within(path, '/mein-weg') || within(path, '/settings')) return 'mein-weg'
  return null
}

/**
 * Seiten ohne App-Navigation: Landing, Laden, Lead-Magnet, Pflichtangaben,
 * Login. Dort bleibt die alte Kopfzeile (Logo, Sprache, Einloggen).
 */
const PLAIN_PATHS = ['/kurse', '/tag-1', '/impressum', '/datenschutz', '/auth']

export function showsSchuleAppNav(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  const path = splitLocalePath(pathname).pathname
  if (path === '/') return false
  return !PLAIN_PATHS.some((p) => within(path, p))
}
