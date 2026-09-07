import { NextResponse } from 'next/server'
import { createClient } from '../../lib/supabase/server'
import { isBrevoConfigured, upsertConfirmedContact } from '../../lib/brevo'

type ServerClient = Awaited<ReturnType<typeof createClient>>

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

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
  }

  return NextResponse.redirect(`${origin}/training`)
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
