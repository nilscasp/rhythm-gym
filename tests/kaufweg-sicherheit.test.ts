import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { courseCheckoutNotice } from '../app/lib/billing'
import {
  decideRefund,
  hasRunningPlatformSubscription,
  trustedCheckoutUserId,
  type CoursePurchaseGrant,
} from '../app/lib/stripe-events'

// ─────────────────────────────────────────────────────────────────────────────
// Sicherheitsregeln des Kaufwegs (Befunde der Sicherheitsprüfung zu
// Abschnitt F). Ohne Netz und DB: die TS-Regeln direkt, die SQL-Regeln als
// Textprüfung der Migration (sie wird nicht ausgeführt).
// ─────────────────────────────────────────────────────────────────────────────

const ME = '11111111-2222-3333-4444-555555555555'
const OTHER = '99999999-8888-7777-6666-555555555555'

describe('Befund 1: Kunde ↔ Profil nur für nachweislich eigene Checkouts', () => {
  const ours = {
    payment_link: null,
    client_reference_id: ME,
    metadata: { platform: 'lernen', user_id: ME, tier: 'vip' },
  }

  test('eigener Checkout → Nutzer-Id', () => {
    expect(trustedCheckoutUserId(ours)).toBe(ME)
  })

  test('Payment Link mit ?client_reference_id=<fremde uuid> → nichts', () => {
    expect(
      trustedCheckoutUserId({
        payment_link: 'plink_123',
        client_reference_id: OTHER,
        metadata: { platform: 'lernen', course_slug: 'rhythmusfundament' },
      })
    ).toBeNull()
  })

  test('Payment Link, selbst wenn die Metadaten zufällig passen → nichts', () => {
    expect(trustedCheckoutUserId({ ...ours, payment_link: { id: 'plink_1' } })).toBeNull()
  })

  test('client_reference_id ohne passende Session-Metadaten → nichts', () => {
    expect(trustedCheckoutUserId({ ...ours, metadata: { platform: 'lernen' } })).toBeNull()
    expect(
      trustedCheckoutUserId({ ...ours, metadata: { platform: 'lernen', user_id: OTHER } })
    ).toBeNull()
    expect(trustedCheckoutUserId({ ...ours, metadata: { user_id: ME } })).toBeNull()
    expect(trustedCheckoutUserId({ ...ours, client_reference_id: null })).toBeNull()
  })

  test('kaputte Ids → nichts', () => {
    expect(
      trustedCheckoutUserId({
        client_reference_id: 'x',
        metadata: { platform: 'lernen', user_id: 'x' },
      })
    ).toBeNull()
  })
})

const grant = (p: Partial<CoursePurchaseGrant>): CoursePurchaseGrant => ({
  refunded_at: null,
  enrollment_id: null,
  created_enrollment: false,
  pending_enrollment_id: null,
  pending_claimed_enrollment_id: null,
  pending_claimed: false,
  ...p,
})

describe('Befund 2: Erstattung sperrt nur, was dieser Kauf angelegt hat', () => {
  test('vom Kauf angelegtes Enrollment wird gesperrt', () => {
    expect(decideRefund(grant({ enrollment_id: 'e1', created_enrollment: true }))).toEqual({
      action: 'revoke_enrollment',
      enrollmentId: 'e1',
    })
  })

  test('vorher bestehendes Enrollment (Zugangscode, früherer Kauf) bleibt offen', () => {
    expect(decideRefund(grant({ enrollment_id: 'e1', created_enrollment: false }))).toEqual({
      action: 'mark_only',
      reason: 'preexisting_enrollment',
    })
  })

  test('nicht eingelöster geparkter Kauf wird geschlossen', () => {
    expect(decideRefund(grant({ pending_enrollment_id: 'p1' }))).toEqual({
      action: 'close_pending',
      pendingId: 'p1',
    })
  })

  test('eingelöster Kauf: nur das beim Einlösen angelegte Enrollment', () => {
    expect(
      decideRefund(
        grant({ pending_enrollment_id: 'p1', pending_claimed: true, pending_claimed_enrollment_id: 'e2' })
      )
    ).toEqual({ action: 'revoke_enrollment', enrollmentId: 'e2' })
    expect(decideRefund(grant({ pending_enrollment_id: 'p1', pending_claimed: true }))).toEqual({
      action: 'mark_only',
      reason: 'preexisting_enrollment',
    })
  })

  test('schon erstattet → nichts mehr', () => {
    expect(decideRefund(grant({ refunded_at: '2026-10-23', enrollment_id: 'e1', created_enrollment: true }))).toEqual({
      action: 'already_refunded',
    })
  })
})

describe('Migration 0012 (Textprüfung)', () => {
  const sql = readFileSync(join(import.meta.dir, '../supabase/migrations/0012_abo_kaufweg.sql'), 'utf8')

  function fn(name: string): string {
    const start = sql.indexOf(`create or replace function public.${name}(`)
    expect(start).toBeGreaterThan(-1)
    const end = sql.indexOf('$function$;', start)
    return sql.slice(start, end)
  }

  test('refund_course_purchase sucht nie über die E-Mail-Adresse', () => {
    const body = fn('refund_course_purchase')
    expect(body).not.toMatch(/email/i)
    // und sperrt nur mit dem Anker aus dem Kaufbeleg
    expect(body).toContain('started_at is not distinct from v_started')
    expect(body).toContain('created_enrollment')
  })

  test('grant_course_purchase markiert nur selbst angelegte Enrollments', () => {
    const body = fn('grant_course_purchase')
    expect(body).toContain("v_outcome := 'already_enrolled'")
    // im already_enrolled-Zweig bleibt v_created false
    const branch = body.slice(body.indexOf('else\n      -- Besteht schon'), body.indexOf("v_outcome := 'already_enrolled'"))
    expect(branch).not.toContain('v_created := true')
  })

  test('alle SECURITY-DEFINER-Funktionen: search_path mit pg_catalog zuerst', () => {
    const definers = sql.split('security definer').length - 1
    const safe = (sql.match(/set search_path to 'pg_catalog', 'public'/g) ?? []).length
    expect(definers).toBeGreaterThan(0)
    expect(safe).toBe(definers)
    expect(sql).not.toMatch(/search_path to 'public'/)
  })

  test('set_membership_by_customer bleibt und ist als ersetzt markiert', () => {
    expect(sql).not.toMatch(/drop function[^;]*set_membership_by_customer/i)
    expect(sql).toContain('Ersetzt durch set_plan_by_customer (0012)')
  })

  test('admin_release_plan: ohne Stripe-Kunde zurück auf free', () => {
    const body = fn('admin_release_plan')
    expect(body).toContain("else 'free' end")
  })
})

describe('Kein zweites Abo', () => {
  const s = (status: string, platform = 'lernen') => ({
    id: status,
    status,
    items: { data: [{ price: { metadata: { platform, tier: 'premium' } } }] },
  })

  test('laufendes oder unbezahltes Abo dieser Plattform → Portal', () => {
    for (const st of ['active', 'trialing', 'past_due', 'incomplete', 'unpaid', 'paused']) {
      expect(hasRunningPlatformSubscription([s(st)])).toBe(true)
    }
  })

  test('beendete Abos und fremde Abos zählen nicht', () => {
    expect(hasRunningPlatformSubscription([s('canceled'), s('incomplete_expired')])).toBe(false)
    expect(hasRunningPlatformSubscription([s('active', 'anderes')])).toBe(false)
    expect(hasRunningPlatformSubscription([])).toBe(false)
  })
})

describe('Kursraum-Hinweise', () => {
  test('bekannte Rückmeldungen', () => {
    expect(courseCheckoutNotice('schon-dabei')).toContain('schon')
    expect(courseCheckoutNotice('abgebrochen')).toContain('abgebrochen')
    expect(courseCheckoutNotice('fehler')).toBeTruthy()
  })
  test('Unbekanntes zeigt nichts', () => {
    expect(courseCheckoutNotice('<script>')).toBeNull()
    expect(courseCheckoutNotice(null)).toBeNull()
  })
})
