'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '../lib/supabase/server'

// ─────────────────────────────────────────────────────────────────────────────
// redeemCodeAction
// Löst einen Zugangs-Code über die SECURITY-DEFINER-Funktion
// redeem_access_code() ein — der einzige Weg, auf dem User ein Enrollment
// erzeugen können (RLS-Insert auf enrollments ist entfernt). Die Funktion
// validiert aktiv/abgelaufen/aufgebraucht atomar (FOR UPDATE) und ist
// idempotent für bereits Eingeschriebene.
// ─────────────────────────────────────────────────────────────────────────────

export type RedeemState = { status: 'idle' | 'error'; message?: string }

const ERROR_TEXT: Record<string, string> = {
  invalid: 'Dieser Code ist ungültig. Prüf die Schreibweise — z. B. RG-XXXX-XXXX.',
  inactive: 'Dieser Code wurde deaktiviert.',
  expired: 'Dieser Code ist abgelaufen.',
  exhausted: 'Dieser Code wurde schon von der maximalen Anzahl Personen eingelöst.',
  unauthorized: 'Bitte melde dich erneut an.',
}

export async function redeemCodeAction(
  _prev: RedeemState,
  formData: FormData,
): Promise<RedeemState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const raw = formData.get('code')
  const code = typeof raw === 'string' ? raw.trim() : ''
  if (!code) {
    return { status: 'error', message: 'Bitte gib einen Code ein.' }
  }

  const { data, error } = await supabase.rpc('redeem_access_code', { p_code: code })
  if (error) {
    return { status: 'error', message: 'Einlösen fehlgeschlagen — versuch es gleich noch einmal.' }
  }

  const result = data as { ok?: boolean; error?: string; already_enrolled?: boolean } | null
  if (!result?.ok) {
    const message = ERROR_TEXT[result?.error ?? ''] ?? 'Einlösen fehlgeschlagen.'
    return { status: 'error', message }
  }
  // Bereits eingeschrieben: die DB-Funktion ändert dann nichts (auch kein
  // Freischalt-Datum) — das sagen wir, statt still „Erfolg" zu melden.
  if (result.already_enrolled) {
    return {
      status: 'error',
      message:
        'Du bist schon eingeschrieben — dieser Code ändert nichts an deinem Zugang oder Startdatum.',
    }
  }

  revalidatePath('/training')
  revalidatePath('/training/rhythmusfundament')
  return { status: 'idle' }
}
