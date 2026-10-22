import { describe, expect, test } from 'bun:test'
import { PLAN_RANK, planSatisfies, toPaidPlan, toPlan } from '../app/lib/plan'

describe('PLAN_RANK', () => {
  test('free < premium < vip (Spiegel von plan_rank() in 0010)', () => {
    expect(PLAN_RANK.free).toBe(0)
    expect(PLAN_RANK.premium).toBe(1)
    expect(PLAN_RANK.vip).toBe(2)
  })
})

describe('toPlan', () => {
  test('gültige Werte bleiben', () => {
    expect(toPlan('free')).toBe('free')
    expect(toPlan('premium')).toBe('premium')
    expect(toPlan('vip')).toBe('vip')
  })
  test('unbekannt, leer, null → free (fail closed)', () => {
    expect(toPlan(null)).toBe('free')
    expect(toPlan(undefined)).toBe('free')
    expect(toPlan('')).toBe('free')
    expect(toPlan('VIP')).toBe('free')
    expect(toPlan('gold')).toBe('free')
    expect(toPlan(2)).toBe('free')
  })
})

describe('toPaidPlan', () => {
  test('nur premium/vip, sonst null', () => {
    expect(toPaidPlan('premium')).toBe('premium')
    expect(toPaidPlan('vip')).toBe('vip')
    expect(toPaidPlan('free')).toBeNull()
    expect(toPaidPlan(null)).toBeNull()
    expect(toPaidPlan('irgendwas')).toBeNull()
  })
})

describe('planSatisfies', () => {
  test('VIP öffnet Premium- und VIP-Türen', () => {
    expect(planSatisfies('vip', 'premium')).toBe(true)
    expect(planSatisfies('vip', 'vip')).toBe(true)
  })
  test('Premium öffnet nur Premium', () => {
    expect(planSatisfies('premium', 'premium')).toBe(true)
    expect(planSatisfies('premium', 'vip')).toBe(false)
  })
  test('free und Unbekanntes öffnen keine bezahlte Tür', () => {
    expect(planSatisfies('free', 'premium')).toBe(false)
    expect(planSatisfies(null, 'premium')).toBe(false)
    expect(planSatisfies('gold', 'vip')).toBe(false)
  })
  test('free-Anforderung ist immer erfüllt', () => {
    expect(planSatisfies(null, 'free')).toBe(true)
  })
})
