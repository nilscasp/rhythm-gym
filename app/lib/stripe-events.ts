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
