import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './supabase/database.types'

// ─────────────────────────────────────────────────────────────────────────────
// Kurszugang = Einschreibung (enrollments). Einziger Lese-Check fürs Gating
// der Kursrouten. Schreibwege in enrollments sind ausschließlich die
// DB-Funktion redeem_access_code() und Admin-Operationen — die RLS-Policy
// enrollments_insert_own wurde entfernt (Migration fundament_access_gating).
// ─────────────────────────────────────────────────────────────────────────────

export async function hasCourseAccess(
  supabase: SupabaseClient<Database>,
  userId: string,
  courseSlug: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('enrollments')
    .select('program_id, programs!inner(slug)')
    .eq('user_id', userId)
    .eq('programs.slug', courseSlug)
    .limit(1)

  // Fail closed: ein Lesefehler darf den Kurs nicht öffnen. Der Redirect
  // landet auf /training, wo die gesperrte Karte den Weg erklärt.
  if (error) return false
  return (data ?? []).length > 0
}
