import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isUuid } from '../lib/miteinander-view'
import type { Person } from './_ui'

// Lesen einzelner Challenges und Treffen — immer mit expliziter Spaltenliste
// (whatsapp_url, exact_place und closed_by_admin sind für Mitglieder nicht
// lesbar, Spalten-Grants in 0013). Fehler → null bzw. leere Liste.

export type Challenge = {
  id: string
  created_by: string
  title: string
  description: string | null
  area: string
  starts_on: string
  ends_on: string
  max_members: number | null
  status: string
}

export type Meetup = {
  id: string
  created_by: string
  title: string
  description: string | null
  region: string | null
  place_hint: string | null
  starts_at: string
  max_people: number | null
  online: boolean
  status: string
}

export const CHALLENGE_COLUMNS = 'id, created_by, title, description, area, starts_on, ends_on, max_members, status'
export const MEETUP_COLUMNS = 'id, created_by, title, description, region, place_hint, starts_at, max_people, online, status'

function log(name: string, error: { code?: string; message?: string } | null) {
  if (error) console.error(`[miteinander] ${name} failed`, { code: error.code, message: error.message })
}

export async function loadChallenge(supabase: SupabaseClient, id: string): Promise<Challenge | null> {
  if (!isUuid(id)) return null
  const { data, error } = await supabase.from('challenges').select(CHALLENGE_COLUMNS).eq('id', id).maybeSingle()
  log('challenge read', error)
  return error ? null : ((data as Challenge | null) ?? null)
}

export async function loadMeetup(supabase: SupabaseClient, id: string): Promise<Meetup | null> {
  if (!isUuid(id)) return null
  const { data, error } = await supabase.from('meetups').select(MEETUP_COLUMNS).eq('id', id).maybeSingle()
  log('meetup read', error)
  return error ? null : ((data as Meetup | null) ?? null)
}

export async function loadPeople(
  supabase: SupabaseClient,
  fn: 'challenge_people' | 'meetup_people',
  id: string,
): Promise<Person[]> {
  const args = fn === 'challenge_people' ? { p_challenge_id: id } : { p_meetup_id: id }
  const { data, error } = await supabase.rpc(fn, args)
  log(fn, error)
  return error ? [] : ((data ?? []) as Person[])
}

/** Geheimes Feld über die SECURITY-DEFINER-Funktion (null, wenn nicht erlaubt). */
export async function loadSecret(
  supabase: SupabaseClient,
  fn: 'challenge_whatsapp_url' | 'meetup_exact_place',
  id: string,
): Promise<string | null> {
  const args = fn === 'challenge_whatsapp_url' ? { p_challenge_id: id } : { p_meetup_id: id }
  const { data, error } = await supabase.rpc(fn, args)
  log(fn, error)
  return error || typeof data !== 'string' || data === '' ? null : data
}
