'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '../../lib/supabase/server'
import { asOutcome, billingRpc } from '../../lib/supabase/database.types.billing'
import { toPlan } from '../../lib/plan'

// ─────────────────────────────────────────────────────────────────────────────
// Stufe von Hand setzen (Raten per Überweisung, Übergänge). Die Berechtigung
// prüft die Datenbank (admin_set_plan → is_admin_user); der Check hier ist
// Defense-in-Depth und liefert saubere Redirects.
// ─────────────────────────────────────────────────────────────────────────────

const PATH = '/coach/mitglieder'

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.is_admin) redirect('/training')
  return supabase
}

function back(q: string, result: string): never {
  const params = new URLSearchParams({ q, ergebnis: result })
  redirect(`${PATH}?${params.toString()}`)
}

export async function setPlanAction(formData: FormData): Promise<void> {
  const supabase = await requireAdmin()
  const email = String(formData.get('email') ?? '').trim()
  const q = String(formData.get('q') ?? '').trim()
  const raw = formData.get('plan')
  const plan = toPlan(raw)
  if (!email || raw !== plan) back(q, 'ungueltig')

  const { data, error } = await billingRpc(supabase).rpc('admin_set_plan', {
    p_email: email,
    p_plan: plan,
  })
  revalidatePath(PATH)
  if (error) back(q, 'fehler')
  const outcome = asOutcome(data)
  back(q, outcome.ok === false ? String(outcome.error ?? 'fehler') : 'gesetzt')
}

export async function releasePlanAction(formData: FormData): Promise<void> {
  const supabase = await requireAdmin()
  const email = String(formData.get('email') ?? '').trim()
  const q = String(formData.get('q') ?? '').trim()
  if (!email) back(q, 'ungueltig')

  const { data, error } = await billingRpc(supabase).rpc('admin_release_plan', { p_email: email })
  revalidatePath(PATH)
  if (error) back(q, 'fehler')
  const outcome = asOutcome(data)
  back(q, outcome.ok === false ? String(outcome.error ?? 'fehler') : 'freigegeben')
}
