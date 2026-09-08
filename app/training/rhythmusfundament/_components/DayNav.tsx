'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// ─────────────────────────────────────────────────────────────────────────────
// DayNav — die Tagesleiste neben der Tagesansicht.
//
// Wer an Tag 27 sitzt, soll nicht erst zurück zur Übersicht, um zu Tag 26 oder
// 31 zu kommen. Also steht die ganze Reise links daneben: nach Zyklen gruppiert,
// eigener Scrollbereich, der aktuelle Tag markiert und beim Öffnen sichtbar.
//
// Gesperrte Tage sind KEINE Links. Ein deaktivierter Link bleibt sonst per Tab
// erreichbar und per Rechtsklick kopierbar — das wäre ein Versprechen, das der
// Server ohnehin zurückweist (Redirect in tag/[n]/page.tsx). Hier steht
// stattdessen, ab wann der Tag offen ist.
//
// Auf dem Handy wäre eine feste Spalte unbrauchbar, dort ist es eine Liste zum
// Aufklappen. Die Umschaltung macht CSS; der Knopf verschwindet ab 1024px.
// ─────────────────────────────────────────────────────────────────────────────

export type NavDay = {
  number: number
  title: string
  /** Gesperrt = noch nicht freigeschaltet ODER Inhalt noch nicht hochgeladen. */
  locked: boolean
  /** „Frei ab 12.10.2026" — nur bei Drip-Sperre gesetzt. */
  unlockLabel: string | null
  /** Tag ist eingeplant, aber noch ohne Inhalt (41–44). */
  planned: boolean
}

export type NavCycle = {
  number: number
  title: string
  days: NavDay[]
}

export function DayNav({
  cycles,
  currentDay,
  totalDays,
  unlockedDays,
}: {
  cycles: NavCycle[]
  currentDay: number
  totalDays: number
  unlockedDays: number
}) {
  const [open, setOpen] = useState(false)
  const activeRef = useRef<HTMLAnchorElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  // Den aktuellen Tag in den sichtbaren Bereich holen — ohne die Seite selbst
  // zu bewegen. `scrollIntoView` würde auch das Fenster verschieben, deshalb
  // wird die Position von Hand gesetzt.
  useEffect(() => {
    const list = listRef.current
    const active = activeRef.current
    if (!list || !active) return
    const ziel = active.offsetTop - list.clientHeight / 2 + active.clientHeight / 2
    list.scrollTop = Math.max(0, ziel)
  }, [currentDay])

  return (
    <nav className="dn" aria-label="Alle Tage des Kurses">
      <div className="dn-head">
        <p className="dn-title">Alle Tage</p>
        <p className="dn-count">
          {unlockedDays} von {totalDays} frei
        </p>
        <button
          type="button"
          className="dn-toggle"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Schließen' : 'Tage zeigen'}
        </button>
      </div>

      <div className={open ? 'dn-list dn-list--open' : 'dn-list'} ref={listRef}>
        {cycles.map((cycle) => (
          <section key={cycle.number} className="dn-cycle">
            <h2 className="dn-cycle-title">
              <span className="dn-cycle-num">Zyklus {cycle.number}</span>
              {cycle.title}
            </h2>

            <ul className="dn-days">
              {cycle.days.map((day) => {
                const isCurrent = day.number === currentDay

                if (day.locked) {
                  return (
                    <li key={day.number}>
                      <span className="dn-day dn-day--locked" aria-disabled="true">
                        <span className="dn-day-num">🔒 {day.number}</span>
                        <span className="dn-day-text">
                          <span className="dn-day-title">
                            {day.planned ? 'Inhalt folgt' : day.title}
                          </span>
                          <span className="dn-day-note">
                            {day.unlockLabel
                              ? `Frei ab ${day.unlockLabel}`
                              : 'Bald verfügbar'}
                          </span>
                        </span>
                      </span>
                    </li>
                  )
                }

                return (
                  <li key={day.number}>
                    <Link
                      href={`/training/rhythmusfundament/tag/${day.number}`}
                      className={isCurrent ? 'dn-day dn-day--current' : 'dn-day'}
                      aria-current={isCurrent ? 'page' : undefined}
                      ref={isCurrent ? activeRef : undefined}
                      onClick={() => setOpen(false)}
                    >
                      <span className="dn-day-num">{day.number}</span>
                      <span className="dn-day-text">
                        <span className="dn-day-title">{day.title}</span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      <style>{DAY_NAV_CSS}</style>
    </nav>
  )
}

const DAY_NAV_CSS = `
  .dn {
    font-family: var(--font-body);
    min-width: 0;
  }

  .dn-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 8px 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
  }
  .dn-title {
    margin: 0;
    font-family: var(--font-ui);
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .dn-count {
    margin: 0;
    font-size: 12px;
    color: var(--muted);
  }
  .dn-toggle {
    margin-left: auto;
    background: transparent;
    border: 1px solid var(--border2);
    border-radius: 2px;
    color: var(--cream);
    padding: 8px 14px;
    min-height: 40px;
    cursor: pointer;
    font-family: var(--font-ui);
    font-size: 12px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .dn-toggle:hover { border-color: var(--amber); color: var(--amber); }

  /* Handy: Liste eingeklappt, bis jemand sie öffnet. */
  .dn-list { display: none; }
  .dn-list--open { display: block; margin-top: 14px; }

  .dn-cycle + .dn-cycle { margin-top: 18px; }
  .dn-cycle-title {
    margin: 0 0 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-family: var(--font-ui);
    font-size: 12px;
    line-height: 1.3;
    letter-spacing: 1px;
    color: var(--muted);
    text-transform: none;
    font-weight: 400;
  }
  .dn-cycle-num {
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--amber);
  }

  .dn-days { list-style: none; margin: 0; padding: 0; }

  .dn-day {
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding: 9px 10px;
    border-left: 2px solid transparent;
    border-radius: 2px;
    text-decoration: none;
    color: var(--muted2);
    font-size: 14px;
    line-height: 1.4;
  }
  a.dn-day:hover {
    background: var(--card);
    color: var(--cream);
    border-left-color: var(--border2);
  }
  .dn-day--current {
    background: var(--card);
    border-left-color: var(--amber);
    color: var(--cream);
  }
  .dn-day--locked {
    color: var(--muted);
    cursor: default;
  }

  .dn-day-num {
    flex-shrink: 0;
    min-width: 2.2em;
    font-family: var(--font-ui);
    font-size: 12px;
    letter-spacing: 1px;
    color: var(--muted);
  }
  .dn-day--current .dn-day-num { color: var(--amber); }

  .dn-day-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .dn-day-title { overflow-wrap: anywhere; }
  .dn-day-note { font-size: 12px; color: var(--muted); }

  /* Ab Tablet-Breite: feste Spalte, die mitläuft und für sich scrollt. */
  @media (min-width: 1024px) {
    .dn {
      position: sticky;
      top: 24px;
      align-self: start;
      max-height: calc(100vh - 48px);
      display: flex;
      flex-direction: column;
    }
    .dn-toggle { display: none; }
    .dn-list {
      display: block;
      margin-top: 14px;
      overflow-y: auto;
      /* Eigener Scrollbereich: die Leiste bewegt sich, die Seite bleibt. */
      overscroll-behavior: contain;
      padding-right: 6px;
    }
  }
`
