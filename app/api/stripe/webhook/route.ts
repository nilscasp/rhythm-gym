import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe, isStripeConfigured } from '../../../lib/stripe'
import {
  checkoutCourseSlug,
  extractCheckoutFields,
  idOf,
  isCheckoutPaid,
  isFullRefund,
  mergeSubscription,
  needsLineItemsForCourse,
  planFromSubscriptions,
  userIdFromReference,
  type SubscriptionLike,
} from '../../../lib/stripe-events'
import { createServiceClient, type ServiceClient } from '../../../lib/supabase/service'
import { asOutcome, billingRpc } from '../../../lib/supabase/database.types.billing'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/stripe/webhook — der einzige Weg vom bezahlten Checkout ins
// Enrollment und vom Abo-Status ins Profil.
//
// Der Endpunkt ist öffentlich erreichbar; sein einziger Türsteher ist die
// Stripe-Signatur über den ROHEN Body. Erst danach wird der service_role-Client
// überhaupt angefasst — das ist die Verifikation, auf die sich der Kommentar in
// app/lib/supabase/service.ts beruft.
//
// Ereignisse (Stripe → Webhook-Endpunkt abonnieren):
//   checkout.session.completed            Abo: Kunde ↔ Profil, Stufe nachziehen
//                                          Kurs: Enrollment (wenn bezahlt)
//   checkout.session.async_payment_succeeded  Kurs mit verzögerter Zahlung (SEPA)
//   customer.subscription.created|updated|deleted  → profiles.plan
//   charge.refunded                        volle Erstattung eines Kurses → 'refunded'
//
// Stufen-Regeln (app/lib/stripe-events.ts, Abschnitt F; Migration 0012):
//   · Stufe aus den Preis-Metadaten (`platform=lernen`, `tier`).
//   · active/trialing → Stufe, past_due → Stufe bleibt (Nachfrist),
//     canceled/unpaid/incomplete_expired (und alles andere) → free.
//   · Es zählt das höchste laufende Abo DESSELBEN Kunden — darum wird bei
//     jedem Abo-Ereignis die ganze Abo-Liste des Kunden bei Stripe gelesen.
//   · plan_source = 'manual' (von Nils gesetzt) fasst der Webhook nie an;
//     das erzwingt set_plan_by_customer() in der Datenbank.
//
// Antwortformen:
//   200 { received, duplicate }  — schon verarbeitet, nichts getan
//   200 { received, ignored }    — Ereignistyp geht uns nichts an
//   200 { received, handled }    — verarbeitet (auch bei fachlichem Nein)
//   400 { error }                — Signatur fehlt oder passt nicht
//   503 { error }                — Stripe-Zugangsdaten fehlen
//   500 { error }                — echter Serverfehler, Stripe soll wiederholen
//
// Grundregel für die Statuswahl: 200 heißt „nicht noch einmal schicken".
// Alles, was eine Wiederholung nicht heilen kann — ein unbekannter Programm-
// Slug, ein Checkout ohne Kurs, ein Kunde ohne Profil — bekommt deshalb 200 und
// eine laute Logzeile. Nur was beim nächsten Versuch klappen könnte, gibt 500.
// Andernfalls wiederholt Stripe tagelang ein Ereignis, das nie passen wird.
//
// In KEINER Logzeile steht eine E-Mail-Adresse. Kundennummern (cus_…) sind in
// Ordnung: sie identifizieren bei Stripe, nicht hier.
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * `stripe_events` und `pending_enrollments` sind service_role-only und stehen
 * (noch) nicht in database.types.ts. Statt die generierte Datei von Hand zu
 * erweitern, beschreibt dieser eng geschnittene Typ genau die zwei
 * Operationen, die der Webhook auf dem Ereignis-Journal ausführt. Nach dem
 * nächsten `supabase gen types` kann er ersatzlos entfallen.
 */
interface EventLedger {
  from(table: 'stripe_events'): {
    insert(values: { event_id: string; type: string }): PromiseLike<{
      error: { code?: string; message: string } | null
    }>
    delete(): {
      eq(
        column: 'event_id',
        value: string
      ): PromiseLike<{ error: { message: string } | null }>
    }
  }
}

function ledger(client: ServiceClient): EventLedger {
  return client as unknown as EventLedger
}

/** Postgres: unique_violation. Genau dann war das Ereignis schon einmal da. */
const UNIQUE_VIOLATION = '23505'

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    console.error(
      '[stripe/webhook] Nicht konfiguriert: STRIPE_SECRET_KEY und/oder STRIPE_WEBHOOK_SECRET fehlen. Endpunkt antwortet bis dahin mit 503.'
    )
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    console.error('[stripe/webhook] Anfrage ohne stripe-signature-Header abgewiesen.')
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 })
  }

  // Der rohe Body, nicht request.json(): die Signatur gilt über die exakten
  // Bytes. Einmal geparst und neu serialisiert stimmt sie nie wieder — ein
  // Fehler, der lokal mit der Stripe-CLI sofort auffällt und in Produktion
  // jeden Kauf verschluckt.
  const raw = await request.text()

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(
      raw,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    )
  } catch (err) {
    // Bewusst ohne Payload und ohne Signatur im Log: wer hier ankommt, ist
    // entweder ein falsch konfiguriertes Secret oder jemand, der es versucht.
    console.error(
      '[stripe/webhook] Signaturprüfung fehlgeschlagen:',
      err instanceof Error ? err.message : 'unbekannter Fehler'
    )
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
  }

  // Typen, die uns nichts angehen, gar nicht erst ins Journal schreiben.
  if (!HANDLED_TYPES.has(event.type)) {
    return NextResponse.json({ received: true, ignored: true })
  }

  const service = createServiceClient()

  // ── Idempotenz VOR der Wirkung ────────────────────────────────────────────
  // Stripe stellt jedes Ereignis mehrfach zu (Retry nach Timeout, manuelles
  // Resend). Der Primärschlüssel auf event_id ist die Sperre: der erste Insert
  // gewinnt, jeder weitere prallt mit 23505 ab.
  //
  // Die Reihenfolge ist Absicht. Erst schreiben, dann wirken heißt: zwei
  // gleichzeitig eintreffende Kopien desselben Ereignisses können nie beide
  // durchlaufen. Umgekehrt (erst wirken, dann schreiben) gäbe es ein Fenster,
  // in dem zwei Enrollments entstehen.
  const { error: ledgerError } = await ledger(service)
    .from('stripe_events')
    .insert({ event_id: event.id, type: event.type })

  if (ledgerError) {
    if (ledgerError.code === UNIQUE_VIOLATION) {
      console.info('[stripe/webhook] Bereits verarbeitet, übersprungen:', event.id, event.type)
      return NextResponse.json({ received: true, duplicate: true })
    }
    // Journal nicht schreibbar → wir wissen nicht, ob schon gewirkt wurde.
    // Nichts tun und Stripe wiederholen lassen ist die sichere Richtung.
    console.error('[stripe/webhook] Journal nicht schreibbar:', ledgerError.message)
    return NextResponse.json({ error: 'ledger_unavailable' }, { status: 500 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        await handleCheckoutCompleted(service, event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionChange(
          service,
          event.data.object as Stripe.Subscription,
          event.type === 'customer.subscription.deleted'
        )
        break

      case 'charge.refunded':
        await handleChargeRefunded(service, event.data.object as Stripe.Charge)
        break
    }
  } catch (err) {
    // Die Wirkung ist gescheitert, das Journal behauptet aber „erledigt".
    // Bliebe die Zeile stehen, würde Stripes Wiederholung als Duplikat
    // abgewiesen — der Kauf wäre für immer verloren, ohne dass jemand etwas
    // merkt. Also die Zeile zurücknehmen und den nächsten Versuch zulassen.
    const { error: rollbackError } = await ledger(service)
      .from('stripe_events')
      .delete()
      .eq('event_id', event.id)

    if (rollbackError) {
      // Der schlimmste Fall: Wirkung gescheitert UND Journal blockiert. Nur
      // von Hand zu heilen, deshalb so laut wie möglich.
      console.error(
        '[stripe/webhook] ACHTUNG: Rücknahme des Journal-Eintrags fehlgeschlagen. Ereignis',
        event.id,
        'wird bei Wiederholung als Duplikat abgewiesen. Zeile in stripe_events von Hand löschen. Grund:',
        rollbackError.message
      )
    }

    console.error(
      '[stripe/webhook] Verarbeitung fehlgeschlagen für',
      event.id,
      event.type,
      '—',
      err instanceof Error ? err.message : 'unbekannter Fehler'
    )
    return NextResponse.json({ error: 'processing_failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true, handled: true })
}

const HANDLED_TYPES = new Set<string>([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'charge.refunded',
])

// ── Checkout ─────────────────────────────────────────────────────────────────

/**
 * Abgeschlossener Checkout.
 *
 * Abo (mode subscription): Kunde ↔ Profil verknüpfen (client_reference_id
 * setzt nur unser eigener Checkout) und die Stufe aus allen Abos des Kunden
 * nachziehen. Das macht den Weg unabhängig von der Reihenfolge, in der Stripe
 * checkout.session.completed und customer.subscription.created zustellt.
 *
 * Kurs (mode payment): Enrollment über grant_enrollment_by_email (0007), dann
 * den Kauf für spätere Rückerstattungen merken (0012). Nur wenn bezahlt —
 * verzögerte Zahlarten kommen über async_payment_succeeded noch einmal.
 */
async function handleCheckoutCompleted(
  service: ServiceClient,
  session: Stripe.Checkout.Session
): Promise<void> {
  const sessionId = session.id
  const customerId = idOf(session.customer)
  const userId = userIdFromReference(session.client_reference_id)

  if (session.mode === 'subscription') {
    if (!customerId) {
      console.error('[stripe/webhook] Abo-Checkout ohne Kundennummer:', sessionId)
      return
    }
    if (userId) {
      await linkCustomer(service, userId, customerId, true)
    } else {
      console.info('[stripe/webhook] Abo-Checkout ohne client_reference_id:', sessionId)
    }
    await syncCustomerPlan(service, customerId, null, false)
    return
  }

  if (!isCheckoutPaid(session)) {
    console.info(
      '[stripe/webhook] Checkout noch nicht bezahlt, warte auf async_payment_succeeded:',
      sessionId,
      session.payment_status
    )
    return
  }

  const { email, dripStart } = extractCheckoutFields(session)

  let linePriceMetadata: Array<Record<string, string> | null> = []
  if (needsLineItemsForCourse(session)) {
    // Bisherige Payment-Links tragen den Kurs nur am Preis. Ein Fehler hier
    // ist vorübergehend (Netz) → werfen, Stripe wiederholt.
    const items = await getStripe().checkout.sessions.listLineItems(sessionId, { limit: 20 })
    linePriceMetadata = items.data.map((item) => item.price?.metadata ?? null)
  }

  const programSlug = checkoutCourseSlug(session, linePriceMetadata)

  // Nicht jeder Checkout ist ein Kurs (z. B. ein Einzeltermin über einen
  // anderen Link). Kein Fehler, keine Wiederholung — nur eine Notiz.
  if (!programSlug) {
    console.info('[stripe/webhook] Checkout ohne Kurs, nichts freizuschalten:', sessionId)
    return
  }

  const { data, error } = await service.rpc('grant_enrollment_by_email', {
    p_email: email ?? '',
    p_program_slug: programSlug,
    p_drip_start: dripStart,
    p_session_id: sessionId || null,
  })

  // Ein RPC-Fehler ist ein echter Fehler (Netz, Rechte, Ausnahme in der
  // Funktion) — werfen, damit oben zurückgerollt wird und Stripe wiederholt.
  if (error) {
    throw new Error(`grant_enrollment_by_email: ${error.message}`)
  }

  const outcome = asOutcome(data)

  // Fachliches Nein: 'missing_email' / 'unknown_program'. Beides heilt keine
  // Wiederholung; beides muss jemand ansehen.
  if (outcome.ok === false) {
    console.error(
      '[stripe/webhook] Kauf konnte nicht zugeordnet werden:',
      outcome.error,
      '| Programm:',
      programSlug,
      '| Session:',
      sessionId
    )
    return
  }

  // Kauf merken (für charge.refunded) und ggf. ein erstattetes Enrollment
  // wieder öffnen. Ein Fehler hier ist ein echter Fehler → werfen; das
  // Enrollment davor ist idempotent und übersteht die Wiederholung.
  const recorded = await billingRpc(service).rpc('record_course_purchase', {
    p_session_id: sessionId,
    p_payment_intent: idOf(session.payment_intent),
    p_customer: customerId,
    p_email: email,
    p_program_slug: programSlug,
    p_user: userId,
  })
  if (recorded.error) {
    throw new Error(`record_course_purchase: ${recorded.error.message}`)
  }

  if (userId && customerId) {
    // Für das Kundenportal; ein bestehender Kunde wird bei Kurskäufen nie ersetzt.
    await linkCustomer(service, userId, customerId, false)
  }

  console.info(
    '[stripe/webhook] Kauf verarbeitet:',
    JSON.stringify({
      program: programSlug,
      enrolled: outcome.enrolled === true,
      already_enrolled: outcome.already_enrolled === true,
      pending: outcome.pending === true,
      reactivated: asOutcome(recorded.data).reactivated === true,
      drip_start: dripStart,
    })
  )
}

// ── Abo ──────────────────────────────────────────────────────────────────────

/** Abo angelegt, geändert oder beendet → `profiles.plan`. */
async function handleSubscriptionChange(
  service: ServiceClient,
  subscription: Stripe.Subscription,
  deleted: boolean
): Promise<void> {
  const customerId = idOf(subscription.customer)
  if (!customerId) {
    console.error('[stripe/webhook] Abo-Ereignis ohne Kundennummer, übersprungen.')
    return
  }

  // Unser Checkout schreibt die Nutzer-Id auch ans Abo. Kommt dieses Ereignis
  // vor checkout.session.completed an, ist der Kunde trotzdem zuordenbar.
  const userId = userIdFromReference(subscription.metadata?.user_id)
  if (userId) {
    await linkCustomer(service, userId, customerId, true)
  }

  await syncCustomerPlan(service, customerId, subscription, deleted)
}

/**
 * Liest alle Abos des Kunden bei Stripe, rechnet die geltende Stufe aus und
 * schreibt sie über set_plan_by_customer (manual-Schutz in der DB).
 *
 * Ein Fehler beim Lesen ist vorübergehend → werfen, Stripe wiederholt.
 */
async function syncCustomerPlan(
  service: ServiceClient,
  customerId: string,
  fromEvent: SubscriptionLike | null,
  deleted: boolean
): Promise<void> {
  const list = await getStripe().subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 100,
  })

  const subs: SubscriptionLike[] = fromEvent
    ? mergeSubscription(list.data, fromEvent, deleted)
    : list.data
  const plan = planFromSubscriptions(subs)

  if (plan === null) {
    console.info(
      '[stripe/webhook] Kein Abo dieser Plattform beim Kunden',
      customerId,
      '— Stufe bleibt unberührt.'
    )
    return
  }

  const { data, error } = await billingRpc(service).rpc('set_plan_by_customer', {
    p_customer: customerId,
    p_plan: plan,
  })
  if (error) {
    throw new Error(`set_plan_by_customer: ${error.message}`)
  }

  const outcome = asOutcome(data)

  // Normalfall für Abos, die nicht über unseren Checkout entstanden sind
  // (z. B. im Dashboard angelegt). Wiederholen hilft nicht.
  if (outcome.ok === false && outcome.error === 'unknown_customer') {
    console.info(
      '[stripe/webhook] Kein Profil zu Kundennummer',
      customerId,
      '— Stufe kann nicht gesetzt werden (Coach → Mitglieder, von Hand).'
    )
    return
  }

  if (outcome.ok === false) {
    console.error('[stripe/webhook] Stufe nicht gesetzt:', outcome.error, '| Kunde:', customerId)
    return
  }

  console.info(
    '[stripe/webhook] Stufe:',
    JSON.stringify({
      customer: customerId,
      plan: typeof outcome.plan === 'string' ? outcome.plan : null,
      previous: typeof outcome.previous === 'string' ? outcome.previous : null,
      skipped: typeof outcome.skipped === 'string' ? outcome.skipped : null,
      subscriptions: subs.length,
    })
  )
}

/**
 * Kunde ↔ Profil. 'customer_taken' (Kunde hängt schon an einem anderen Profil)
 * ist ein fachliches Nein: laut loggen, nicht wiederholen.
 */
async function linkCustomer(
  service: ServiceClient,
  userId: string,
  customerId: string,
  replace: boolean
): Promise<void> {
  const { data, error } = await billingRpc(service).rpc('link_stripe_customer', {
    p_user: userId,
    p_customer: customerId,
    p_replace: replace,
  })
  if (error) {
    throw new Error(`link_stripe_customer: ${error.message}`)
  }
  const outcome = asOutcome(data)
  if (outcome.ok === false) {
    console.error(
      '[stripe/webhook] Kunde nicht verknüpft:',
      outcome.error,
      '| Kunde:',
      customerId
    )
  } else if (outcome.replaced === true) {
    console.info('[stripe/webhook] Kundennummer am Profil ersetzt durch', customerId)
  }
}

// ── Rückerstattung ───────────────────────────────────────────────────────────

/**
 * Volle Erstattung eines Kurskaufs → Enrollment 'refunded'. Abo-Zahlungen
 * laufen hier ebenfalls durch, finden aber keinen Kurskauf und werden nur
 * notiert — das Abo selbst regelt Stripe über den Abo-Status.
 */
async function handleChargeRefunded(service: ServiceClient, charge: Stripe.Charge): Promise<void> {
  if (!isFullRefund(charge)) {
    console.info('[stripe/webhook] Teilerstattung, Zugang bleibt:', charge.id)
    return
  }

  const paymentIntent = idOf(charge.payment_intent)
  if (!paymentIntent) {
    console.info('[stripe/webhook] Erstattung ohne PaymentIntent, nichts zuzuordnen:', charge.id)
    return
  }

  const { data, error } = await billingRpc(service).rpc('refund_course_purchase', {
    p_payment_intent: paymentIntent,
  })
  if (error) {
    throw new Error(`refund_course_purchase: ${error.message}`)
  }

  const outcome = asOutcome(data)
  if (outcome.ok === false) {
    // unknown_purchase: Abo-Zahlung oder Kauf aus der Zeit vor 0012.
    console.info(
      '[stripe/webhook] Erstattung ohne verzeichneten Kurskauf:',
      outcome.error,
      '| PaymentIntent:',
      paymentIntent
    )
    return
  }

  console.info(
    '[stripe/webhook] Kurs erstattet:',
    JSON.stringify({
      payment_intent: paymentIntent,
      enrollments: outcome.enrollments ?? 0,
      pending: outcome.pending ?? 0,
      already_refunded: outcome.already_refunded === true,
    })
  )
}
