import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

  if (!url || !key) {
    throw new Error(
      'Supabase env vars missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY'
    )
  }

  let response = NextResponse.next({
    request,
  })

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        response = NextResponse.next({
          request,
        })
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

  // Auth gate: everything except the landing and the /auth/* surface is
  // members-only. Unauthenticated requests get bounced back to the landing,
  // which carries the Login/Signup CTAs. Static assets and _next/* are already
  // excluded by the proxy matcher in `proxy.ts`.
  const pathname = request.nextUrl.pathname
  const isPublic = pathname === '/' || pathname.startsWith('/auth/')

  if (!isPublic && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}
