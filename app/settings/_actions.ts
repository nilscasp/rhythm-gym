'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '../lib/supabase/server'
import type { Json } from '../lib/supabase/database.types'
import { CONSENT_TEXT_VERSION } from '../lib/consent'
import { isBrevoConfigured, upsertConfirmedContact } from '../lib/brevo'

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
  // Wer aus den Einstellungen kommt, bleibt in den Einstellungen — sonst wirft
  // ein Instrumentwechsel die Person unvermittelt ins Training. Ohne das Feld
  // bleibt der Onboarding-Weg unverändert.
  if (String(formData.get('return_to')) === '/settings') {
    redirect('/settings?msg=instrument')
  }
  redirect('/training')
}

// ─────────────────────────────────────────────────────────────────────────────
// updateBriefeConsentAction
// Einwilligung für die „Briefe aus der Schule" in den Einstellungen umschalten.
//
// Die Einwilligung selbst liegt in `profiles` (Zeitpunkt + Textversion) — das
// ist das Protokoll. Brevo ist der Versandweg; die Übertragung dorthin darf
// niemals das Speichern kippen, sonst hängt die Einwilligung an der Laune eines
// fremden Dienstes. Scheitert sie, bleibt `brevo_synced_at` null und der
// nächste Sync-Lauf holt es nach.
// ─────────────────────────────────────────────────────────────────────────────

export type ConsentState = { status: 'idle' | 'ok' | 'error'; message?: string }

const CONSENT_SAVE_FAILED =
  'Speichern fehlgeschlagen — versuch es gleich noch einmal.'

export async function updateBriefeConsentAction(
  _prev: ConsentState,
  formData: FormData,
): Promise<ConsentState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const raw = formData.get('consent')
  const optIn = raw === 'on' || raw === 'true'

  if (!optIn) {
    // Bewusst KEIN Brevo-Aufruf beim Abmelden: den Kontakt entfernt Nils dort
    // von Hand, oder die Person nutzt den Abmelde-Link in jeder Mail. Ein
    // automatischer Löschruf würde bei einem Fehler unbemerkt scheitern und
    // beide Seiten auseinanderlaufen lassen — hier zählt, dass von uns nichts
    // Neues mehr rausgeht.
    const { error } = await supabase
      .from('profiles')
      .update({
        marketing_consent_at: null,
        marketing_consent_text_version: null,
        brevo_synced_at: null,
      })
      .eq('id', user.id)
    if (error) {
      console.error('[briefe-einwilligung] Abmeldung konnte nicht gespeichert werden')
      return { status: 'error', message: CONSENT_SAVE_FAILED }
    }

    revalidatePath('/settings')
    return {
      status: 'ok',
      message:
        'Gespeichert. Du bekommst keine neuen Briefe mehr. Aus einer Mail, die schon unterwegs ist, kommst du jederzeit über den Abmelde-Link am Ende raus.',
    }
  }

  const consentAt = new Date().toISOString()
  const { error } = await supabase
    .from('profiles')
    .update({
      marketing_consent_at: consentAt,
      marketing_consent_text_version: CONSENT_TEXT_VERSION,
      // Zurück auf null, damit der Sync die Adresse erneut überträgt.
      brevo_synced_at: null,
    })
    .eq('id', user.id)
  if (error) {
    console.error('[briefe-einwilligung] Einwilligung konnte nicht gespeichert werden')
    return { status: 'error', message: CONSENT_SAVE_FAILED }
  }

  // Nur bestätigte Adressen gehen raus — eine unbestätigte wäre ein offenes
  // Tor, jemand anderes auf die Liste zu setzen.
  if (isBrevoConfigured() && user.email && user.email_confirmed_at) {
    const result = await upsertConfirmedContact({
      email: user.email,
      consentAt,
      source: 'profil',
    })

    if (!result.ok) {
      // Nie die Adresse ins Log — Status und adressfreie Meldung genügen.
      console.error(
        `[briefe-einwilligung] Übertragung an den Versand fehlgeschlagen (Status ${result.status}): ${result.message}`,
      )
      revalidatePath('/settings')
      return {
        status: 'ok',
        message:
          'Gespeichert. Die Übertragung an den Versand hakt gerade — ich schaue nach.',
      }
    }

    const { error: syncErr } = await supabase
      .from('profiles')
      .update({ brevo_synced_at: new Date().toISOString() })
      .eq('id', user.id)
    if (syncErr) {
      console.error('[briefe-einwilligung] Sync-Zeitpunkt konnte nicht gespeichert werden')
    }
  }

  revalidatePath('/settings')
  return { status: 'ok', message: 'Gespeichert. Du bekommst die Briefe aus der Schule.' }
}
