'use server'

import { createClient } from './supabase/server'

// ─────────────────────────────────────────────────────────────────────────────
// „Gesehen“ setzen, wenn jemand die Glocke öffnet (news_state, Migration 0011).
// RLS lässt nur die eigene Zeile zu; die user_id kommt aus der Sitzung, nie
// aus dem Formular. Ein Fehler ist nicht kritisch — dann bleibt die Zahl
// beim nächsten Laden einfach stehen.
// ─────────────────────────────────────────────────────────────────────────────

export async function markNewsSeenAction(): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase
    .from('news_state')
    .upsert({ user_id: user.id, seen_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) {
    console.error('[news] mark seen failed', { code: error.code, message: error.message })
  }
}
