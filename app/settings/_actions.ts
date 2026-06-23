'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '../lib/supabase/server'
import type { Json } from '../lib/supabase/database.types'

// ─────────────────────────────────────────────────────────────────────────────
// saveHandpanAction
// Speichert ein vom User gewähltes/gebautes Instrument in handpans und setzt es
// als aktiv (profiles.active_handpan_id). Weil RLS NICHT erzwingt, dass ein
// aktiviertes Instrument dem User gehört, garantieren wir das hier: wir inserten
// den Pan unmittelbar vorher für genau diesen User und aktivieren nur diese id.
// ─────────────────────────────────────────────────────────────────────────────

export type SaveHandpanState = { status: 'idle' | 'error'; message?: string }

interface IncomingNote {
  id: string
  label: string
  x: number
  y: number
  r: number
}

function parseNotes(raw: FormDataEntryValue | null): IncomingNote[] | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null

  const notes: IncomingNote[] = []
  for (const n of parsed) {
    if (!n || typeof n !== 'object') return null
    const o = n as Record<string, unknown>
    if (typeof o.label !== 'string' || o.label.trim() === '') return null
    notes.push({
      id: typeof o.id === 'string' && o.id ? o.id : crypto.randomUUID(),
      label: o.label.trim(),
      x: typeof o.x === 'number' ? o.x : 500,
      y: typeof o.y === 'number' ? o.y : 500,
      r: typeof o.r === 'number' ? o.r : 48,
    })
  }
  return notes
}

export async function saveHandpanAction(
  _prev: SaveHandpanState,
  formData: FormData,
): Promise<SaveHandpanState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const name = String(formData.get('name') ?? '').trim()
  const rawScale = String(formData.get('scale_name') ?? '').trim()
  const scale_name = rawScale === '' ? null : rawScale
  const notes = parseNotes(formData.get('notes'))

  if (!name) {
    return { status: 'error', message: 'Bitte gib deinem Instrument einen Namen.' }
  }
  if (!notes) {
    return { status: 'error', message: 'Dein Instrument braucht mindestens eine Note (das Ding).' }
  }

  const { data: inserted, error: insErr } = await supabase
    .from('handpans')
    .insert({ user_id: user.id, name, scale_name, notes: notes as unknown as Json })
    .select('id')
    .single()
  if (insErr || !inserted) {
    return { status: 'error', message: 'Speichern fehlgeschlagen — versuch es gleich noch einmal.' }
  }

  const { error: updErr } = await supabase
    .from('profiles')
    .update({ active_handpan_id: inserted.id })
    .eq('id', user.id)
  if (updErr) {
    return { status: 'error', message: 'Instrument gespeichert, aber Aktivierung fehlgeschlagen. Du kannst es in den Einstellungen erneut wählen.' }
  }

  revalidatePath('/training')
  revalidatePath('/settings')
  redirect('/training')
}
