import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { contactMailto, MEMBERSHIP_PATH } from '../../lib/billing'
import { loadMembership } from '../../lib/membership'
import { getStripe } from '../../lib/stripe'
import { checkoutCourseSlug, trustedCheckoutUserId } from '../../lib/stripe-events'
import { createClient } from '../../lib/supabase/server'
import { currentBrand } from '../../lib/brand-server'
import { TIER_NAMES } from '../../lib/tiers'
import { COURSE_CSS } from '../../training/_course/views'
import { MEMBERSHIP_CSS } from '../styles'
import { Refresher } from './Refresher'

// ─────────────────────────────────────────────────────────────────────────────
// /mitgliedschaft/danke?session_id=cs_… — Rückkehr aus dem Stripe-Checkout.
//
// Die Freischaltung macht der Webhook, nicht diese Seite. Sie sagt ehrlich
// „Wir schalten dich gerade frei“ und lädt den Stand neu, bis er da ist. Die
// Session wird nur gelesen, um zu wissen, ob es ein Abo oder ein Kurs war —
// und nur, wenn sie zu genau dieser Person gehört.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata = { title: 'Danke' }
export const dynamic = 'force-dynamic'

const SESSION_ID = /^cs_(test_|live_)?[A-Za-z0-9]{10,200}$/

type Purchase = { kind: 'subscription' } | { kind: 'course'; slug: string | null } | null

async function readPurchase(sessionId: string | null, userId: string): Promise<Purchase> {
  if (!sessionId || !SESSION_ID.test(sessionId) || !process.env.STRIPE_SECRET_KEY) return null
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId)
    if (trustedCheckoutUserId(session) !== userId) return null
    if (session.mode === 'subscription') return { kind: 'subscription' }
    return { kind: 'course', slug: checkoutCourseSlug(session) }
  } catch {
    return null
  }
}

export default async function ThanksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // Nur Marke schule; auf rhythmgym.io gibt es diese Seite nicht.
  if ((await currentBrand()) !== 'schule') notFound()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?next=${MEMBERSHIP_PATH}`)

  const params = await searchParams
  const sessionId = typeof params.session_id === 'string' ? params.session_id : null

  const [membership, purchase] = await Promise.all([
    loadMembership(supabase, user.id),
    readPurchase(sessionId, user.id),
  ])

  let ready = false
  let target: { href: string; label: string } = { href: '/training', label: 'Zu deinen Kursen' }
  let readyText = ''

  if (purchase?.kind === 'course' && purchase.slug) {
    const { data: program } = await supabase
      .from('programs')
      .select('id, title')
      .eq('slug', purchase.slug)
      .maybeSingle()
    if (program) {
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('status')
        .eq('user_id', user.id)
        .eq('program_id', program.id)
        .maybeSingle()
      ready = !!enrollment && (enrollment.status ?? 'active') === 'active'
      target = { href: `/training/${purchase.slug}`, label: 'Zum Kurs' }
      readyText = `„${program.title}“ ist für dich offen.`
    }
  } else {
    const plan = membership?.plan ?? 'free'
    ready = plan !== 'free'
    if (ready && plan !== 'free') readyText = `Du bist dabei: ${TIER_NAMES[plan]}.`
    target = { href: '/training', label: 'Los geht’s' }
  }

  return (
    <>
      <style>{COURSE_CSS}</style>
      <style>{MEMBERSHIP_CSS}</style>
      <main className="cr-page">
        <div className="cr-wrap">
          <header className="cr-head">
            <p className="cr-kicker">Danke</p>
            <h1 className="cr-title">{ready ? 'Schön, dass du da bist' : 'Wir schalten dich gerade frei'}</h1>
          </header>

          <div className="cr-locked">
            {ready ? (
              <>
                <p className="cr-locked-text">{readyText}</p>
                <div className="cr-actions">
                  <Link href={target.href} className="cr-btn">
                    {target.label}
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="cr-locked-text">
                  Danke für deine Buchung. Stripe meldet sie uns gerade, das dauert meist nur ein
                  paar Sekunden.
                </p>
                <Refresher contactHref={contactMailto('Freischaltung nach der Buchung')} />
              </>
            )}
          </div>

          <Link href={MEMBERSHIP_PATH} className="cr-back">
            ← Mitgliedschaft
          </Link>
        </div>
      </main>
    </>
  )
}
