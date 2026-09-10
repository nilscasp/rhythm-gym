import { NextResponse } from 'next/server'
import { createClient } from '../../lib/supabase/server'
import { isBrevoConfigured, upsertConfirmedContact } from '../../lib/brevo'

type ServerClient = Awaited<ReturnType<typeof createClient>>

/**
 * Ziel nach dem Code-Tausch. Bewusst eine feste Liste statt „alles, was mit /
 * beginnt": Präfix-Prüfungen übersehen Varianten wie `/\`, `/%09/` oder
 * Steuerzeichen, und der Login wäre eine offene Weiterleitung. Alles, was nicht
 * auf der Liste steht, landet wie bisher im Training.
 */
const NEXT_TARGETS = new Set(['/auth/passwort'])

function safeNext(value: string | null): string {
  return value && NEXT_TARGETS.has(value) ? value : '/training'
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Die „Passwort vergessen"-Mail hängt `next=/auth/passwort` an: nach dem
  // Tausch soll man ein neues Passwort setzen, nicht im Training landen.
  const next = safeNext(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent(error.message)}`
      )
    }
    // Darf den Login nie blockieren: Fehler werden geloggt (ohne Adresse) und
    // beim nächsten Callback erneut versucht, weil brevo_synced_at NULL bleibt.
    await syncBriefeConsent(supabase)
    // Ebenfalls nie blockierend: ein vor der Anmeldung getätigter Kauf holt
    // hier sein Konto ein.
    await claimPurchases(supabase)
  }

  return NextResponse.redirect(`${origin}${next}`)
}

/**
 * Löst Käufe ein, die vor dem Konto getätigt wurden (Migration 0007).
 *
 * Wer über einen Payment-Link kauft, hat oft noch kein Konto. Der Webhook parkt
 * den Kauf dann in `pending_enrollments` unter der Adresse. Genau hier — nach
 * der Mailbestätigung — wird daraus ein Enrollment.
 *
 * Bewusst der NORMALE Client, nicht der service_role-Client:
 * `claim_pending_enrollments()` läuft als `authenticated` und liest die Adresse
 * selbst aus `auth.users`, und zwar nur die bestätigte. Damit kann niemand mit
 * einer fremden, unbestätigten Adresse einen fremden Kauf einsammeln. Würde der
 * Webhook-Client das hier tun, müsste diese Route der Adresse glauben, die ihr
 * gereicht wird — genau die Vertrauensstellung, die die Funktion vermeidet.
 *
 * Ein Fehlschlag ist folgenlos: die Zeile bleibt unclaimed und der nächste
 * Login versucht es erneut. Der Redirect passiert in jedem Fall.
 */
async function claimPurchases(supabase: ServerClient): Promise<void> {
  try {
    const { data, error } = await supabase.rpc('claim_pending_enrollments')
    if (error) {
      console.error('[auth/callback] Kauf-Einlösung fehlgeschlagen:', error.message)
      return
    }

    // Nur die Anzahl, nie die Adresse.
    const claimed =
      data && typeof data === 'object' && !Array.isArray(data)
        ? (data as { claimed?: unknown }).claimed
        : undefined

    if (typeof claimed === 'number' && claimed > 0) {
      console.info('[auth/callback] Käufe eingelöst:', claimed)
    }
  } catch (err) {
    console.error(
      '[auth/callback] Kauf-Einlösung Fehler:',
      err instanceof Error ? err.message : err
    )
  }
}

/**
 * Überträgt eine beim Signup gegebene Einwilligung genau einmal an Brevo —
 * erst, wenn Supabase die Adresse bestätigt hat (eine Bestätigungsmail statt
 * zwei, Plan §3). Idempotent über profiles.brevo_synced_at.
 */
async function syncBriefeConsent(supabase: ServerClient): Promise<void> {
  try {
    if (!isBrevoConfigured()) return

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.email || !user.email_confirmed_at) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('marketing_consent_at, brevo_synced_at')
      .eq('id', user.id)
      .maybeSingle()
    if (!profile?.marketing_consent_at || profile.brevo_synced_at) return

    const result = await upsertConfirmedContact({
      email: user.email,
      consentAt: profile.marketing_consent_at,
      source: 'konto',
    })
    if (!result.ok) {
      console.error('[auth/callback] Brevo-Sync fehlgeschlagen:', result.status, result.message)
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({ brevo_synced_at: new Date().toISOString() })
      .eq('id', user.id)
    if (error) console.error('[auth/callback] brevo_synced_at nicht gesetzt:', error.message)
  } catch (err) {
    console.error('[auth/callback] Brevo-Sync Fehler:', err instanceof Error ? err.message : err)
  }
}
