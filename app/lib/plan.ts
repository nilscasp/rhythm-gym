// ─────────────────────────────────────────────────────────────────────────────
// Abo-Stufen — eine Rangfolge für die ganze App.
//
// free < premium < vip. VIP kommt durch jede Premium-Tür, Premium nicht durch
// die VIP-Tür. Das SQL-Gegenstück ist `plan_rank()` (Migration 0010); beide
// ändern sich nur zusammen. Benutzt von event-access.ts (Termine) und
// course-access.ts (Kurse „im Abo enthalten“).
//
// Unbekannte Werte zählen als free — fail closed.
// ─────────────────────────────────────────────────────────────────────────────

export const PLANS = ['free', 'premium', 'vip'] as const
export type Plan = (typeof PLANS)[number]

/** Stufen, in denen ein Kurs enthalten sein kann (programs.included_in_plan). */
export type PaidPlan = Exclude<Plan, 'free'>

export const PLAN_RANK: Record<Plan, number> = {
  free: 0,
  premium: 1,
  vip: 2,
}

/** Beliebiger Wert (profiles.plan, DB-Text, null) → gültige Stufe. */
export function toPlan(value: unknown): Plan {
  return typeof value === 'string' && (PLANS as readonly string[]).includes(value)
    ? (value as Plan)
    : 'free'
}

/** Gültige bezahlte Stufe oder null (z. B. für programs.included_in_plan). */
export function toPaidPlan(value: unknown): PaidPlan | null {
  const plan = toPlan(value)
  return plan === 'free' ? null : plan
}

/** Erreicht `plan` mindestens die Stufe `required`? */
export function planSatisfies(plan: unknown, required: Plan): boolean {
  return PLAN_RANK[toPlan(plan)] >= PLAN_RANK[required]
}
