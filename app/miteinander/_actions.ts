'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import {
  berlinToday,
  errorCodeFrom,
  parseChallengeForm,
  parseContactForm,
  parseMeetupForm,
  validateConnectionMessage,
  type MiteinanderError,
} from '../lib/miteinander'
import { backPath, insertErrorCode, isUuid, withParam } from '../lib/miteinander-view'
import { miteinanderSession } from './_session'

// ─────────────────────────────────────────────────────────────────────────────
// Server Actions für Miteinander (Abschnitt G, Migration 0013).
//
// Eingaben laufen durch die Validierer aus app/lib/miteinander.ts; die
// Datenbank prüft dieselben Grenzen noch einmal. Geschrieben wird nur über
// die SECURITY-DEFINER-Funktionen bzw. die freigegebenen Spalten aus 0013.
// Auf challenges/meetups wird nie `*` gelesen (Spalten-Grants), Rückgabe
// immer `.select('id')`.
//
// Fehler: Rückleitung mit ?fehler=<code>, die Seite zeigt messageFor(code).
// Erfolg: revalidatePath, dann Rückleitung.
// ─────────────────────────────────────────────────────────────────────────────

const HOME = '/miteinander'
const MEIN_WEG = '/mein-weg'

function fail(path: string, code: MiteinanderError): never {
  redirect(withParam(path, 'fehler', code))
}

function text(formData: FormData, key: string): string {
  const v = formData.get(key)
  return typeof v === 'string' ? v : ''
}

function idFrom(formData: FormData, key: string, back: string): string {
  const id = text(formData, key)
  if (!isUuid(id)) fail(back, 'not_found')
  return id
}

function refresh(...paths: string[]) {
  for (const p of new Set([HOME, ...paths])) revalidatePath(p)
}

// ── Mein Kontakt ─────────────────────────────────────────────────────────────

export async function saveContactAction(formData: FormData): Promise<void> {
  const { supabase, user } = await miteinanderSession()
  const back = `${MEIN_WEG}#kontakt`
  const parsed = parseContactForm({
    display_name: text(formData, 'display_name'),
    phone: text(formData, 'phone'),
    region: text(formData, 'region'),
    about: text(formData, 'about'),
    visible: formData.get('visible') === 'on',
    open_for: formData.getAll('open_for').filter((v): v is string => typeof v === 'string'),
  })
  if (!parsed.ok) fail(back, parsed.error)

  const { error } = await supabase
    .from('member_profiles')
    .upsert({ user_id: user.id, ...parsed.value, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) {
    console.error('[miteinander] save contact failed', { code: error.code })
    fail(back, errorCodeFrom(error))
  }
  refresh(MEIN_WEG)
  redirect(withParam(back, 'gespeichert', '1'))
}

// ── Verbindungen ─────────────────────────────────────────────────────────────

export async function requestConnectionAction(formData: FormData): Promise<void> {
  const { supabase } = await miteinanderSession()
  const to = idFrom(formData, 'to_user', HOME)
  const back = `${HOME}/mensch/${to}`
  const message = validateConnectionMessage(text(formData, 'message'))
  if (!message.ok) fail(back, message.error)

  const { error } = await supabase.rpc('request_connection', { p_to_user: to, p_message: message.value })
  if (error) fail(back, errorCodeFrom(error))
  refresh(back, MEIN_WEG)
  redirect(withParam(back, 'ok', 'gesendet'))
}

export async function answerConnectionAction(formData: FormData): Promise<void> {
  const { supabase } = await miteinanderSession()
  const back = backPath(text(formData, 'zurueck'), `${MEIN_WEG}#anfragen`)
  const id = idFrom(formData, 'request_id', back)
  const accept = text(formData, 'accept') === '1'

  const { error } = await supabase.rpc('answer_connection', { p_request_id: id, p_accept: accept })
  if (error) fail(back, errorCodeFrom(error))
  refresh(MEIN_WEG, back.split('#')[0])
  redirect(withParam(back, 'ok', accept ? 'verbunden' : 'abgelehnt'))
}

export async function withdrawConnectionAction(formData: FormData): Promise<void> {
  const { supabase } = await miteinanderSession()
  const back = backPath(text(formData, 'zurueck'), MEIN_WEG)
  const id = idFrom(formData, 'request_id', back)

  const { error } = await supabase.rpc('withdraw_connection', { p_request_id: id })
  if (error) fail(back, errorCodeFrom(error))
  refresh(MEIN_WEG, back.split('#')[0])
  redirect(withParam(back, 'ok', 'zurueckgezogen'))
}

export async function endConnectionAction(formData: FormData): Promise<void> {
  const { supabase } = await miteinanderSession()
  const back = backPath(text(formData, 'zurueck'), MEIN_WEG)
  const id = idFrom(formData, 'request_id', back)

  const { error } = await supabase.rpc('end_connection', { p_request_id: id })
  if (error) fail(back, errorCodeFrom(error))
  refresh(MEIN_WEG, back.split('#')[0])
  redirect(withParam(back, 'ok', 'geloest'))
}

// ── Challenges ───────────────────────────────────────────────────────────────

function challengeInput(formData: FormData) {
  return {
    title: text(formData, 'title'),
    description: text(formData, 'description'),
    area: text(formData, 'area'),
    starts_on: text(formData, 'starts_on'),
    duration_days: text(formData, 'duration_days'),
    ends_on: text(formData, 'ends_on'),
    max_members: text(formData, 'max_members'),
    whatsapp_url: text(formData, 'whatsapp_url'),
  }
}

export async function createChallengeAction(formData: FormData): Promise<void> {
  const { supabase, user } = await miteinanderSession()
  const back = `${HOME}/challenge/neu`
  const parsed = parseChallengeForm(challengeInput(formData), berlinToday())
  if (!parsed.ok) fail(back, parsed.error)

  const { data, error } = await supabase
    .from('challenges')
    .insert({ created_by: user.id, ...parsed.value })
    .select('id')
    .single()
  if (error || !data) fail(back, insertErrorCode(error, 'challenge'))
  refresh()
  redirect(`${HOME}/challenge/${(data as { id: string }).id}`)
}

export async function updateChallengeAction(formData: FormData): Promise<void> {
  const { supabase, user } = await miteinanderSession()
  const id = idFrom(formData, 'id', HOME)
  const back = `${HOME}/challenge/${id}/bearbeiten`
  // Eine laufende Challenge darf ihren Start behalten.
  const parsed = parseChallengeForm(challengeInput(formData), berlinToday(), { allowPastStart: true })
  if (!parsed.ok) fail(back, parsed.error)

  const { data, error } = await supabase
    .from('challenges')
    .update(parsed.value)
    .eq('id', id)
    .eq('created_by', user.id)
    .select('id')
  if (error) fail(back, insertErrorCode(error, 'challenge'))
  if (!data || data.length === 0) fail(back, 'not_allowed')
  refresh(`${HOME}/challenge/${id}`)
  redirect(withParam(`${HOME}/challenge/${id}`, 'ok', 'gespeichert'))
}

export async function closeChallengeAction(formData: FormData): Promise<void> {
  const { supabase, user } = await miteinanderSession()
  const id = idFrom(formData, 'id', HOME)
  const back = `${HOME}/challenge/${id}`

  const { data, error } = await supabase
    .from('challenges')
    .update({ status: 'closed' })
    .eq('id', id)
    .eq('created_by', user.id)
    .select('id')
  if (error) fail(back, errorCodeFrom(error))
  if (!data || data.length === 0) fail(back, 'not_allowed')
  refresh(back)
  redirect(withParam(back, 'ok', 'geschlossen'))
}

export async function joinChallengeAction(formData: FormData): Promise<void> {
  const { supabase } = await miteinanderSession()
  const id = idFrom(formData, 'id', HOME)
  const back = `${HOME}/challenge/${id}`

  const { error } = await supabase.rpc('join_challenge', { p_challenge_id: id })
  if (error) fail(back, errorCodeFrom(error))
  refresh(back)
  redirect(withParam(back, 'ok', 'dabei'))
}

export async function leaveChallengeAction(formData: FormData): Promise<void> {
  const { supabase } = await miteinanderSession()
  const id = idFrom(formData, 'id', HOME)
  const back = `${HOME}/challenge/${id}`

  const { error } = await supabase.rpc('leave_challenge', { p_challenge_id: id })
  if (error) fail(back, errorCodeFrom(error))
  refresh(back)
  redirect(back)
}

// ── Treffen ──────────────────────────────────────────────────────────────────

function meetupInput(formData: FormData) {
  return {
    title: text(formData, 'title'),
    description: text(formData, 'description'),
    region: text(formData, 'region'),
    place_hint: text(formData, 'place_hint'),
    exact_place: text(formData, 'exact_place'),
    date: text(formData, 'date'),
    time: text(formData, 'time'),
    max_people: text(formData, 'max_people'),
    online: formData.get('online') === 'on',
  }
}

export async function createMeetupAction(formData: FormData): Promise<void> {
  const { supabase, user } = await miteinanderSession()
  const back = `${HOME}/treffen/neu`
  const parsed = parseMeetupForm(meetupInput(formData), new Date())
  if (!parsed.ok) fail(back, parsed.error)

  const { data, error } = await supabase
    .from('meetups')
    .insert({ created_by: user.id, ...parsed.value })
    .select('id')
    .single()
  if (error || !data) fail(back, insertErrorCode(error, 'meetup'))
  refresh()
  redirect(`${HOME}/treffen/${(data as { id: string }).id}`)
}

export async function updateMeetupAction(formData: FormData): Promise<void> {
  const { supabase, user } = await miteinanderSession()
  const id = idFrom(formData, 'id', HOME)
  const back = `${HOME}/treffen/${id}/bearbeiten`
  const parsed = parseMeetupForm(meetupInput(formData), new Date())
  if (!parsed.ok) fail(back, parsed.error)

  const { data, error } = await supabase
    .from('meetups')
    .update(parsed.value)
    .eq('id', id)
    .eq('created_by', user.id)
    .select('id')
  if (error) fail(back, insertErrorCode(error, 'meetup'))
  if (!data || data.length === 0) fail(back, 'not_allowed')
  refresh(`${HOME}/treffen/${id}`)
  redirect(withParam(`${HOME}/treffen/${id}`, 'ok', 'gespeichert'))
}

export async function closeMeetupAction(formData: FormData): Promise<void> {
  const { supabase, user } = await miteinanderSession()
  const id = idFrom(formData, 'id', HOME)
  const back = `${HOME}/treffen/${id}`

  const { data, error } = await supabase
    .from('meetups')
    .update({ status: 'closed' })
    .eq('id', id)
    .eq('created_by', user.id)
    .select('id')
  if (error) fail(back, errorCodeFrom(error))
  if (!data || data.length === 0) fail(back, 'not_allowed')
  refresh(back)
  redirect(withParam(back, 'ok', 'geschlossen'))
}

export async function joinMeetupAction(formData: FormData): Promise<void> {
  const { supabase } = await miteinanderSession()
  const id = idFrom(formData, 'id', HOME)
  const back = `${HOME}/treffen/${id}`

  const { error } = await supabase.rpc('join_meetup', { p_meetup_id: id })
  if (error) fail(back, errorCodeFrom(error))
  refresh(back)
  redirect(withParam(back, 'ok', 'dabei'))
}

export async function leaveMeetupAction(formData: FormData): Promise<void> {
  const { supabase } = await miteinanderSession()
  const id = idFrom(formData, 'id', HOME)
  const back = `${HOME}/treffen/${id}`

  const { error } = await supabase.rpc('leave_meetup', { p_meetup_id: id })
  if (error) fail(back, errorCodeFrom(error))
  refresh(back)
  redirect(back)
}
