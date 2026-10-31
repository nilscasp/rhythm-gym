import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import {
  formatDateDE,
  getCourseAccess,
  unlockDateForDay,
} from '../../lib/course-access'
import {
  getCompletedDays,
  nextOpenDay,
  progressPercent,
} from '../../lib/course-progress'
import {
  RF15_BLOCKS,
  RF15_CYCLES,
  RF15_DAYS,
  RF15_INTROS,
  RF15_KICKOFF_LABEL,
  RF15_PDF,
  RF15_SLUG,
  RF15_START_DATE,
  RF15_TITLE,
  RF15_TOTAL_DAYS,
  fingeruebungKurz,
} from '../../../data/rhythmusfundament-1-5-days'
import { VideoSlot } from './_components/VideoSlot'
import { RF15_CSS } from './_components/styles'

// ─────────────────────────────────────────────────────────────────────────────
// /training/rhythmusfundament-1-5 — Kursübersicht.
//
// Oben die Einführung (zwei Videos + Begleit-PDF, sofort offen), darunter die
// 22 Tage in zwei Zyklen. Gesperrte Tage zeigen ihr Freischalt-Datum. Zugang:
// eigenes Enrollment (Zugangs-Code), getaktet ab RF15_START_DATE.
// ─────────────────────────────────────────────────────────────────────────────

export const metadata = {
  title: `${RF15_TITLE} — 22 Tage`,
  description:
    'Rhythmus Fundament 1.5: 22 Tage mit Fingerübung, kompositorischem Denken und Muskelgedächtnis.',
}

export default async function Rf15IndexPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const access = await getCourseAccess(supabase, user.id, RF15_SLUG, {
    totalDays: RF15_TOTAL_DAYS,
    defaultDripStartDate: RF15_START_DATE,
  })
  if (!access.enrolled) redirect('/training')

  const { dripStartDate, maxUnlockedDay } = access
  const unlockLabelFor = (n: number): string | null =>
    dripStartDate && n > maxUnlockedDay
      ? formatDateDE(unlockDateForDay(dripStartDate, n))
      : null
  const dateLabelFor = (n: number): string | null =>
    dripStartDate ? formatDateDE(unlockDateForDay(dripStartDate, n)) : null
  const nextDay = maxUnlockedDay + 1
  const nextUnlockLabel = nextDay <= RF15_TOTAL_DAYS ? unlockLabelFor(nextDay) : null

  const completed = access.programId
    ? await getCompletedDays(supabase, user.id, access.programId)
    : new Set<number>()
  const donePct = progressPercent(completed.size, RF15_TOTAL_DAYS)
  const continueDay = nextOpenDay(
    completed,
    maxUnlockedDay,
    RF15_DAYS.map((d) => d.number),
  )

  return (
    <>
      <style>{RF15_CSS}</style>
      <main className="r15-page">
        <div className="r15-wrap">
          <header className="r15-hero">
            <div className="r15-eyebrow">Kurs · für Teilnehmende von Rhythmus Fundament 1.0</div>
            <h1 className="r15-title">{RF15_TITLE.toUpperCase()}</h1>
            <p className="r15-lead">
              {RF15_TOTAL_DAYS} Tage, jeder mit drei Blöcken. Jeder Tag gehört zu
              einem Tag aus Rhythmus Fundament 1.0: Tag 1 zu Tag 23, Tag 22 zu Tag 44.
            </p>
            <ul className="r15-blocks">
              {RF15_BLOCKS.map((b) => (
                <li key={b.key}>
                  <span className="r15-blocks-num">Block {b.nummer}</span>
                  <span className="r15-blocks-title">{b.titel}</span>
                  <span className="r15-blocks-sub">{b.zweck}</span>
                </li>
              ))}
            </ul>
            <p className="r15-notice" role="status">
              <strong>Kickoff: {RF15_KICKOFF_LABEL}.</strong>{' '}
              {maxUnlockedDay === 0 && nextUnlockLabel ? (
                <>Tag 1 wird am {nextUnlockLabel} freigeschaltet, danach jeden Tag ein weiterer.</>
              ) : nextUnlockLabel ? (
                <>
                  {maxUnlockedDay} von {RF15_TOTAL_DAYS} Tagen frei. Tag {nextDay} wird am{' '}
                  {nextUnlockLabel} freigeschaltet.
                </>
              ) : (
                <>Alle {RF15_TOTAL_DAYS} Tage sind freigeschaltet.</>
              )}
            </p>
            <div className="r15-chips">
              <span className="r15-chip">
                {maxUnlockedDay} von {RF15_TOTAL_DAYS} Tagen frei
              </span>
              <span className="r15-chip r15-chip--done">
                {completed.size} abgehakt · {donePct} %
              </span>
            </div>
            {continueDay ? (
              <Link
                href={`/training/rhythmusfundament-1-5/tag/${continueDay}`}
                className="r15-continue"
              >
                Weiter mit Tag {continueDay} →
              </Link>
            ) : null}
          </header>

          {/* Einführung — immer offen */}
          <section className="r15-section" aria-labelledby="r15-intro">
            <header className="r15-section-head">
              <span className="r15-eyebrow">Vor dem Start</span>
              <h2 id="r15-intro" className="r15-h2">Einführung</h2>
              <p className="r15-section-sub">
                Zwei Videos und ein Begleitheft: wie der Kurs abläuft und wie die
                Fingerübungen gebaut sind.
              </p>
            </header>
            <div className="r15-intro-grid">
              {RF15_INTROS.map((intro) => (
                <article key={intro.id} className="r15-intro">
                  <h3 className="r15-intro-title">{intro.titel}</h3>
                  <VideoSlot videoId={intro.videoId} title={intro.titel} />
                </article>
              ))}
            </div>
            <div className="r15-pdf">
              <div className="r15-pdf-text">
                <span className="r15-eyebrow">Begleit-PDF</span>
                <span className="r15-pdf-title">{RF15_PDF.titel}</span>
                <span className="r15-muted">{RF15_PDF.untertitel}</span>
              </div>
              {RF15_PDF.file ? (
                <a
                  href="/training/rhythmusfundament-1-5/fingerpyramide"
                  className="r15-btn"
                  target="_blank"
                  rel="noopener"
                >
                  PDF öffnen ↗
                </a>
              ) : (
                <span className="r15-btn r15-btn--disabled" aria-disabled="true">
                  PDF folgt
                </span>
              )}
            </div>
          </section>

          {RF15_CYCLES.map((cycle) => (
            <section key={cycle.number} className="r15-section">
              <header className="r15-section-head">
                <span className="r15-eyebrow">
                  Tag {cycle.dayRange[0]}–{cycle.dayRange[1]}
                </span>
                <h2 className="r15-h2">{cycle.titel}</h2>
                <p className="r15-section-sub">{cycle.untertitel}</p>
              </header>
              <div className="r15-day-grid">
                {RF15_DAYS.filter((d) => d.cycle === cycle.number).map((d) => {
                  const unlockLabel = unlockLabelFor(d.number)
                  const dateLabel = dateLabelFor(d.number)
                  const inner = (
                    <>
                      <span className="r15-day-num">
                        {unlockLabel ? '🔒 ' : completed.has(d.number) ? '✓ ' : ''}
                        {dateLabel ?? `Zyklus ${d.cycle}`}
                      </span>
                      <span className="r15-day-title">Tag {d.number}</span>
                      <span className="r15-day-line">
                        Fingerübung: {fingeruebungKurz(d.fingeruebung)}
                      </span>
                      <span
                        className={
                          unlockLabel ? 'r15-day-meta r15-day-meta--unlock' : 'r15-day-meta'
                        }
                      >
                        {unlockLabel
                          ? `Frei ab ${unlockLabel}`
                          : `Baut auf RF 1.0 · Tag ${d.rf10Day} auf`}
                      </span>
                    </>
                  )
                  if (unlockLabel) {
                    return (
                      <div
                        key={d.number}
                        className="r15-day-card r15-day-card--locked"
                        aria-disabled="true"
                      >
                        {inner}
                      </div>
                    )
                  }
                  return (
                    <Link
                      key={d.number}
                      href={`/training/rhythmusfundament-1-5/tag/${d.number}`}
                      className={
                        completed.has(d.number)
                          ? 'r15-day-card r15-day-card--done'
                          : 'r15-day-card'
                      }
                    >
                      {inner}
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </main>
    </>
  )
}
