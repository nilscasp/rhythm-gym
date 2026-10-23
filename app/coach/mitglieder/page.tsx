import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '../../lib/supabase/server'
import type { ProfileBillingRow } from '../../lib/supabase/database.types.billing'
import { PLANS, toPlan, type Plan } from '../../lib/plan'
import { TIER_NAMES } from '../../lib/tiers'
import { COURSE_CSS } from '../../training/_course/views'
import { releasePlanAction, setPlanAction } from './_actions'

// ─────────────────────────────────────────────────────────────────────────────
// /coach/mitglieder — nur für Admins. Suche nach E-Mail, Stufe von Hand
// setzen (Quelle „manual“: der Stripe-Webhook lässt sie dann in Ruhe), zeigt,
// ob es einen Stripe-Kunden gibt. Noch nicht aus /coach verlinkt.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata = { title: 'Mitglieder — Coach' }
export const dynamic = 'force-dynamic'

const PLAN_LABEL: Record<Plan, string> = {
  free: 'Ohne Abo',
  premium: TIER_NAMES.premium,
  vip: TIER_NAMES.vip,
}

const RESULTS: Record<string, string> = {
  gesetzt: 'Stufe gesetzt. Quelle: von Hand — Stripe ändert sie nicht mehr.',
  freigegeben: 'Stufe wieder an Stripe übergeben. Die nächste Abo-Meldung von Stripe setzt sie.',
  ungueltig: 'Eingabe unvollständig.',
  unknown_email: 'Zu dieser Adresse gibt es kein Konto.',
  ambiguous_email: 'Zu dieser Adresse gibt es mehrere Konten — bitte in Supabase klären.',
  forbidden: 'Keine Berechtigung.',
  invalid_plan: 'Unbekannte Stufe.',
  fehler: 'Das hat nicht geklappt (Datenbank). Ist Migration 0012 eingespielt?',
}

const CSS = `
  .mg-form { display: flex; flex-wrap: wrap; gap: 12px; }
  .mg-input, .mg-select {
    min-height: 48px; padding: 10px 14px; border: 1px solid var(--border2); border-radius: 2px;
    background: transparent; color: var(--text); font-family: var(--font-body); font-size: 16px;
  }
  .mg-input { flex: 1 1 260px; min-width: 0; }
  .mg-list { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--border); }
  .mg-row { display: flex; flex-direction: column; gap: 10px; padding: 16px 0; border-bottom: 1px solid var(--border); }
  .mg-mail { font-family: var(--font-body); font-size: 17px; color: var(--cream); overflow-wrap: anywhere; }
  .mg-meta { font-family: var(--font-ui); font-size: 14px; color: var(--muted2); }
  .mg-row form { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
  .mg-row .cr-btn { cursor: pointer; }
`

/** % und _ sind in ILIKE Platzhalter — als Text suchen. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`)
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: me } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()
  if (!me?.is_admin) redirect('/training')

  const params = await searchParams
  const q = typeof params.q === 'string' ? params.q.trim().slice(0, 120) : ''
  const result = typeof params.ergebnis === 'string' ? RESULTS[params.ergebnis] : undefined

  let rows: ProfileBillingRow[] = []
  let loadError = false
  if (q.length >= 3) {
    // plan_source steht noch nicht in den generierten Typen (Migration 0012).
    const { data, error } = await (supabase as unknown as SupabaseClient)
      .from('profiles')
      .select('id, email, full_name, plan, plan_source, stripe_customer_id')
      .ilike('email', `%${escapeLike(q)}%`)
      .order('email')
      .limit(25)
    if (error) loadError = true
    rows = (data ?? []) as ProfileBillingRow[]
  }

  return (
    <>
      <style>{COURSE_CSS}</style>
      <style>{CSS}</style>
      <main className="cr-page">
        <div className="cr-wrap">
          <Link href="/coach" className="cr-back">
            ← Coach
          </Link>
          <header className="cr-head">
            <p className="cr-kicker">Coach</p>
            <h1 className="cr-title">Mitglieder</h1>
            <p className="cr-intro">
              Stufe von Hand setzen, z. B. bei Raten per Überweisung. Eine von Hand gesetzte Stufe
              ändert Stripe nicht mehr, bis du sie wieder an Stripe übergibst.
            </p>
          </header>

          {result ? (
            <p className="cr-locked-text" role="status">
              {result}
            </p>
          ) : null}

          <form method="get" className="mg-form" role="search">
            <input
              className="mg-input"
              type="search"
              name="q"
              defaultValue={q}
              placeholder="E-Mail (mindestens 3 Zeichen)"
              aria-label="Nach E-Mail suchen"
              autoComplete="off"
            />
            <button type="submit" className="cr-btn" style={{ cursor: 'pointer' }}>
              Suchen
            </button>
          </form>

          {loadError ? (
            <p className="cr-muted">Suche fehlgeschlagen. Ist Migration 0012 eingespielt?</p>
          ) : q.length >= 3 && rows.length === 0 ? (
            <p className="cr-muted">Keine Treffer.</p>
          ) : null}

          {rows.length > 0 ? (
            <ul className="mg-list">
              {rows.map((row) => {
                const plan = toPlan(row.plan)
                const source =
                  row.plan_source === 'manual'
                    ? 'von Hand'
                    : row.plan_source === 'stripe'
                      ? 'Stripe'
                      : 'nie gesetzt'
                return (
                  <li key={row.id} className="mg-row">
                    <span className="mg-mail">{row.email ?? '(ohne Adresse)'}</span>
                    <span className="mg-meta">
                      {row.full_name ? `${row.full_name} · ` : ''}
                      {PLAN_LABEL[plan]} · Quelle: {source} · Stripe-Kunde:{' '}
                      {row.stripe_customer_id ? 'ja' : 'nein'}
                    </span>
                    {row.email ? (
                      <form action={setPlanAction}>
                        <input type="hidden" name="email" value={row.email} />
                        <input type="hidden" name="q" value={q} />
                        <select
                          name="plan"
                          defaultValue={plan}
                          className="mg-select"
                          aria-label={`Stufe für ${row.email}`}
                        >
                          {PLANS.map((p) => (
                            <option key={p} value={p}>
                              {PLAN_LABEL[p]}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="cr-btn">
                          Von Hand setzen
                        </button>
                      </form>
                    ) : null}
                    {row.email && row.plan_source === 'manual' ? (
                      <form action={releasePlanAction}>
                        <input type="hidden" name="email" value={row.email} />
                        <input type="hidden" name="q" value={q} />
                        <button type="submit" className="cr-btn cr-btn--ghost">
                          Wieder an Stripe übergeben
                        </button>
                      </form>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          ) : null}
        </div>
      </main>
    </>
  )
}
