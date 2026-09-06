import type { NextRequest } from 'next/server'
import { BRAND_COOKIE, BRAND_HEADER, resolveBrand } from './app/lib/brand'
import { updateSession } from './app/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  // Einzige Entscheidungsstelle für die Marke. Das Ergebnis reist als
  // Request-Header weiter, damit `layout.tsx` den Host nicht erneut auswertet.
  // Hinter dem Vercel-Proxy trägt x-forwarded-host die echte Domain.
  const brand = resolveBrand(
    request.headers.get('x-forwarded-host') ?? request.headers.get('host'),
    request.cookies.get(BRAND_COOKIE)?.value
  )

  return await updateSession(request, { [BRAND_HEADER]: brand })
}

export const config = {
  matcher: [
    // Statische Assets bleiben außerhalb der Auth-Schleuse — inkl. der self-hosted
    // Schul-Fonts (woff2), sonst bekommt ein ausgeloggter Besucher statt der Schrift
    // einen Redirect auf /.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf)$).*)',
  ],
}
