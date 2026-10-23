'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '../lib/supabase/server'
import { isValidSlug, slugify, uniqueSlug } from '../lib/slug'

// ─────────────────────────────────────────────────────────────────────────────
// Beiträge von Nils anlegen und bearbeiten (Migration 0011, nur Admin).
// Wie bei den Terminen: RLS (admins_all_posts) hält, requireAdmin() liefert
// nur den freundlicheren Weg.
// ─────────────────────────────────────────────────────────────────────────────

const AUDIENCES = ['members', 'premium', 'vip'] as const
type Audience = (typeof AUDIENCES)[number]
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

function text(formData: FormData, field: string): string {
  const raw = formData.get(field)
  return typeof raw === 'string' ? raw.trim() : ''
}

function readPostFields(formData: FormData) {
  const title = text(formData, 'title')
  if (!title) throw new Error('Der Titel fehlt.')
  if (title.length > 200) throw new Error('Der Titel ist zu lang (höchstens 200 Zeichen).')

  const audience = text(formData, 'audience') as Audience
  if (!AUDIENCES.includes(audience)) throw new Error('Unbekannte Zielgruppe.')

  const videoGuid = text(formData, 'video_guid') || null
  if (videoGuid && !GUID.test(videoGuid)) {
    throw new Error('Die Video-GUID sieht nicht aus wie eine Bunny-GUID (8-4-4-4-12).')
  }

  const rawSlug = text(formData, 'slug')
  const slugBase = slugify(rawSlug || title)

  return {
    title,
    audience,
    videoGuid,
    slugBase,
    body: text(formData, 'body_md') || null,
    // 'now' = veröffentlichen, 'draft' = Entwurf
    publish: text(formData, 'publish') === 'now',
  }
}

/** Freier Slug: base, base-2 … (ohne den Beitrag selbst). */
async function freeSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  base: string,
  ownId: string | null,
): Promise<string> {
  const root = base || 'beitrag'
  const { data, error } = await supabase.from('posts').select('id, slug').like('slug', `${root}%`)
  if (error) throw error
  const taken = new Set((data ?? []).filter((r) => r.id !== ownId).map((r) => r.slug))
  const slug = uniqueSlug(root, taken)
  if (!isValidSlug(slug)) throw new Error('Aus dem Titel lässt sich keine Adresse bilden.')
  return slug
}

function revalidatePosts() {
  revalidatePath('/coach')
  revalidatePath('/beitraege')
  revalidatePath('/training')
}

export async function createPostAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireAdmin()
  const fields = readPostFields(formData)
  const slug = await freeSlug(supabase, fields.slugBase, null)

  const { error } = await supabase.from('posts').insert({
    slug,
    title: fields.title,
    body_md: fields.body,
    video_guid: fields.videoGuid,
    audience: fields.audience,
    published_at: fields.publish ? new Date().toISOString() : null,
    created_by: user.id,
  })
  if (error) throw error
  revalidatePosts()
}

export async function updatePostAction(formData: FormData): Promise<void> {
  const { supabase } = await requireAdmin()
  const id = text(formData, 'id')
  if (!id) return
  const fields = readPostFields(formData)

  const { data: row, error: readErr } = await supabase
    .from('posts')
    .select('published_at')
    .eq('id', id)
    .maybeSingle()
  if (readErr) throw readErr
  if (!row) return

  const slug = await freeSlug(supabase, fields.slugBase, id)
  // Schon veröffentlicht und bleibt es → Datum behalten (sonst wäre er wieder „neu“).
  const publishedAt = fields.publish ? (row.published_at ?? new Date().toISOString()) : null

  const { error } = await supabase
    .from('posts')
    .update({
      slug,
      title: fields.title,
      body_md: fields.body,
      video_guid: fields.videoGuid,
      audience: fields.audience,
      published_at: publishedAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw error
  revalidatePosts()
}
