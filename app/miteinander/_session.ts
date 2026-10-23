import 'server-only'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '../lib/supabase/server'
import { currentBrand } from '../lib/brand-server'

// Miteinander gibt es nur auf der Marke schule und nur angemeldet.
// Für Seiten und Server Actions gleich.
export async function miteinanderSession() {
  if ((await currentBrand()) !== 'schule') notFound()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return { supabase, user }
}

/** Erster Wert eines Suchparameters. */
export function param(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : Array.isArray(value) ? (value[0] ?? '') : ''
}
