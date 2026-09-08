import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../lib/supabase/database.types'
import { ANONYMOUS, type PublicEvent, type Viewer } from '../lib/event-access'

// ─────────────────────────────────────────────────────────────────────────────
// Gemeinsamer Unterbau der beiden Termin-Seiten (Liste + Detail).
//
// Zwei Dinge stehen hier, damit sie GENAU EINMAL existieren:
//
// 1) EVENT_COLUMNS — die Spaltenliste, Spalte für Spalte dieselbe wie das
//    `grant select (…)` in Migration 0006. `zoom_url` fehlt darin nicht aus
//    Nachlässigkeit: das Spalten-Privileg ist anon und authenticated entzogen,
//    eine Abfrage mit dieser Spalte bekäme einen Fehler statt Daten. Der
//    einzige Weg zur Tür ist `event_zoom_url()` — genau ein Aufruf im ganzen
//    Verzeichnis, auf der Detailseite.
//    Wer in der Migration eine Spalte ergänzt, ergänzt sie auch hier.
//
// 2) currentViewer() — der Betrachter für hasEventAccess(). Ausgeloggt ist
//    ANONYMOUS; die Seiten sind ohne Anmeldung erreichbar.
//
// Beide Lesefehler enden bewusst konservativ (kein Innerer Kreis, keine
// Einschreibungen). Ein Fehler darf höchstens eine Tür verstecken, die offen
// wäre — nie eine öffnen, die zu ist. Die Wahrheit hält ohnehin die
// SQL-Funktion; das hier entscheidet nur über die Darstellung.
// ─────────────────────────────────────────────────────────────────────────────

export const EVENT_COLUMNS =
  'id, title, description, starts_at, ends_at, kind, location, program_id, visibility, series_id, all_day, website_link, created_at, updated_at'

/** Ein Termin so, wie ihn EVENT_COLUMNS liefert. */
export type Termin = Omit<PublicEvent, 'created_by'>

export async function currentViewer(
  supabase: SupabaseClient<Database>,
): Promise<Viewer> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return ANONYMOUS

  const [profileResult, enrollmentResult] = await Promise.all([
    supabase.from('profiles').select('plan').eq('id', user.id).maybeSingle(),
    // status null zählt wie 'active' — dieselbe Regel wie in event_zoom_url().
    supabase
      .from('enrollments')
      .select('program_id')
      .eq('user_id', user.id)
      .or('status.is.null,status.eq.active'),
  ])

  if (profileResult.error) {
    console.error('[termine] profile read failed', {
      code: profileResult.error.code,
      message: profileResult.error.message,
    })
  }
  if (enrollmentResult.error) {
    console.error('[termine] enrollments read failed', {
      code: enrollmentResult.error.code,
      message: enrollmentResult.error.message,
    })
  }

  return {
    isAuthenticated: true,
    isPremium: profileResult.data?.plan === 'premium',
    enrolledProgramIds: (enrollmentResult.data ?? []).map((row) => row.program_id),
  }
}
