import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import { currentBrand } from '../../lib/brand-server'
import { toMarkdownBodyDialect } from '../../lib/lesson-markdown'
import { BunnyVideoEmbed } from '../../training/rhythmusfundament/_components/BunnyVideoEmbed'
import { bunnyEmbedSrc } from '../../lib/bunny-embed'
import { MarkdownBody } from '../../training/rhythmusfundament/_components/MarkdownBody'
import { SCHULE_PAGE_CSS } from '../../_schule/pages-css'
import { COURSE_CSS } from '../../training/_course/views'
import { NilsByline, POST_LIST_COLUMNS, WhatsappBox, postDateLabel } from '../_shared'

// ─────────────────────────────────────────────────────────────────────────────
// /beitraege/[slug] — ein Beitrag von Nils (Mockup „Beitrag von Nils“):
// ruhige Lesespalte (max. 720 px), optional Bunny-Video, Markdown über den
// vorhandenen Renderer, darunter der WhatsApp-Kasten; „Frühere Beiträge“
// rechts (Desktop) bzw. unten (mobil).
// Lesbar ist, was RLS freigibt. Admin sieht über RLS auch Entwürfe — als
// Vorschau, deutlich markiert.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Beitrag von Nils — Handpan Schule des Lebens',
}

export default async function BeitragPage({ params }: { params: Promise<{ slug: string }> }) {
  if ((await currentBrand()) !== 'schule') notFound()
  const { slug } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const nowIso = new Date().toISOString()
  const [postRes, earlierRes] = await Promise.all([
    supabase
      .from('posts')
      .select('id, slug, title, body_md, video_guid, published_at')
      .eq('slug', slug)
      .maybeSingle(),
    supabase
      .from('posts')
      .select(POST_LIST_COLUMNS)
      .neq('slug', slug)
      .not('published_at', 'is', null)
      .lte('published_at', nowIso)
      .order('published_at', { ascending: false })
      .limit(6),
  ])
  if (postRes.error) {
    console.error('[beitrag] read failed', { code: postRes.error.code, message: postRes.error.message })
  }
  const post = postRes.data
  if (!post) notFound()

  const isPreview = !post.published_at || post.published_at > nowIso
  const markdown = toMarkdownBodyDialect(post.body_md)
  const earlier = earlierRes.data ?? []

  return (
    <>
      <style>{COURSE_CSS}</style>
      <style>{SCHULE_PAGE_CSS}</style>
      <main className="cr-page sp-page">
        <div className="sp-post-shell">
          <article className="sp-post-main">
            <Link href="/beitraege" className="cr-back">
              ← Alle Beiträge
            </Link>
            <header className="cr-head">
              <p className="cr-kicker">
                Beitrag von Nils
                {isPreview ? <span className="sp-badge">Vorschau · nicht veröffentlicht</span> : null}
              </p>
              <h1 className="cr-title">{post.title}</h1>
              <NilsByline date={post.published_at} />
            </header>

            {post.video_guid ? (
              <section className="sp-post-video" aria-label="Video">
                <BunnyVideoEmbed src={bunnyEmbedSrc(post.video_guid)} title={post.title} />
              </section>
            ) : null}

            {markdown ? (
              <section className="sp-post-body">
                <MarkdownBody markdown={markdown} />
              </section>
            ) : null}

            <WhatsappBox />
          </article>

          <aside className="sp-post-aside" aria-labelledby="fruehere">
            <h2 id="fruehere" className="cr-kicker">Frühere Beiträge</h2>
            {earlier.length === 0 ? (
              <p className="sp-note">Das ist der erste.</p>
            ) : (
              <ul className="sp-list">
                {earlier.map((p) => (
                  <li key={p.id}>
                    <Link href={`/beitraege/${p.slug}`} className="sp-list-item">
                      <span>{p.title}</span>
                      <span className="sp-list-meta">{p.published_at ? postDateLabel(p.published_at) : ''}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      </main>
    </>
  )
}
