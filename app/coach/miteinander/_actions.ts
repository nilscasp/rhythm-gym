'use server'

import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '../../lib/supabase/server'
import { currentBrand } from '../../lib/brand-server'
import { errorCodeFrom } from '../../lib/miteinander'
import { isUuid } from '../../lib/miteinander-view'

// ─────────────────────────────────────────────────────────────────────────────
// Moderation für Miteinander (0013), nur Admin. Die Datenbank prüft selbst
// (admin_close_* / admin_hide_member → is_admin_user, community_blocks per
// RLS nur Admin); der Check hier ist Defense-in-Depth und liefert saubere
// Rückleitungen.
// ─────────────────────────────────────────────────────────────────────────────

const PATH = '/coach/miteinander'

async function requireAdmin() {
  if ((await currentBrand()) !== 'schule') notFound()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!profile?.is_admin) redirect('/training')
  return { supabase, user }
}

function back(formData: FormData, result: string): never {
  const q = String(formData.get('q') ?? '').trim().slice(0, 120)
  const params = new URLSearchParams(q ? { q, ergebnis: result } : { ergebnis: result })
  redirect(`${PATH}?${params.toString()}`)
}

function idOf(formData: FormData, key: string): string | null {
  const id = String(formData.get(key) ?? '')
  return isUuid(id) ? id : null
}

function done(formData: FormData, error: { message?: string } | null, ok: string): never {
  revalidatePath(PATH)
  revalidatePath('/miteinander')
  if (error) {
    console.error('[coach/miteinander] action failed', { message: error.message })
    back(formData, errorCodeFrom(error))
  }
  back(formData, ok)
}

export async function adminCloseChallengeAction(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin()
  const id = idOf(formData, 'id')
  if (!id) back(formData, 'ungueltig')
  const { error } = await supabase.rpc('admin_close_challenge', { p_challenge_id: id, p_closed: true })
  done(formData, error, 'challenge-geschlossen')
}

export async function adminCloseMeetupAction(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin()
  const id = idOf(formData, 'id')
  if (!id) back(formData, 'ungueltig')
  const { error } = await supabase.rpc('admin_close_meetup', { p_meetup_id: id, p_closed: true })
  done(formData, error, 'treffen-geschlossen')
}

export async function hideMemberAction(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin()
  const id = idOf(formData, 'user_id')
  if (!id) back(formData, 'ungueltig')
  const hidden = String(formData.get('hidden') ?? '') === '1'
  const { error } = await supabase.rpc('admin_hide_member', { p_user_id: id, p_hidden: hidden })
  done(formData, error, hidden ? 'ausgeblendet' : 'freigegeben')
}

export async function blockMemberAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin()
  const id = idOf(formData, 'user_id')
  if (!id) back(formData, 'ungueltig')
  const reason = String(formData.get('reason') ?? '').trim().slice(0, 500) || null
  const { error } = await supabase
    .from('community_blocks')
    .upsert({ user_id: id, reason, created_by: user.id }, { onConflict: 'user_id' })
  done(formData, error, 'gesperrt')
}

export async function unblockMemberAction(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin()
  const id = idOf(formData, 'user_id')
  if (!id) back(formData, 'ungueltig')
  const { error } = await supabase.from('community_blocks').delete().eq('user_id', id)
  done(formData, error, 'entsperrt')
}
