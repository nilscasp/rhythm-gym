'use server'

import { randomBytes, randomUUID } from 'node:crypto'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '../lib/supabase/server'
import { isEventKind, isEventVisibility } from '../lib/event-access'
import {
  MAX_REPEAT_WEEKS,
  berlinLocalToUtcISO,
  weeklySeriesUtcISO,
} from '../lib/event-time'

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

// ─────────────────────────────────────────────────────────────────────────────
// Termine (admin-only, Phasenplan v2 §4).
//
// Gleiche Aufteilung wie oben: RLS (events_admin_write) hält, requireAdmin()
// hier liefert nur den freundlicheren Weg. Zwei Dinge sind eigen:
//
// 1) ZEIT. Das Formular schickt eine Berliner Wanduhr ohne Zone; die Datenbank
//    will einen Zeitpunkt. Umgerechnet wird ausschließlich in event-time.ts —
//    nie mit `new Date(local)`, sonst steht der Termin im Sommer eine Stunde
//    falsch (Vercel läuft in UTC).
// 2) SERIE. Wiederholungen sind n Einzelzeilen mit gemeinsamer series_id,
//    kein RRULE-Motor. Jede Zeile wird aus ihrer eigenen Wanduhr gerechnet,
//    damit „samstags um 19 Uhr" auch nach der Zeitumstellung 19 Uhr bleibt.
// ─────────────────────────────────────────────────────────────────────────────

function requiredText(formData: FormData, field: string, label: string): string {
  const raw = formData.get(field)
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (!value) throw new Error(`${label} fehlt.`)
  return value
}

function optionalText(formData: FormData, field: string): string | null {
  const raw = formData.get(field)
  const value = typeof raw === 'string' ? raw.trim() : ''
  return value || null
}

/** Die Felder, die Anlegen und Bearbeiten teilen — einmal geprüft, einmal gebaut. */
function readEventFields(formData: FormData) {
  const titleDe = requiredText(formData, 'title_de', 'Der Titel')
  const startsAtLocal = requiredText(formData, 'starts_at_local', 'Der Beginn')

  const kind = formData.get('kind')
  if (!isEventKind(kind)) throw new Error('Unbekannte Art von Termin.')

  const visibility = formData.get('visibility')
  if (!isEventVisibility(visibility)) throw new Error('Unbekannte Sichtbarkeit.')

  const programId = optionalText(formData, 'program_id')

  // Der Browser verlangt das Feld schon, aber ein abgeschaltetes JavaScript
  // oder ein direkt abgeschicktes Formular darf keinen Termin erzeugen, zu dem
  // niemand hineinkommt: visibility 'program' ohne program_id sperrt jeden aus.
  if (visibility === 'program' && !programId) {
    throw new Error('Für „nur wer im Kurs ist" muss ein Kurs ausgewählt sein.')
  }

  const rawDuration = formData.get('duration_minutes')
  const parsedDuration =
    typeof rawDuration === 'string' && rawDuration.trim() ? Number(rawDuration) : NaN
  const durationMinutes =
    Number.isFinite(parsedDuration) && parsedDuration > 0
      ? Math.min(Math.round(parsedDuration), 24 * 60)
      : null

  return {
    titleDe,
    startsAtLocal,
    kind,
    visibility,
    programId,
    durationMinutes,
    // jsonb {"de": …} — Englisch kommt mit next-intl (KW38) dazu.
    description: optionalText(formData, 'description_de'),
    location: optionalText(formData, 'location'),
    zoomUrl: optionalText(formData, 'zoom_url'),
    websiteLink: optionalText(formData, 'website_link'),
    allDay: formData.get('all_day') === '1',
  }
}

/** Dauer in Minuten auf einen Zeitpunkt addieren — echte verstrichene Zeit. */
function endsAtFrom(startsAtISO: string, durationMinutes: number | null): string | null {
  if (!durationMinutes) return null
  return new Date(new Date(startsAtISO).getTime() + durationMinutes * 60_000).toISOString()
}

export async function createEventAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin()
  const fields = readEventFields(formData)

  const rawRepeat = formData.get('repeat_weeks')
  const parsedRepeat = typeof rawRepeat === 'string' && rawRepeat.trim() ? Number(rawRepeat) : 1
  const repeatWeeks =
    Number.isFinite(parsedRepeat) && parsedRepeat > 1
      ? Math.min(Math.trunc(parsedRepeat), MAX_REPEAT_WEEKS)
      : 1

  const starts = weeklySeriesUtcISO(fields.startsAtLocal, repeatWeeks)
  // Eine Serie bekommt eine gemeinsame Kennung, ein einzelner Termin keine —
  // sonst stünde später bei jedem Termin ein „ganze Serie löschen".
  const seriesId = starts.length > 1 ? randomUUID() : null

  const rows = starts.map((startsAt) => ({
    title: { de: fields.titleDe },
    description: fields.description ? { de: fields.description } : null,
    starts_at: startsAt,
    ends_at: endsAtFrom(startsAt, fields.durationMinutes),
    kind: fields.kind,
    visibility: fields.visibility,
    all_day: fields.allDay,
    location: fields.location,
    zoom_url: fields.zoomUrl,
    program_id: fields.programId,
    website_link: fields.websiteLink,
    series_id: seriesId,
    created_by: user.id,
  }))

  const { error } = await supabase.from('events').insert(rows)
  if (error) throw error

  revalidatePath('/coach')
  revalidatePath('/termine')
}

export async function updateEventAction(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin()

  const rawId = formData.get('id')
  const id = typeof rawId === 'string' ? rawId.trim() : ''
  if (!id) return

  const fields = readEventFields(formData)
  // Einzelne Zeile, bewusst ohne Serien-Logik: wer eine ganze Serie verschieben
  // will, löscht sie und legt sie neu an (Phasenplan §4).
  const startsAt = berlinLocalToUtcISO(fields.startsAtLocal)

  const patch: Record<string, unknown> = {
    title: { de: fields.titleDe },
    description: fields.description ? { de: fields.description } : null,
    starts_at: startsAt,
    ends_at: endsAtFrom(startsAt, fields.durationMinutes),
    kind: fields.kind,
    visibility: fields.visibility,
    all_day: fields.allDay,
    location: fields.location,
    program_id: fields.programId,
    website_link: fields.websiteLink,
    updated_at: new Date().toISOString(),
  }

  // Die Zoom-Tür ist der eine Wert, den das Formular NICHT vorbefüllen kann:
  // das Spalten-Privileg ist entzogen (Migration 0006), lesen geht nur über
  // event_zoom_url(). Ein leeres Feld heißt darum „unverändert" und nicht
  // „löschen" — sonst wäre die Tür nach jedem Titel-Tippfehler weg. Entfernen
  // ist möglich, aber nur ausdrücklich.
  if (formData.get('remove_zoom_url') === '1') {
    patch.zoom_url = null
  } else if (fields.zoomUrl) {
    patch.zoom_url = fields.zoomUrl
  }

  const { error } = await supabase.from('events').update(patch).eq('id', id)
  if (error) throw error

  revalidatePath('/coach')
  revalidatePath('/termine')
}

export async function deleteEventAction(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin()

  const rawId = formData.get('id')
  const id = typeof rawId === 'string' ? rawId.trim() : ''
  if (!id) return

  const wholeSeries = formData.get('whole_series') === '1'

  if (wholeSeries) {
    // series_id steht nicht im Formular: aus der Zeile lesen, damit ein
    // manipuliertes Feld nicht eine fremde Serie löschen kann.
    const { data: row, error: readErr } = await supabase
      .from('events')
      .select('series_id')
      .eq('id', id)
      .maybeSingle()
    if (readErr) throw readErr
    if (!row) return

    if (row.series_id) {
      const { error } = await supabase.from('events').delete().eq('series_id', row.series_id)
      if (error) throw error
      revalidatePath('/coach')
      revalidatePath('/termine')
      return
    }
    // Keine Serie — dann eben nur diese eine Zeile.
  }

  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) throw error

  revalidatePath('/coach')
  revalidatePath('/termine')
}
