import { NextResponse } from 'next/server'
import { getStripe } from '../../../lib/stripe'
import {
  AUTOMATIC_TAX_ENABLED,
  MEMBERSHIP_PATH,
  buildCheckoutParams,
  cancelPathFor,
  isSameOrigin,
  lookupKeyFor,
  parseCheckoutRequest,
  priceMatchesRequest,
  requestOrigin,
} from '../../../lib/billing'
import { loadMembership } from '../../../lib/membership'
import { BRAND_HEADER } from '../../../lib/brand'
import { getCourseAccess } from '../../../lib/course-access'
import { hasRunningPlatformSubscription } from '../../../lib/stripe-events'
import { createClient } from '../../../lib/supabase/server'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/stripe/checkout — Formular von /mitgliedschaft bzw. aus dem
// Kursraum → Stripe-Checkout-Session → 303 zu Stripe.
//
// Felder: kind=subscription&tier=premium|vip&interval=month|year
//      oder kind=course&course=<programs.slug>
//
// Der Preis wird über seinen Lookup-Key geholt (nie über eine feste Id) und
// muss in den Metadaten zur Anfrage passen. Wer schon ein Abo über Stripe hat,
// bekommt kein zweites: Wechsel und Kündigung laufen über das Kundenportal.
//
// Jede Ablehnung führt sichtbar zurück (?kauf=…), nie auf eine leere Seite.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function back(origin: string, path: string, reason: string) {
  return NextResponse.redirect(`${origin}${path}?kauf=${reason}`, { status: 303 })
}

export async function POST(request: Request) {
  // Kaufweg gibt es nur auf der Marke schule.
  if (request.headers.get(BRAND_HEADER) !== 'schule') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const origin = requestOrigin(request.headers)
  if (!origin) {
    return NextResponse.json({ error: 'bad_host' }, { status: 400 })
  }
  if (!isSameOrigin(request.headers.get('origin'), origin)) {
    return NextResponse.json({ error: 'cross_origin' }, { status: 403 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/auth/login?next=${MEMBERSHIP_PATH}`, { status: 303 })
  }

  const form = await request.formData().catch(() => null)
  const checkout = parseCheckoutRequest({
    kind: form?.get('kind'),
    tier: form?.get('tier'),
    interval: form?.get('interval'),
    course: form?.get('course'),
  })
  if (!checkout) return back(origin, MEMBERSHIP_PATH, 'ungueltig')

  const backPath = cancelPathFor(checkout)

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[stripe/checkout] STRIPE_SECRET_KEY fehlt.')
    return back(origin, backPath, 'nicht-verfuegbar')
  }

  const membership = await loadMembership(supabase, user.id)
  if (!membership) return back(origin, backPath, 'fehler')

  // Schon ein Abo? Dann kein zweites Abo, sondern das Portal.
  if (checkout.kind === 'subscription' && membership.plan !== 'free') {
    return back(origin, MEMBERSHIP_PATH, 'schon-dabei')
  }
  // Von Nils gesetzte Stufe (auch free): der Webhook dürfte sie nicht ändern,
  // ein bezahltes Abo bliebe also ohne Wirkung. Erst mit Nils klären.
  if (checkout.kind === 'subscription' && membership.planSource === 'manual') {
    return back(origin, MEMBERSHIP_PATH, 'von-hand')
  }

  // Kurs: wer schon Zugang hat (Enrollment, Abo-Stufe, Admin), zahlt nicht
  // ein zweites Mal. Einzige Zugangsprüfung ist course-access.ts.
  if (checkout.kind === 'course') {
    const access = await getCourseAccess(supabase, user.id, checkout.courseSlug)
    if (access.hasAccess) return back(origin, backPath, 'schon-dabei')
  }

  try {
    const stripe = getStripe()

    // Abo: profiles.plan kann hinter Stripe herlaufen (Webhook noch unterwegs,
    // Migration nicht eingespielt). Hat der Kunde bei Stripe schon ein
    // laufendes Abo dieser Plattform, gibt es kein zweites — dann das Portal.
    if (checkout.kind === 'subscription' && membership.customerId) {
      const running = await stripe.subscriptions.list({
        customer: membership.customerId,
        status: 'all',
        limit: 100,
      })
      if (hasRunningPlatformSubscription(running.data)) {
        return back(origin, MEMBERSHIP_PATH, 'schon-dabei')
      }
    }

    const lookupKey = lookupKeyFor(checkout)
    const prices = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })
    const price = prices.data[0]

    if (!price || !priceMatchesRequest(price, checkout)) {
      console.error('[stripe/checkout] Kein passender Preis zum Lookup-Key', lookupKey)
      return back(origin, backPath, 'nicht-verfuegbar')
    }

    const session = await stripe.checkout.sessions.create(
      buildCheckoutParams(checkout, {
        userId: user.id,
        customerId: membership.customerId,
        email: membership.email ?? user.email ?? null,
        origin,
        priceId: price.id,
        automaticTax: AUTOMATIC_TAX_ENABLED,
      })
    )

    if (!session.url) {
      console.error('[stripe/checkout] Session ohne URL:', session.id)
      return back(origin, backPath, 'fehler')
    }

    return NextResponse.redirect(session.url, { status: 303 })
  } catch (err) {
    console.error(
      '[stripe/checkout] Session nicht erstellt:',
      err instanceof Error ? err.message : 'unbekannter Fehler'
    )
    return back(origin, backPath, 'fehler')
  }
}
