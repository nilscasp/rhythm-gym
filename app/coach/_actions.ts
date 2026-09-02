'use server'

import { randomBytes } from 'node:crypto'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '../lib/supabase/server'

// ─────────────────────────────────────────────────────────────────────────────
// Zugangs-Code-Verwaltung (admin-only).
// RLS (admins_all_access_codes) erzwingt die Berechtigung auf DB-Ebene;
// der requireAdmin-Check hier ist Defense-in-Depth und liefert sauberere
// Redirects statt leerer RLS-Fehler.
// ─────────────────────────────────────────────────────────────────────────────

const RHYTHMUSFUNDAMENT_SLUG = 'rhythmusfundament'

// Ohne mehrdeutige Zeichen (0/O, 1/I/L) — Codes werden vorgelesen/abgetippt.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function generateCode(): string {
  const bytes = randomBytes(8)
  let s = ''
  for (let i = 0; i < 8; i++) s += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  return `RG-${s.slice(0, 4)}-${s.slice(4)}`
}

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

  return { supabase, user }
}

export async function createAccessCodeAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin()

  const rawMax = formData.get('max_uses')
  const parsedMax = typeof rawMax === 'string' ? parseInt(rawMax, 10) : NaN
  const maxUses = Number.isFinite(parsedMax) ? Math.min(Math.max(parsedMax, 1), 1000) : 1

  const rawExpires = formData.get('expires_at')
  const expiresAt =
    typeof rawExpires === 'string' && rawExpires.trim()
      ? new Date(`${rawExpires.trim()}T23:59:59Z`).toISOString()
      : null

  const rawNote = formData.get('note')
  const note = typeof rawNote === 'string' && rawNote.trim() ? rawNote.trim() : null

  // Drip-Unlock: Tag 1 wird an diesem Datum frei, danach täglich ein weiterer
  // Tag (Berlin-Kalendertage, Logik in app/lib/course-access.ts). Leer = alle
  // Tage sofort offen. Wird beim Einlösen in das Enrollment kopiert.
  // Vergangene Daten sind erlaubt (Kohorte läuft schon → entsprechend viele
  // Tage sofort offen). Kalendarisch ungültige Werte (2026-13-45) lehnen wir
  // hier ab, statt sie als kryptischen Postgres-Fehler durchzureichen.
  const rawDrip = formData.get('drip_start_date')
  const dripTrimmed = typeof rawDrip === 'string' ? rawDrip.trim() : ''
  let dripStartDate: string | null = null
  if (dripTrimmed) {
    const valid =
      /^\d{4}-\d{2}-\d{2}$/.test(dripTrimmed) &&
      new Date(`${dripTrimmed}T00:00:00Z`).toISOString().slice(0, 10) === dripTrimmed
    if (!valid) throw new Error('Ungültiges Freischalt-Datum (erwartet JJJJ-MM-TT).')
    dripStartDate = dripTrimmed
  }

  const { data: program, error: programErr } = await supabase
    .from('programs')
    .select('id')
    .eq('slug', RHYTHMUSFUNDAMENT_SLUG)
    .maybeSingle()
  if (programErr) throw programErr
  if (!program) throw new Error('Rhythmusfundament-Programm nicht gefunden.')

  // Unique-Kollision ist bei 31^8 Codes praktisch ausgeschlossen, aber billig
  // abzufangen: bis zu 3 Versuche mit frischem Code.
  let lastError: unknown = null
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await supabase.from('access_codes').insert({
      code: generateCode(),
      program_id: program.id,
      max_uses: maxUses,
      expires_at: expiresAt,
      drip_start_date: dripStartDate,
      note,
      created_by: user.id,
    })
    if (!error) {
      revalidatePath('/coach')
      return
    }
    lastError = error
    if (error.code !== '23505') break
  }
  throw lastError
}

export async function toggleAccessCodeAction(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin()

  const rawId = formData.get('id')
  const id = typeof rawId === 'string' ? rawId.trim() : ''
  if (!id) return

  const { data: row, error: readErr } = await supabase
    .from('access_codes')
    .select('active')
    .eq('id', id)
    .maybeSingle()
  if (readErr) throw readErr
  if (!row) return

  const { error: updateErr } = await supabase
    .from('access_codes')
    .update({ active: !row.active })
    .eq('id', id)
  if (updateErr) throw updateErr

  revalidatePath('/coach')
}
