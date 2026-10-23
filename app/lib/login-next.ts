// ─────────────────────────────────────────────────────────────────────────────
// Wohin der Login danach führt — eine feste Liste, keine Präfix-Prüfung.
//
// Präfix-Prüfungen („beginnt mit /“) übersehen Varianten wie `//evil`, `/\`,
// `/%09/` und machen den Login zur offenen Weiterleitung. Darum dieselbe
// Haltung wie im Auth-Callback (app/auth/callback/route.ts): nur was hier
// steht, ist ein Ziel; alles andere landet im Training.
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_AFTER_LOGIN = '/training'

/** Ziele, auf die Login, Registrierung und Callback zurückführen dürfen. */
export const LOGIN_NEXT_TARGETS: ReadonlySet<string> = new Set(['/mitgliedschaft'])

/** Geprüftes Ziel oder das Training. */
export function safeLoginNext(value: string | null | undefined): string {
  return value && LOGIN_NEXT_TARGETS.has(value) ? value : DEFAULT_AFTER_LOGIN
}

/**
 * Für die Auth-Schleuse: führt ein ausgeloggter Aufruf dieses Pfads über den
 * Login zurück? `/mitgliedschaft/danke` → zurück zur Mitgliedschaft.
 */
export function loginNextFor(pathname: string): string | null {
  for (const target of LOGIN_NEXT_TARGETS) {
    if (pathname === target || pathname.startsWith(`${target}/`)) return target
  }
  return null
}
