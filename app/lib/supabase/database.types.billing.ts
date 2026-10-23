// ─────────────────────────────────────────────────────────────────────────────
// Typen-Ergänzung für Migration 0012 (Abo und Kurse in der App kaufen).
//
// database.types.ts ist generiert und wird parallel an anderer Stelle gepflegt;
// statt sie von Hand zu erweitern, beschreibt diese Datei eng genau die neuen
// Funktionen und Spalten. Nach dem nächsten `supabase gen types` kann sie
// ersatzlos entfallen (die Aufrufer casten dann nicht mehr).
// ─────────────────────────────────────────────────────────────────────────────

import type { Plan } from '../plan'

export type PlanSource = 'stripe' | 'manual'

/** profiles-Spalten, die 0012 dazubringt bzw. die der Kaufweg liest. */
export interface ProfileBillingRow {
  id: string
  email: string | null
  full_name: string | null
  plan: string | null
  plan_source: PlanSource | null
  stripe_customer_id: string | null
}

export interface BillingFunctions {
  link_stripe_customer: { p_user: string; p_customer: string; p_replace?: boolean }
  set_plan_by_customer: { p_customer: string; p_plan: Plan }
  record_course_purchase: {
    p_session_id: string
    p_payment_intent: string | null
    p_customer: string | null
    p_email: string | null
    p_program_slug: string
    p_user: string | null
  }
  refund_course_purchase: { p_payment_intent: string }
  admin_set_plan: { p_email: string; p_plan: Plan }
  admin_release_plan: { p_email: string }
}

type RpcResult = PromiseLike<{ data: unknown; error: { message: string } | null }>

/** Nur `rpc` mit den neuen Funktionsnamen — mehr braucht der Kaufweg nicht. */
export interface BillingRpcClient {
  rpc<F extends keyof BillingFunctions>(fn: F, args: BillingFunctions[F]): RpcResult
}

/** Ein Supabase-Client (service oder server) als BillingRpcClient. */
export function billingRpc(client: unknown): BillingRpcClient {
  return client as BillingRpcClient
}

/** Die jsonb-Antwort der SECURITY-DEFINER-Funktionen, eingeengt. */
export interface RpcOutcome {
  ok?: boolean
  error?: string
  [key: string]: unknown
}

export function asOutcome(data: unknown): RpcOutcome {
  return data && typeof data === 'object' && !Array.isArray(data) ? (data as RpcOutcome) : {}
}
