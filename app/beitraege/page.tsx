import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '../lib/supabase/server'
import { currentBrand } from '../lib/brand-server'
import { SCHULE_PAGE_CSS } from '../_schule/pages-css'
import { COURSE_CSS } from '../training/_course/views'
import { NilsByline, POST_LIST_COLUMNS, postDateLabel } from './_shared'

// ─────────────────────────────────────────────────────────────────────────────
// /beitraege — Beiträge von Nils, neueste zuerst (Abschnitt E).
// Was sichtbar ist, entscheidet RLS (posts_select_published + can_read_post,
// Migration 0011). Admin sieht über RLS auch Entwürfe — die Liste filtert
// darum ausdrücklich auf „veröffentlicht und nicht in der Zukunft“.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Beiträge von Nils — Handpan Schule des Lebens',
}

export default async function BeitraegePage() {
  if ((await currentBrand()) !== 'schule') notFound()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data, error } = await supabase
    .from('posts')
    .select(POST_LIST_COLUMNS)
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(100)
  if (error) {
    console.error('[beitraege] list failed', { code: error.code, message: error.message })
  }
  const posts = data ?? []

  return (
    <>
      <style>{COURSE_CSS}</style>
      <style>{SCHULE_PAGE_CSS}</style>
      <main className="cr-page sp-page">
        <div className="cr-wrap sp-wrap">
          <header className="cr-head">
            <p className="cr-kicker">Aus der Schule</p>
            <h1 className="cr-title">Beiträge von Nils</h1>
            <NilsByline date={null} />
          </header>

          {posts.length === 0 ? (
            <p className="sp-note">
              {error ? 'Die Beiträge lassen sich gerade nicht laden.' : 'Noch ist hier nichts erschienen.'}
            </p>
          ) : (
            <ul className="sp-list">
              {posts.map((p) => (
                <li key={p.id}>
                  <Link href={`/beitraege/${p.slug}`} className="sp-list-item">
                    <span>{p.title}</span>
                    <span className="sp-list-meta">{p.published_at ? postDateLabel(p.published_at) : ''}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  )
}
