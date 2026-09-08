import type { NextRequest } from 'next/server'
import { BRAND_COOKIE, BRAND_HEADER, resolveBrand } from './app/lib/brand'
import { LOCALE_HEADER, resolveLocale } from './app/lib/locale'
import { updateSession } from './app/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  // Einzige Entscheidungsstelle für die Marke. Das Ergebnis reist als
  // Request-Header weiter, damit `layout.tsx` den Host nicht erneut auswertet.
  // Hinter dem Vercel-Proxy trägt x-forwarded-host die echte Domain.
  const brand = resolveBrand(
    request.headers.get('x-forwarded-host') ?? request.headers.get('host'),
    request.cookies.get(BRAND_COOKIE)?.value
  )

  // Zweite Entscheidungsstelle, gleiches Muster: die Sprache. `/en/termine`
  // wird intern zu `/termine` — es gibt jede Seite nur einmal im Dateibaum,
  // die Sprache reist als Header mit. Deutsch bleibt präfixfrei, damit keine
  // bestehende Adresse bricht.
  const { locale, pathname, fromPath } = resolveLocale(
    request.nextUrl.pathname,
    request.headers.get('accept-language')
  )

  const headers = { [BRAND_HEADER]: brand, [LOCALE_HEADER]: locale }

  if (fromPath) {
    // Ohne das Präfix weitersuchen: die Auth-Schleuse und die Routen sehen den
    // nackten Pfad, sonst gälte /en/termine als geschützte Unterseite.
    const url = request.nextUrl.clone()
    url.pathname = pathname
    return await updateSession(request, headers, url)
  }

  return await updateSession(request, headers)
}

export const config = {
  matcher: [
    // Statische Assets bleiben außerhalb der Auth-Schleuse — inkl. der self-hosted
    // Schul-Fonts (woff2), sonst bekommt ein ausgeloggter Besucher statt der Schrift
    // einen Redirect auf /.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf)$).*)',
  ],
}
