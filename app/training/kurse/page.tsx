import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import { currentBrand } from '../../lib/brand-server'
import { progressPercent } from '../../lib/course-progress'
import { SCHULE_PAGE_CSS } from '../../_schule/pages-css'
import { COURSE_CSS } from '../_course/views'
import { loadCourseCatalog, type CatalogCard } from '../_course/catalog'

// ─────────────────────────────────────────────────────────────────────────────
// /training/kurse — alle Kurse und Bibliotheken der Schule (Abschnitt D).
// Mit Zugang: Fortschritt + „Weiter“. Ohne: Gliederung ansehen + Hinweis
// („Im Abo ab Premium enthalten.“ bzw. „Kurs buchen“, lockedHint()).
// Nur Marke schule — auf rhythmgym.io gibt es diese Seite nicht.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Kurse — Handpan Schule des Lebens',
}

const BOOK_URL = 'https://handpan.schule/'

export default async function KursePage() {
  if ((await currentBrand()) !== 'schule') notFound()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const cards = await loadCourseCatalog(supabase, user.id)
  const courses = cards.filter((c) => c.kind === 'course')
  const libraries = cards.filter((c) => c.kind === 'library')

  return (
    <>
      <style>{COURSE_CSS}</style>
      <style>{SCHULE_PAGE_CSS}</style>
      <main className="cr-page sp-page">
        <div className="cr-wrap sp-wrap">
          <header className="cr-head">
            <p className="cr-kicker">Die Schule</p>
            <h1 className="cr-title">Kurse</h1>
            <p className="cr-intro">Alles, was du hier üben kannst – deine Kurse zuerst offen, die übrigen mit einem Blick hinein.</p>
          </header>

          {cards.length === 0 ? (
            <p className="cr-muted">Die Kurse lassen sich gerade nicht laden.</p>
          ) : null}

          {courses.length > 0 ? (
            <section className="sp-section" aria-labelledby="kurse-kurse">
              <h2 id="kurse-kurse" className="cr-kicker">Kurse</h2>
              <ul className="sp-cards">
                {courses.map((c) => (
                  <li key={c.programId}>
                    <CourseCard card={c} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {libraries.length > 0 ? (
            <section className="sp-section" aria-labelledby="kurse-bib">
              <h2 id="kurse-bib" className="cr-kicker">Zum Nachschauen</h2>
              <ul className="sp-cards">
                {libraries.map((c) => (
                  <li key={c.programId}>
                    <CourseCard card={c} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </main>
    </>
  )
}

function CourseCard({ card }: { card: CatalogCard }) {
  const pct = progressPercent(card.done, card.total)
  const unit = card.slug === 'rhythmusfundament' ? 'Tagen' : 'Lektionen'
  return (
    <article className={`sp-card ${card.hasAccess ? '' : 'sp-card--locked'}`}>
      <p className="sp-card-kicker">
        {card.kind === 'library' ? 'Bibliothek' : 'Kurs'}
        {card.draft ? <span className="sp-badge">Entwurf</span> : null}
      </p>
      <h3 className="sp-card-title">{card.title}</h3>
      {card.description ? (
        <p className="sp-card-text">{card.description.split(/\n\s*\n/)[0]}</p>
      ) : null}

      {card.hasAccess ? (
        <>
          {card.total > 0 ? (
            <div className="sp-card-progress">
              <span className="cr-bar" aria-hidden="true">
                <span className="cr-bar-fill" style={{ width: `${pct}%` }} />
              </span>
              <span className="sp-card-count">
                {card.done} von {card.total} {unit}
              </span>
            </div>
          ) : null}
          <div className="cr-actions">
            <Link href={card.href} className="cr-btn">
              {card.kind === 'library' ? 'Ansehen' : card.done > 0 ? 'Weiter' : 'Beginnen'}
              <span className="sp-sr"> – {card.title}</span>
            </Link>
          </div>
        </>
      ) : (
        <>
          {card.lockedHint ? <p className="sp-card-hint">{card.lockedHint}</p> : null}
          <div className="cr-actions">
            <Link href={card.href} className="cr-btn cr-btn--ghost">
              Gliederung ansehen
            </Link>
            {card.bookable ? (
              <a href={BOOK_URL} className="cr-btn cr-btn--ghost" target="_blank" rel="noopener noreferrer">
                Kurs buchen
              </a>
            ) : null}
          </div>
        </>
      )}
    </article>
  )
}
