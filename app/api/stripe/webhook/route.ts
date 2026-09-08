import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe, isStripeConfigured } from '../../../lib/stripe'
import { extractCheckoutFields, isSubscriptionActive } from '../../../lib/stripe-events'
import { createServiceClient, type ServiceClient } from '../../../lib/supabase/service'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/stripe/webhook — der einzige Weg vom bezahlten Checkout ins
// Enrollment und vom Abo-Status ins Profil.
//
// Der Endpunkt ist öffentlich erreichbar; sein einziger Türsteher ist die
// Stripe-Signatur über den ROHEN Body. Erst danach wird der service_role-Client
// überhaupt angefasst — das ist die Verifikation, auf die sich der Kommentar in
// app/lib/supabase/service.ts beruft.
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
 * (noch) nicht in database.types.ts — dort sind bisher nur die drei neuen
 * Funktionen nachgetragen. Statt die generierte Datei von Hand zu erweitern,
 * beschreibt dieser eng geschnittene Typ genau die zwei Operationen, die der
 * Webhook auf dem Ereignis-Journal ausführt. Nach dem nächsten
 * `supabase gen types` kann er ersatzlos entfallen.
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

/** Die Antwort der SECURITY-DEFINER-Funktionen ist jsonb — hier eingeengt. */
interface RpcOutcome {
  ok?: boolean
  error?: string
  [key: string]: unknown
}

function asOutcome(data: unknown): RpcOutcome {
  return data && typeof data === 'object' && !Array.isArray(data) ? (data as RpcOutcome) : {}
}

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

      default:
        return NextResponse.json({ received: true, ignored: true })
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

/**
 * Bezahlter Checkout → Enrollment (oder ein geparkter Kauf, falls es das Konto
 * noch nicht gibt). Die Entscheidung, welches von beidem, trifft die
 * Datenbankfunktion — hier wird nur gelesen und weitergereicht.
 */
async function handleCheckoutCompleted(
  service: ServiceClient,
  session: Stripe.Checkout.Session
): Promise<void> {
  const { email, programSlug, dripStart, sessionId } = extractCheckoutFields(session)

  // Nicht jeder Checkout ist ein Kurs: das Abo für den Inneren Kreis läuft über
  // denselben Endpunkt und trägt kein program_slug. Kein Fehler, keine
  // Wiederholung — nur eine Notiz.
  if (!programSlug) {
    console.info(
      '[stripe/webhook] Checkout ohne program_slug, kein Kursverkauf:',
      sessionId || '(ohne Session-Id)'
    )
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

  // Fachliches Nein: die Funktion hat sauber geantwortet, aber es geht nicht.
  // 'missing_email' → Stripe hat keine Adresse mitgeschickt.
  // 'unknown_program' → der Slug im Payment-Link passt zu keinem Programm.
  // Beides heilt keine Wiederholung; beides muss jemand ansehen.
  if (outcome.ok === false) {
    console.error(
      '[stripe/webhook] Kauf konnte nicht zugeordnet werden:',
      outcome.error,
      '| Programm:',
      programSlug,
      '| Session:',
      sessionId || '(ohne Session-Id)'
    )
    return
  }

  // enrolled | already_enrolled | pending — ohne Adresse.
  console.info(
    '[stripe/webhook] Kauf verarbeitet:',
    JSON.stringify({
      program: programSlug,
      enrolled: outcome.enrolled === true,
      already_enrolled: outcome.already_enrolled === true,
      pending: outcome.pending === true,
      drip_start: dripStart,
    })
  )
}

/**
 * Abo angelegt, geändert oder beendet → `profiles.plan`.
 *
 * Die Kundennummer ist der Anker: `set_membership_by_customer` merkt sie sich
 * beim ersten Treffer, danach findet jedes weitere Ereignis das Profil auch
 * ohne Adresse.
 */
async function handleSubscriptionChange(
  service: ServiceClient,
  subscription: Stripe.Subscription,
  deleted: boolean
): Promise<void> {
  const customerId = customerIdOf(subscription.customer)
  if (!customerId) {
    console.error('[stripe/webhook] Abo-Ereignis ohne Kundennummer, übersprungen.')
    return
  }

  const active = isSubscriptionActive(subscription.status, deleted)
  const email = await resolveCustomerEmail(subscription.customer, customerId)

  const { data, error } = await service.rpc('set_membership_by_customer', {
    p_customer_id: customerId,
    p_email: email ?? '',
    p_active: active,
  })

  if (error) {
    throw new Error(`set_membership_by_customer: ${error.message}`)
  }

  const outcome = asOutcome(data)

  // 'unknown_customer' ist der Normalfall bei jemandem, der über Stripe gekauft
  // hat, aber noch kein Konto besitzt. Eine Wiederholung ändert daran nichts —
  // deshalb Notiz statt Fehler, sonst klopft Stripe tagelang an.
  if (outcome.ok === false && outcome.error === 'unknown_customer') {
    console.info(
      '[stripe/webhook] Kein Profil zu Kundennummer',
      customerId,
      '— Abo-Stand wird beim Anlegen des Kontos nachgezogen.'
    )
    return
  }

  if (outcome.ok === false) {
    console.error(
      '[stripe/webhook] Abo-Stand nicht gesetzt:',
      outcome.error,
      '| Kunde:',
      customerId
    )
    return
  }

  console.info(
    '[stripe/webhook] Abo-Stand gesetzt:',
    JSON.stringify({ customer: customerId, status: subscription.status ?? null, deleted, active })
  )
}

/** `customer` ist mal eine Id, mal ein ausgeklapptes Objekt. */
function customerIdOf(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  if (!customer) return null
  return typeof customer === 'string' ? customer : customer.id
}

/**
 * Adresse zum Kunden — nur wenn nötig.
 *
 * Liegt der Kunde schon ausgeklappt im Payload, ist die Adresse da und es
 * braucht keinen zweiten Weg zu Stripe. Erst sonst wird nachgefragt.
 *
 * Ein gelöschter Kunde hat kein `email`-Feld; das ist kein Fehler, sondern
 * gerade bei `.deleted` ein plausibler Zustand. Dann trägt die Kundennummer
 * allein — genau dafür merkt sich das Profil sie.
 *
 * Auch ein Fehlschlag hier ist nicht tödlich: ohne Adresse findet
 * `set_membership_by_customer` das Profil weiterhin über die gemerkte
 * Kundennummer. Nur der allererste Treffer braucht die Adresse.
 */
async function resolveCustomerEmail(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
  customerId: string
): Promise<string | null> {
  if (customer && typeof customer !== 'string') {
    if ('deleted' in customer && customer.deleted) return null
    return (customer as Stripe.Customer).email ?? null
  }

  try {
    const fetched = await getStripe().customers.retrieve(customerId)
    if (fetched.deleted) return null
    return fetched.email ?? null
  } catch (err) {
    console.error(
      '[stripe/webhook] Kunde nicht abrufbar:',
      customerId,
      '—',
      err instanceof Error ? err.message : 'unbekannter Fehler'
    )
    return null
  }
}
