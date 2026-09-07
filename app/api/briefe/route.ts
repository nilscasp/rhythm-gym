import { NextResponse } from 'next/server'
import { isBrevoConfigured, startDoubleOptIn } from '../../lib/brevo'
import {
  checkRateLimit,
  clientIpFromHeader,
  createRateLimitBucket,
  isHoneypotClean,
  isValidEmail,
  normalizeEmail,
  normalizeSource,
} from '../../lib/briefe'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/briefe — Eintrag in die „Briefe aus der Schule" (Double-Opt-in).
//
// Öffentlich erreichbar (PUBLIC_PATHS in app/lib/supabase/middleware.ts).
// Body: { email, source?, consent, website? }
//
// Antwortformen:
//   200 { ok: true }   — DOI-Mail unterwegs ODER Honeypot (Bot bekommt kein Signal)
//   400 { error }      — fehlende Einwilligung oder unbrauchbare Adresse
//   429 { error }      — zu viele Versuche von derselben IP
//   503 { error }      — Brevo (noch) nicht konfiguriert
//
// Die Adresse wird nirgends geloggt — auch nicht im Fehlerfall.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Prozesslokaler Zähler, siehe Kommentar in app/lib/briefe.ts. */
const rateLimitBucket = createRateLimitBucket()

interface BriefeRequestBody {
  email?: unknown
  source?: unknown
  consent?: unknown
  website?: unknown
}

/**
 * Ursprung für den Rücksprung aus der Bestätigungsmail. Hinter dem Vercel-Proxy
 * trägt `x-forwarded-host` die echte Domain (dieselbe Regel wie in proxy.ts);
 * lokal bleibt es bei http://localhost:3000.
 */
function resolveOrigin(request: Request): string {
  const headers = request.headers
  const host = headers.get('x-forwarded-host') ?? headers.get('host')
  if (!host) return new URL(request.url).origin

  const forwardedProto = headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1')
  const proto = forwardedProto ?? (isLocal ? 'http' : 'https')
  return `${proto}://${host}`
}

export async function POST(request: Request) {
  let body: BriefeRequestBody
  try {
    body = (await request.json()) as BriefeRequestBody
  } catch {
    return NextResponse.json(
      { error: 'Das Formular kam unvollständig an. Versuch es bitte noch einmal.' },
      { status: 400 }
    )
  }

  // Honeypot zuerst: Bots bekommen dieselbe freundliche 200 wie ein Mensch,
  // damit sie nicht lernen, welches Feld sie verrät.
  if (!isHoneypotClean(body.website)) {
    return NextResponse.json({ ok: true })
  }

  const ip = clientIpFromHeader(request.headers.get('x-forwarded-for'))
  const limit = checkRateLimit(rateLimitBucket, ip)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Das waren viele Versuche. Warte einen Moment und probier es dann erneut.' },
      { status: 429, headers: { 'retry-after': String(limit.retryAfterSeconds) } }
    )
  }

  if (body.consent !== true) {
    return NextResponse.json(
      { error: 'Ohne dein Ja kann ich dir keine Briefe schicken.' },
      { status: 400 }
    )
  }

  if (!isValidEmail(body.email)) {
    return NextResponse.json(
      { error: 'Das sieht nicht nach einer E-Mail-Adresse aus.' },
      { status: 400 }
    )
  }

  if (!isBrevoConfigured()) {
    return NextResponse.json(
      {
        error:
          'Die Briefe sind noch nicht angeschlossen. Schreib mir kurz, dann trage ich dich von Hand ein.',
      },
      { status: 503 }
    )
  }

  const email = normalizeEmail(body.email as string)
  const source = normalizeSource(body.source)
  const redirectionUrl = `${resolveOrigin(request)}/tag-1?bestaetigt=1`

  const result = await startDoubleOptIn({ email, source, redirectionUrl })
  if (!result.ok) {
    // Adressfrei: nur Status und Brevos Fehlercode.
    console.error('[api/briefe] Brevo-Fehler:', result.status, result.message)
    return NextResponse.json(
      {
        error:
          'Der Eintrag hat gerade nicht geklappt. Versuch es in ein paar Minuten noch einmal.',
      },
      { status: 502 }
    )
  }

  return NextResponse.json({ ok: true })
}
