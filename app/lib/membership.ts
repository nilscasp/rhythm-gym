import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { SUBSCRIPTION_LOOKUP_KEYS, buildPriceTable, type PriceTable } from './billing'
import { getStripe } from './stripe'
import { toPlan, type Plan } from './plan'
import type { PlanSource, ProfileBillingRow } from './supabase/database.types.billing'

// ─────────────────────────────────────────────────────────────────────────────
// Serverseitige Lader für den Kaufweg: Profil-Stand und Abo-Preise.
// Nur aus Server Components und Route Handlers importieren.
// ─────────────────────────────────────────────────────────────────────────────

export interface MembershipState {
  userId: string
  email: string | null
  plan: Plan
  planSource: PlanSource | null
  customerId: string | null
}

/**
 * Stand des angemeldeten Profils. `plan_source` steht (noch) nicht in den
 * generierten Typen (Migration 0012) — darum der untypisierte Zugriff mit
 * eng gecastetem Ergebnis. Fehlt die Spalte (Migration noch nicht
 * eingespielt), fällt die Abfrage auf die alten Spalten zurück.
 */
export async function loadMembership(
  /** Der normale Server-Client (RLS: nur die eigene Zeile). */
  supabase: unknown,
  userId: string
): Promise<MembershipState | null> {
  const client = supabase as unknown as SupabaseClient
  let { data, error } = await client
    .from('profiles')
    .select('id, email, plan, plan_source, stripe_customer_id')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    // Übergang: nach dem Einspielen von 0012 entfernen. Bis dahin laut, damit
    // ein fehlendes Einspielen auffällt (ohne plan_source greift kein manual-Schutz-Hinweis).
    console.error(
      '[mitgliedschaft] profiles.plan_source nicht lesbar, Rückfall auf alte Spalten. Migration 0012 eingespielt?',
      error.message
    )
    ;({ data, error } = await client
      .from('profiles')
      .select('id, email, plan, stripe_customer_id')
      .eq('id', userId)
      .maybeSingle())
  }
  if (error || !data) return null

  const row = data as Partial<ProfileBillingRow>
  return {
    userId,
    email: row.email ?? null,
    plan: toPlan(row.plan),
    planSource: row.plan_source === 'stripe' || row.plan_source === 'manual' ? row.plan_source : null,
    customerId: row.stripe_customer_id ?? null,
  }
}

export type PriceLoad = { ok: true; table: PriceTable } | { ok: false }

/** Die vier Abo-Preise über ihre Lookup-Keys. Fehler → { ok: false }, nie ein Wurf. */
export async function loadSubscriptionPrices(): Promise<PriceLoad> {
  if (!process.env.STRIPE_SECRET_KEY) return { ok: false }
  try {
    const res: Stripe.ApiList<Stripe.Price> = await getStripe().prices.list({
      lookup_keys: [...SUBSCRIPTION_LOOKUP_KEYS],
      active: true,
      limit: 10,
    })
    return { ok: true, table: buildPriceTable(res.data) }
  } catch (err) {
    console.error(
      '[mitgliedschaft] Preise nicht abrufbar:',
      err instanceof Error ? err.message : 'unbekannter Fehler'
    )
    return { ok: false }
  }
}
