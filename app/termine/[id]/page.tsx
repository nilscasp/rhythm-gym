import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { currentLocale, getMessages } from '../../../messages/server'
import { localizeHref } from '../../lib/locale'
import { createClient } from '../../lib/supabase/server'
import {
  QUESTION_MAX_LENGTH,
  canAskQuestion,
  eventTimeLabel,
  formatEventDate,
  hasEventAccess,
  isEventKind,
  isUpcoming,
  localized,
  recordingGate,
  type RecordingGate,
} from '../../lib/event-access'
import { getProgramAccessMap } from '../../lib/course-access'
import { bunnyEmbedSrc } from '../../lib/bunny-embed'
import { BunnyVideoEmbed } from '../../training/rhythmusfundament/_components/BunnyVideoEmbed'
import { withdrawQuestionAction } from '../_actions'
import { QuestionForm } from '../_components/QuestionForm'
import {
  EVENT_COLUMNS,
  currentViewer,
  detailTitle,
  hintFor,
  type Termin,
} from '../_viewer'

// ─────────────────────────────────────────────────────────────────────────────
// /termine/[id] — der einzelne Termin, und die einzige Stelle im Verzeichnis,
// an der die Zoom-Tür überhaupt vorkommt.
//
// Der Weg dorthin ist bewusst schmal: `hasEventAccess` entscheidet nur, OB ein
// Knopf gezeigt wird; die Adresse selbst kommt ausschließlich aus
// `event_zoom_url()` (SECURITY DEFINER, Migration 0006), die ihre Prüfung
// unabhängig noch einmal macht. Wäre die Anzeige-Logik hier je falsch, sähe
// jemand einen Knopf ohne Ziel — durch die Tür käme er trotzdem nicht.
//
// Gibt die Funktion null zurück, obwohl die Person hineindürfte, ist meistens
// schlicht noch kein Link hinterlegt. Darum steht dort ein ruhiger Satz und
// keine Fehlermeldung.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

/**
 * Arten, bei denen es überhaupt einen Raum zu betreten gibt. Ein Kursstart oder
 * ein Retreat hat keine Zoom-Tür — dort wäre „Die Tür öffnet kurz vor Beginn"
 * ein Versprechen, das niemand einlöst.
 */
const ROOM_KINDS = new Set(['live_training', 'qa', 'community'])

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const locale = await currentLocale()
  const supabase = await createClient()

  // Eine ungültige uuid endet hier als Lesefehler, nicht als Absturz.
  const { data } = await supabase
    .from('events')
    .select('title')
    .eq('id', id)
    .maybeSingle()

  return { title: detailTitle(data ? localized(data.title, locale) : '', locale) }
}

export default async function TerminPage({ params }: PageProps) {
  const { id } = await params
  const { locale, t } = await getMessages()
  const supabase = await createClient()
  const viewer = await currentViewer(supabase)

  const { data, error } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[termine] event read failed', {
      id,
      code: error.code,
      message: error.message,
    })
  }
  if (!data) notFound()

  const event = data as Termin
  const access = hasEventAccess(viewer, event)
  const hint = hintFor(access, t)
  const reason = access.canJoin ? null : access.reason
  const kindLabel = isEventKind(event.kind) ? t.events.kinds[event.kind] : null

  // Der einzige Aufruf der Tür-Funktion — und nur, wenn die Anzeige-Logik
  // ohnehin schon zustimmt. Ohne Zugang wird sie gar nicht erst gefragt.
  let zoomUrl: string | null = null
  if (access.canJoin) {
    const { data: url, error: rpcError } = await supabase.rpc('event_zoom_url', {
      p_event_id: id,
    })
    if (rpcError) {
      console.error('[termine] event_zoom_url failed', {
        id,
        code: rpcError.code,
        message: rpcError.message,
      })
    }
    zoomUrl = typeof url === 'string' && url.trim() !== '' ? url : null
  }

  // ── Aufzeichnungen (Abschnitt H) ──────────────────────────────────────────
  // Lektionen in Bibliotheken, die per lessons.event_id an diesem Termin
  // hängen. Gliederung ist öffentlich; ob jemand sie sehen darf, rechnet
  // course-access.ts (getProgramAccessMap = has_program_access). Die Video-ID
  // kommt aus lesson_contents, das RLS ohnehin nur mit Zugang herausgibt.
  const recordings = await loadRecordings(supabase, id, viewer.userId ?? null)

  // ── Frage vorab ───────────────────────────────────────────────────────────
  const upcoming = isUpcoming(event)
  const mayAsk = canAskQuestion(viewer, event)
  let myQuestions: { id: string; body: string; created_at: string }[] = []
  if (viewer.userId && upcoming) {
    // Admin liest per RLS alle Fragen — hier nur die eigenen.
    const { data: rows, error: qError } = await supabase
      .from('event_questions')
      .select('id, body, created_at')
      .eq('event_id', id)
      .eq('user_id', viewer.userId)
      .order('created_at', { ascending: true })
    if (qError) {
      console.error('[termine] own questions read failed', {
        id,
        code: qError.code,
        message: qError.message,
      })
    }
    myQuestions = rows ?? []
  }

  const icsHref = `/termine/${event.id}/kalender.ics${locale === 'en' ? '?lang=en' : ''}`
  const feedHref = `/termine/abo.ics${locale === 'en' ? '?lang=en' : ''}`

  const paragraphs = localized(event.description, locale)
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean)

  return (
    <>
      <style>{TERMIN_CSS}</style>
      <main className="tv-page">
        <div className="tv-wrap">
          <Link href={localizeHref('/termine', locale)} className="tv-back">
            {t.events.back}
          </Link>

          <header className="tv-header">
            {kindLabel ? <p className="tv-tag">{kindLabel}</p> : null}
            <h1 className="tv-title">{localized(event.title, locale)}</h1>
            <p className="tv-when">
              {formatEventDate(event.starts_at, locale)} ·{' '}
              {eventTimeLabel(event, { locale, allDayLabel: t.events.allDay })}
            </p>
            {event.location ? (
              <p className="tv-place">{event.location}</p>
            ) : null}
          </header>

          {paragraphs.length > 0 ? (
            <section className="tv-body">
              {paragraphs.map((text, index) => (
                <p key={index} className="tv-para">
                  {text}
                </p>
              ))}
            </section>
          ) : null}

          <section className="tv-door">
            {access.canJoin ? (
              zoomUrl ? (
                <div className="tv-cta-row">
                  <a
                    href={zoomUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tv-cta tv-cta--primary"
                  >
                    {t.events.door}
                  </a>
                </div>
              ) : event.website_link ? (
                // Kein Raum hinterlegt, aber eine Seite auf handpan.schule:
                // typisch für Kursstarts und Retreats, wo es nichts zu
                // betreten, aber etwas zu lesen gibt.
                <div className="tv-cta-row">
                  <a
                    href={event.website_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tv-cta tv-cta--secondary"
                  >
                    {t.events.moreOnWebsite}
                  </a>
                </div>
              ) : (
                // Nur wenn ein Raum vorgesehen, aber noch nicht eingetragen ist.
                // Ohne Raum und ohne Seite versprechen wir keine Tür.
                ROOM_KINDS.has(event.kind) ? (
                  <p className="tv-muted">{t.events.doorSoon}</p>
                ) : null
              )
            ) : (
              <>
                {hint ? <p className="tv-hint">{hint}</p> : null}

                {reason === 'login' ? (
                  <div className="tv-cta-row">
                    <Link
                      href={localizeHref('/auth/login', locale)}
                      className="tv-cta tv-cta--primary"
                    >
                      {t.events.login}
                    </Link>
                    {/* `localizeHref` präfixt nur den Pfad — die Abfrage wird
                        danach angehängt, sonst zählte sie als Teil des Pfads. */}
                    <Link
                      href={`${localizeHref('/auth/login', locale)}?mode=signup`}
                      className="tv-cta tv-cta--secondary"
                    >
                      {t.events.freeAccount}
                    </Link>
                  </div>
                ) : null}

                {reason === 'premium' || reason === 'vip' ? (
                  <p className="tv-muted">{t.events.circleOpens}</p>
                ) : null}

                {reason === 'program' ? (
                  <div className="tv-cta-row">
                    <Link
                      href={localizeHref('/training', locale)}
                      className="tv-cta tv-cta--primary"
                    >
                      {t.events.toCourses}
                    </Link>
                  </div>
                ) : null}
              </>
            )}
          </section>

          {recordings.length > 0 ? (
            <section className="tv-section" aria-labelledby="tv-rec-title">
              <h2 id="tv-rec-title" className="tv-section-title">
                {t.events.recordingTitle}
              </h2>
              {recordings.map((rec) => (
                <div key={rec.lessonId} className="tv-rec">
                  <p className="tv-rec-name">{rec.title}</p>
                  {rec.gate.canWatch ? (
                    <>
                      {rec.videoGuid ? (
                        <BunnyVideoEmbed src={bunnyEmbedSrc(rec.videoGuid)} title={rec.title} />
                      ) : null}
                      <Link
                        href={localizeHref(`/training/${rec.programSlug}/${rec.lessonSlug}`, locale)}
                        className="tv-link"
                      >
                        {t.events.recordingOpen} · {rec.programTitle}
                      </Link>
                    </>
                  ) : (
                    <p className="tv-hint">{recordingHint(rec.gate, t)}</p>
                  )}
                </div>
              ))}
            </section>
          ) : null}

          {upcoming && (mayAsk || myQuestions.length > 0) ? (
            <section className="tv-section" aria-labelledby="tv-q-title">
              <h2 id="tv-q-title" className="tv-section-title">
                {t.events.questionTitle}
              </h2>
              <p className="tv-muted">{t.events.questionIntro}</p>

              {myQuestions.length > 0 ? (
                <ul className="tv-q-list" aria-label={t.events.questionMine}>
                  {myQuestions.map((q) => (
                    <li key={q.id} className="tv-q-item">
                      <p className="tv-q-body">{q.body}</p>
                      <form action={withdrawQuestionAction}>
                        <input type="hidden" name="question_id" value={q.id} />
                        <input type="hidden" name="event_id" value={event.id} />
                        <button type="submit" className="tv-q-withdraw">
                          {t.events.questionWithdraw}
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : null}

              {mayAsk ? (
                <QuestionForm
                  eventId={event.id}
                  maxLength={QUESTION_MAX_LENGTH}
                  texts={{
                    placeholder: t.events.questionPlaceholder,
                    submit: t.events.questionSubmit,
                    sent: t.events.questionSent,
                    invalid: t.events.questionInvalid,
                    limit: t.events.questionLimit,
                    closed: t.events.questionClosed,
                    error: t.events.questionError,
                  }}
                />
              ) : null}
            </section>
          ) : null}

          {upcoming ? (
            <section className="tv-section">
              <div className="tv-cta-row">
                <a href={icsHref} className="tv-cta tv-cta--secondary" download>
                  {t.events.addToCalendar}
                </a>
                <a href={feedHref} className="tv-link tv-link--quiet">
                  {t.events.subscribeFeed}
                </a>
              </div>
              <p className="tv-muted tv-small">{t.events.calendarNote}</p>
            </section>
          ) : null}
        </div>
      </main>
    </>
  )
}

// ── Aufzeichnungen laden ─────────────────────────────────────────────────────

type Recording = {
  lessonId: string
  lessonSlug: string
  title: string
  programSlug: string
  programTitle: string
  gate: RecordingGate
  /** Nur gesetzt, wenn gate.canWatch — und nur, wenn RLS sie herausgibt. */
  videoGuid: string | null
}

async function loadRecordings(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  userId: string | null,
): Promise<Recording[]> {
  const { data: lessons, error } = await supabase
    .from('lessons')
    .select('id, slug, title, program_id, published_at')
    .eq('event_id', eventId)
    .not('published_at', 'is', null)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[termine] recordings read failed', {
      eventId,
      code: error.code,
      message: error.message,
    })
    return []
  }
  if (!lessons || lessons.length === 0) return []

  const programIds = [...new Set(lessons.map((l) => l.program_id))]
  const { data: programs } = await supabase
    .from('programs')
    .select('id, slug, title, included_in_plan, published_at')
    .in('id', programIds)

  // Nur veröffentlichte Bibliotheken zählen; der Rest bleibt unsichtbar.
  const programById = new Map(
    (programs ?? []).filter((p) => p.published_at).map((p) => [p.id, p] as const),
  )
  const accessMap = userId
    ? (await getProgramAccessMap(supabase, userId, [...programById.values()], () => 366)).access
    : new Map()

  const result: Recording[] = []
  for (const lesson of lessons) {
    const program = programById.get(lesson.program_id)
    if (!program) continue
    const gate = recordingGate(
      { isAuthenticated: userId !== null },
      accessMap.get(program.id),
      program.included_in_plan,
    )
    result.push({
      lessonId: lesson.id,
      lessonSlug: lesson.slug,
      title: lesson.title,
      programSlug: program.slug,
      programTitle: program.title,
      gate,
      videoGuid: null,
    })
  }

  // Video-IDs nur für die Lektionen, die die Person sehen darf.
  const watchable = result.filter((r) => r.gate.canWatch).map((r) => r.lessonId)
  if (watchable.length > 0) {
    const { data: contents, error: cError } = await supabase
      .from('lesson_contents')
      .select('lesson_id, video_guid')
      .in('lesson_id', watchable)
    if (cError) {
      console.error('[termine] recording contents read failed', {
        eventId,
        code: cError.code,
        message: cError.message,
      })
    }
    const guidByLesson = new Map((contents ?? []).map((c) => [c.lesson_id, c.video_guid] as const))
    for (const r of result) {
      if (r.gate.canWatch) r.videoGuid = guidByLesson.get(r.lessonId) ?? null
    }
  }

  return result
}

function recordingHint(
  gate: RecordingGate,
  t: Awaited<ReturnType<typeof getMessages>>['t'],
): string {
  if (gate.canWatch) return ''
  switch (gate.reason) {
    case 'login':
      return t.events.recordingLogin
    case 'premium':
      return t.events.recordingCircle
    case 'vip':
      return t.events.recordingVip
    case 'program':
      return t.events.recordingProgram
  }
}

const TERMIN_CSS = `
  .tv-page {
    min-height: 100vh;
    min-height: 100dvh;
    background: var(--black);
    color: var(--cream);
    padding: 40px 20px 96px;
    font-family: var(--font-body);
  }
  .tv-wrap {
    max-width: 720px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 28px;
    min-width: 0;
  }

  .tv-back {
    align-self: flex-start;
    font-family: var(--font-ui);
    font-size: 14px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--muted2);
    text-decoration: none;
    padding: 4px 0;
    transition: color 0.15s;
  }
  .tv-back:hover {
    color: var(--amber);
  }

  .tv-header {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }
  .tv-tag {
    margin: 0;
    align-self: flex-start;
    font-family: var(--font-ui);
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--amber);
    border: 1px solid var(--border2);
    border-radius: 999px;
    padding: 3px 12px;
  }
  .tv-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(30px, 6.5vw, 44px);
    letter-spacing: 1.2px;
    line-height: 1.08;
    color: var(--cream);
    overflow-wrap: anywhere;
  }
  .tv-when {
    margin: 0;
    font-family: var(--font-ui);
    font-size: 17px;
    letter-spacing: 0.5px;
    color: var(--amber);
    overflow-wrap: anywhere;
  }
  .tv-place {
    margin: 0;
    font-size: 16px;
    line-height: 1.5;
    color: var(--muted2);
    overflow-wrap: anywhere;
  }

  .tv-body {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
  }
  .tv-para {
    margin: 0;
    font-size: 17px;
    line-height: 1.65;
    color: var(--muted2);
    max-width: 62ch;
    overflow-wrap: anywhere;
  }

  .tv-door {
    border-top: 1px solid var(--border);
    padding-top: 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
  }
  .tv-hint,
  .tv-muted {
    margin: 0;
    font-size: 16px;
    line-height: 1.6;
    color: var(--muted);
    max-width: 56ch;
  }
  .tv-hint {
    color: var(--muted2);
  }

  .tv-cta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    min-width: 0;
  }
  .tv-cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 48px;
    padding: 14px 22px;
    border-radius: 2px;
    font-family: var(--font-ui);
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    text-decoration: none;
    transition: background-color 0.15s, border-color 0.15s, color 0.15s;
  }
  .tv-cta--primary {
    background: var(--amber);
    color: var(--black);
    border: 1px solid var(--amber);
  }
  .tv-cta--primary:hover {
    background: var(--amber2);
    border-color: var(--amber2);
  }
  .tv-cta--secondary {
    background: transparent;
    color: var(--cream);
    border: 1px solid var(--border2);
  }
  .tv-cta--secondary:hover {
    border-color: var(--amber);
    color: var(--amber);
  }

  .tv-section {
    border-top: 1px solid var(--border);
    padding-top: 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
  }
  .tv-section-title {
    margin: 0;
    font-family: var(--font-ui);
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .tv-small {
    font-size: 14px;
  }
  .tv-link {
    align-self: flex-start;
    font-family: var(--font-ui);
    font-size: 15px;
    color: var(--cream);
    text-decoration: underline;
    text-underline-offset: 3px;
    overflow-wrap: anywhere;
  }
  .tv-link:hover {
    color: var(--amber);
  }
  .tv-link--quiet {
    align-self: center;
    color: var(--muted2);
  }
  .tv-rec {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }
  .tv-rec-name {
    margin: 0;
    font-size: 17px;
    color: var(--cream);
    overflow-wrap: anywhere;
  }
  .tv-q-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }
  .tv-q-input {
    width: 100%;
    box-sizing: border-box;
    min-height: 112px;
    padding: 12px 14px;
    background: transparent;
    color: var(--cream);
    border: 1px solid var(--border2);
    border-radius: 2px;
    font-family: var(--font-body);
    font-size: 16px;
    line-height: 1.5;
    resize: vertical;
  }
  .tv-q-input:focus {
    outline: none;
    border-color: var(--amber);
  }
  .tv-q-note {
    margin: 0;
    font-size: 15px;
    color: var(--muted2);
  }
  .tv-q-note--ok {
    color: var(--amber);
  }
  .tv-q-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .tv-q-item {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    justify-content: space-between;
    border: 1px solid var(--border);
    border-radius: 2px;
    padding: 12px 14px;
    min-width: 0;
  }
  .tv-q-body {
    margin: 0;
    font-size: 16px;
    line-height: 1.5;
    color: var(--cream);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    min-width: 0;
  }
  .tv-q-withdraw {
    flex-shrink: 0;
    background: none;
    border: none;
    padding: 4px 0;
    min-height: 32px;
    font-family: var(--font-ui);
    font-size: 13px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--muted2);
    cursor: pointer;
  }
  .tv-q-withdraw:hover {
    color: var(--amber);
  }

  /* Mobil (iPhone 390x844 ist die Pflichtprobe): Knoepfe voll breit,
     nichts laeuft ueber den Rand. */
  @media (max-width: 480px) {
    .tv-page {
      padding: 28px 14px 80px;
    }
    .tv-wrap {
      gap: 24px;
    }
    .tv-when {
      font-size: 16px;
    }
    .tv-para {
      font-size: 16px;
    }
    .tv-cta-row {
      flex-direction: column;
      align-items: stretch;
    }
    .tv-cta {
      width: 100%;
    }
  }
`
