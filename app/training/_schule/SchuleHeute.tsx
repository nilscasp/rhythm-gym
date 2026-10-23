import type { ReactNode } from 'react'
import Link from 'next/link'
import { progressPercent } from '../../lib/course-progress'
import { activeDayCount, greetingDateLabel, isoWeek, weekDots } from '../../lib/schule-heute'
import { quoteForWeek } from '../../lib/weekly-quote'
import { COURSE_CSS } from '../_course/views'
import { RedeemCodeCard } from '../_components/RedeemCodeCard'
import type { HeuteCourse, HeuteData } from './load'

// ─────────────────────────────────────────────────────────────────────────────
// „Heute“ — Startseite der Schule (/training auf der Marke schule).
// Mockup-Ansicht 1 (Plans/umzug-von-skool.md, Abschnitt D). Die Marke gym
// behält den alten Hub in app/training/page.tsx.
//
// Reihenfolge: Gedanke der Woche · Begrüßung + Weiterüben · Diese Woche ·
// Weiter, wo du warst (+ Zum Nachschauen) · Als Nächstes live · Konto.
// `top` ist der Platz für „Neu von Nils“ (Abschnitt E) über allem anderen.
// Basis-Stil (cr-page, cr-btn, cr-bar …) kommt aus dem Kursraum (COURSE_CSS).
// ─────────────────────────────────────────────────────────────────────────────

const SCHULE_URL = 'https://handpan.schule/'

function nextStepSentence(course: HeuteCourse | undefined): string {
  if (!course) return 'Wähle einen Kurs und fang dort an, wo es dich hinzieht.'
  if (course.nextTitle) return `Als Nächstes: ${course.nextTitle} – im Kurs ${course.courseTitle}.`
  return `Im Kurs ${course.courseTitle} ist gerade alles geübt, was offen ist.`
}

export function SchuleHeute({
  data,
  now = new Date(),
  top,
}: {
  data: HeuteData
  now?: Date
  top?: ReactNode
}) {
  const week = isoWeek(data.today)
  const quote = quoteForWeek(week)
  const dots = weekDots(data.today, data.activityDays)
  const daysThisWeek = activeDayCount(dots)
  const hasCourses = data.courses.length > 0
  const primary = data.courses.find((c) => c.nextTitle) ?? data.courses[0]

  return (
    <>
      <style>{COURSE_CSS}</style>
      <style>{HEUTE_CSS}</style>
      <main className="cr-page sh-page">
        <div className="cr-wrap sh-wrap">
          {top}

          {/* ── Gedanke der Woche ── */}
          {quote ? (
            <figure className="sh-quote">
              <p className="cr-kicker sh-quote-kicker">Gedanke der Woche</p>
              <blockquote className="sh-quote-text">{quote.text}</blockquote>
              <figcaption className="sh-quote-by">
                {quote.author} · Woche {week}
              </figcaption>
            </figure>
          ) : null}

          {/* ── Begrüßung ── */}
          <header className="cr-head sh-greet">
            <p className="cr-kicker">{greetingDateLabel(now)}</p>
            <h1 className="cr-title">Schön, dass du da bist.</h1>
            <p className="cr-intro">{nextStepSentence(primary)}</p>
            <div className="cr-actions">
              {primary ? (
                <Link href={primary.href} className="cr-btn">
                  Weiterüben
                </Link>
              ) : (
                <Link href="/kurse" className="cr-btn">
                  Zu den Kursen
                </Link>
              )}
            </div>
          </header>

          {/* ── Diese Woche ── */}
          <section className="sh-section" aria-labelledby="sh-week-title">
            <h2 id="sh-week-title" className="cr-kicker sh-section-kicker">
              Diese Woche
            </h2>
            <ol className="sh-dots" aria-label={`${daysThisWeek} von 7 Tagen geübt`}>
              {dots.map((d) => (
                <li
                  key={d.day}
                  className={[
                    'sh-dot',
                    d.active ? 'sh-dot--on' : '',
                    d.isToday ? 'sh-dot--today' : '',
                    d.isFuture ? 'sh-dot--future' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className="sh-dot-mark" aria-hidden="true" />
                  <span className="sh-dot-label">{d.label}</span>
                </li>
              ))}
            </ol>
            <p className="sh-week-count">
              {daysThisWeek === 1 ? '1 Tag diese Woche' : `${daysThisWeek} Tage diese Woche`}
            </p>
            <p className="sh-week-note">Jeder Tag zählt. Keiner muss.</p>
          </section>

          {/* ── Weiter, wo du warst ── */}
          {hasCourses ? (
            <section className="sh-section" aria-labelledby="sh-courses-title">
              <h2 id="sh-courses-title" className="cr-kicker sh-section-kicker">
                Weiter, wo du warst
              </h2>
              <ul className="sh-cards">
                {data.courses.map((c) => {
                  const pct = progressPercent(c.done, c.total)
                  return (
                    <li key={c.programId}>
                      <Link href={c.href} className="sh-card">
                        <span className="sh-card-kicker">{c.courseTitle}</span>
                        <span className="sh-card-title">
                          {c.nextTitle ?? (c.total > 0 && c.done >= c.total ? 'Alles geübt' : 'Zum Kursraum')}
                        </span>
                        {c.total > 0 ? (
                          <span className="sh-card-progress">
                            <span className="cr-bar" aria-hidden="true">
                              <span className="cr-bar-fill" style={{ width: `${pct}%` }} />
                            </span>
                            <span className="sh-card-count">
                              {c.done} von {c.total}
                            </span>
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : (
            <section className="sh-section sh-noaccess" aria-labelledby="sh-noaccess-title">
              <h2 id="sh-noaccess-title" className="sh-noaccess-title">
                Dein Raum wartet auf deinen ersten Kurs.
              </h2>
              <p className="sh-noaccess-text">
                Hast du einen Zugangs-Code bekommen? Löse ihn hier ein, dann öffnet sich dein Kurs.
                Alle Kurse und Wege in die Schule findest du auf handpan.schule.
              </p>
              <RedeemCodeCard variant="schule" />
              <a href={SCHULE_URL} className="sh-link" target="_blank" rel="noopener noreferrer">
                handpan.schule ansehen
              </a>
            </section>
          )}

          {data.libraries.length > 0 ? (
            <section className="sh-section" aria-labelledby="sh-library-title">
              <h2 id="sh-library-title" className="cr-kicker sh-section-kicker">
                Zum Nachschauen
              </h2>
              <ul className="sh-list">
                {data.libraries.map((l) => (
                  <li key={l.slug}>
                    <Link href={l.href} className="sh-list-link">
                      {l.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* ── Als Nächstes live ── */}
          <section className="sh-section" aria-labelledby="sh-live-title">
            <h2 id="sh-live-title" className="cr-kicker sh-section-kicker">
              Als Nächstes live
            </h2>
            {data.events.length > 0 ? (
              <ul className="sh-events">
                {data.events.map((e) => (
                  <li key={e.id}>
                    <Link href={e.href} className="sh-event">
                      <span className="sh-event-date" aria-hidden="true">
                        <span className="sh-event-day">{e.badgeDay}</span>
                        <span className="sh-event-month">{e.badgeMonth}</span>
                      </span>
                      <span className="sh-event-body">
                        <span className="sh-event-title">{e.title}</span>
                        <span className="sh-event-time">
                          {e.dateLabel} · {e.timeLabel}
                        </span>
                        {e.hint ? <span className="sh-event-hint">{e.hint}</span> : null}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="cr-muted">
                {data.eventsFailed
                  ? 'Die Termine lassen sich gerade nicht laden.'
                  : 'Gerade ist kein Termin geplant.'}
              </p>
            )}
            <Link href="/termine" className="sh-link">
              Alle Termine
            </Link>
          </section>

          {/* ── Konto ── */}
          <footer className="sh-account">
            <Link href="/settings" className="sh-account-link">
              Einstellungen
            </Link>
            <form action="/auth/logout" method="POST">
              <button type="submit" className="sh-account-link">
                Abmelden
              </button>
            </form>
          </footer>
        </div>
      </main>
    </>
  )
}

const HEUTE_CSS = `
  .sh-wrap { max-width: 680px; gap: 40px; }
  .sh-section { display: flex; flex-direction: column; gap: 14px; }
  .sh-section-kicker { font-weight: 400; }

  /* Gedanke der Woche — zwischen zwei goldenen Haarlinien */
  .sh-quote {
    margin: 8px 0 0;
    padding: 24px 0;
    border-top: 1px solid var(--amber);
    border-bottom: 1px solid var(--amber);
    display: flex;
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
  .sh-quote-kicker { font-size: 11px; }
  .sh-quote-text {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 300;
    font-style: italic;
    font-size: clamp(20px, 5.4vw, 26px);
    line-height: 1.4;
    color: var(--cream);
  }
  .sh-quote-by {
    font-family: var(--font-ui);
    font-size: 13px;
    letter-spacing: 1px;
    color: var(--muted2);
  }

  /* Diese Woche */
  .sh-dots {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 4px;
  }
  .sh-dot { display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .sh-dot-mark {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 1px solid var(--border2);
    background: transparent;
  }
  .sh-dot--on .sh-dot-mark { background: var(--amber); border-color: var(--amber); }
  .sh-dot--today .sh-dot-mark { box-shadow: 0 0 0 3px var(--black), 0 0 0 4px var(--amber); }
  .sh-dot--future .sh-dot-mark { opacity: 0.5; }
  .sh-dot-label {
    font-family: var(--font-ui);
    font-size: 12px;
    letter-spacing: 1px;
    color: var(--muted);
  }
  .sh-dot--today .sh-dot-label { color: var(--amber); }
  .sh-week-count { margin: 4px 0 0; font-family: var(--font-body); font-size: 17px; color: var(--cream); }
  .sh-week-note { margin: 0; font-family: var(--font-body); font-style: italic; font-size: 16px; color: var(--muted2); }

  /* Kurskarten */
  .sh-cards { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
  .sh-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 44px;
    padding: 18px 18px 16px;
    border: 1px solid var(--border2);
    border-radius: 2px;
    background: linear-gradient(180deg, var(--amber-glow), transparent 70%);
    color: var(--text);
    text-decoration: none;
  }
  .sh-card:hover { border-color: var(--amber); }
  .sh-card:focus-visible { outline: 2px solid var(--amber); outline-offset: 3px; }
  .sh-card-kicker {
    font-family: var(--font-ui);
    font-size: 11px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--amber);
    overflow-wrap: anywhere;
  }
  .sh-card-title {
    font-family: var(--font-display);
    font-weight: 300;
    font-size: 22px;
    line-height: 1.25;
    color: var(--cream);
    overflow-wrap: anywhere;
  }
  .sh-card-progress { display: flex; align-items: center; gap: 12px; margin-top: 4px; }
  .sh-card-progress .cr-bar { flex: 1 1 auto; }
  .sh-card-count { flex: 0 0 auto; font-family: var(--font-ui); font-size: 13px; color: var(--muted2); }

  /* Listen und Links */
  .sh-list { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--border); }
  .sh-list-link {
    display: flex;
    align-items: center;
    min-height: 52px;
    padding: 12px 4px;
    border-bottom: 1px solid var(--border);
    font-family: var(--font-body);
    font-size: 17px;
    color: var(--text);
    text-decoration: none;
  }
  .sh-list-link:hover { color: var(--amber); }
  .sh-link {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    font-family: var(--font-ui);
    font-size: 14px;
    letter-spacing: 1px;
    color: var(--amber);
    text-decoration: none;
    border-bottom: 1px solid transparent;
  }
  .sh-link:hover { border-bottom-color: var(--amber); }

  /* Termine */
  .sh-events { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--border); }
  .sh-event {
    display: flex;
    gap: 16px;
    align-items: center;
    min-height: 72px;
    padding: 14px 4px;
    border-bottom: 1px solid var(--border);
    color: var(--text);
    text-decoration: none;
  }
  .sh-event:hover .sh-event-title { color: var(--amber); }
  .sh-event-date {
    flex: 0 0 56px;
    height: 56px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border2);
    border-radius: 2px;
  }
  .sh-event-day { font-family: var(--font-display); font-weight: 300; font-size: 24px; line-height: 1; color: var(--cream); }
  .sh-event-month {
    margin-top: 4px;
    font-family: var(--font-ui);
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .sh-event-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .sh-event-title { font-family: var(--font-body); font-size: 17px; line-height: 1.35; color: var(--cream); overflow-wrap: anywhere; }
  .sh-event-time { font-family: var(--font-ui); font-size: 13px; color: var(--muted2); }
  .sh-event-hint { font-family: var(--font-body); font-style: italic; font-size: 14px; color: var(--muted); }

  /* Ohne Kurs */
  .sh-noaccess {
    padding: 20px;
    border: 1px solid var(--border2);
    border-radius: 2px;
    background: linear-gradient(180deg, var(--amber-glow), transparent 70%);
  }
  .sh-noaccess-title { margin: 0; font-family: var(--font-display); font-weight: 300; font-size: 24px; line-height: 1.25; color: var(--cream); }
  .sh-noaccess-text { margin: 0; font-family: var(--font-body); font-size: 16px; line-height: 1.6; color: var(--muted2); }
  .sh-redeem-form { display: flex; flex-direction: column; gap: 8px; }
  .sh-redeem-label {
    font-family: var(--font-ui);
    font-size: 11px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .sh-redeem-row { display: flex; flex-wrap: wrap; gap: 10px; }
  .sh-redeem-input {
    flex: 1 1 200px;
    min-width: 0;
    min-height: 48px;
    padding: 10px 14px;
    border: 1px solid var(--border2);
    border-radius: 2px;
    background: var(--dark);
    color: var(--cream);
    font-family: var(--font-ui);
    font-size: 16px;
    letter-spacing: 1px;
  }
  .sh-redeem-input:focus { outline: none; border-color: var(--amber); }
  .sh-redeem-row .cr-btn { flex: 0 0 auto; }
  .sh-redeem-row .cr-btn:disabled { opacity: 0.6; }
  .sh-redeem-error { margin: 0; font-family: var(--font-body); font-size: 15px; color: var(--cream); }

  /* Konto — dezent */
  .sh-account {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 24px;
    padding-top: 20px;
    border-top: 1px solid var(--border);
  }
  .sh-account-link {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 0;
    border: 0;
    background: none;
    font-family: var(--font-ui);
    font-size: 14px;
    letter-spacing: 1px;
    color: var(--muted);
    text-decoration: none;
    cursor: pointer;
  }
  .sh-account-link:hover { color: var(--amber); }

  @media (max-width: 520px) {
    .sh-redeem-row .cr-btn { flex: 1 1 100%; width: 100%; }
  }
`
