import type { SupabaseClient } from '@supabase/supabase-js'
import type { Messages } from '../../messages'
import type { Database } from '../lib/supabase/database.types'
import type { Locale } from '../lib/locale'
import {
  ANONYMOUS,
  type EventAccess,
  type PublicEvent,
  type Viewer,
} from '../lib/event-access'

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

// ─────────────────────────────────────────────────────────────────────────────
// Sprache der beiden Termin-Seiten.
//
// `hintFor` tritt an die Stelle des früheren `accessHint()` aus
// `event-access.ts`. Es steht hier und nicht dort, weil die Zuordnung
// Grund → Satz eine Sache der OBERFLÄCHE ist: `hasEventAccess` liefert einen
// Grund, die Seite entscheidet, wie sie ihn ausspricht. Liste und Detailseite
// rufen dieselbe Funktion, damit derselbe Termin nicht an zwei Stellen zwei
// verschiedene Sätze bekommt.
//
// Die Maps darunter sind Texte OHNE Schlüssel in `messages/*`: Titel und
// Beschreibung der Seiten (Metadaten, nie im Fließtext) und der Satz für einen
// fehlgeschlagenen Lesevorgang. Sobald `messages/*` Schlüssel dafür bekommt,
// wandern sie dorthin und diese Maps verschwinden ersatzlos.
// ─────────────────────────────────────────────────────────────────────────────

/** Ruhige Zeile, warum die Tür zu ist. `null`, wenn sie offen steht. */
export function hintFor(access: EventAccess, t: Messages): string | null {
  if (access.canJoin) return null
  switch (access.reason) {
    case 'login':
      return t.events.hintLogin
    case 'premium':
      return t.events.hintCircle
    case 'program':
      return t.events.hintProgram
  }
}

/** Metadaten der Liste. Der Markenname wird nicht übersetzt. */
export const LIST_META: Record<Locale, { title: string; description: string }> = {
  de: {
    title: 'Termine — Handpan Schule des Lebens',
    description:
      'Live-Trainings, Fragerunden und Workshops mit Datum, Uhrzeit und Ort — offen einsehbar, auch ohne Konto.',
  },
  en: {
    title: 'Events — Handpan Schule des Lebens',
    description:
      'Live trainings, question rounds and workshops with date, time and place — open to read, no account needed.',
  },
}

/** Titel der Detailseite, wenn der Termin (noch) keinen hergibt. */
export const DETAIL_FALLBACK_TITLE: Record<Locale, string> = {
  de: 'Termin — Handpan Schule des Lebens',
  en: 'Event — Handpan Schule des Lebens',
}

/** Detailtitel mit Markenzusatz — eine Formulierung für beide Sprachen. */
export function detailTitle(title: string, locale: Locale): string {
  return title ? `${title} — Handpan Schule des Lebens` : DETAIL_FALLBACK_TITLE[locale]
}

/** Lesefehler der Liste — nicht dasselbe wie „nichts geplant". */
export const LIST_LOAD_ERROR: Record<Locale, string> = {
  de: 'Die Termine lassen sich gerade nicht laden. Versuch es bitte gleich noch einmal.',
  en: 'The events cannot be loaded right now. Please try again in a moment.',
}
