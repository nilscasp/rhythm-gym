'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CalendarDays, List } from 'lucide-react'
import type { Locale } from '../../lib/locale'
import {
  dayTitle,
  firstDayOf,
  groupByDay,
  monthKeyOf,
  monthMatrix,
  monthTitle,
  shiftMonth,
  type MonthKey,
} from '../../lib/calendar-month'
import type { TerminView as Termin } from '../_viewer'

// ─────────────────────────────────────────────────────────────────────────────
// TermineView — der Kalender der Schule, in zwei Ansichten.
//
// MONAT ist die Standardansicht und bleibt es auch nach einem Neuladen: die
// Wahl wird bewusst NICHT gespeichert. Wer die Seite öffnet, soll sehen, was
// dieser Monat bringt — nicht, was er beim letzten Besuch angeklickt hat.
//
// Der Monat zeigt auch VERGANGENE Termine (wer am 13. schaut, sieht den 11.),
// die Liste zeigt nur Kommendes. Zwei Ansichten, zwei ehrliche Aussagen — die
// Liste heißt „Kommende Termine" und soll das auch bleiben.
//
// Gerechnet wird hier nichts: Datum, Uhrzeit, Sprache und Zugriffs-Hinweis
// kommen fertig vom Server (TerminView). Der Client ordnet nur noch ein. Auch
// „heute" ist ein Prop — würde der Browser es selbst bestimmen, stünde nach
// Mitternacht eine andere Zelle im Rahmen als der Server gerendert hat.
//
// Auf dem Handy ist ein Raster mit Text unlesbar. Dort tragen die Zellen nur
// Punkte, und die Termine des gewählten Tages stehen darunter. Die Umschaltung
// macht CSS (560px), nicht JavaScript — beides ist immer im DOM.
// ─────────────────────────────────────────────────────────────────────────────

export type TermineLabels = {
  eyebrow: string
  title: string
  intro: string
  empty: string
  viewMonth: string
  viewList: string
  calendarLabel: string
  today: string
  prevMonth: string
  nextMonth: string
  monthEmpty: string
  dayEmpty: string
  eventOne: string
  eventMany: string
}

type Mode = 'month' | 'list'

export function TermineView({
  events,
  today,
  initialMonth,
  firstMonth,
  lastMonth,
  weekdays,
  locale,
  labels,
  loadError = null,
}: {
  /** Das ganze Fenster, aufsteigend sortiert — Vergangenheit inbegriffen. */
  events: Termin[]
  /** Berliner Kalendertag von heute, serverseitig bestimmt. */
  today: string
  initialMonth: MonthKey
  /** Erster und letzter geladener Monat — weiter lässt sich nicht blättern. */
  firstMonth: MonthKey
  lastMonth: MonthKey
  weekdays: string[]
  locale: Locale
  labels: TermineLabels
  /**
   * Gesetzt, wenn die Abfrage fehlgeschlagen ist. „Nichts geplant" und „ließ
   * sich nicht laden" sind zwei verschiedene Aussagen; wer sie zusammenwirft,
   * behauptet einen leeren Kalender, den es gar nicht gibt.
   */
  loadError?: string | null
}) {
  const byDay = useMemo(() => groupByDay(events), [events])

  // Ansicht und Monat stehen in der Adresse — aber nur, nachdem jemand sie
  // selbst geändert hat. Wer /termine frisch öffnet, bekommt immer den Monat.
  // Der Gewinn: nach einem Klick auf einen Termin führt der Zurück-Knopf
  // dorthin zurück, wo man war, statt in den laufenden Monat.
  const params = useSearchParams()
  const paramMonth = params.get('monat')
  const [mode, setMode] = useState<Mode>(
    params.get('ansicht') === 'liste' ? 'list' : 'month',
  )
  const [cursor, setCursor] = useState<MonthKey>(
    paramMonth && paramMonth >= firstMonth && paramMonth <= lastMonth
      ? paramMonth
      : initialMonth,
  )
  const [selected, setSelected] = useState<string>(today)

  /**
   * Adresse mitschreiben, ohne die Seite neu zu laden. `router.replace` würde
   * hier eine Serverrunde auslösen — bei force-dynamic für jeden Monatsklick.
   * `history.replaceState` schreibt nur die Adresse.
   */
  const rememberInUrl = useCallback((next: { mode: Mode; cursor: MonthKey }) => {
    if (typeof window === 'undefined') return
    const query = new URLSearchParams()
    if (next.mode === 'list') query.set('ansicht', 'liste')
    query.set('monat', next.cursor)
    window.history.replaceState(null, '', `${window.location.pathname}?${query}`)
  }, [])

  // Beim Monatswechsel den ersten Tag mit Terminen wählen — im laufenden Monat
  // bleibt es heute. So zeigt die Tagesliste auf dem Handy nie grundlos leer.
  const selectionFor = useCallback(
    (month: MonthKey): string => {
      if (monthKeyOf(today) === month) return today
      const firstWithEvents = [...byDay.keys()]
        .filter((day) => monthKeyOf(day) === month)
        .sort()[0]
      return firstWithEvents ?? firstDayOf(month)
    },
    [byDay, today],
  )

  const goMonth = useCallback(
    (delta: number) => {
      const next = shiftMonth(cursor, delta)
      if (next < firstMonth || next > lastMonth) return
      setCursor(next)
      setSelected(selectionFor(next))
      rememberInUrl({ mode, cursor: next })
    },
    [cursor, firstMonth, lastMonth, selectionFor, rememberInUrl, mode],
  )

  const goToday = useCallback(() => {
    const month = monthKeyOf(today)
    setCursor(month)
    setSelected(today)
    rememberInUrl({ mode, cursor: month })
  }, [today, rememberInUrl, mode])

  const switchMode = useCallback(
    (next: Mode) => {
      setMode(next)
      rememberInUrl({ mode: next, cursor })
    },
    [cursor, rememberInUrl],
  )

  const atFirst = cursor <= firstMonth
  const atLast = cursor >= lastMonth

  const weeks = useMemo(() => monthMatrix(cursor), [cursor])
  const monthCount = useMemo(
    () => events.filter((e) => monthKeyOf(e.startDate) === cursor).length,
    [events, cursor],
  )
  const selectedEvents = byDay.get(selected) ?? []

  // Die Liste bleibt, was sie war: kommende Termine, nach Monat gruppiert.
  // `endDate >= today` statt `startsAt >= now` — ein Termin, der heute schon
  // gelaufen ist, verschwindet erst morgen aus der Liste.
  const upcoming = useMemo(
    () => events.filter((event) => event.endDate >= today),
    [events, today],
  )
  const listGroups = useMemo(() => {
    const groups: { key: string; label: string; events: Termin[] }[] = []
    for (const event of upcoming) {
      const key = monthKeyOf(event.startDate)
      const last = groups[groups.length - 1]
      if (last && last.key === key) last.events.push(event)
      else groups.push({ key, label: monthTitle(key, locale), events: [event] })
    }
    return groups
  }, [upcoming, locale])

  const countLabel = (n: number): string =>
    `${n} ${n === 1 ? labels.eventOne : labels.eventMany}`

  return (
    <>
      <style>{TERMINE_CSS}</style>
      <main className="tm-page">
        <div className="tm-wrap">
          <header className="tm-header">
            <p className="tm-eyebrow">{labels.eyebrow}</p>
            <h1 className="tm-title">{labels.title}</h1>
            <p className="tm-intro">{labels.intro}</p>
          </header>

          {loadError ? (
            <p className="tm-empty" role="status">
              {loadError}
            </p>
          ) : (
          <>
          {/* Leiste: links Heute + Blättern, rechts die Ansichtswahl. */}
          <div className="tm-bar">
            <div className="tm-nav">
              <button type="button" className="tm-today" onClick={goToday}>
                {labels.today}
              </button>
              {mode === 'month' ? (
                <>
                  <button
                    type="button"
                    className="tm-step"
                    onClick={() => goMonth(-1)}
                    aria-label={labels.prevMonth}
                    disabled={atFirst}
                  >
                    ‹
                  </button>
                  <span className="tm-month-name" aria-live="polite">
                    {monthTitle(cursor, locale)}
                  </span>
                  <button
                    type="button"
                    className="tm-step"
                    onClick={() => goMonth(1)}
                    aria-label={labels.nextMonth}
                    disabled={atLast}
                  >
                    ›
                  </button>
                </>
              ) : null}
            </div>

            <div className="tm-modes" role="group" aria-label={labels.calendarLabel}>
              <button
                type="button"
                className={mode === 'month' ? 'tm-mode tm-mode--on' : 'tm-mode'}
                aria-pressed={mode === 'month'}
                onClick={() => switchMode('month')}
              >
                <CalendarDays size={16} aria-hidden="true" />
                <span>{labels.viewMonth}</span>
              </button>
              <button
                type="button"
                className={mode === 'list' ? 'tm-mode tm-mode--on' : 'tm-mode'}
                aria-pressed={mode === 'list'}
                onClick={() => switchMode('list')}
              >
                <List size={16} aria-hidden="true" />
                <span>{labels.viewList}</span>
              </button>
            </div>
          </div>

          {mode === 'month' ? (
            <section className="cal" aria-label={labels.calendarLabel}>
              <div className="cal-head" aria-hidden="true">
                {weekdays.map((day) => (
                  <span key={day} className="cal-weekday">
                    {day}
                  </span>
                ))}
              </div>

              <div className="cal-grid">
                {weeks.map((week) =>
                  week.map((cell) => {
                    const dayEvents = byDay.get(cell.date) ?? []
                    const classes = ['cal-cell']
                    if (!cell.inMonth) classes.push('cal-cell--outside')
                    if (cell.date === today) classes.push('cal-cell--today')
                    if (cell.date === selected) classes.push('cal-cell--selected')

                    return (
                      <div key={cell.date} className={classes.join(' ')}>
                        <button
                          type="button"
                          className="cal-hit"
                          onClick={() => setSelected(cell.date)}
                          aria-label={`${dayTitle(cell.date, locale)}, ${countLabel(dayEvents.length)}`}
                          aria-current={cell.date === today ? 'date' : undefined}
                        >
                          <span className="cal-num">{cell.day}</span>
                          <span className="cal-dots" aria-hidden="true">
                            {dayEvents.slice(0, 4).map((event) => (
                              <span key={event.id} className="cal-dot" />
                            ))}
                          </span>
                        </button>

                        <ul className="cal-chips">
                          {dayEvents.map((event) => (
                            <li key={event.id}>
                              <Link
                                href={event.href}
                                className={
                                  event.endDate < today ? 'cal-chip cal-chip--past' : 'cal-chip'
                                }
                              >
                                <span className="cal-chip-time">{event.timeLabel}</span>
                                <span className="cal-chip-title">{event.title}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  }),
                )}
              </div>

              {monthCount === 0 ? (
                <p className="tm-empty cal-month-empty">{labels.monthEmpty}</p>
              ) : null}

              {/* Handy: die Termine des gewählten Tages unter dem Raster. */}
              <div className="cal-day">
                <h2 className="cal-day-title">{dayTitle(selected, locale)}</h2>
                {selectedEvents.length === 0 ? (
                  <p className="tm-empty">{labels.dayEmpty}</p>
                ) : (
                  <ul className="tm-list">
                    {selectedEvents.map((event) => (
                      <li key={event.id}>
                        <TerminCard event={event} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ) : listGroups.length === 0 ? (
            <p className="tm-empty">{labels.empty}</p>
          ) : (
            listGroups.map((group) => (
              <section key={group.key} className="tm-month">
                <h2 className="tm-month-title">{group.label}</h2>
                <ul className="tm-list">
                  {group.events.map((event) => (
                    <li key={event.id}>
                      <TerminCard event={event} />
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
          </>
          )}
        </div>
      </main>
    </>
  )
}

/** Die Terminkarte — dieselbe in der Liste und in der Tagesansicht. */
function TerminCard({ event }: { event: Termin }) {
  return (
    <Link href={event.href} className="tm-card">
      <div className="tm-badge" aria-hidden="true">
        <span className="tm-badge-day">{event.badgeDay}</span>
        <span className="tm-badge-month">{event.badgeMonth}</span>
      </div>

      <div className="tm-card-body">
        <div className="tm-card-head">
          <h3 className="tm-card-title">{event.title}</h3>
          {event.kindLabel ? <span className="tm-tag">{event.kindLabel}</span> : null}
        </div>

        <p className="tm-meta">{event.timeLabel}</p>
        {event.location ? <p className="tm-place">{event.location}</p> : null}
        {event.hint ? <p className="tm-hint">{event.hint}</p> : null}
      </div>
    </Link>
  )
}

const TERMINE_CSS = `
  .tm-page {
    min-height: 100vh;
    min-height: 100dvh;
    background: var(--black);
    color: var(--cream);
    padding: 40px 20px 96px;
    font-family: var(--font-body);
  }
  .tm-wrap {
    max-width: 960px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 28px;
    min-width: 0;
  }

  .tm-header { display: flex; flex-direction: column; gap: 10px; }
  .tm-eyebrow {
    margin: 0;
    font-family: var(--font-ui);
    font-size: 13px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .tm-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(32px, 7vw, 48px);
    letter-spacing: 1.5px;
    line-height: 1.05;
    color: var(--cream);
    overflow-wrap: anywhere;
  }
  .tm-intro {
    margin: 0;
    font-size: 17px;
    line-height: 1.6;
    color: var(--muted2);
    max-width: 60ch;
  }

  .tm-empty {
    margin: 0;
    color: var(--muted2);
    font-size: 16px;
    line-height: 1.6;
    max-width: 56ch;
  }

  /* ── Leiste: Heute · ‹ Monat › ............ Monat | Liste ── */
  .tm-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--border);
  }
  .tm-nav { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .tm-today {
    min-height: 40px;
    padding: 8px 16px;
    background: transparent;
    border: 1px solid var(--border2);
    border-radius: 999px;
    color: var(--cream);
    font-family: var(--font-ui);
    font-size: 12px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }
  .tm-today:hover { border-color: var(--amber); color: var(--amber); }
  .tm-step {
    width: 40px;
    height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid var(--border2);
    border-radius: 999px;
    color: var(--cream);
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }
  .tm-step:hover { border-color: var(--amber); color: var(--amber); }
  .tm-step:disabled { opacity: 0.35; cursor: default; }
  .tm-step:disabled:hover { border-color: var(--border2); color: var(--cream); }
  .tm-month-name {
    font-family: var(--font-display);
    font-size: 20px;
    line-height: 1.2;
    color: var(--cream);
    /* Einzeilig: „September 2026" über zwei Zeilen zerreißt die Leiste. */
    white-space: nowrap;
  }

  .tm-modes { display: flex; gap: 0; flex: 0 0 auto; }
  .tm-mode {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 40px;
    padding: 8px 14px;
    background: transparent;
    border: 1px solid var(--border2);
    color: var(--muted);
    font-family: var(--font-ui);
    font-size: 12px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }
  .tm-mode:first-child { border-radius: 4px 0 0 4px; }
  .tm-mode:last-child { border-radius: 0 4px 4px 0; margin-left: -1px; }
  .tm-mode:hover { color: var(--cream); }
  .tm-mode--on {
    background: var(--amber-dim);
    border-color: var(--amber);
    color: var(--amber);
    z-index: 1;
  }

  /* ── Monatsraster ── */
  .cal { display: flex; flex-direction: column; gap: 0; min-width: 0; }
  .cal-head {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 1px;
    padding-bottom: 8px;
  }
  .cal-weekday {
    font-family: var(--font-ui);
    font-size: 11px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--muted);
    text-align: center;
  }
  .cal-grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 1px;
    background: var(--border);
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow: hidden;
  }
  .cal-cell {
    position: relative;
    min-height: 112px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 6px 6px 8px;
    background: var(--card);
    min-width: 0;
  }
  .cal-cell--outside { background: var(--dark); }
  .cal-cell--outside .cal-num { color: var(--muted); opacity: 0.5; }
  .cal-cell--today { background: var(--card2, var(--card)); }

  .cal-hit {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0;
    background: transparent;
    border: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: default;
    pointer-events: none;
  }
  .cal-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 26px;
    height: 26px;
    border-radius: 999px;
    font-family: var(--font-ui);
    font-size: 13px;
    color: var(--muted2);
  }
  .cal-cell--today .cal-num {
    background: var(--amber);
    color: var(--black);
    font-weight: 700;
  }
  .cal-dots { display: none; gap: 3px; }
  .cal-dot {
    width: 5px;
    height: 5px;
    border-radius: 999px;
    background: var(--amber);
  }

  .cal-chips {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .cal-chip {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 5px 7px;
    border-left: 2px solid var(--amber);
    border-radius: 3px;
    background: var(--amber-dim);
    text-decoration: none;
    min-width: 0;
    transition: background 0.15s;
  }
  .cal-chip:hover { background: var(--amber-glow, var(--amber-dim)); }
  /* Vergangen: noch lesbar und anklickbar, aber sichtbar vorbei. */
  .cal-chip--past { opacity: 0.55; border-left-color: var(--muted); }
  .cal-chip--past .cal-chip-time { color: var(--muted); }
  .cal-chip-time {
    font-family: var(--font-ui);
    font-size: 10px;
    letter-spacing: 0.5px;
    color: var(--amber);
  }
  .cal-chip-title {
    font-size: 12px;
    line-height: 1.25;
    color: var(--cream);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .cal-month-empty { margin-top: 16px; }

  /* Tagesansicht — nur auf dem Handy sichtbar. */
  .cal-day { display: none; flex-direction: column; gap: 12px; margin-top: 20px; }
  .cal-day-title {
    margin: 0;
    font-family: var(--font-ui);
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--amber);
  }

  /* ── Liste ── */
  .tm-month { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
  .tm-month-title {
    margin: 0;
    font-family: var(--font-ui);
    font-size: 14px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--muted);
    border-bottom: 1px solid var(--border);
    padding-bottom: 8px;
  }
  .tm-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }
  .tm-card {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    padding: 16px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--card);
    text-decoration: none;
    color: inherit;
    min-width: 0;
    transition: border-color 0.15s, background-color 0.15s;
  }
  .tm-card:hover { border-color: var(--amber); background: var(--card2); }
  .tm-badge {
    flex: 0 0 auto;
    width: 56px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 8px 0;
    border-radius: 4px;
    background: var(--amber-dim);
  }
  .tm-badge-day {
    font-family: var(--font-display);
    font-size: 24px;
    line-height: 1;
    color: var(--amber);
  }
  .tm-badge-month {
    font-family: var(--font-ui);
    font-size: 12px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--muted2);
  }
  .tm-card-body {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .tm-card-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
  }
  .tm-card-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: 20px;
    line-height: 1.2;
    letter-spacing: 0.5px;
    color: var(--cream);
    overflow-wrap: anywhere;
  }
  .tm-tag {
    flex: 0 0 auto;
    font-family: var(--font-ui);
    font-size: 11px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--amber);
    border: 1px solid var(--border2);
    border-radius: 999px;
    padding: 2px 10px;
  }
  .tm-meta, .tm-place, .tm-hint {
    margin: 0;
    font-size: 15px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
  .tm-meta { color: var(--muted2); }
  .tm-place { color: var(--muted); }
  .tm-hint { color: var(--muted); font-style: italic; }

  /* ── Handy: Punkte statt Text, Tagesliste unter dem Raster ── */
  @media (max-width: 560px) {
    .tm-page { padding: 28px 14px 80px; }
    .tm-wrap { gap: 22px; }
    .tm-intro { font-size: 16px; }
    .tm-bar { gap: 10px; }
    .tm-nav { flex: 1 1 100%; justify-content: space-between; }
    .tm-modes { flex: 1 1 100%; }
    .tm-mode { flex: 1 1 50%; justify-content: center; }
    .tm-month-name { font-size: 16px; }
    .tm-today { padding: 8px 12px; }
    .tm-step { width: 36px; height: 36px; }

    .cal-grid { border-radius: 4px; }
    .cal-cell { min-height: 56px; padding: 4px 2px; align-items: center; }
    .cal-hit {
      pointer-events: auto;
      cursor: pointer;
      flex-direction: column;
      gap: 3px;
      width: 100%;
      min-height: 48px;
      align-items: center;
      justify-content: center;
    }
    .cal-chips { display: none; }
    .cal-dots { display: flex; min-height: 5px; }
    .cal-cell--selected { background: var(--amber-dim); }
    .cal-cell--selected .cal-num { color: var(--cream); }
    .cal-day { display: flex; }

    .tm-card { flex-direction: column; gap: 10px; padding: 14px; }
    .tm-badge {
      width: auto;
      flex-direction: row;
      align-items: baseline;
      gap: 8px;
      padding: 4px 10px;
      align-self: flex-start;
    }
    .tm-badge-day { font-size: 20px; }
    .tm-card-body { width: 100%; }
  }
`
