'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '../../lib/supabase/server'

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return { supabase, user }
}

export async function renamePatternAction(formData: FormData): Promise<void> {
  const id = String(formData.get('pattern_id') ?? '').trim()
  const rawName = String(formData.get('name') ?? '').trim()
  if (!id) return
  const newName = rawName === '' ? 'Unbenannt' : rawName

  const { supabase, user } = await requireUser()

  // RLS update_own_or_public covers UPDATE — eq on user_id is belt+braces.
  await supabase
    .from('saved_patterns')
    .update({ name: newName, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath('/patterns/meine')
  revalidatePath('/training')
}

export async function deletePatternAction(formData: FormData): Promise<void> {
  const id = String(formData.get('pattern_id') ?? '').trim()
  if (!id) return

  const { supabase, user } = await requireUser()

  await supabase
    .from('saved_patterns')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath('/patterns/meine')
  revalidatePath('/training')
}
