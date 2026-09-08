import type { Metadata } from 'next'
import { BriefeForm } from '../../components/BriefeForm'
import { currentLocale, getMessages } from '../../messages/server'
import { localizeHref } from '../lib/locale'
import { CATALOG, formatPrice } from '../lib/courses-catalog'

// ─────────────────────────────────────────────────────────────────────────────
// /kurse (deutsch) · /en/kurse (englisch) — der Laden für Selbststudium-Kurse.
//
// Nils' Entscheidung vom 8.9.2026: der englische Bereich wird passiv gepflegt.
// Fertige Kurse, kein Live-Termin, keine Gruppe. Genau das sagt diese Seite —
// und nichts darüber hinaus.
//
// Ehrlichkeit vor Vollständigkeit: es gibt heute KEINEN englischen Kursinhalt
// (siehe app/lib/courses-catalog.ts). Deshalb steht bei jedem Kurs „in
// Vorbereitung" statt eines Kaufknopfs. Der Knopf erscheint automatisch,
// sobald ein Eintrag `available` ist UND eine `checkoutUrl` trägt. Bis dahin
// sammelt die Seite Adressen — das ist das ehrliche Versprechen.
//
// Öffentlich ohne Konto (PUBLIC_PATHS in app/lib/supabase/middleware.ts).
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await currentLocale()
  return locale === 'en'
    ? {
        title: 'Self-study courses — Handpan School of Life',
        description:
          'Finished handpan courses you walk at your own pace: video by video, exercise by exercise, no fixed dates.',
      }
    : {
        title: 'Kurse zum Selbststudium — Handpan Schule des Lebens',
        description:
          'Fertige Handpan-Kurse in deinem Tempo: Video für Video, Übung für Übung, ohne feste Termine.',
      }
}

export default async function KursePage() {
  const { locale, t } = await getMessages()

  return (
    <>
      <style>{KURSE_CSS}</style>
      <main className="ks-page">
        <div className="ks-wrap">
          <header className="ks-head">
            <p className="ks-eyebrow">{t.courses.eyebrow}</p>
            <h1 className="ks-title">{t.courses.title}</h1>
            <p className="ks-intro">{t.courses.intro}</p>
            <p className="ks-note">{t.courses.selfStudyNote}</p>
          </header>

          <ul className="ks-list">
            {CATALOG.map((course) => {
              const buyable = course.status === 'available' && course.checkoutUrl

              return (
                <li key={course.slug} className="ks-card">
                  <div className="ks-card-head">
                    <h2 className="ks-card-title">{course.title[locale]}</h2>
                    <span className="ks-price">{formatPrice(course.priceEur, locale)}</span>
                  </div>

                  <p className="ks-summary">{course.summary[locale]}</p>

                  <p className="ks-included">{t.courses.included}</p>
                  <ul className="ks-bullets">
                    {course.bullets[locale].map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>

                  {buyable ? (
                    <a
                      href={course.checkoutUrl}
                      className="ks-buy"
                      rel="noopener noreferrer"
                    >
                      {t.courses.buy}
                    </a>
                  ) : (
                    <div className="ks-preparing">
                      <span className="ks-badge">{t.courses.preparing}</span>
                      <p className="ks-preparing-note">
                        {locale === 'en' ? t.courses.germanNote : t.courses.preparingNote}
                      </p>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          <section className="ks-notify" id="briefe">
            <h2 className="ks-notify-title">{t.courses.notifyTitle}</h2>
            <p className="ks-intro">{t.courses.preparingNote}</p>
            <BriefeForm
              source={locale === 'en' ? 'en-kurse' : 'kurse'}
              messages={t.briefe}
              privacyHref={localizeHref('/datenschutz', locale)}
            />
          </section>
        </div>
      </main>
    </>
  )
}

const KURSE_CSS = `
  .ks-page {
    min-height: 100vh;
    min-height: 100dvh;
    background: var(--black);
    color: var(--cream);
    padding: 48px 20px 96px;
    font-family: var(--font-body);
  }
  .ks-wrap {
    max-width: 760px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 40px;
    min-width: 0;
  }

  .ks-head { display: flex; flex-direction: column; gap: 12px; }
  .ks-eyebrow {
    margin: 0;
    font-family: var(--font-ui);
    font-size: 12px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .ks-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(30px, 6.5vw, 46px);
    line-height: 1.1;
    color: var(--cream);
  }
  .ks-intro {
    margin: 0;
    font-size: 17px;
    line-height: 1.6;
    color: var(--muted2);
    max-width: 58ch;
  }
  .ks-note {
    margin: 0;
    font-size: 15px;
    line-height: 1.6;
    color: var(--muted);
    border-left: 2px solid var(--border2);
    padding-left: 14px;
    max-width: 58ch;
  }

  .ks-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .ks-card {
    background: var(--card);
    border: 1px solid var(--border);
    padding: 26px 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .ks-card-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
  }
  .ks-card-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: 24px;
    line-height: 1.15;
    color: var(--cream);
  }
  .ks-price {
    font-family: var(--font-ui);
    font-size: 18px;
    color: var(--amber);
    white-space: nowrap;
  }
  .ks-summary { margin: 0; font-size: 16px; line-height: 1.6; color: var(--muted2); }
  .ks-included {
    margin: 6px 0 0;
    font-family: var(--font-ui);
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
  }
  .ks-bullets { margin: 0; padding-left: 18px; color: var(--muted2); font-size: 15px; line-height: 1.7; }

  .ks-buy {
    align-self: flex-start;
    margin-top: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 48px;
    padding: 14px 26px;
    background: var(--amber);
    color: var(--black);
    border: 1px solid var(--amber);
    border-radius: 2px;
    font-family: var(--font-ui);
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    text-decoration: none;
  }
  .ks-buy:hover { background: var(--amber2); border-color: var(--amber2); }

  .ks-preparing { margin-top: 6px; display: flex; flex-direction: column; gap: 8px; }
  .ks-badge {
    align-self: flex-start;
    font-family: var(--font-ui);
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--amber);
    border: 1px solid var(--border2);
    border-radius: 2px;
    padding: 5px 10px;
  }
  .ks-preparing-note { margin: 0; font-size: 14px; line-height: 1.6; color: var(--muted); }

  .ks-notify {
    border-top: 1px solid var(--border);
    padding-top: 30px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .ks-notify-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(22px, 5vw, 30px);
    line-height: 1.15;
    color: var(--cream);
  }

  @media (max-width: 480px) {
    .ks-page { padding: 32px 14px 80px; }
    .ks-wrap { gap: 30px; }
    .ks-card { padding: 20px 16px; }
    .ks-buy { align-self: stretch; width: 100%; }
  }
`
