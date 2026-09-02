import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import {
  formatDateDE,
  getCourseAccess,
  unlockDateForDay,
} from '../../lib/course-access'
import {
  COURSE_TOTAL_DAYS,
  PLANNED_DAY_NUMBERS,
  RHYTHMUS_CYCLES,
  RHYTHMUS_DAYS,
  cycleForDay,
} from '../../../data/rhythmusfundament-days'

// ─────────────────────────────────────────────────────────────────────────────
// /training/rhythmusfundament — 44-Tage-Index.
//
// Auth-gates first. Listet die Tage gruppiert in drei Zyklen. Noch nicht
// hochgeladene Tage (PLANNED_DAY_NUMBERS) erscheinen als Platzhalter. Jede Karte
// linkt auf /training/rhythmusfundament/tag/[n] mit Markdown-Body + Player.
//
// Der reichere Tag-12-bis-22-Player (mit Stufen, Kombis, Spielwegen, Supabase-
// Abhaken) lebt jetzt unter /training/rhythmusfundament/zyklus-2-uebersicht.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata = {
  title: 'Rhythmus-Fundament — 44-Tage-Kurs',
  description:
    'Alle 44 Tage des Rhythmus-Fundament-Kurses — Texte und Player pro Tag. Wähle deinen Tag und drück Play.',
}

export default async function RhythmusfundamentIndexPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Kurs-Gate: ohne Einschreibung zurück zum Hub (gesperrte Karte mit Code-Feld).
  const access = await getCourseAccess(supabase, user.id, 'rhythmusfundament')
  if (!access.enrolled) redirect('/training')

  // Drip-Unlock: Labels werden HIER (serverseitig, Berlin-Datum) formatiert —
  // der Client rechnet nie mit Datumswerten.
  const { dripStartDate, maxUnlockedDay } = access
  const isDrip = dripStartDate !== null
  const nextDay = maxUnlockedDay + 1
  const nextUnlockLabel =
    isDrip && nextDay <= COURSE_TOTAL_DAYS
      ? formatDateDE(unlockDateForDay(dripStartDate, nextDay))
      : null
  // Geplante, noch nicht hochgeladene Tage (41–44) je Zyklus als Platzhalter.
  const plannedByCycle = (cycleNumber: number): number[] =>
    PLANNED_DAY_NUMBERS.filter((n) => cycleForDay(n).number === cycleNumber)
  const unlockLabelFor = (dayNumber: number): string | null =>
    isDrip && dayNumber > maxUnlockedDay
      ? formatDateDE(unlockDateForDay(dripStartDate, dayNumber))
      : null

  return (
    <>
      <style>{INDEX_CSS}</style>
      <main className="rf-page">
        <div className="rf-wrap">
          {/* Hero */}
          <header className="rf-hero">
            <div className="rf-eyebrow">Rhythm Gym · Kurs</div>
            <h1 className="rf-title">RHYTHMUS-FUNDAMENT</h1>
            <p className="rf-tagline">
              {COURSE_TOTAL_DAYS} Tage · drei Zyklen · vom Puls bis zur eigenen Komposition.
            </p>
            <p className="rf-sub">
              Wähle deinen Tag — Text, Übungen und der Rhythmus-Player sind
              auf jeder Seite direkt geladen. Mehrere Patterns pro Tag:
              ein Klick wechselt den Player.
            </p>
            {isDrip ? (
              <p className="rf-drip" role="status">
                {maxUnlockedDay === 0 ? (
                  <>
                    Dein Kurs beginnt: <strong>Tag 1 wird am {nextUnlockLabel} freigeschaltet</strong>.
                    Danach kommt jeden Tag ein neuer Kurstag dazu.
                  </>
                ) : nextUnlockLabel ? (
                  <>
                    <strong>{maxUnlockedDay} von {COURSE_TOTAL_DAYS} Tagen frei.</strong>{' '}
                    Tag {nextDay} wird am {nextUnlockLabel} freigeschaltet.
                  </>
                ) : (
                  <>Alle {COURSE_TOTAL_DAYS} Tage sind freigeschaltet.</>
                )}
              </p>
            ) : null}
            <div className="rf-meta">
              <span className="rf-chip">
                {isDrip
                  ? `${maxUnlockedDay} von ${COURSE_TOTAL_DAYS} Tagen frei`
                  : `${COURSE_TOTAL_DAYS} Tage`}
              </span>
              <span className="rf-chip">3 Zyklen</span>
              <Link
                href="/training/rhythmusfundament/zyklus-2-uebersicht"
                className="rf-chip rf-chip--link"
              >
                Zyklus 2 · klassische Übersicht →
              </Link>
            </div>
          </header>

          {/* Cycles */}
          {RHYTHMUS_CYCLES.map((cycle) => {
            const cycleDays = RHYTHMUS_DAYS.filter(
              (d) => d.cycle === cycle.number,
            )
            const planned = plannedByCycle(cycle.number)
            return (
              <section key={cycle.number} className="rf-cycle">
                <header className="rf-cycle-head">
                  <span className="rf-cycle-num">Zyklus {cycle.number}</span>
                  <h2 className="rf-cycle-title">{cycle.title}</h2>
                  <p className="rf-cycle-sub">{cycle.subtitle}</p>
                  <p className="rf-cycle-range">
                    Tag {cycle.dayRange[0]}–{cycle.dayRange[1]} ·{' '}
                    {cycleDays.length + planned.length} Tage
                  </p>
                </header>
                <div className="rf-day-grid">
                  {cycleDays.map((d) => {
                    const unlockLabel = unlockLabelFor(d.number)
                    if (unlockLabel) {
                      return (
                        <div
                          key={d.number}
                          className="rf-day-card rf-day-card--locked"
                          aria-disabled="true"
                        >
                          <span className="rf-day-num">🔒 Tag {d.number}</span>
                          <span className="rf-day-title">{d.title}</span>
                          <span className="rf-day-essence">{d.essence}</span>
                          <span className="rf-day-meta rf-day-meta--unlock">
                            Frei ab {unlockLabel}
                          </span>
                        </div>
                      )
                    }
                    return (
                      <Link
                        key={d.number}
                        href={`/training/rhythmusfundament/tag/${d.number}`}
                        className="rf-day-card"
                      >
                        <span className="rf-day-num">Tag {d.number}</span>
                        <span className="rf-day-title">{d.title}</span>
                        <span className="rf-day-essence">{d.essence}</span>
                        <span className="rf-day-meta">
                          {d.presets.length}{' '}
                          {d.presets.length === 1 ? 'Pattern' : 'Patterns'}
                        </span>
                      </Link>
                    )
                  })}
                  {planned.map((n) => {
                    const unlockLabel = unlockLabelFor(n)
                    return (
                      <div
                        key={`planned-${n}`}
                        className="rf-day-card rf-day-card--locked rf-day-card--planned"
                        aria-disabled="true"
                      >
                        <span className="rf-day-num">
                          {unlockLabel ? '🔒 ' : ''}Tag {n}
                        </span>
                        <span className="rf-day-title">Inhalt folgt</span>
                        <span className="rf-day-essence">
                          Dieser Tag wird noch hochgeladen.
                        </span>
                        <span className="rf-day-meta rf-day-meta--unlock">
                          {unlockLabel ? `Frei ab ${unlockLabel}` : 'Bald verfügbar'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      </main>
    </>
  )
}

const INDEX_CSS = `
  .rf-page {
    min-height: 100vh;
    background: var(--black);
    color: var(--cream);
    padding: 48px 20px 96px;
    font-family: 'Barlow', sans-serif;
  }
  .rf-wrap {
    max-width: 1180px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 56px;
  }

  /* ── Hero ── */
  .rf-hero {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 36px 32px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    position: relative;
    overflow: hidden;
  }
  .rf-hero::before {
    content: '';
    position: absolute;
    top: -120px;
    right: -120px;
    width: 360px;
    height: 360px;
    background: radial-gradient(circle, rgba(245,166,35,0.08) 0%, transparent 70%);
    pointer-events: none;
  }
  .rf-eyebrow {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .rf-title {
    font-family: 'Anton', sans-serif;
    font-size: clamp(36px, 6vw, 56px);
    letter-spacing: 2px;
    line-height: 1.05;
    color: var(--cream);
    margin: 0;
  }
  .rf-tagline {
    font-size: 16px;
    color: var(--muted2, var(--muted));
    margin: 0;
  }
  .rf-sub {
    font-size: 14px;
    color: var(--text, var(--cream));
    line-height: 1.6;
    margin: 0;
    max-width: 70ch;
  }
  .rf-drip {
    margin: 4px 0 0;
    padding: 12px 14px;
    background: rgba(245,166,35,0.08);
    border: 1px solid rgba(245,166,35,0.35);
    border-radius: 6px;
    font-size: 14px;
    line-height: 1.55;
    color: var(--cream);
    max-width: 70ch;
  }
  .rf-drip strong {
    color: var(--amber);
    font-weight: 600;
  }
  .rf-day-card--locked {
    opacity: 0.55;
    cursor: default;
  }
  .rf-day-card--locked:hover {
    border-color: var(--border);
    transform: none;
  }
  .rf-day-card--locked .rf-day-num {
    color: var(--muted);
  }
  .rf-day-meta--unlock {
    color: var(--amber);
  }
  .rf-day-card--planned {
    border-style: dashed;
  }
  .rf-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 8px;
  }
  .rf-chip {
    display: inline-block;
    padding: 6px 12px;
    background: var(--amber-dim, rgba(245,166,35,0.12));
    color: var(--amber);
    border-radius: 4px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .rf-chip--link {
    text-decoration: none;
    border: 1px solid transparent;
    transition: border-color 0.15s;
  }
  .rf-chip--link:hover {
    border-color: var(--amber);
  }

  /* ── Cycle Section ── */
  .rf-cycle {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .rf-cycle-head {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
  }
  .rf-cycle-num {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .rf-cycle-title {
    font-family: 'Anton', sans-serif;
    font-size: 26px;
    letter-spacing: 1px;
    line-height: 1.1;
    color: var(--cream);
    margin: 0;
  }
  .rf-cycle-sub {
    font-size: 14px;
    color: var(--muted2, var(--muted));
    margin: 0;
    max-width: 64ch;
  }
  .rf-cycle-range {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    margin: 0;
  }

  /* ── Day Grid ── */
  .rf-day-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .rf-day-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 16px 18px;
    color: var(--cream);
    text-decoration: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
    transition: border-color 0.15s, transform 0.1s;
  }
  .rf-day-card:hover {
    border-color: var(--amber);
    transform: translateY(-1px);
  }
  .rf-day-num {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .rf-day-title {
    font-family: 'Anton', sans-serif;
    font-size: 18px;
    letter-spacing: 0.5px;
    line-height: 1.15;
    color: var(--cream);
  }
  .rf-day-essence {
    font-size: 13px;
    color: var(--muted2, var(--muted));
    line-height: 1.45;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .rf-day-meta {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--muted);
    margin-top: 4px;
  }

  /* Desktop: 2 columns from 720, 3 from 1080. */
  @media (min-width: 720px) {
    .rf-day-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .rf-hero {
      padding: 44px 48px;
    }
  }
  @media (min-width: 1080px) {
    .rf-day-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  /* Mobile */
  @media (max-width: 480px) {
    .rf-page {
      padding: 28px 14px 80px;
    }
    .rf-wrap {
      gap: 40px;
    }
    .rf-hero {
      padding: 24px 20px;
    }
    .rf-day-card {
      padding: 14px;
    }
  }
`
