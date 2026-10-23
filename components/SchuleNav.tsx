'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from './Logo'
import { NEWS_BELL_CSS, NewsBell } from './NewsBell'
import type { News } from '../app/lib/news'
import { localizeHref, type Locale } from '../app/lib/locale'
import {
  SCHULE_BOTTOM_NAV,
  SCHULE_NAV,
  activeSchuleNav,
  type SchuleNavKey,
} from '../app/lib/schule-nav'
import { messagesFor } from '../messages'

// ─────────────────────────────────────────────────────────────────────────────
// App-Navigation der Marke schule (Abschnitt D, Mockup-Ansicht 1):
// Heute · Kurse · Üben · Live · Miteinander · Mein Weg.
//
//   · Desktop (≥ 768 px): obere Leiste mit allen sechs Punkten, Glocke,
//     runder Profil-Knopf (Initiale → Mein Weg), für Admin ein dezentes „Coach“.
//   · Mobil (< 768 px): oben nur Signet, Glocke und Profil-Knopf; unten eine
//     feste Leiste mit fünf Punkten und Strich-Icons. Der Platz dafür wird am
//     body reserviert (inkl. safe-area), damit nichts dahinter verschwindet.
//
// Die Marke gym sieht diese Komponente nie (components/Nav.tsx entscheidet).
// ─────────────────────────────────────────────────────────────────────────────

function NavIcon({ name }: { name: SchuleNavKey }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  switch (name) {
    case 'heute':
      // Sonne am Horizont
      return (
        <svg {...common}>
          <path d="M3 18h18" />
          <path d="M7 18a5 5 0 0 1 10 0" />
          <path d="M12 6v3M5.6 9.6l1.8 1.8M18.4 9.6l-1.8 1.8" />
        </svg>
      )
    case 'kurse':
      // Aufgeschlagenes Buch
      return (
        <svg {...common}>
          <path d="M3 5.5h5.5A3.5 3.5 0 0 1 12 9v10.5a2.5 2.5 0 0 0-2.5-2.5H3Z" />
          <path d="M21 5.5h-5.5A3.5 3.5 0 0 0 12 9v10.5a2.5 2.5 0 0 1 2.5-2.5H21Z" />
        </svg>
      )
    case 'ueben':
      // Handpan von oben: Ding in der Mitte, Tonfelder im Kreis
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="2.6" />
          <circle cx="12" cy="6.2" r="1.1" />
          <circle cx="17.5" cy="10.2" r="1.1" />
          <circle cx="15.4" cy="16.7" r="1.1" />
          <circle cx="8.6" cy="16.7" r="1.1" />
          <circle cx="6.5" cy="10.2" r="1.1" />
        </svg>
      )
    case 'live':
      // Punkt mit Wellen
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="1.8" />
          <path d="M8.5 15.5a5 5 0 0 1 0-7M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M5.6 18.4a9 9 0 0 1 0-12.8M18.4 5.6a9 9 0 0 1 0 12.8" />
        </svg>
      )
    case 'miteinander':
      // Zwei Menschen
      return (
        <svg {...common}>
          <circle cx="9" cy="8.5" r="3" />
          <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
          <circle cx="16.5" cy="9.5" r="2.4" />
          <path d="M16 14.1a4.6 4.6 0 0 1 4.6 4.6" />
        </svg>
      )
    case 'mein-weg':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      )
  }
}

export function SchuleNav({
  isAdmin,
  locale,
  initial,
  news,
}: {
  isAdmin: boolean
  locale: Locale
  /** Erster Buchstabe des Namens (oder der E-Mail) für den Profil-Knopf */
  initial: string
  news: News
}) {
  const pathname = usePathname()
  const t = messagesFor(locale)
  const active = activeSchuleNav(pathname)

  const label: Record<SchuleNavKey, string> = {
    heute: t.nav.today,
    kurse: t.nav.courses,
    ueben: t.nav.practice,
    live: t.nav.live,
    miteinander: t.nav.together,
    'mein-weg': t.nav.myPath,
  }

  return (
    <>
      <header className="sn-top">
        <div className="sn-top-inner">
          <Logo size={32} brand="schule" />

          <nav className="sn-desktop" aria-label={t.nav.mainNav}>
            <ul className="sn-desktop-list">
              {SCHULE_NAV.map((item) => (
                <li key={item.key}>
                  <Link
                    href={localizeHref(item.href, locale)}
                    className="sn-link"
                    aria-current={active === item.key ? 'page' : undefined}
                  >
                    {label[item.key]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="sn-tools">
            {isAdmin ? (
              <Link href="/coach" className="sn-coach" aria-current={pathname?.startsWith('/coach') ? 'page' : undefined}>
                {t.nav.coach}
              </Link>
            ) : null}
            <NewsBell news={news} label={t.nav.news} />
            <Link
              href={localizeHref('/mein-weg', locale)}
              className="sn-avatar"
              aria-label={t.nav.myPath}
              aria-current={active === 'mein-weg' ? 'page' : undefined}
            >
              <span aria-hidden="true">{initial}</span>
            </Link>
          </div>
        </div>
      </header>

      <nav className="sn-bottom" aria-label={t.nav.mainNav}>
        <ul className="sn-bottom-list">
          {SCHULE_BOTTOM_NAV.map((item) => (
            <li key={item.key}>
              <Link
                href={localizeHref(item.href, locale)}
                className="sn-tab"
                aria-current={active === item.key ? 'page' : undefined}
              >
                <NavIcon name={item.key} />
                <span className="sn-tab-label">{label[item.key]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <style>{SCHULE_NAV_CSS}</style>
      <style>{NEWS_BELL_CSS}</style>
    </>
  )
}

const SCHULE_NAV_CSS = `
  .sn-top {
    position: sticky;
    top: 0;
    z-index: 100;
    background: color-mix(in srgb, var(--black) 92%, transparent);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border);
    padding: 10px 16px;
  }
  .sn-top-inner {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 44px;
  }
  .sn-desktop { display: none; }
  .sn-desktop-list { list-style: none; margin: 0; padding: 0; display: flex; align-items: center; gap: 4px; }
  .sn-link, .sn-coach {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 0 12px;
    font-family: var(--font-ui);
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted2);
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition: color 0.2s;
  }
  .sn-link:hover, .sn-coach:hover { color: var(--amber); }
  .sn-link[aria-current="page"] { color: var(--amber); border-bottom-color: var(--amber); }
  .sn-link:focus-visible, .sn-coach:focus-visible, .sn-avatar:focus-visible, .sn-tab:focus-visible {
    outline: 2px solid var(--amber);
    outline-offset: 2px;
  }
  .sn-coach { display: none; font-size: 11px; color: var(--muted); }
  .sn-coach[aria-current="page"] { color: var(--amber); }
  .sn-tools { display: flex; align-items: center; gap: 6px; }
  .sn-avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border: 1px solid var(--amber);
    border-radius: 50%;
    color: var(--amber);
    font-family: var(--font-display);
    font-weight: 300;
    font-size: 19px;
    line-height: 1;
    text-decoration: none;
    text-transform: uppercase;
  }
  .sn-avatar:hover, .sn-avatar[aria-current="page"] { background: var(--amber); color: var(--black); }

  /* Mobil unten */
  .sn-bottom {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 100;
    background: color-mix(in srgb, var(--black) 96%, transparent);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-top: 1px solid var(--border);
    padding-bottom: env(safe-area-inset-bottom);
  }
  .sn-bottom-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
  .sn-tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-height: 60px;
    padding: 8px 2px 6px;
    color: var(--muted);
    text-decoration: none;
  }
  .sn-tab:hover { color: var(--cream); }
  .sn-tab[aria-current="page"] { color: var(--amber); }
  .sn-tab-label {
    font-family: var(--font-ui);
    font-size: 11px;
    letter-spacing: 0.5px;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  @media (max-width: 767.98px) {
    body { padding-bottom: calc(61px + env(safe-area-inset-bottom)); }
    .sn-top .logo-wordmark { display: none; }
  }
  @media (min-width: 768px) {
    .sn-top { padding: 12px 24px; }
    .sn-desktop { display: block; }
    .sn-bottom { display: none; }
  }
  @media (min-width: 768px) and (max-width: 1179.98px) {
    .sn-top .logo-wordmark { display: none; }
    .sn-link { padding: 0 8px; letter-spacing: 1.5px; font-size: 12px; }
  }
  @media (min-width: 1024px) {
    .sn-coach { display: inline-flex; }
  }
`
