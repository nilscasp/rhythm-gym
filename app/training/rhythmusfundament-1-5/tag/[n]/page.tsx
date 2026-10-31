import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/server'
import {
  formatDateDE,
  getCourseAccess,
  unlockDateForDay,
} from '../../../../lib/course-access'
import { getCompletedDays } from '../../../../lib/course-progress'
import { RHYTHMUS_DAYS } from '../../../../../data/rhythmusfundament-days'
import {
  RF15_BLOCKS,
  RF15_DAYS,
  RF15_SLUG,
  RF15_START_DATE,
  RF15_TITLE,
  RF15_TOTAL_DAYS,
  type Rf15BlockKey,
} from '../../../../../data/rhythmusfundament-1-5-days'
import { DayCheck } from '../../../rhythmusfundament/_components/DayCheck'
import { toggleRf15DayAction } from '../../_actions'
import { VideoSlot } from '../../_components/VideoSlot'
import { RF15_CSS } from '../../_components/styles'

// ─────────────────────────────────────────────────────────────────────────────
// /training/rhythmusfundament-1-5/tag/[n] — ein Kurstag mit drei Blöcken.
//
// Block 2 verweist auf den zugehörigen Tag in RF 1.0 (N + 22) — als Link nur,
// wenn dieser Tag für den User dort offen ist; sonst als Hinweis ohne Link.
// ─────────────────────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  return RF15_DAYS.map((d) => ({ n: String(d.number) }))
}

interface PageProps {
  params: Promise<{ n: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { n } = await params
  return { title: `Tag ${n} — ${RF15_TITLE}` }
}

const BLOCK_BY_KEY = Object.fromEntries(RF15_BLOCKS.map((b) => [b.key, b])) as Record<
  Rf15BlockKey,
  (typeof RF15_BLOCKS)[number]
>

export default async function Rf15TagPage({ params }: PageProps) {
  const { n } = await params
  const num = parseInt(n, 10)
  const day = RF15_DAYS.find((d) => d.number === num)
  if (!day) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [access, rf10Access] = await Promise.all([
    getCourseAccess(supabase, user.id, RF15_SLUG, {
      totalDays: RF15_TOTAL_DAYS,
      defaultDripStartDate: RF15_START_DATE,
    }),
    getCourseAccess(supabase, user.id, 'rhythmusfundament'),
  ])
  if (!access.enrolled) redirect('/training')
  if (day.number > access.maxUnlockedDay) redirect('/training/rhythmusfundament-1-5')

  const completed = access.programId
    ? await getCompletedDays(supabase, user.id, access.programId)
    : new Set<number>()

  const dateLabel = access.dripStartDate
    ? formatDateDE(unlockDateForDay(access.dripStartDate, day.number))
    : null
  const rf10 = RHYTHMUS_DAYS.find((d) => d.number === day.rf10Day)
  const rf10Open = rf10Access.enrolled && day.rf10Day <= rf10Access.maxUnlockedDay
  const f = day.fingeruebung

  const prevNum = day.number > 1 ? day.number - 1 : null
  const nextNum = day.number < RF15_TOTAL_DAYS ? day.number + 1 : null
  const nextLocked = nextNum !== null && nextNum > access.maxUnlockedDay
  const nextUnlockLabel =
    nextNum && nextLocked && access.dripStartDate
      ? formatDateDE(unlockDateForDay(access.dripStartDate, nextNum))
      : null

  const blockHead = (key: Rf15BlockKey) => {
    const b = BLOCK_BY_KEY[key]
    return (
      <header className="r15-block-head">
        <span className="r15-eyebrow">
          Block {b.nummer} · {b.zweck}
        </span>
        <h2 className="r15-block-title">{b.titel}</h2>
      </header>
    )
  }

  return (
    <>
      <style>{RF15_CSS}</style>
      <main className="r15-page">
        <div className="r15-wrap r15-wrap--narrow">
          <div className="r15-crumb">
            <Link href="/training/rhythmusfundament-1-5">← {RF15_TITLE}</Link>
            <span aria-hidden="true">·</span>
            <span>Zyklus {day.cycle}</span>
          </div>

          <header className="r15-day-header">
            <div className="r15-eyebrow">
              Tag {day.number} von {RF15_TOTAL_DAYS}
              {dateLabel ? ` · ${dateLabel}` : ''}
            </div>
            <h1 className="r15-title">TAG {day.number}</h1>
            <p className="r15-lead r15-muted">
              Gehört zu Rhythmus Fundament 1.0 · Tag {day.rf10Day}
              {rf10 ? ` · ${rf10.title}` : ''}
            </p>
          </header>

          <section className="r15-block" aria-label="Block 1 · Fingerübung">
            {blockHead('fingeruebung')}
            <VideoSlot
              videoId={day.videos.fingeruebung}
              title={`Tag ${day.number} · Fingerübung`}
            />
            <dl className="r15-plan">
              <dt>Hände</dt>
              <dd>{f.haende}</dd>
              <dt>Finger</dt>
              <dd>{f.finger}</dd>
              <dt>Schläge</dt>
              <dd>
                {f.schlaege === 1 ? '1 Schlag' : `${f.schlaege} Schläge`} pro Tonfeld
              </dd>
              <dt>Weg</dt>
              <dd>{f.weg}</dd>
              <dt>Basis</dt>
              <dd>{f.basis}</dd>
            </dl>
          </section>

          <section className="r15-block" aria-label="Block 2 · Kompositorisches Denken">
            {blockHead('komposition')}
            <VideoSlot
              videoId={day.videos.komposition}
              title={`Tag ${day.number} · Kompositorisches Denken`}
            />
            {rf10Open ? (
              <Link href={`/training/rhythmusfundament/tag/${day.rf10Day}`} className="r15-ref">
                <span className="r15-eyebrow">Grundlage</span>
                <span className="r15-ref-title">
                  RF 1.0 · Tag {day.rf10Day}
                  {rf10 ? ` · ${rf10.title}` : ''} →
                </span>
                <span className="r15-muted">
                  Schau dir das Video dieses Tages noch einmal an, bevor du loslegst.
                </span>
              </Link>
            ) : (
              <div className="r15-ref">
                <span className="r15-eyebrow">Grundlage</span>
                <span className="r15-ref-title">
                  RF 1.0 · Tag {day.rf10Day}
                  {rf10 ? ` · ${rf10.title}` : ''}
                </span>
                <span className="r15-muted">
                  Dieser Tag ist in deinem Rhythmus Fundament 1.0 noch nicht freigeschaltet.
                </span>
              </div>
            )}
          </section>

          <section className="r15-block" aria-label="Block 3 · Muskelgedächtnis">
            {blockHead('muskelgedaechtnis')}
            <VideoSlot
              videoId={day.videos.muskelgedaechtnis}
              title={`Tag ${day.number} · Muskelgedächtnis`}
            />
          </section>

          <DayCheck
            day={day.number}
            done={completed.has(day.number)}
            action={toggleRf15DayAction}
          />

          <nav className="r15-strip" aria-label="Alle Tage">
            {RF15_DAYS.map((d) => {
              const locked = d.number > access.maxUnlockedDay
              const cls =
                d.number === day.number
                  ? 'is-current'
                  : locked
                    ? 'is-locked'
                    : completed.has(d.number)
                      ? 'is-done'
                      : ''
              return locked ? (
                <span key={d.number} className={cls} aria-disabled="true">
                  {d.number}
                </span>
              ) : (
                <Link
                  key={d.number}
                  href={`/training/rhythmusfundament-1-5/tag/${d.number}`}
                  className={cls}
                  aria-current={d.number === day.number ? 'page' : undefined}
                >
                  {d.number}
                </Link>
              )
            })}
          </nav>

          <nav className="r15-nav" aria-label="Tag-Navigation">
            {prevNum ? (
              <Link href={`/training/rhythmusfundament-1-5/tag/${prevNum}`}>
                ← Tag {prevNum}
              </Link>
            ) : null}
            {nextNum && !nextLocked ? (
              <Link
                href={`/training/rhythmusfundament-1-5/tag/${nextNum}`}
                className="r15-nav-next"
              >
                Tag {nextNum} →
              </Link>
            ) : nextNum ? (
              <div className="r15-nav-next r15-nav-locked">
                🔒 Tag {nextNum}
                {nextUnlockLabel ? ` · frei ab ${nextUnlockLabel}` : ''}
              </div>
            ) : null}
          </nav>
        </div>
      </main>
    </>
  )
}
