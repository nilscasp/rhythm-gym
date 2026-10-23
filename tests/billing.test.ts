import { describe, expect, test } from 'bun:test'
import {
  AUTOMATIC_TAX_ENABLED,
  SUBSCRIPTION_LOOKUP_KEYS,
  buildCheckoutParams,
  buildPriceTable,
  courseLookupKey,
  courseSlugFromMetadata,
  formatAmount,
  hasAnyPrice,
  intervalLabel,
  isSameOrigin,
  parseCheckoutRequest,
  priceMatchesRequest,
  requestOrigin,
  subscriptionLookupKey,
  tierFromMetadata,
  type PriceLike,
} from '../app/lib/billing'
import { TIER_CONTENT, TIER_NAMES } from '../app/lib/tiers'

// ─────────────────────────────────────────────────────────────────────────────
// Kaufweg in der App (Abschnitt F) — ohne Stripe-Konto.
// ─────────────────────────────────────────────────────────────────────────────

const lernen = (extra: Record<string, string>) => ({ platform: 'lernen', ...extra })

describe('Lookup-Keys', () => {
  test('Abo-Keys nach docs/stripe-produkte.md', () => {
    expect(subscriptionLookupKey('premium', 'month')).toBe('lernen_premium_month')
    expect(subscriptionLookupKey('vip', 'year')).toBe('lernen_vip_year')
    expect(SUBSCRIPTION_LOOKUP_KEYS).toEqual([
      'lernen_premium_month',
      'lernen_premium_year',
      'lernen_vip_month',
      'lernen_vip_year',
    ])
  })

  test('Kurs-Key aus dem Slug', () => {
    expect(courseLookupKey('von-anfang-an-spielen')).toBe('lernen_von-anfang-an-spielen')
  })
})

describe('tierFromMetadata', () => {
  test('liest premium und vip', () => {
    expect(tierFromMetadata(lernen({ tier: 'premium' }))).toBe('premium')
    expect(tierFromMetadata(lernen({ tier: 'vip' }))).toBe('vip')
  })

  test('ohne platform=lernen keine Stufe (fremdes Abo im selben Konto)', () => {
    expect(tierFromMetadata({ tier: 'vip' })).toBeNull()
    expect(tierFromMetadata({ platform: 'skool', tier: 'vip' })).toBeNull()
  })

  test('unbekannte oder freie Stufe ist keine Stufe', () => {
    expect(tierFromMetadata(lernen({ tier: 'free' }))).toBeNull()
    expect(tierFromMetadata(lernen({ tier: 'gold' }))).toBeNull()
    expect(tierFromMetadata(lernen({}))).toBeNull()
    expect(tierFromMetadata(null)).toBeNull()
  })
})

describe('courseSlugFromMetadata', () => {
  test('liest einen gültigen Slug', () => {
    expect(courseSlugFromMetadata(lernen({ course_slug: 'rhythmusfundament' }))).toBe(
      'rhythmusfundament'
    )
  })
  test('verwirft fremde Plattform und kaputte Slugs', () => {
    expect(courseSlugFromMetadata({ course_slug: 'rhythmusfundament' })).toBeNull()
    expect(courseSlugFromMetadata(lernen({ course_slug: '../admin' }))).toBeNull()
    expect(courseSlugFromMetadata(lernen({ course_slug: 'Gross' }))).toBeNull()
  })
})

describe('Anzeige', () => {
  test('ganze Euro ohne Nachkomma, Tausenderpunkt', () => {
    expect(formatAmount(7000, 'eur')).toBe('70 €')
    expect(formatAmount(150000, 'eur')).toBe('1.500 €')
    expect(formatAmount(39950, 'EUR')).toBe('399,50 €')
  })

  test('andere Währung mit Code', () => {
    expect(formatAmount(3600, 'usd')).toBe('36 USD')
  })

  test('Intervall-Label', () => {
    expect(intervalLabel('month')).toBe('im Monat')
    expect(intervalLabel('year')).toBe('im Jahr')
  })
})

const price = (p: Partial<PriceLike> & { id: string }): PriceLike => ({
  active: true,
  currency: 'eur',
  ...p,
})

const FOUR: PriceLike[] = [
  price({
    id: 'price_pm',
    lookup_key: 'lernen_premium_month',
    unit_amount: 7000,
    recurring: { interval: 'month' },
    metadata: lernen({ tier: 'premium', interval: 'month' }),
  }),
  price({
    id: 'price_py',
    lookup_key: 'lernen_premium_year',
    unit_amount: 70000,
    recurring: { interval: 'year' },
    metadata: lernen({ tier: 'premium', interval: 'year' }),
  }),
  price({
    id: 'price_vm',
    lookup_key: 'lernen_vip_month',
    unit_amount: 15000,
    recurring: { interval: 'month' },
    metadata: lernen({ tier: 'vip', interval: 'month' }),
  }),
  price({
    id: 'price_vy',
    lookup_key: 'lernen_vip_year',
    unit_amount: 150000,
    recurring: { interval: 'year' },
    metadata: lernen({ tier: 'vip', interval: 'year' }),
  }),
]

describe('buildPriceTable', () => {
  test('vier Preise → zwei Stufen × zwei Intervalle', () => {
    const t = buildPriceTable(FOUR)
    expect(t.premium.month).toEqual({
      priceId: 'price_pm',
      tier: 'premium',
      interval: 'month',
      amount: '70 €',
      per: 'im Monat',
    })
    expect(t.premium.year?.amount).toBe('700 €')
    expect(t.vip.month?.amount).toBe('150 €')
    expect(t.vip.year?.amount).toBe('1.500 €')
    expect(hasAnyPrice(t)).toBe(true)
  })

  test('Key und Metadaten müssen zusammenpassen, sonst kein Kaufknopf', () => {
    const wrong = price({
      id: 'price_x',
      lookup_key: 'lernen_premium_month',
      unit_amount: 15000,
      recurring: { interval: 'month' },
      metadata: lernen({ tier: 'vip' }),
    })
    const t = buildPriceTable([wrong])
    expect(t.premium.month).toBeUndefined()
    expect(t.vip.month).toBeUndefined()
    expect(hasAnyPrice(t)).toBe(false)
  })

  test('inaktive Preise und Preise ohne Betrag fallen weg', () => {
    const t = buildPriceTable([
      { ...FOUR[0], active: false },
      { ...FOUR[1], unit_amount: null },
    ])
    expect(hasAnyPrice(t)).toBe(false)
  })
})

describe('parseCheckoutRequest', () => {
  test('Abo', () => {
    expect(parseCheckoutRequest({ kind: 'subscription', tier: 'vip', interval: 'year' })).toEqual({
      kind: 'subscription',
      tier: 'vip',
      interval: 'year',
    })
  })
  test('Kurs', () => {
    expect(parseCheckoutRequest({ kind: 'course', course: 'rhythmusfundament' })).toEqual({
      kind: 'course',
      courseSlug: 'rhythmusfundament',
    })
  })
  test('alles Ungefähre wird abgewiesen', () => {
    expect(parseCheckoutRequest({ kind: 'subscription', tier: 'free', interval: 'month' })).toBeNull()
    expect(parseCheckoutRequest({ kind: 'subscription', tier: 'vip', interval: 'week' })).toBeNull()
    expect(parseCheckoutRequest({ kind: 'subscription', tier: 'VIP', interval: 'month' })).toBeNull()
    expect(parseCheckoutRequest({ kind: 'course', course: 'a/b' })).toBeNull()
    expect(parseCheckoutRequest({ kind: 'gift' })).toBeNull()
    expect(parseCheckoutRequest({})).toBeNull()
  })
})

describe('priceMatchesRequest', () => {
  test('passender Abo-Preis', () => {
    expect(
      priceMatchesRequest(FOUR[3], { kind: 'subscription', tier: 'vip', interval: 'year' })
    ).toBe(true)
  })
  test('falsches Intervall oder falsche Stufe', () => {
    expect(
      priceMatchesRequest(FOUR[2], { kind: 'subscription', tier: 'vip', interval: 'year' })
    ).toBe(false)
    expect(
      priceMatchesRequest(FOUR[0], { kind: 'subscription', tier: 'vip', interval: 'month' })
    ).toBe(false)
  })
  test('Kurspreis: einmalig und mit course_slug', () => {
    const course = price({
      id: 'price_rf',
      lookup_key: 'lernen_rhythmusfundament',
      unit_amount: 39900,
      recurring: null,
      metadata: lernen({ course_slug: 'rhythmusfundament' }),
    })
    expect(priceMatchesRequest(course, { kind: 'course', courseSlug: 'rhythmusfundament' })).toBe(true)
    expect(
      priceMatchesRequest({ ...course, recurring: { interval: 'month' } }, {
        kind: 'course',
        courseSlug: 'rhythmusfundament',
      })
    ).toBe(false)
    expect(priceMatchesRequest(course, { kind: 'course', courseSlug: 'elemente' })).toBe(false)
  })
})

describe('buildCheckoutParams', () => {
  const ctx = {
    userId: '11111111-2222-3333-4444-555555555555',
    customerId: null,
    email: 'mensch@example.com',
    origin: 'https://lernen.handpan.schule/',
    priceId: 'price_vy',
  }

  test('Abo ohne Kunden: customer_email, subscription, Metadaten auch am Abo', () => {
    const p = buildCheckoutParams({ kind: 'subscription', tier: 'vip', interval: 'year' }, ctx)
    expect(p.mode).toBe('subscription')
    expect(p.client_reference_id).toBe(ctx.userId)
    expect(p).toHaveProperty('customer_email', 'mensch@example.com')
    expect(p).not.toHaveProperty('customer')
    expect(p).not.toHaveProperty('customer_creation')
    expect(p.metadata).toEqual({
      platform: 'lernen',
      tier: 'vip',
      interval: 'year',
      user_id: ctx.userId,
    })
    expect(p).toHaveProperty('subscription_data.metadata.tier', 'vip')
    expect(p).not.toHaveProperty('payment_intent_data')
    expect(p.line_items).toEqual([{ price: 'price_vy', quantity: 1 }])
    expect(p.success_url).toBe(
      'https://lernen.handpan.schule/mitgliedschaft/danke?session_id={CHECKOUT_SESSION_ID}'
    )
    expect(p.cancel_url).toBe('https://lernen.handpan.schule/mitgliedschaft')
  })

  test('vorhandener Kunde wird wiederverwendet, keine customer_email', () => {
    const p = buildCheckoutParams(
      { kind: 'subscription', tier: 'premium', interval: 'month' },
      { ...ctx, customerId: 'cus_123' }
    )
    expect(p).toHaveProperty('customer', 'cus_123')
    expect(p).not.toHaveProperty('customer_email')
    expect(p).toHaveProperty('customer_update', { address: 'auto', name: 'auto' })
  })

  test('Pflichtfelder: Adresse, Name, keine Promo-Codes, Deutsch, keine Testphase', () => {
    const p = buildCheckoutParams({ kind: 'subscription', tier: 'premium', interval: 'year' }, ctx)
    expect(p.billing_address_collection).toBe('required')
    expect(p.name_collection).toEqual({ individual: { enabled: true, optional: false } })
    expect(p.allow_promotion_codes).toBe(false)
    expect(p.locale).toBe('de')
    expect(JSON.stringify(p)).not.toContain('trial')
  })

  test('automatische Steuer nur mit ausdrücklicher Erlaubnis, Standard aus', () => {
    expect(AUTOMATIC_TAX_ENABLED).toBe(false)
    const off = buildCheckoutParams({ kind: 'subscription', tier: 'vip', interval: 'month' }, ctx)
    expect(off.automatic_tax).toEqual({ enabled: false })
    const on = buildCheckoutParams(
      { kind: 'subscription', tier: 'vip', interval: 'month' },
      { ...ctx, automaticTax: true }
    )
    expect(on.automatic_tax).toEqual({ enabled: true })
  })

  test('Kurs: payment, Kunde wird angelegt, Metadaten am PaymentIntent, zurück in den Kursraum', () => {
    const p = buildCheckoutParams({ kind: 'course', courseSlug: 'von-anfang-an-spielen' }, ctx)
    expect(p.mode).toBe('payment')
    expect(p).toHaveProperty('customer_creation', 'always')
    expect(p.metadata).toEqual({
      platform: 'lernen',
      course_slug: 'von-anfang-an-spielen',
      user_id: ctx.userId,
    })
    expect(p).toHaveProperty('payment_intent_data.metadata.course_slug', 'von-anfang-an-spielen')
    expect(p).not.toHaveProperty('subscription_data')
    expect(p.cancel_url).toBe('https://lernen.handpan.schule/training/von-anfang-an-spielen')
  })
})

describe('requestOrigin / isSameOrigin', () => {
  const h = (map: Record<string, string>) => ({ get: (n: string) => map[n.toLowerCase()] ?? null })

  test('Vercel-Proxy: x-forwarded-host gewinnt', () => {
    expect(
      requestOrigin(h({ 'x-forwarded-host': 'lernen.handpan.schule', host: 'x.vercel.app' }))
    ).toBe('https://lernen.handpan.schule')
  })
  test('localhost ohne Proto → http', () => {
    expect(requestOrigin(h({ host: 'localhost:3000' }))).toBe('http://localhost:3000')
  })
  test('kaputter Host → null', () => {
    expect(requestOrigin(h({ host: 'evil.com/path' }))).toBeNull()
    expect(requestOrigin(h({}))).toBeNull()
  })
  test('Origin-Prüfung', () => {
    expect(isSameOrigin('https://lernen.handpan.schule', 'https://lernen.handpan.schule')).toBe(true)
    expect(isSameOrigin('https://evil.example', 'https://lernen.handpan.schule')).toBe(false)
    expect(isSameOrigin(null, 'https://lernen.handpan.schule')).toBe(true)
  })
})

describe('tiers.ts', () => {
  test('Namen stehen an einer Stelle und tauchen im VIP-Text über die Konstante auf', () => {
    expect(TIER_NAMES.premium).toBeTruthy()
    expect(TIER_CONTENT.vip.items[0]).toContain(TIER_NAMES.premium)
  })

  test('Anzeigenamen vorerst Stufe 1 / Stufe 2, DB-Werte bleiben', () => {
    expect(TIER_NAMES).toEqual({ premium: 'Stufe 1', vip: 'Stufe 2' })
  })

  test('kein sichtbarer Text nennt die alten Namen (Schul-Gedächtnis, 23.10.2026)', () => {
    // Nur die Werte — die Schlüssel premium/vip sind DB-Werte und bleiben.
    const all = JSON.stringify([Object.values(TIER_NAMES), Object.values(TIER_CONTENT)])
    expect(all).not.toMatch(/premium|vip/i)
  })

  test('der Weg: Persönlichkeit und Seele mit je drei Schritten', () => {
    expect(TIER_CONTENT.premium.essence).toBe('Persönlichkeit')
    expect(TIER_CONTENT.premium.steps).toEqual(['Regelmäßigkeit', 'Ausrichtung', 'Freude am Üben'])
    expect(TIER_CONTENT.vip.essence).toBe('Seele')
    expect(TIER_CONTENT.vip.steps).toEqual(['Emotion', 'Freiheit', 'Wahrhaftigkeit'])
  })

  test('freie Sessions werden nicht genannt (Nils, 22.10.2026)', () => {
    const all = JSON.stringify(TIER_CONTENT).toLowerCase()
    for (const word of ['meditation', 'rhythm gym', 'projekt', 'kostenlos', 'testphase']) {
      expect(all).not.toContain(word)
    }
  })
})
