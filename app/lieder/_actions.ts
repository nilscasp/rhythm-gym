'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { DIFFICULTIES, LIMITS, checkTab, errorCodeFrom, isUuid, metaOf, type LiederError } from '../lib/lieder'
import type { Json } from '../lib/supabase/database.types'
import { liederSession } from './_session'

// ─────────────────────────────────────────────────────────────────────────────
// Server Actions für Lieder (Migration 0015). Geschrieben wird nur über die
// SECURITY-DEFINER-Funktionen; die Datenbank prüft dieselben Grenzen noch einmal.
// Fehler: Rückleitung mit ?fehler=<code>. Erfolg: ?ok=<wort>.
// ─────────────────────────────────────────────────────────────────────────────

function text(formData: FormData, key: string): string {
  const v = formData.get(key)
  return typeof v === 'string' ? v : ''
}

function fail(path: string, code: LiederError): never {
  redirect(`${path}${path.includes('?') ? '&' : '?'}fehler=${code}`)
}

export async function submitSongAction(formData: FormData): Promise<void> {
  const { supabase, isMember } = await liederSession()
  const id = text(formData, 'id')
  const back = id ? `/lieder/${id}/bearbeiten` : '/lieder/neu'
  if (!isMember) fail('/lieder', 'not_member')
  if (id && !isUuid(id)) fail('/lieder', 'not_found')
  if (formData.get('own_work') !== 'on') fail(back, 'not_own_work')

  const tabText = text(formData, 'tab')
  if (tabText.length > LIMITS.bytes) fail(back, 'invalid_data')
  let raw: unknown
  try {
    raw = JSON.parse(tabText)
  } catch {
    fail(back, 'invalid_data')
  }
  const checked = checkTab(raw)
  if (!checked.ok) fail(back, checked.error)

  const title = text(formData, 'title').trim().slice(0, LIMITS.title)
  if (!title) fail(back, 'invalid_title')
  const artist = text(formData, 'artist').trim().slice(0, LIMITS.artist)
  const diff = text(formData, 'difficulty')
  const difficulty = (DIFFICULTIES as readonly string[]).includes(diff) ? diff : 'Mittel'
  const source = { ...checked.source, title, artist, difficulty: difficulty as typeof checked.source.difficulty }
  const meta = metaOf({ ...checked.song, title, artist })

  const { data, error } = await supabase.rpc('submit_song', {
    p_id: id || null,
    p_title: title,
    p_artist: artist,
    p_difficulty: difficulty,
    p_handpan: meta.handpan,
    p_bpm: meta.bpm,
    p_measures: meta.measures,
    p_data: source as unknown as Json,
    p_own_work: true,
  })
  if (error) {
    console.error('[lieder] submit_song failed', { code: error.code, message: error.message })
    fail(back, errorCodeFrom(error))
  }
  revalidatePath('/lieder')
  redirect(`/lieder/${data}?ok=eingereicht`)
}

export async function deleteSongAction(formData: FormData): Promise<void> {
  const { supabase } = await liederSession()
  const id = text(formData, 'id')
  if (!isUuid(id)) fail('/lieder', 'not_found')
  const { error } = await supabase.rpc('delete_song', { p_id: id })
  if (error) fail(`/lieder/${id}`, errorCodeFrom(error))
  revalidatePath('/lieder')
  redirect('/lieder?zeige=meine&ok=geloescht')
}

export async function reviewSongAction(formData: FormData): Promise<void> {
  const { supabase, isAdmin } = await liederSession()
  const id = text(formData, 'id')
  if (!isUuid(id)) fail('/lieder', 'not_found')
  if (!isAdmin) fail(`/lieder/${id}`, 'not_admin')
  const approve = text(formData, 'entscheidung') === 'frei'
  // Freigabe gilt nur der geprüften Fassung (0015, admin_review_song)
  const seen = text(formData, 'seen')
  if (!seen || Number.isNaN(Date.parse(seen))) fail(`/lieder/${id}`, 'changed')
  const note = text(formData, 'notiz').trim().slice(0, LIMITS.note)
  const { error } = await supabase.rpc('admin_review_song', { p_id: id, p_approve: approve, p_seen: seen, p_note: note || null })
  if (error) fail(`/lieder/${id}`, errorCodeFrom(error))
  revalidatePath('/lieder')
  redirect(`/lieder?zeige=pruefen&ok=${approve ? 'freigegeben' : 'abgelehnt'}`)
}
