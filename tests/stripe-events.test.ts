import { describe, expect, test } from 'bun:test'
import {
  extractCheckoutFields,
  isSubscriptionActive,
  parseDripStart,
} from '../app/lib/stripe-events'

// ─────────────────────────────────────────────────────────────────────────────
// Die Entscheidungen des Stripe-Webhooks — ohne Netz, ohne Datenbank.
//
// Der Webhook selbst ist kaum testbar: Signaturprüfung, Idempotenz-Insert und
// RPC hängen alle an echten Diensten. Was aber ohne Ausnahme stimmen muss, ist
// die Auslegung dessen, was Stripe schickt — und genau das liegt hier.
//
// Warum das zählt: ein falsch gelesenes `drip_start` verschiebt jemandem den
// ganzen Kurs, ein falsch gelesener Abo-Status nimmt einem zahlenden Mitglied
// den Zugang (oder lässt einen gekündigten drin). Beides merkt man erst, wenn
// sich jemand beschwert.
// ─────────────────────────────────────────────────────────────────────────────

describe('parseDripStart', () => {
  test('nimmt ein sauberes ISO-Datum an', () => {
    expect(parseDripStart('2026-10-05')).toBe('2026-10-05')
  })

  test('nimmt den Schalttag an', () => {
    expect(parseDripStart('2028-02-29')).toBe('2028-02-29')
  })

  test('lässt Rand-Datümer durch (Jahreswechsel)', () => {
    expect(parseDripStart('2026-01-01')).toBe('2026-01-01')
    expect(parseDripStart('2026-12-31')).toBe('2026-12-31')
  })

  test('verwirft Formate, die nur so aussehen', () => {
    expect(parseDripStart('05.10.2026')).toBeNull()
    expect(parseDripStart('2026-10-5')).toBeNull()
    expect(parseDripStart('26-10-05')).toBeNull()
    expect(parseDripStart('2026/10/05')).toBeNull()
    expect(parseDripStart('2026-10-05T00:00:00Z')).toBeNull()
  })

  // Ohne diese Prüfung ginge '2026-02-31' durch die Regex, Postgres würde beim
  // date-Cast werfen, der Webhook 500 antworten — und Stripe stellt dasselbe
  // kaputte Ereignis tagelang erneut zu. Fail closed statt Retry-Sturm.
  test('verwirft Kalender-Unmöglichkeiten trotz passender Form', () => {
    expect(parseDripStart('2026-02-31')).toBeNull()
    expect(parseDripStart('2026-13-01')).toBeNull()
    expect(parseDripStart('2026-00-10')).toBeNull()
    expect(parseDripStart('2026-10-00')).toBeNull()
    expect(parseDripStart('2026-10-32')).toBeNull()
    expect(parseDripStart('2027-02-29')).toBeNull() // kein Schaltjahr
  })

  test('verwirft alles, was kein String ist', () => {
    expect(parseDripStart(undefined)).toBeNull()
    expect(parseDripStart(null)).toBeNull()
    expect(parseDripStart('')).toBeNull()
    expect(parseDripStart(20261005)).toBeNull()
    expect(parseDripStart({ drip_start: '2026-10-05' })).toBeNull()
    expect(parseDripStart(['2026-10-05'])).toBeNull()
  })
})

describe('isSubscriptionActive', () => {
  test('active und trialing zählen als bezahlt', () => {
    expect(isSubscriptionActive('active', false)).toBe(true)
    expect(isSubscriptionActive('trialing', false)).toBe(true)
  })

  test('alles andere nimmt den Zugang', () => {
    expect(isSubscriptionActive('canceled', false)).toBe(false)
    expect(isSubscriptionActive('unpaid', false)).toBe(false)
    expect(isSubscriptionActive('past_due', false)).toBe(false)
    expect(isSubscriptionActive('incomplete', false)).toBe(false)
    expect(isSubscriptionActive('incomplete_expired', false)).toBe(false)
    expect(isSubscriptionActive('paused', false)).toBe(false)
  })

  // customer.subscription.deleted trägt im Payload oft noch status 'active' —
  // das Ereignis selbst ist die Kündigung. Der deleted-Schalter muss deshalb
  // jeden Status überstimmen, sonst behält ein Gekündigter den Inneren Kreis.
  test('deleted überstimmt jeden Status', () => {
    expect(isSubscriptionActive('active', true)).toBe(false)
    expect(isSubscriptionActive('trialing', true)).toBe(false)
    expect(isSubscriptionActive('canceled', true)).toBe(false)
  })

  test('fehlender Status ist nie aktiv', () => {
    expect(isSubscriptionActive(null, false)).toBe(false)
    expect(isSubscriptionActive(undefined, false)).toBe(false)
    expect(isSubscriptionActive('', false)).toBe(false)
    expect(isSubscriptionActive('ACTIVE', false)).toBe(false) // Stripe schickt klein
  })
})

describe('extractCheckoutFields', () => {
  test('customer_details.email hat Vorrang vor customer_email', () => {
    const fields = extractCheckoutFields({
      id: 'cs_test_1',
      customer_details: { email: 'gezahlt@example.com' },
      customer_email: 'formular@example.com',
      metadata: { program_slug: 'rhythmusfundament' },
    })
    expect(fields.email).toBe('gezahlt@example.com')
    expect(fields.programSlug).toBe('rhythmusfundament')
    expect(fields.sessionId).toBe('cs_test_1')
    expect(fields.dripStart).toBeNull()
  })

  test('fällt auf customer_email zurück, wenn customer_details fehlt', () => {
    const fields = extractCheckoutFields({
      id: 'cs_test_2',
      customer_email: 'nur-formular@example.com',
      metadata: { program_slug: 'rhythmusfundament' },
    })
    expect(fields.email).toBe('nur-formular@example.com')
  })

  test('fällt zurück, wenn customer_details.email leer ist', () => {
    const fields = extractCheckoutFields({
      id: 'cs_test_3',
      customer_details: { email: null },
      customer_email: 'fallback@example.com',
      metadata: { program_slug: 'rhythmusfundament' },
    })
    expect(fields.email).toBe('fallback@example.com')
  })

  test('liest ein gültiges drip_start aus den Metadaten', () => {
    const fields = extractCheckoutFields({
      id: 'cs_test_4',
      customer_details: { email: 'a@example.com' },
      metadata: { program_slug: 'rhythmusfundament', drip_start: '2026-10-05' },
    })
    expect(fields.dripStart).toBe('2026-10-05')
  })

  test('ein unbrauchbares drip_start wird zu null, nicht zum Fehler', () => {
    const fields = extractCheckoutFields({
      id: 'cs_test_5',
      customer_details: { email: 'a@example.com' },
      metadata: { program_slug: 'rhythmusfundament', drip_start: 'sofort' },
    })
    expect(fields.dripStart).toBeNull()
    expect(fields.programSlug).toBe('rhythmusfundament')
  })

  // Ein Abo-Checkout trägt kein program_slug. Der Webhook darf daraus keinen
  // Fehler machen, sonst wiederholt Stripe ein Ereignis, das nie passen wird.
  test('ohne program_slug bleibt der Slug null', () => {
    const fields = extractCheckoutFields({
      id: 'cs_test_6',
      customer_details: { email: 'abo@example.com' },
      metadata: { irgendwas: 'anderes' },
    })
    expect(fields.programSlug).toBeNull()
    expect(fields.email).toBe('abo@example.com')
  })

  test('ganz ohne metadata bleibt der Slug null', () => {
    const fields = extractCheckoutFields({ id: 'cs_test_7', metadata: null })
    expect(fields.programSlug).toBeNull()
    expect(fields.email).toBeNull()
    expect(fields.dripStart).toBeNull()
    expect(fields.sessionId).toBe('cs_test_7')
  })

  test('leere Adressen werden zu null statt zu einem leeren String', () => {
    const fields = extractCheckoutFields({
      id: 'cs_test_8',
      customer_details: { email: '   ' },
      customer_email: '',
      metadata: { program_slug: '  ' },
    })
    expect(fields.email).toBeNull()
    expect(fields.programSlug).toBeNull()
  })

  test('umschließende Leerzeichen fallen weg', () => {
    const fields = extractCheckoutFields({
      id: 'cs_test_9',
      customer_details: { email: '  Nils@Example.com  ' },
      metadata: { program_slug: ' rhythmusfundament ' },
    })
    expect(fields.email).toBe('Nils@Example.com')
    expect(fields.programSlug).toBe('rhythmusfundament')
  })
})
