import 'server-only'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '../lib/supabase/server'
import { currentBrand } from '../lib/brand-server'

// Lieder gibt es nur auf der Marke schule (lernen.handpan.schule), nie bei
// Rhythm Gym, und nur angemeldet. Für Seiten und Server Actions gleich.
export async function liederSession() {
  if ((await currentBrand()) !== 'schule') notFound()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  // Mitglied? Eine Stelle in der DB: is_song_member() (0015).
  const [memberRes, profileRes] = await Promise.all([
    supabase.rpc('is_song_member'),
    supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle(),
  ])
  if (memberRes.error) console.error('[lieder] is_song_member failed', { code: memberRes.error.code, message: memberRes.error.message })
  const isMember = memberRes.data === true
  const isAdmin = (profileRes.data as { is_admin?: boolean } | null)?.is_admin === true
  return { supabase, user, isMember, isAdmin }
}

/** Erster Wert eines Suchparameters. */
export function param(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : Array.isArray(value) ? (value[0] ?? '') : ''
}
