import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '../lib/supabase/server'
import { currentBrand } from '../lib/brand-server'
import { progressPercent } from '../lib/course-progress'
import { switchLocaleHref } from '../lib/locale'
import { getMessages } from '../../messages/server'
import { SCHULE_PAGE_CSS } from '../_schule/pages-css'
import { COURSE_CSS } from '../training/_course/views'
import { loadCourseCatalog } from '../training/_course/catalog'

// ─────────────────────────────────────────────────────────────────────────────
// /mein-weg — Profil-Kopf, Einstellungen, eigene Kurse mit Fortschritt,
// Abmelden. Hierher führt der runde Profil-Knopf oben rechts. Später kommt
// das Übe-Tagebuch dazu. Admin findet hier auch „Coach“.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Mein Weg — Handpan Schule des Lebens',
}

export default async function MeinWegPage() {
  if ((await currentBrand()) !== 'schule') notFound()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: profile }, cards, { locale, t }] = await Promise.all([
    supabase.from('profiles').select('full_name, is_admin').eq('id', user.id).maybeSingle(),
    loadCourseCatalog(supabase, user.id),
    getMessages(),
  ])

  const name: string = profile?.full_name?.trim() || user.email || 'Du'
  const initial = (Array.from(name)[0] ?? '·').toLocaleUpperCase('de-DE')
  const mine = cards.filter((c) => c.hasAccess && c.kind === 'course')
  const other = locale === 'de' ? 'en' : 'de'

  return (
    <>
      <style>{COURSE_CSS}</style>
      <style>{SCHULE_PAGE_CSS}</style>
      <main className="cr-page sp-page">
        <div className="cr-wrap sp-wrap">
          <header className="sp-profile">
            <span className="sp-avatar" aria-hidden="true">
              {initial}
            </span>
            <div className="cr-head">
              <p className="cr-kicker">Mein Weg</p>
              <h1 className="cr-title">{name}</h1>
            </div>
          </header>

          <section className="sp-section" aria-labelledby="mw-kurse">
            <h2 id="mw-kurse" className="cr-kicker">Deine Kurse</h2>
            {mine.length === 0 ? (
              <p className="sp-note">Noch kein Kurs offen.</p>
            ) : (
              <ul className="sp-list">
                {mine.map((c) => (
                  <li key={c.programId}>
                    <Link href={c.href} className="sp-list-item">
                      <span>{c.title}</span>
                      {c.total > 0 ? (
                        <span className="sp-list-meta">{progressPercent(c.done, c.total)} %</span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/training/kurse" className="sp-link">
              Alle Kurse
            </Link>
          </section>

          <section className="sp-section" aria-labelledby="mw-konto">
            <h2 id="mw-konto" className="cr-kicker">Konto</h2>
            <ul className="sp-list">
              <li>
                <Link href="/settings" className="sp-list-item">
                  Einstellungen
                </Link>
              </li>
              <li>
                <Link href={switchLocaleHref('/mein-weg', other)} hrefLang={other} className="sp-list-item">
                  {other === 'en' ? t.nav.toEnglish : t.nav.toGerman}
                </Link>
              </li>
              {profile?.is_admin ? (
                <li>
                  <Link href="/coach" className="sp-list-item">
                    Coach
                  </Link>
                </li>
              ) : null}
            </ul>
          </section>

          <footer className="sp-account">
            <form action="/auth/logout" method="POST">
              <button type="submit" className="sp-account-link">
                Abmelden
              </button>
            </form>
          </footer>
        </div>
      </main>
    </>
  )
}
