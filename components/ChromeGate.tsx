'use client'

import { usePathname } from 'next/navigation'

/**
 * Hides its children on routes matching any prefix in `hideOn`.
 *
 * Match semantics:
 *   - The string `'/'` matches ONLY the landing path (exact). It does NOT match
 *     descendant routes like `/training`.
 *   - Any other prefix matches the exact pathname OR descendants
 *     (e.g. `'/auth'` matches `/auth` and `/auth/login`).
 */
export function ChromeGate({
  hideOn,
  children,
}: {
  hideOn: string[]
  children: React.ReactNode
}) {
  const pathname = usePathname()
  if (!pathname) return <>{children}</>

  const shouldHide = hideOn.some((p) => {
    if (p === '/') return pathname === '/'
    return pathname === p || pathname.startsWith(p + '/')
  })

  if (shouldHide) return null
  return <>{children}</>
}
