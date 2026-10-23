import { toPaidPlan, type PaidPlan } from './plan'

// ─────────────────────────────────────────────────────────────────────────────
// Kaufweg in der App (Umzug von Skool, Abschnitt F) — reine Funktionen.
//
// Kein Netz, kein Stripe-SDK, keine DB: alles, was hier steht, ist in
// tests/billing.test.ts ohne Stripe-Konto prüfbar. Die Routen
// (app/api/stripe/checkout, app/api/stripe/portal) und die Seite
// /mitgliedschaft holen die Daten und reichen sie hier durch.
//
// Preise werden IMMER über Lookup-Keys geholt, nie über fest eingetragene
// Preis-IDs (docs/stripe-produkte.md): die Keys sind in Test und Live gleich.
// ─────────────────────────────────────────────────────────────────────────────

/** Marke dieser Plattform in den Stripe-Metadaten (`platform=lernen`). */
export const PLATFORM = 'lernen'

/**
 * Automatische Steuer im Checkout. Standard AUS (docs/stripe-produkte.md:
 * Endpreise, kein Steuersatz hinterlegt, § 19 UStG offen). Erst einschalten,
 * wenn in Stripe eine Steuerregistrierung hinterlegt ist — sonst lehnt
 * Stripe die Session ab.
 */
export const AUTOMATIC_TAX_ENABLED = false

export const INTERVALS = ['month', 'year'] as const
export type BillingInterval = (typeof INTERVALS)[number]

export function isInterval(value: unknown): value is BillingInterval {
  return value === 'month' || value === 'year'
}

/** Course-Slugs wie in programs.slug: klein, Ziffern, Bindestrich. */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function isCourseSlug(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 80 && SLUG.test(value)
}

/** `lernen_premium_month` … `lernen_vip_year`. */
export function subscriptionLookupKey(tier: PaidPlan, interval: BillingInterval): string {
  return `${PLATFORM}_${tier}_${interval}`
}

/** `lernen_<course_slug>`, z. B. `lernen_von-anfang-an-spielen`. */
export function courseLookupKey(courseSlug: string): string {
  return `${PLATFORM}_${courseSlug}`
}

/** Alle vier Abo-Keys, in fester Reihenfolge. */
export const SUBSCRIPTION_LOOKUP_KEYS: readonly string[] = (['premium', 'vip'] as const).flatMap(
  (tier) => INTERVALS.map((interval) => subscriptionLookupKey(tier, interval))
)

/** „im Monat“ / „im Jahr“. */
export function intervalLabel(interval: BillingInterval): string {
  return interval === 'month' ? 'im Monat' : 'im Jahr'
}

/** Getrimmter String oder null. */
function clean(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const t = value.trim()
  return t.length > 0 ? t : null
}

/** Metadaten gehören zu dieser Plattform? */
export function isPlatformMetadata(meta: Record<string, string> | null | undefined): boolean {
  return clean(meta?.platform) === PLATFORM
}

/**
 * Stufe aus Preis- (oder Produkt-/Abo-)Metadaten. Nur mit `platform=lernen`,
 * sonst null — ein fremdes Abo im selben Stripe-Konto darf nie eine Stufe
 * vergeben.
 */
export function tierFromMetadata(meta: Record<string, string> | null | undefined): PaidPlan | null {
  if (!isPlatformMetadata(meta)) return null
  return toPaidPlan(clean(meta?.tier))
}

/** Kurs-Slug aus Preis-Metadaten (`platform=lernen`, `course_slug`). */
export function courseSlugFromMetadata(
  meta: Record<string, string> | null | undefined
): string | null {
  if (!isPlatformMetadata(meta)) return null
  const slug = clean(meta?.course_slug)
  return slug && isCourseSlug(slug) ? slug : null
}

/**
 * Betrag in Cent → „70 €“, „1.500 €“, „399,50 €“. Ganze Euro ohne Nachkomma,
 * sonst zwei Stellen. Andere Währungen mit ihrem Code.
 */
export function formatAmount(unitAmount: number, currency: string): string {
  const value = unitAmount / 100
  const whole = Number.isInteger(value)
  const number = new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(value)
  const cur = currency.toLowerCase()
  return cur === 'eur' ? `${number} €` : `${number} ${cur.toUpperCase()}`
}

/** Nur die Felder eines Stripe-Preises, die die Anzeige braucht. */
export interface PriceLike {
  id: string
  lookup_key?: string | null
  unit_amount?: number | null
  currency?: string | null
  active?: boolean | null
  metadata?: Record<string, string> | null
  recurring?: { interval?: string | null } | null
}

export interface DisplayPrice {
  priceId: string
  tier: PaidPlan
  interval: BillingInterval
  /** „70 €“ */
  amount: string
  /** „im Monat“ */
  per: string
}

export type PriceTable = Record<PaidPlan, Partial<Record<BillingInterval, DisplayPrice>>>

/**
 * Stripe-Preise → Anzeige-Tabelle je Stufe und Intervall.
 *
 * Maßgeblich ist der Lookup-Key (er wurde so angefragt); die Metadaten müssen
 * dazu passen, sonst fällt der Preis weg — lieber kein Kaufknopf als einer,
 * der eine falsche Stufe verkauft.
 */
export function buildPriceTable(prices: readonly PriceLike[]): PriceTable {
  const table: PriceTable = { premium: {}, vip: {} }
  for (const price of prices) {
    if (price.active === false) continue
    if (typeof price.unit_amount !== 'number' || !price.currency) continue
    const tier = tierFromMetadata(price.metadata)
    const interval = price.recurring?.interval
    if (!tier || !isInterval(interval)) continue
    if (price.lookup_key !== subscriptionLookupKey(tier, interval)) continue
    table[tier][interval] = {
      priceId: price.id,
      tier,
      interval,
      amount: formatAmount(price.unit_amount, price.currency),
      per: intervalLabel(interval),
    }
  }
  return table
}

/** Ist die Tabelle vollständig genug, um zu verkaufen? */
export function hasAnyPrice(table: PriceTable): boolean {
  return Object.values(table).some((byInterval) => Object.keys(byInterval).length > 0)
}

// ── Checkout ─────────────────────────────────────────────────────────────────

export type CheckoutRequest =
  | { kind: 'subscription'; tier: PaidPlan; interval: BillingInterval }
  | { kind: 'course'; courseSlug: string }

/**
 * Formularfelder → geprüfte Anfrage oder null. Alles, was nicht exakt passt,
 * wird abgewiesen (fail closed).
 */
export function parseCheckoutRequest(fields: {
  kind?: unknown
  tier?: unknown
  interval?: unknown
  course?: unknown
}): CheckoutRequest | null {
  if (fields.kind === 'subscription') {
    const tier = toPaidPlan(fields.tier)
    if (!tier || fields.tier !== tier || !isInterval(fields.interval)) return null
    return { kind: 'subscription', tier, interval: fields.interval }
  }
  if (fields.kind === 'course') {
    if (!isCourseSlug(fields.course)) return null
    return { kind: 'course', courseSlug: fields.course }
  }
  return null
}

export function lookupKeyFor(request: CheckoutRequest): string {
  return request.kind === 'subscription'
    ? subscriptionLookupKey(request.tier, request.interval)
    : courseLookupKey(request.courseSlug)
}

/**
 * Passt der gefundene Preis zur Anfrage? Schützt davor, dass ein falsch
 * gepflegter Lookup-Key in Stripe eine andere Stufe oder einen anderen Kurs
 * verkauft als angeklickt.
 */
export function priceMatchesRequest(price: PriceLike, request: CheckoutRequest): boolean {
  if (price.active === false) return false
  if (price.lookup_key !== lookupKeyFor(request)) return false
  if (request.kind === 'subscription') {
    return (
      tierFromMetadata(price.metadata) === request.tier &&
      price.recurring?.interval === request.interval
    )
  }
  return !price.recurring && courseSlugFromMetadata(price.metadata) === request.courseSlug
}

export interface CheckoutContext {
  userId: string
  /** profiles.stripe_customer_id — wird wiederverwendet, wenn vorhanden. */
  customerId: string | null
  /** Adresse fürs Vorausfüllen, wenn es noch keinen Kunden gibt. */
  email: string | null
  /** z. B. https://lernen.handpan.schule */
  origin: string
  priceId: string
  automaticTax?: boolean
}

/**
 * Kontaktadresse der Schule — dieselbe, die Einstellungen und Startseite der
 * Marke schule nennen (app/settings/page.tsx, app/_schule/LandingSchule.tsx).
 * Für Raten per Überweisung und Fragen zur von Hand gesetzten Stufe.
 */
export const MEMBERSHIP_CONTACT_EMAIL = 'kontakt@handpan.schule'

/** mailto-Link mit Betreff (kodiert). */
export function contactMailto(subject: string): string {
  return `mailto:${MEMBERSHIP_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`
}

/** Pfade nach dem Checkout. */
export const SUCCESS_PATH = '/mitgliedschaft/danke'
export const MEMBERSHIP_PATH = '/mitgliedschaft'

export function cancelPathFor(request: CheckoutRequest): string {
  // Abo: zurück zur Mitgliedschaft (Vorgabe). Kurs: zurück in den Kursraum,
  // von dem aus gekauft wurde — dort steht der Knopf.
  return request.kind === 'subscription' ? MEMBERSHIP_PATH : `/training/${request.courseSlug}`
}

/**
 * Die Parameter für `stripe.checkout.sessions.create` — als schlichtes Objekt,
 * damit der Test jede Regel einzeln prüfen kann:
 *
 * · mode subscription (Abo) oder payment (Kurs)
 * · client_reference_id = Nutzer-Id (der Webhook verknüpft darüber Kunde ↔ Profil)
 * · vorhandener Kunde wird wiederverwendet, sonst customer_email
 * · metadata platform=lernen + tier bzw. course_slug, auch am Abo/PaymentIntent
 * · Rechnungsadresse und Name Pflicht, keine Promo-Codes, Sprache de
 * · automatische Steuer nur, wenn ausdrücklich erlaubt
 * · keine Testphase
 */
export function buildCheckoutParams(request: CheckoutRequest, ctx: CheckoutContext) {
  const metadata: Record<string, string> =
    request.kind === 'subscription'
      ? { platform: PLATFORM, tier: request.tier, interval: request.interval, user_id: ctx.userId }
      : { platform: PLATFORM, course_slug: request.courseSlug, user_id: ctx.userId }

  const origin = ctx.origin.replace(/\/+$/, '')
  const customer = ctx.customerId ? { customer: ctx.customerId } : null
  const email = !customer && ctx.email ? { customer_email: ctx.email } : null

  return {
    mode: request.kind === 'subscription' ? ('subscription' as const) : ('payment' as const),
    line_items: [{ price: ctx.priceId, quantity: 1 }],
    client_reference_id: ctx.userId,
    ...(customer ?? {}),
    ...(email ?? {}),
    // Bestehender Kunde: Name und Adresse aus dem Checkout am Kunden speichern,
    // damit die nächste Rechnung stimmt.
    ...(customer ? { customer_update: { address: 'auto' as const, name: 'auto' as const } } : {}),
    // Payment-Modus legt ohne das keinen Kunden an — dann gäbe es später kein
    // Kundenportal und keine Rechnungen an einer Stelle.
    ...(request.kind === 'course' && !customer ? { customer_creation: 'always' as const } : {}),
    metadata,
    ...(request.kind === 'subscription'
      ? { subscription_data: { metadata } }
      : { payment_intent_data: { metadata } }),
    billing_address_collection: 'required' as const,
    name_collection: { individual: { enabled: true, optional: false } },
    allow_promotion_codes: false,
    automatic_tax: { enabled: ctx.automaticTax === true },
    locale: 'de' as const,
    success_url: `${origin}${SUCCESS_PATH}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}${cancelPathFor(request)}`,
  }
}

/**
 * Origin der Anfrage für success/cancel-URLs. Hinter dem Vercel-Proxy tragen
 * x-forwarded-host/-proto die echte Domain. Nur http(s) und ein plausibler
 * Host; sonst null (dann bricht die Route ab, statt Stripe eine kaputte URL
 * zu geben).
 */
export function requestOrigin(headers: {
  get(name: string): string | null
}): string | null {
  const host = clean(headers.get('x-forwarded-host')?.split(',')[0]) ?? clean(headers.get('host'))
  if (!host || !/^[a-z0-9.-]+(?::\d+)?$/i.test(host)) return null
  const forwarded = clean(headers.get('x-forwarded-proto')?.split(',')[0])
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host)
  const proto = forwarded === 'http' || forwarded === 'https' ? forwarded : local ? 'http' : 'https'
  return `${proto}://${host}`
}

/**
 * Kommt ein POST von unserer eigenen Seite? Formular-POSTs tragen `Origin`.
 * Fehlt er (alte Browser), lassen wir durch — die Supabase-Cookies sind
 * SameSite=Lax und reisen bei fremden POSTs ohnehin nicht mit.
 */
export function isSameOrigin(originHeader: string | null, expected: string): boolean {
  if (!originHeader) return true
  return originHeader.replace(/\/+$/, '') === expected
}
