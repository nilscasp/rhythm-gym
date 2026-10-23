import Link from 'next/link'
import { heuteNewsSlots, type News } from '../../lib/news'
import { OpenNewsButton } from '../../../components/NewsBell'
import { SCHULE_PAGE_CSS } from '../../_schule/pages-css'

// ─────────────────────────────────────────────────────────────────────────────
// Oben auf „Heute“ (Platz `top` in SchuleHeute, Abschnitt E):
//   1. schmale Leiste mit dem neuesten ungelesenen Eintrag + „Alle Neuigkeiten“
//   2. Karte „Neuer Beitrag von Nils“, wenn der neueste Beitrag ungelesen ist
// Was wohin gehört, entscheidet heuteNewsSlots() (app/lib/news.ts, getestet).
// ─────────────────────────────────────────────────────────────────────────────

export function NewsTop({ news }: { news: News }) {
  const { featuredPost, bar } = heuteNewsSlots(news)
  if (!featuredPost && !bar) return null

  return (
    <>
      <style>{SCHULE_PAGE_CSS}</style>
      {bar ? (
        <div className="sp-newsbar" role="status">
          <Link href={bar.href} className="sp-newsbar-link">
            {bar.title}
            {bar.when ? ` · ${bar.when}` : ''}
          </Link>
          <OpenNewsButton className="sp-newsbar-all">Alle Neuigkeiten</OpenNewsButton>
        </div>
      ) : null}

      {featuredPost ? (
        <section className="sp-card sp-postcard" aria-labelledby="neu-von-nils">
          <span className="sp-avatar sp-avatar--sm" aria-hidden="true">
            N
          </span>
          <div className="sp-postcard-body">
            <p className="sp-card-kicker">Neuer Beitrag von Nils · {featuredPost.when}</p>
            <h2 id="neu-von-nils" className="sp-card-title">
              {featuredPost.title}
            </h2>
            <Link href={featuredPost.href} className="cr-btn">
              Lesen
            </Link>
          </div>
        </section>
      ) : null}
    </>
  )
}
