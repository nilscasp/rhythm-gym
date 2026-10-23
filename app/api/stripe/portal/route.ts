import { NextResponse } from 'next/server'
import { getStripe } from '../../../lib/stripe'
import { MEMBERSHIP_PATH, isSameOrigin, requestOrigin } from '../../../lib/billing'
import { loadMembership } from '../../../lib/membership'
import { createClient } from '../../../lib/supabase/server'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/stripe/portal — „Abo verwalten“ → Stripe-Kundenportal (Zahlart,
// Rechnungen, Wechsel der Stufe, Kündigung). Rückkehr nach /mitgliedschaft.
// Welche Aktionen das Portal anbietet, steht im Stripe-Dashboard
// (Einstellungen → Billing → Kundenportal), nicht hier.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
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

  const membership = await loadMembership(supabase, user.id)
  if (!membership?.customerId || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.redirect(`${origin}${MEMBERSHIP_PATH}?portal=nicht-verfuegbar`, {
      status: 303,
    })
  }

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: membership.customerId,
      return_url: `${origin}${MEMBERSHIP_PATH}`,
      locale: 'de',
    })
    return NextResponse.redirect(session.url, { status: 303 })
  } catch (err) {
    console.error(
      '[stripe/portal] Portal-Session nicht erstellt:',
      err instanceof Error ? err.message : 'unbekannter Fehler'
    )
    return NextResponse.redirect(`${origin}${MEMBERSHIP_PATH}?portal=fehler`, { status: 303 })
  }
}
