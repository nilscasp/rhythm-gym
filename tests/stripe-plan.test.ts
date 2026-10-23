import { describe, expect, test } from 'bun:test'
import {
  checkoutCourseSlug,
  decidePlanChange,
  idOf,
  isCheckoutPaid,
  isFullRefund,
  mergeSubscription,
  needsLineItemsForCourse,
  planForStatus,
  planFromSubscriptions,
  tierOfSubscription,
  userIdFromReference,
  type SubscriptionLike,
} from '../app/lib/stripe-events'

// ─────────────────────────────────────────────────────────────────────────────
// Webhook-Logik für Abo-Stufen und Kurskäufe (Abschnitt F) — ohne Netz.
//
// Was hier schiefgeht, merkt man erst, wenn sich jemand beschwert: ein VIP,
// der still auf free fällt; eine Ratenzahlerin, der der Webhook die von Hand
// gesetzte Stufe wegnimmt; ein gekündigtes Abo, das weiterläuft.
// ─────────────────────────────────────────────────────────────────────────────

const sub = (
  id: string,
  tier: 'premium' | 'vip' | null,
  status: string,
  where: 'price' | 'sub' = 'price'
): SubscriptionLike => {
  const meta = tier ? { platform: 'lernen', tier } : { platform: 'anderes' }
  return where === 'price'
    ? { id, status, items: { data: [{ price: { metadata: meta } }] } }
    : { id, status, metadata: meta, items: { data: [{ price: { metadata: {} } }] } }
}

describe('tierOfSubscription', () => {
  test('aus den Preis-Metadaten', () => {
    expect(tierOfSubscription(sub('s1', 'premium', 'active'))).toBe('premium')
    expect(tierOfSubscription(sub('s1', 'vip', 'active'))).toBe('vip')
  })

  test('Rückfall auf Abo-Metadaten', () => {
    expect(tierOfSubscription(sub('s1', 'vip', 'active', 'sub'))).toBe('vip')
  })

  test('mehrere Positionen: die höchste zählt', () => {
    expect(
      tierOfSubscription({
        id: 's',
        status: 'active',
        items: {
          data: [
            { price: { metadata: { platform: 'lernen', tier: 'premium' } } },
            { price: { metadata: { platform: 'lernen', tier: 'vip' } } },
          ],
        },
      })
    ).toBe('vip')
  })

  test('fremdes Abo → null', () => {
    expect(tierOfSubscription(sub('s1', null, 'active'))).toBeNull()
    expect(tierOfSubscription({ id: 's', status: 'active' })).toBeNull()
  })
})

describe('planForStatus', () => {
  test('active und trialing geben die Stufe', () => {
    expect(planForStatus('vip', 'active')).toBe('vip')
    expect(planForStatus('premium', 'trialing')).toBe('premium')
  })

  test('past_due: Zugang sofort weg', () => {
    expect(planForStatus('vip', 'past_due')).toBe('free')
  })

  test('beendet oder nie bezahlt → free', () => {
    for (const s of ['canceled', 'unpaid', 'incomplete_expired', 'incomplete', 'paused', '', null]) {
      expect(planForStatus('vip', s)).toBe('free')
    }
  })
})

describe('planFromSubscriptions (Herabstufungsregel)', () => {
  test('keine Abos dieser Plattform → null (Profil nicht anfassen)', () => {
    expect(planFromSubscriptions([])).toBeNull()
    expect(planFromSubscriptions([sub('x', null, 'active')])).toBeNull()
  })

  test('ein beendetes Abo → free', () => {
    expect(planFromSubscriptions([sub('a', 'premium', 'canceled')])).toBe('free')
  })

  test('auslaufendes Premium stuft laufendes VIP nicht herunter', () => {
    expect(
      planFromSubscriptions([sub('p', 'premium', 'canceled'), sub('v', 'vip', 'active')])
    ).toBe('vip')
  })

  test('auslaufendes VIP bei laufendem Premium → premium', () => {
    expect(
      planFromSubscriptions([sub('v', 'vip', 'canceled'), sub('p', 'premium', 'active')])
    ).toBe('premium')
  })

  test('Wechsel Premium → VIP im selben Abo', () => {
    expect(planFromSubscriptions([sub('a', 'vip', 'active')])).toBe('vip')
  })

  test('fremde Abos daneben zählen nicht', () => {
    expect(planFromSubscriptions([sub('x', null, 'active'), sub('p', 'premium', 'unpaid')])).toBe(
      'free'
    )
  })
})

describe('mergeSubscription', () => {
  test('die Liste gewinnt über ein verspätetes Ereignis', () => {
    const list = [sub('a', 'premium', 'canceled')]
    const merged = mergeSubscription(list, sub('a', 'premium', 'active'), false)
    expect(merged).toHaveLength(1)
    expect(planFromSubscriptions(merged)).toBe('free')
  })

  test('fehlt das Abo in der Liste, zählt das Ereignis', () => {
    const merged = mergeSubscription([], sub('a', 'vip', 'active'), false)
    expect(planFromSubscriptions(merged)).toBe('vip')
  })

  test('.deleted mit noch „active“ im Payload zählt als gekündigt', () => {
    const merged = mergeSubscription([], sub('a', 'vip', 'active'), true)
    expect(planFromSubscriptions(merged)).toBe('free')
  })
})

describe('decidePlanChange (manual-Schutz)', () => {
  test('manual schützt jede Stufe', () => {
    expect(decidePlanChange({ plan: 'vip', plan_source: 'manual' }, 'free')).toEqual({
      action: 'skip',
      reason: 'manual',
    })
    expect(decidePlanChange({ plan: 'free', plan_source: 'manual' }, 'premium')).toEqual({
      action: 'skip',
      reason: 'manual',
    })
  })

  test('ohne Quelle oder Quelle stripe wird gesetzt', () => {
    expect(decidePlanChange({ plan: 'free', plan_source: null }, 'premium')).toEqual({
      action: 'set',
      plan: 'premium',
    })
    expect(decidePlanChange({ plan: 'vip', plan_source: 'stripe' }, 'free')).toEqual({
      action: 'set',
      plan: 'free',
    })
  })

  // Früher (0009) blieb VIP immer VIP. Jetzt entscheidet allein die Quelle —
  // ein über Stripe gekauftes VIP endet mit seinem Abo.
  test('VIP aus Stripe ist nicht mehr unantastbar', () => {
    expect(decidePlanChange({ plan: 'vip', plan_source: null }, 'premium')).toEqual({
      action: 'set',
      plan: 'premium',
    })
  })

  test('gleicher Stand → nichts zu tun', () => {
    expect(decidePlanChange({ plan: 'vip', plan_source: 'stripe' }, 'vip')).toEqual({
      action: 'skip',
      reason: 'unchanged',
    })
  })
})

describe('Kurskauf', () => {
  test('Slug: program_slug vor course_slug vor Preis-Metadaten', () => {
    expect(checkoutCourseSlug({ metadata: { program_slug: 'a', course_slug: 'b' } })).toBe('a')
    expect(checkoutCourseSlug({ metadata: { course_slug: 'b' } })).toBe('b')
    expect(
      checkoutCourseSlug({ metadata: {} }, [
        { platform: 'anderes', course_slug: 'x' },
        { platform: 'lernen', course_slug: 'von-anfang-an-spielen' },
      ])
    ).toBe('von-anfang-an-spielen')
    expect(checkoutCourseSlug({ metadata: null }, [])).toBeNull()
  })

  test('kaputter Slug in der Session → null, nicht weitersuchen', () => {
    expect(
      checkoutCourseSlug({ metadata: { course_slug: '../x' } }, [
        { platform: 'lernen', course_slug: 'rhythmusfundament' },
      ])
    ).toBeNull()
  })

  test('Positionen nur abrufen, wenn die Session keinen Slug trägt', () => {
    expect(needsLineItemsForCourse({ metadata: { program_slug: 'a' } })).toBe(false)
    expect(needsLineItemsForCourse({ metadata: {} })).toBe(true)
  })

  test('nur bezahlte Sessions schalten frei', () => {
    expect(isCheckoutPaid({ payment_status: 'paid' })).toBe(true)
    expect(isCheckoutPaid({ payment_status: 'no_payment_required' })).toBe(true)
    expect(isCheckoutPaid({ payment_status: 'unpaid' })).toBe(false)
    expect(isCheckoutPaid({})).toBe(false)
  })

  test('nur volle Rückerstattung nimmt den Kurs', () => {
    expect(isFullRefund({ refunded: true })).toBe(true)
    expect(isFullRefund({ refunded: false, amount: 39900, amount_refunded: 39900 })).toBe(true)
    expect(isFullRefund({ refunded: false, amount: 39900, amount_refunded: 5000 })).toBe(false)
    expect(isFullRefund({})).toBe(false)
  })
})

describe('Hilfen', () => {
  test('idOf', () => {
    expect(idOf('cus_1')).toBe('cus_1')
    expect(idOf({ id: 'cus_2' })).toBe('cus_2')
    expect(idOf(null)).toBeNull()
  })

  test('userIdFromReference nimmt nur UUIDs', () => {
    expect(userIdFromReference('11111111-2222-3333-4444-555555555555')).toBe(
      '11111111-2222-3333-4444-555555555555'
    )
    expect(userIdFromReference("1'; drop table profiles;--")).toBeNull()
    expect(userIdFromReference(null)).toBeNull()
  })
})
