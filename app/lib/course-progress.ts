import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './supabase/database.types'

// ─────────────────────────────────────────────────────────────────────────────
// Kurs-Fortschritt = abgehakte Tage (day_completions). Reine Helfer hier,
// testbar ohne DB (tests/course-progress.test.ts); die zwei Leser darunter
// kapseln den einzigen Lesepfad auf die Tabelle.
//
// Was hier NICHT liegt: ob ein Tag frei ist. Das entscheidet course-access.ts
// (Drip). Die Helfer nehmen `maxUnlockedDay` als Eingabe entgegen und
// rechnen nie selbst mit Datumswerten.
// ─────────────────────────────────────────────────────────────────────────────

/** 0 bei leerem Kurs, sonst gerundet und auf 0–100 begrenzt. */
export function progressPercent(done: number, total: number): number {
  if (!Number.isFinite(done) || !Number.isFinite(total) || total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)))
}

/**
 * Darf dieser Tag abgehakt werden? Nur ganze Tage, die es als Inhalt gibt
 * (`availableDays`) UND die der Drip schon freigegeben hat.
 */
export function isDayCompletable(
  day: number,
  maxUnlockedDay: number,
  availableDays: readonly number[],
): boolean {
  if (!Number.isInteger(day) || day < 1) return false
  if (day > maxUnlockedDay) return false
  return availableDays.includes(day)
}

/**
 * Der nächste Tag, der offen ist, Inhalt hat und noch nicht abgehakt wurde —
 * oder null, wenn alles Offene erledigt ist. Immer der kleinste Kandidat,
 * damit Lücken zuerst geschlossen werden.
 */
export function nextOpenDay(
  completed: ReadonlySet<number>,
  maxUnlockedDay: number,
  availableDays: readonly number[],
): number | null {
  const candidates = availableDays
    .filter((d) => d <= maxUnlockedDay && !completed.has(d))
    .sort((a, b) => a - b)
  return candidates.length > 0 ? candidates[0] : null
}

type Client = SupabaseClient<Database>

/** Abgehakte Tagesnummern eines Users in einem Programm. Lesefehler → leer. */
export async function getCompletedDays(
  supabase: Client,
  userId: string,
  programId: string,
): Promise<Set<number>> {
  const { data, error } = await supabase
    .from('day_completions')
    .select('day_number')
    .eq('user_id', userId)
    .eq('program_id', programId)

  if (error) {
    console.error('[course-progress] day_completions read failed', {
      userId,
      programId,
      code: error.code,
      message: error.message,
    })
    return new Set()
  }
  return new Set((data ?? []).map((r) => r.day_number))
}

/** Abgehakte Tage aller Programme eines Users, gruppiert nach program_id. */
export async function getCompletedDaysByProgram(
  supabase: Client,
  userId: string,
): Promise<Map<string, Set<number>>> {
  const out = new Map<string, Set<number>>()
  const { data, error } = await supabase
    .from('day_completions')
    .select('program_id, day_number')
    .eq('user_id', userId)

  if (error) {
    console.error('[course-progress] day_completions read failed', {
      userId,
      code: error.code,
      message: error.message,
    })
    return out
  }
  for (const row of data ?? []) {
    const set = out.get(row.program_id) ?? new Set<number>()
    set.add(row.day_number)
    out.set(row.program_id, set)
  }
  return out
}
