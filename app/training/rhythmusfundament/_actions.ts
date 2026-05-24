'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '../../lib/supabase/server'

// ─────────────────────────────────────────────────────────────────────────────
// toggleCompletionAction
// Auth-gated toggle for the `completions` table. Reads `exercise_id` from the
// form payload, then either DELETEs the existing row for (user_id, exercise_id)
// or INSERTs a new one. Revalidates the course player and the training hub so
// per-day progress + hub completion-count stay in sync.
// ─────────────────────────────────────────────────────────────────────────────
export async function toggleCompletionAction(formData: FormData): Promise<void> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  const rawId = formData.get('exercise_id')
  const exerciseId = typeof rawId === 'string' ? rawId.trim() : ''
  if (!exerciseId) {
    // No id → nothing to toggle. Bail without touching the table.
    return
  }

  const { data: existing, error: selectErr } = await supabase
    .from('completions')
    .select('exercise_id')
    .eq('user_id', user.id)
    .eq('exercise_id', exerciseId)
    .maybeSingle()

  if (selectErr) {
    // Surface server-side; do NOT silently flip UI on a broken read.
    throw selectErr
  }

  if (existing) {
    const { error: delErr } = await supabase
      .from('completions')
      .delete()
      .eq('user_id', user.id)
      .eq('exercise_id', exerciseId)
    if (delErr) throw delErr
  } else {
    const { error: insertErr } = await supabase
      .from('completions')
      .insert({ user_id: user.id, exercise_id: exerciseId })
    if (insertErr) throw insertErr
  }

  revalidatePath('/training/rhythmusfundament')
  revalidatePath('/training')
}
