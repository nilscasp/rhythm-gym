import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { contactMailto, hasAnyPrice, MEMBERSHIP_PATH } from '../lib/billing'
import { loadMembership, loadSubscriptionPrices } from '../lib/membership'
import { createClient } from '../lib/supabase/server'
import { currentBrand } from '../lib/brand-server'
import { TIER_NAMES } from '../lib/tiers'
import { COURSE_CSS } from '../training/_course/views'
import { Plans } from './Plans'
import { MEMBERSHIP_CSS } from './styles'

// ─────────────────────────────────────────────────────────────────────────────
// /mitgliedschaft — die zwei Abo-Stufen der Schule, Kauf in der App.
// Inhalt aus app/lib/tiers.ts (Schul-Gedächtnis, Wissen/Kurse/community.md).
// Keine Testphase, keine Ankerpreise, kein „du sparst“.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata = {
  title: 'Mitgliedschaft',
  description: 'Die zwei Stufen der Handpan Schule des Lebens.',
}

export const dynamic = 'force-dynamic'

/** Rückmeldungen aus /api/stripe/checkout und /api/stripe/portal. */
const NOTICES: Record<string, string> = {
  'kauf:ungueltig': 'Das hat nicht geklappt. Bitte wähle die Stufe noch einmal.',
  'kauf:nicht-verfuegbar': 'Buchen geht gerade nicht. Versuch es bitte später noch einmal.',
  'kauf:fehler': 'Der Weg zur Zahlung ist gerade gestört. Versuch es bitte gleich noch einmal.',
  'kauf:schon-dabei': 'Du hast schon ein Abo. Wechseln kannst du unter „Abo verwalten“.',
  'kauf:von-hand':
    'Deine Stufe hat Nils von Hand für dich eingerichtet. Schreib ihm kurz, dann klärt ihr den Wechsel zusammen.',
  'portal:nicht-verfuegbar': 'Für dein Konto ist bei Stripe noch kein Abo hinterlegt.',
  'portal:fehler': 'Die Abo-Verwaltung ist gerade nicht erreichbar. Versuch es bitte gleich noch einmal.',
}

function noticeFor(params: Record<string, string | string[] | undefined>): string | null {
  for (const key of ['kauf', 'portal']) {
    const value = params[key]
    if (typeof value === 'string' && NOTICES[`${key}:${value}`]) return NOTICES[`${key}:${value}`]
  }
  return null
}

export default async function MembershipPage({
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

  const [membership, prices, params] = await Promise.all([
    loadMembership(supabase, user.id),
    loadSubscriptionPrices(),
    searchParams,
  ])

  const plan = membership?.plan ?? 'free'
  const isMember = plan !== 'free'
  const table = prices.ok && hasAnyPrice(prices.table) ? prices.table : null
  const notice = noticeFor(params)

  return (
    <>
      <style>{COURSE_CSS}</style>
      <style>{MEMBERSHIP_CSS}</style>
      <main className="cr-page">
        <div className="cr-wrap ms-wrap">
          <Link href="/training" className="cr-back">
            ← Zurück
          </Link>

          <header className="cr-head">
            <p className="cr-kicker">Mitgliedschaft</p>
            <h1 className="cr-title">Mit Nils an der Handpan wachsen</h1>
            <p className="cr-intro">
              Für alle, die dranbleiben und langfristig an ihrem Instrument wachsen wollen. Zwei
              Stufen, die aufeinander aufbauen.
            </p>
          </header>

          {notice ? (
            <p className="ms-note" role="status">
              {notice}
            </p>
          ) : null}

          {isMember ? (
            <div className="cr-locked">
              <p className="cr-locked-title">Du bist dabei: {TIER_NAMES[plan]}</p>
              {membership?.planSource === 'manual' ? (
                <p className="cr-locked-text">
                  Deine Stufe hat Nils für dich eingerichtet. Bei Fragen dazu{' '}
                  <a href={contactMailto('Meine Mitgliedschaft')}>
                    schreib ihm eine Nachricht
                  </a>
                  .
                </p>
              ) : (
                <p className="cr-locked-text">
                  Zahlart, Rechnungen, Wechsel der Stufe und Kündigung findest du unter „Abo
                  verwalten“.
                </p>
              )}
              {membership?.customerId ? (
                <form method="post" action="/api/stripe/portal" className="cr-actions">
                  <button type="submit" className="cr-btn">
                    Abo verwalten
                  </button>
                </form>
              ) : null}
            </div>
          ) : null}

          {!isMember && !table ? (
            <p className="ms-note" role="status">
              Buchen geht gerade nicht, die Preise laden nicht. Versuch es bitte später noch einmal.
            </p>
          ) : null}

          <Plans table={table} currentPlan={plan} />

          {!isMember ? (
            <p className="ms-small">
              Das Jahresabo kannst du auch in 3 Raten per Überweisung zahlen ({TIER_NAMES.vip} in
              4).{' '}
              <a href={contactMailto('Jahresabo in Raten')}>Schreib Nils dafür eine Nachricht.</a>
            </p>
          ) : null}
        </div>
      </main>
    </>
  )
}
