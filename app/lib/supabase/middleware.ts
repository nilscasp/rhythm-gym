import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Seiten und Endpunkte, die ohne Login erreichbar sein müssen: Pflichtangaben,
 * der Lead-Magnet `/tag-1` (Tag 1 geschenkt, `noindex`) und sein Formular-
 * Endpunkt `/api/briefe` — der muss auch ohne Cookie durchkommen, sonst
 * schluckt die Auth-Schleuse den POST und antwortet mit einem Redirect auf `/`.
 */
const PUBLIC_PATHS = new Set([
  '/impressum',
  '/datenschutz',
  '/tag-1',
  '/api/briefe',
  // Der Kalender ist auch ein Schaufenster: Titel, Zeit und Ort sieht jeder,
  // die Zoom-Tür hängt an der Zugriffsregel (Migration 0006).
  '/termine',
  '/api/events.json',
  // Der Laden für Selbststudium-Kurse — er richtet sich an Menschen ohne Konto.
  '/kurse',
])

/** Öffentliche Pfade mit Unterseiten, z. B. /termine/{id}. */
const PUBLIC_PREFIXES = ['/termine/']

export async function updateSession(
  request: NextRequest,
  extraRequestHeaders?: Record<string, string>,
  /**
   * Ziel für ein internes Umschreiben. Gesetzt, wenn die Adresse ein
   * Sprachpräfix trug (`/en/termine`): gerendert wird `/termine`, die Adresse
   * im Browser bleibt die englische.
   */
  rewriteTo?: URL
): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

  if (!url || !key) {
    throw new Error(
      'Supabase env vars missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY'
    )
  }

  // Frischer Snapshot der Request-Header plus die Extras (z. B. `x-brand`).
  // Muss bei jedem NextResponse.next() neu gebaut werden: `request.cookies.set()`
  // schreibt in denselben Header-Satz, und nur ein Snapshot NACH dem Setzen
  // trägt die aufgefrischten Tokens zu den Server Components weiter.
  const forwardedHeaders = () => {
    const headers = new Headers(request.headers)
    for (const [name, value] of Object.entries(extraRequestHeaders ?? {})) {
      headers.set(name, value)
    }
    return headers
  }

  // Eine Stelle, die die Antwort baut: entweder ein normales Weiterreichen oder
  // ein internes Umschreiben (Sprachpräfix). Beide tragen dieselben Header.
  const buildResponse = () =>
    rewriteTo
      ? NextResponse.rewrite(rewriteTo, { request: { headers: forwardedHeaders() } })
      : NextResponse.next({ request: { headers: forwardedHeaders() } })

  let response = buildResponse()

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        response = buildResponse()
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  // Refresh expiring tokens. Required to be called as soon as possible after
  // creating the server client — do not run other code between createServerClient
  // and supabase.auth.getUser(), or sessions may terminate unexpectedly.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Auth gate: everything except the landing, the /auth/* surface and the paths
  // in PUBLIC_PATHS (Pflichtangaben, Lead-Magnet, Brief-Endpunkt) is
  // members-only. Unauthenticated requests get bounced back to the landing,
  // which carries the Login/Signup CTAs. Static assets and _next/* are already
  // excluded by the proxy matcher in `proxy.ts`.
  // Beim Umschreiben zaehlt der Zielpfad: `/en/termine` ist oeffentlich, weil
  // `/termine` es ist. Ohne das faengt die Schleuse jede englische Adresse ab.
  const pathname = rewriteTo ? rewriteTo.pathname : request.nextUrl.pathname
  const isPublic =
    pathname === '/' ||
    pathname.startsWith('/auth/') ||
    PUBLIC_PATHS.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  if (!isPublic && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}
