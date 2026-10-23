// ─────────────────────────────────────────────────────────────────────────────
// Wie ein Stripe-Ereignis zu lesen ist — reine Funktionen, kein Netz, keine DB.
//
// Der Webhook selbst (app/api/stripe/webhook/route.ts) macht nur noch drei
// Dinge: Signatur prüfen, Idempotenz sichern, RPC rufen. Jede Auslegung dessen,
// was im Payload steht, liegt hier, damit sie in tests/stripe-events.test.ts
// ohne Stripe-Konto überprüfbar ist.
//
// Diese Datei kennt bewusst keine Stripe-Typen: sie beschreibt strukturell nur
// die Felder, auf die es ankommt. Stripe.Checkout.Session passt darauf, ohne
// dass der Test ein Session-Objekt nachbauen müsste.
// ─────────────────────────────────────────────────────────────────────────────

import { PLAN_RANK, toPlan, type PaidPlan, type Plan } from './plan'
import { courseSlugFromMetadata, isCourseSlug, tierFromMetadata } from './billing'

/** Nur die Felder einer Checkout-Session, die der Kaufweg braucht. */
export interface CheckoutSessionLike {
  id?: string | null
  customer_details?: { email?: string | null } | null
  customer_email?: string | null
  metadata?: Record<string, string> | null
}

export interface CheckoutFields {
  /** Getrimmt; null, wenn Stripe keine brauchbare Adresse mitschickt. */
  email: string | null
  /** `metadata.program_slug`; null bei einem Checkout ohne Kurs (z. B. Abo). */
  programSlug: string | null
  /** Geprüftes YYYY-MM-DD aus `metadata.drip_start`, sonst null. */
  dripStart: string | null
  /** Stripe-Session-Id — Eindeutigkeitsschlüssel in `pending_enrollments`. */
  sessionId: string
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Getrimmter String oder null — leere und nicht-String-Werte fallen weg. */
function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Ein Startdatum aus den Stripe-Metadaten, oder null.
 *
 * Zwei Hürden, nicht eine: erst die Form (YYYY-MM-DD), dann der Kalender.
 * Die Regex allein ließe '2026-02-31' durch — Postgres würde beim date-Cast
 * werfen, der Webhook mit 500 antworten, und Stripe stellt ein Ereignis, das
 * nie funktionieren kann, tagelang erneut zu. Lieber kein Drip-Datum (dann ist
 * der Kurs sofort offen, sichtbar und von Hand korrigierbar) als eine
 * Wiederholungsschleife, die niemand bemerkt.
 */
export function parseDripStart(value: unknown): string | null {
  const raw = cleanString(value)
  if (!raw || !ISO_DATE.test(raw)) return null

  const [year, month, day] = raw.split('-').map(Number)
  // Date.UTC normalisiert stillschweigend (31.02. → 03.03.). Der Rückvergleich
  // deckt genau das auf: nur ein echtes Kalenderdatum bleibt unverändert.
  const parsed = new Date(Date.UTC(year, month - 1, day))
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null
  }

  return raw
}

/**
 * Zählt ein Abo als bezahlt?
 *
 * `active` und `trialing` ja, alles andere nein — `canceled`, `unpaid`,
 * `past_due`, `incomplete`, `incomplete_expired`, `paused`. `past_due` ist
 * Absicht: wer nicht zahlt, verliert den Inneren Kreis sofort und bekommt ihn
 * mit der nächsten erfolgreichen Abbuchung (ein weiteres .updated) zurück.
 *
 * `deleted` überstimmt jeden Status, weil `customer.subscription.deleted` im
 * Payload noch den letzten Status trägt — das Ereignis selbst ist die Kündigung.
 */
export function isSubscriptionActive(
  status: string | null | undefined,
  deleted: boolean
): boolean {
  if (deleted) return false
  return status === 'active' || status === 'trialing'
}

/**
 * Die vier Felder, die aus einer bezahlten Checkout-Session zählen.
 *
 * `customer_details.email` steht über `customer_email`: das erste ist, was der
 * Käufer im Stripe-Checkout tatsächlich bestätigt hat, das zweite nur, was wir
 * vorab hineingereicht haben. Beim Einlösen muss die Adresse zu der passen, mit
 * der sich derselbe Mensch später anmeldet — also gilt die bestätigte.
 */
export function extractCheckoutFields(session: CheckoutSessionLike): CheckoutFields {
  return {
    email: cleanString(session.customer_details?.email) ?? cleanString(session.customer_email),
    programSlug: cleanString(session.metadata?.program_slug),
    dripStart: parseDripStart(session.metadata?.drip_start),
    sessionId: cleanString(session.id) ?? '',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Abschnitt F (Umzug von Skool): Abo-Stufen aus Stripe, Kurs-Slug aus
// Preis-Metadaten, Rückerstattungen. Weiterhin reine Funktionen.
//
// Leitregeln:
//   · Die Stufe kommt aus den Preis-Metadaten (`platform=lernen`, `tier`),
//     nie aus dem Produktnamen oder einer Preis-Id.
//   · `active` / `trialing` → Stufe. `past_due` → Stufe bleibt (Nachfrist,
//     bis Stripe nach den Wiederholungen kündigt oder auf `unpaid` stellt).
//     Alles andere → free.
//   · Hat dieselbe Person (derselbe Stripe-Kunde) mehrere Abos, zählt das
//     höchste noch laufende. Ein auslaufendes Premium-Abo stuft einen VIP mit
//     laufendem VIP-Abo nicht herunter.
//   · Eine von Hand gesetzte Stufe (`plan_source = 'manual'`, z. B. Raten per
//     Überweisung) fasst der Webhook nie an. Die Datenbank erzwingt das in
//     set_plan_by_customer() (Migration 0012); decidePlanChange() ist der
//     gleiche Gedanke für Tests und Logzeilen.
//
// `isSubscriptionActive` oben bleibt für den alten Weg stehen
// (set_membership_by_customer); der neue Weg nutzt planForStatus.
// ─────────────────────────────────────────────────────────────────────────────

/** Nur die Felder eines Abos, auf die es ankommt. */
export interface SubscriptionLike {
  id?: string | null
  status?: string | null
  metadata?: Record<string, string> | null
  items?: {
    data?: ReadonlyArray<{
      price?: { metadata?: Record<string, string> | null } | null
    }> | null
  } | null
}

/** Status, in denen die Stufe gilt. `past_due` = Nachfrist. */
const PAID_STATUSES = new Set(['active', 'trialing', 'past_due'])

function higher(a: Plan, b: Plan): Plan {
  return PLAN_RANK[b] > PLAN_RANK[a] ? b : a
}

/**
 * Stufe eines Abos: die höchste aus den Preis-Metadaten seiner Positionen.
 * Rückfall auf die Abo-Metadaten (der eigene Checkout setzt sie über
 * subscription_data.metadata). Null = kein Abo dieser Plattform.
 */
export function tierOfSubscription(sub: SubscriptionLike): PaidPlan | null {
  let best: PaidPlan | null = null
  for (const item of sub.items?.data ?? []) {
    const tier = tierFromMetadata(item.price?.metadata)
    if (tier && (!best || PLAN_RANK[tier] > PLAN_RANK[best])) best = tier
  }
  return best ?? tierFromMetadata(sub.metadata)
}

/** Stufe, die ein einzelnes Abo in seinem Status vergibt. */
export function planForStatus(tier: PaidPlan, status: string | null | undefined): Plan {
  return status && PAID_STATUSES.has(status) ? tier : 'free'
}

/**
 * Die Stufe, die alle Abos eines Kunden zusammen ergeben — das höchste noch
 * geltende. Null, wenn keines davon zu dieser Plattform gehört: dann geht das
 * Ereignis `profiles.plan` nichts an.
 */
export function planFromSubscriptions(subs: readonly SubscriptionLike[]): Plan | null {
  let seen = false
  let plan: Plan = 'free'
  for (const sub of subs) {
    const tier = tierOfSubscription(sub)
    if (!tier) continue
    seen = true
    plan = higher(plan, planForStatus(tier, sub.status))
  }
  return seen ? plan : null
}

/** Status, in denen ein Abo noch „lebt“ (auch unbezahlt oder pausiert). */
const LIVING_STATUSES = new Set(['active', 'trialing', 'past_due', 'incomplete', 'unpaid', 'paused'])

/**
 * Hat der Kunde schon ein nicht beendetes Abo dieser Plattform? Dann kein
 * zweiter Checkout, sondern das Kundenportal (Wechsel, Zahlart, Kündigung).
 * Abos anderer Produkte im selben Stripe-Konto zählen nicht.
 */
export function hasRunningPlatformSubscription(subs: readonly SubscriptionLike[]): boolean {
  return subs.some((s) => tierOfSubscription(s) !== null && !!s.status && LIVING_STATUSES.has(s.status))
}

/**
 * Abo aus dem Ereignis mit der frisch abgerufenen Liste zusammenführen.
 * Die Liste gewinnt (sie ist aktueller als ein verspätet zugestelltes
 * Ereignis). Fehlt das Abo darin, zählt das Ereignis — bei `.deleted` als
 * gekündigt, egal welcher Status noch im Payload steht.
 */
export function mergeSubscription(
  list: readonly SubscriptionLike[],
  fromEvent: SubscriptionLike,
  deleted: boolean
): SubscriptionLike[] {
  const merged = [...list]
  if (!fromEvent.id || !merged.some((s) => s.id === fromEvent.id)) {
    merged.push(deleted ? { ...fromEvent, status: 'canceled' } : fromEvent)
  }
  return merged
}

export type PlanDecision =
  | { action: 'set'; plan: Plan }
  | { action: 'skip'; reason: 'manual' | 'unchanged' }

/**
 * Darf der Webhook die Stufe ändern, und auf was? Spiegel der Regel in
 * set_plan_by_customer(): `plan_source = 'manual'` schützt jede Stufe —
 * auch free —, bis Nils sie wieder an Stripe übergibt.
 */
export function decidePlanChange(
  profile: { plan: unknown; plan_source: unknown },
  target: Plan
): PlanDecision {
  if (profile.plan_source === 'manual') return { action: 'skip', reason: 'manual' }
  if (toPlan(profile.plan) === target && profile.plan_source === 'stripe') {
    return { action: 'skip', reason: 'unchanged' }
  }
  return { action: 'set', plan: target }
}

/** Ist die Zahlung durch? `unpaid` heißt z. B. SEPA unterwegs → später async_payment_succeeded. */
export function isCheckoutPaid(session: { payment_status?: string | null }): boolean {
  return session.payment_status === 'paid' || session.payment_status === 'no_payment_required'
}

/** Id aus einem Feld, das mal String, mal ausgeklapptes Objekt ist. */
export function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : value.id
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** client_reference_id → Nutzer-Id, nur wenn es eine UUID ist. */
export function userIdFromReference(value: unknown): string | null {
  const v = cleanString(value)
  return v && UUID.test(v) ? v.toLowerCase() : null
}

/**
 * Die Nutzer-Id einer Checkout-Session — NUR, wenn die Session nachweislich
 * aus unserem eigenen Checkout (/api/stripe/checkout) stammt.
 *
 * Warum so streng: Öffentliche Payment Links nehmen `?client_reference_id=…`
 * aus der URL an. Wer eine fremde Profil-Id kennt, könnte sonst seinen
 * Stripe-Kunden mit diesem Profil verknüpfen (oder den echten Kunden des
 * Opfers verdrängen). Session-Metadaten dagegen setzt nur unser Server; ein
 * Payment Link kann sie nicht per URL ändern. Also gilt die Id nur, wenn
 *   · kein Payment Link im Spiel ist,
 *   · metadata.platform = 'lernen' und
 *   · metadata.user_id exakt client_reference_id ist.
 * Sonst null — der Kauf läuft dann wie ein Payment-Link-Kauf über die
 * E-Mail-Adresse, verknüpft aber keinen Kunden.
 */
export function trustedCheckoutUserId(session: {
  payment_link?: string | { id: string } | null
  client_reference_id?: string | null
  metadata?: Record<string, string> | null
}): string | null {
  if (session.payment_link) return null
  if (cleanString(session.metadata?.platform) !== 'lernen') return null
  const fromRef = userIdFromReference(session.client_reference_id)
  const fromMeta = userIdFromReference(session.metadata?.user_id)
  return fromRef && fromMeta && fromRef === fromMeta ? fromRef : null
}

/** Was ein Kurskauf beim Freischalten bewirkt hat (course_purchases, Migration 0012). */
export interface CoursePurchaseGrant {
  refunded_at: string | null
  /**
   * Anker des Enrollments, das zu diesem Kauf gehört (neu angelegt oder schon
   * da). `enrollments` hat keine eigene Id; in SQL ist der Anker
   * enrolled_user_id + program_id + enrollment_started_at.
   */
  enrollment_id: string | null
  /** true nur, wenn DIESER Kauf das Enrollment angelegt oder wieder geöffnet hat. */
  created_enrollment: boolean
  /** Geparkter Kauf ohne Konto. */
  pending_enrollment_id: string | null
  /** Enrollment, das claim_pending_enrollments() aus dem geparkten Kauf angelegt hat. */
  pending_claimed_enrollment_id: string | null
  pending_claimed: boolean
}

export type RefundDecision =
  | { action: 'already_refunded' }
  | { action: 'revoke_enrollment'; enrollmentId: string }
  | { action: 'close_pending'; pendingId: string }
  | { action: 'mark_only'; reason: 'preexisting_enrollment' | 'nothing_granted' }

/**
 * Welches Enrollment eine volle Erstattung sperren darf — genau eines, und
 * nur, wenn es durch diesen Kauf entstand. Ein Enrollment, das vorher schon
 * bestand (anderer Kauf, Zugangscode), bleibt stehen: dann wird nur der Kauf
 * als erstattet markiert und Nils entscheidet. Keine Suche über die E-Mail.
 * Spiegel von refund_course_purchase() in Migration 0012.
 */
export function decideRefund(p: CoursePurchaseGrant): RefundDecision {
  if (p.refunded_at) return { action: 'already_refunded' }
  if (p.enrollment_id) {
    return p.created_enrollment
      ? { action: 'revoke_enrollment', enrollmentId: p.enrollment_id }
      : { action: 'mark_only', reason: 'preexisting_enrollment' }
  }
  if (p.pending_enrollment_id) {
    if (!p.pending_claimed) return { action: 'close_pending', pendingId: p.pending_enrollment_id }
    return p.pending_claimed_enrollment_id
      ? { action: 'revoke_enrollment', enrollmentId: p.pending_claimed_enrollment_id }
      : { action: 'mark_only', reason: 'preexisting_enrollment' }
  }
  return { action: 'mark_only', reason: 'nothing_granted' }
}

/**
 * Kurs-Slug eines Kaufs. Reihenfolge:
 *   1. metadata.program_slug (bisherige Payment-Links)
 *   2. metadata.course_slug (eigener Checkout)
 *   3. course_slug aus den Preis-Metadaten der Positionen (`platform=lernen`)
 * Nur gültige Slugs; sonst null.
 */
export function checkoutCourseSlug(
  session: { metadata?: Record<string, string> | null },
  linePriceMetadata: ReadonlyArray<Record<string, string> | null | undefined> = []
): string | null {
  const fromSession =
    cleanString(session.metadata?.program_slug) ?? cleanString(session.metadata?.course_slug)
  if (fromSession) return isCourseSlug(fromSession) ? fromSession : null
  for (const meta of linePriceMetadata) {
    const slug = courseSlugFromMetadata(meta)
    if (slug) return slug
  }
  return null
}

/** Braucht es die Positionen (ein Netzaufruf), um den Kurs zu finden? */
export function needsLineItemsForCourse(session: {
  metadata?: Record<string, string> | null
}): boolean {
  return !cleanString(session.metadata?.program_slug) && !cleanString(session.metadata?.course_slug)
}

/**
 * Nimmt eine Rückerstattung den Kurs? Nur bei voller Erstattung. Teil-
 * erstattungen (Kulanz, Gebühr) lassen den Zugang stehen.
 */
export function isFullRefund(charge: {
  refunded?: boolean | null
  amount?: number | null
  amount_refunded?: number | null
}): boolean {
  if (charge.refunded === true) return true
  return (
    typeof charge.amount === 'number' &&
    typeof charge.amount_refunded === 'number' &&
    charge.amount > 0 &&
    charge.amount_refunded >= charge.amount
  )
}
