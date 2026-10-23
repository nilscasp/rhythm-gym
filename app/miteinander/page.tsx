import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '../lib/supabase/server'
import { currentBrand } from '../lib/brand-server'
import { communityUrl } from '../lib/community'
import { SCHULE_PAGE_CSS } from '../_schule/pages-css'
import { COURSE_CSS } from '../training/_course/views'

// ─────────────────────────────────────────────────────────────────────────────
// /miteinander — vorerst eine ruhige Seite (Abschnitt G folgt: Challenges,
// Treffen, Menschen). Gespräch läuft auf WhatsApp. Nur angemeldet, nur schule.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Miteinander — Handpan Schule des Lebens',
}

export default async function MiteinanderPage() {
  if ((await currentBrand()) !== 'schule') notFound()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const url = communityUrl()

  return (
    <>
      <style>{COURSE_CSS}</style>
      <style>{SCHULE_PAGE_CSS}</style>
      <main className="cr-page sp-page">
        <div className="cr-wrap sp-wrap">
          <header className="cr-head">
            <p className="cr-kicker">Die Gemeinschaft</p>
            <h1 className="cr-title">Miteinander</h1>
            <p className="cr-intro">Gesprochen wird auf WhatsApp, gefunden wird hier.</p>
          </header>

          <div className="cr-actions">
            {url ? (
              <a href={url} className="cr-btn" target="_blank" rel="noopener noreferrer">
                WhatsApp-Community öffnen
              </a>
            ) : (
              <p className="sp-note">Der Link zur WhatsApp-Community folgt.</p>
            )}
          </div>

          <p className="sp-note">Challenges, Treffen und Menschen kommen bald.</p>
        </div>
      </main>
    </>
  )
}
