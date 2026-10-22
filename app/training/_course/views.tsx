import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ExternalLink, FileText, MessageCircle } from 'lucide-react'
import { createClient } from '../../lib/supabase/server'
import { progressPercent } from '../../lib/course-progress'
import { toMarkdownBodyDialect } from '../../lib/lesson-markdown'
import { BunnyVideoEmbed } from '../rhythmusfundament/_components/BunnyVideoEmbed'
import { MarkdownBody } from '../rhythmusfundament/_components/MarkdownBody'
import { CourseOutline } from './CourseOutline'
import { LessonCheck } from './LessonCheck'
import { durationLabel, loadCourseRoom, lockedHint, type CourseRoom } from './load'

// ─────────────────────────────────────────────────────────────────────────────
// Kursraum und Lektionsseite für Kurse aus der DB (Migration 0010).
// Design: Schule-Tokens aus app/globals.css ([data-brand="schule"]) — dunkel,
// Gold als einziger Akzent, Fraunces 300 für Überschriften, Spectral im Text,
// Radius 2px, Haarlinien statt Schatten, Touch-Ziele ≥ 44px. Mobil zuerst.
// Auf rhythmgym.io greifen dieselben Variablen mit den Gym-Werten.
// ─────────────────────────────────────────────────────────────────────────────

/** Wohin „Kurs buchen“ führt, solange es keinen Kauf in der App gibt (Abschnitt F). */
const BOOK_URL = 'https://handpan.schule/'

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return { supabase, user }
}

function kicker(room: CourseRoom): string {
  if (room.isLibrary) return 'Bibliothek'
  const n = room.lessons.length
  return n === 1 ? 'Kurs · 1 Lektion' : `Kurs · ${n} Lektionen`
}

function WhatsappButton({ url }: { url: string | null }) {
  if (!url) return null
  return (
    <a href={url} className="cr-btn cr-btn--ghost" target="_blank" rel="noopener noreferrer">
      <MessageCircle size={18} strokeWidth={1.5} aria-hidden="true" />
      Kursgruppe auf WhatsApp
    </a>
  )
}

function LockedPanel({ room }: { room: CourseRoom }) {
  const viaPlan = room.access.includedInPlan !== null
  return (
    <div className="cr-locked" role="note">
      <p className="cr-locked-title">{lockedHint(room.access)}</p>
      <p className="cr-locked-text">
        {viaPlan
          ? 'Die Gliederung siehst du schon. Mit dem passenden Abo öffnen sich alle Lektionen.'
          : 'Die Gliederung siehst du schon. Nach der Buchung öffnen sich die Lektionen hier.'}
      </p>
      <div className="cr-actions">
        {!viaPlan ? (
          <a href={BOOK_URL} className="cr-btn" target="_blank" rel="noopener noreferrer">
            Kurs buchen
          </a>
        ) : null}
        <Link href="/training" className="cr-btn cr-btn--ghost">
          Zugangs-Code einlösen
        </Link>
      </div>
    </div>
  )
}

// ── Kursraum ─────────────────────────────────────────────────────────────────

export async function CourseRoomPage({ slug }: { slug: string }) {
  const { supabase, user } = await requireUser()
  const room = await loadCourseRoom(supabase, user.id, slug)
  if (!room) notFound()
  return <CourseRoomView room={room} />
}

export function CourseRoomView({ room }: { room: CourseRoom }) {
  const baseHref = `/training/${room.program.slug}`
  const showProgress = !room.isLibrary && room.access.hasAccess
  const total = room.lessons.length
  const done = room.lessons.filter((l) => room.completed.has(l.id)).length
  const pct = progressPercent(done, total)

  return (
    <>
      <style>{COURSE_CSS}</style>
      <main className="cr-page">
        <div className="cr-wrap">
          <Link href="/training" className="cr-back">
            ← Deine Kurse
          </Link>

          <header className="cr-head">
            <p className="cr-kicker">{kicker(room)}</p>
            <h1 className="cr-title">{room.program.title}</h1>
            {room.program.description ? (
              <p className="cr-intro">{room.program.description}</p>
            ) : null}
          </header>

          {showProgress && total > 0 ? (
            <div className="cr-progress">
              <div className="cr-bar" aria-hidden="true">
                <span className="cr-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <p className="cr-progress-label">
                {done} von {total} Lektionen geübt · {pct} %
              </p>
            </div>
          ) : null}

          {room.access.hasAccess ? (
            <div className="cr-actions">
              {room.next ? (
                <Link href={`${baseHref}/${room.next.slug}`} className="cr-btn">
                  {done === 0 ? 'Beginnen' : 'Weiter'}: {room.next.title}
                </Link>
              ) : null}
              <WhatsappButton url={room.whatsappUrl} />
            </div>
          ) : (
            <LockedPanel room={room} />
          )}

          {room.lessons.length === 0 ? (
            <p className="cr-muted">Die ersten Lektionen kommen bald.</p>
          ) : (
            <CourseOutline
              baseHref={baseHref}
              sections={room.sections}
              completed={room.completed}
              showProgress={showProgress}
            />
          )}
        </div>
      </main>
    </>
  )
}

// ── Lektion ──────────────────────────────────────────────────────────────────

export async function LessonPage({ slug, lessonSlug }: { slug: string; lessonSlug: string }) {
  const { supabase, user } = await requireUser()
  const room = await loadCourseRoom(supabase, user.id, slug, {
    // „Von Anfang an spielen“ existiert schon und ist ggf. nicht veröffentlicht.
    requirePublished: slug !== 'von-anfang-an-spielen',
  })
  if (!room) notFound()

  const index = room.lessons.findIndex((l) => l.slug === lessonSlug)
  if (index === -1) notFound()
  const lesson = room.lessons[index]
  const baseHref = `/training/${room.program.slug}`

  // Inhalt nur für offene Lektionen holen. RLS hält ihn sonst ohnehin zurück.
  const [contentRes, attachmentsRes] = lesson.unlocked
    ? await Promise.all([
        supabase
          .from('lesson_contents')
          .select('body_md, video_guid')
          .eq('lesson_id', lesson.id)
          .maybeSingle(),
        supabase
          .from('lesson_attachments')
          .select('id, title, kind, url, storage_path')
          .eq('lesson_id', lesson.id)
          .order('sort_order', { ascending: true }),
      ])
    : [null, null]

  if (contentRes?.error || attachmentsRes?.error) {
    console.error('[lesson] content read failed', {
      lesson: lesson.id,
      content: contentRes?.error?.message,
      attachments: attachmentsRes?.error?.message,
    })
  }
  const content = contentRes?.data ?? null
  const attachments = attachmentsRes?.data ?? []
  const markdown = toMarkdownBodyDialect(content?.body_md)

  // Vorige/nächste in Anzeige-Reihenfolge. Bibliothek: „vorige“ = neuere.
  const prev = index > 0 ? room.lessons[index - 1] : null
  const next = index < room.lessons.length - 1 ? room.lessons[index + 1] : null
  const section = room.sections.find((s) => s.lessons.some((l) => l.id === lesson.id))
  const duration = durationLabel(lesson.duration_seconds)
  const showProgress = !room.isLibrary && room.access.hasAccess

  return (
    <>
      <style>{COURSE_CSS}</style>
      <style>{LESSON_CSS}</style>
      <main className="cr-page">
        <div className="lp-shell">
          <div className="lp-main">
            <Link href={baseHref} className="cr-back">
              ← {room.program.title}
            </Link>

            <header className="cr-head">
              <p className="cr-kicker">
                {[section?.title, `Lektion ${index + 1} von ${room.lessons.length}`]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <h1 className="cr-title">{lesson.title}</h1>
              {lesson.subtitle || duration ? (
                <p className="cr-intro">
                  {[lesson.subtitle, duration].filter(Boolean).join(' · ')}
                </p>
              ) : null}
            </header>

            {!room.access.hasAccess ? (
              <LockedPanel room={room} />
            ) : !lesson.unlocked ? (
              <div className="cr-locked" role="note">
                <p className="cr-locked-title">Diese Lektion ist noch nicht offen.</p>
                <p className="cr-locked-text">
                  {lesson.unlockLabel
                    ? `Sie wird am ${lesson.unlockLabel} frei.`
                    : 'Sie wird mit dem Kursverlauf frei.'}
                </p>
              </div>
            ) : (
              <>
                {content?.video_guid ? (
                  <section className="lp-video" aria-label="Video">
                    <BunnyVideoEmbed videoId={content.video_guid} title={lesson.title} />
                  </section>
                ) : null}

                {markdown ? (
                  <section className="lp-body">
                    <MarkdownBody markdown={markdown} />
                  </section>
                ) : null}

                {attachments.length > 0 ? (
                  <section className="lp-files" aria-label="Begleitmaterial">
                    <h2 className="lp-h2">Begleitmaterial</h2>
                    <ul className="lp-file-list">
                      {attachments.map((a) =>
                        a.url ? (
                          <li key={a.id}>
                            <a
                              href={a.url}
                              className="lp-file"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {a.kind === 'pdf' ? (
                                <FileText size={18} strokeWidth={1.5} aria-hidden="true" />
                              ) : (
                                <ExternalLink size={18} strokeWidth={1.5} aria-hidden="true" />
                              )}
                              <span>{a.title}</span>
                            </a>
                          </li>
                        ) : (
                          // TODO(Abschnitt I): storage_path über signierte URL aus
                          // Supabase Storage ausliefern. Bis dahin nur Platzhalter.
                          <li key={a.id}>
                            <span className="lp-file lp-file--pending">
                              <FileText size={18} strokeWidth={1.5} aria-hidden="true" />
                              <span>{a.title} · folgt</span>
                            </span>
                          </li>
                        ),
                      )}
                    </ul>
                  </section>
                ) : null}

                {!room.isLibrary ? (
                  <LessonCheck lessonId={lesson.id} done={room.completed.has(lesson.id)} />
                ) : null}
              </>
            )}

            <nav className="lp-nav" aria-label="Lektionen">
              {prev ? (
                <Link href={`${baseHref}/${prev.slug}`} className="lp-nav-link">
                  <span className="lp-nav-hint">{room.isLibrary ? '← Neuer' : '← Vorige'}</span>
                  <span className="lp-nav-title">{prev.title}</span>
                </Link>
              ) : (
                <span />
              )}
              {next && next.unlocked ? (
                <Link href={`${baseHref}/${next.slug}`} className="lp-nav-link lp-nav-link--next">
                  <span className="lp-nav-hint">{room.isLibrary ? 'Älter →' : 'Nächste →'}</span>
                  <span className="lp-nav-title">{next.title}</span>
                </Link>
              ) : next ? (
                <div className="lp-nav-link lp-nav-link--next lp-nav-link--locked">
                  <span className="lp-nav-hint">Nächste</span>
                  <span className="lp-nav-title">
                    {next.unlockLabel ? `Frei ab ${next.unlockLabel}` : 'Noch gesperrt'}
                  </span>
                </div>
              ) : (
                <span />
              )}
            </nav>
          </div>

          <aside className="lp-aside" aria-label="Kursverlauf">
            <p className="cr-kicker">{room.isLibrary ? 'Alle Aufzeichnungen' : 'Kursverlauf'}</p>
            {showProgress ? (
              <p className="lp-aside-progress">
                {room.lessons.filter((l) => room.completed.has(l.id)).length} von{' '}
                {room.lessons.length} geübt
              </p>
            ) : null}
            <CourseOutline
              baseHref={baseHref}
              sections={room.sections}
              completed={room.completed}
              currentLessonId={lesson.id}
              showProgress={showProgress}
              compact
            />
            <div className="lp-aside-group">
              <WhatsappButton url={room.whatsappUrl} />
            </div>
          </aside>
        </div>
      </main>
    </>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────

const COURSE_CSS = `
  .cr-page {
    min-height: 100vh;
    background: var(--black);
    color: var(--text);
    padding: 24px 16px 96px;
  }
  .cr-wrap { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 28px; }
  .cr-back {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    font-family: var(--font-ui);
    font-size: 14px;
    letter-spacing: 1px;
    color: var(--muted2);
    text-decoration: none;
  }
  .cr-back:hover { color: var(--amber); }
  .cr-head { display: flex; flex-direction: column; gap: 10px; }
  .cr-kicker {
    margin: 0;
    font-family: var(--font-ui);
    font-size: 12px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .cr-title {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 300;
    font-size: clamp(32px, 8vw, 52px);
    line-height: 1.08;
    letter-spacing: -0.01em;
    color: var(--cream);
    overflow-wrap: anywhere;
  }
  .cr-intro {
    margin: 0;
    max-width: 62ch;
    font-family: var(--font-body);
    font-size: 18px;
    line-height: 1.6;
    color: var(--muted2);
  }
  .cr-muted { margin: 0; font-family: var(--font-body); font-size: 16px; color: var(--muted); }
  .cr-progress { display: flex; flex-direction: column; gap: 8px; }
  .cr-bar { height: 2px; background: var(--border2); }
  .cr-bar-fill { display: block; height: 100%; background: var(--amber); }
  .cr-progress-label { margin: 0; font-family: var(--font-ui); font-size: 14px; color: var(--muted2); }
  .cr-actions { display: flex; flex-wrap: wrap; gap: 12px; }
  .cr-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 48px;
    padding: 12px 22px;
    border: 1px solid var(--amber);
    border-radius: 2px;
    background: var(--amber);
    color: var(--black);
    font-family: var(--font-ui);
    font-size: 15px;
    letter-spacing: 0.5px;
    text-decoration: none;
    text-align: center;
  }
  .cr-btn:hover { background: var(--amber2); border-color: var(--amber2); }
  .cr-btn:focus-visible { outline: 2px solid var(--amber); outline-offset: 3px; }
  .cr-btn--ghost { background: transparent; color: var(--amber); border-color: var(--border2); }
  .cr-btn--ghost:hover { background: transparent; border-color: var(--amber); color: var(--amber); }
  .cr-locked {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 20px;
    border: 1px solid var(--border2);
    border-radius: 2px;
  }
  .cr-locked-title {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 300;
    font-size: 24px;
    line-height: 1.2;
    color: var(--cream);
  }
  .cr-locked-text { margin: 0; font-family: var(--font-body); font-size: 16px; line-height: 1.55; color: var(--muted2); }
  @media (max-width: 520px) {
    .cr-actions .cr-btn { flex: 1 1 100%; width: 100%; }
  }
`

const LESSON_CSS = `
  .lp-shell {
    max-width: 1180px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 48px;
  }
  .lp-main { display: flex; flex-direction: column; gap: 28px; min-width: 0; }
  .lp-video .bunny-wrap { border-radius: 2px; border-color: var(--border); background: var(--dark); }
  .lp-body .md-body { font-size: 17px; max-width: 68ch; }
  .lp-body .md-section-head { font-family: var(--font-display); font-weight: 300; font-size: 22px; letter-spacing: 0; text-transform: none; color: var(--cream); }
  .lp-body .md-section-symbol { color: var(--amber); font-size: 14px; }
  .lp-h2 {
    margin: 0 0 8px;
    font-family: var(--font-display);
    font-weight: 300;
    font-size: 22px;
    color: var(--cream);
  }
  .lp-file-list { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--border); }
  .lp-file {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 52px;
    padding: 12px 4px;
    border-bottom: 1px solid var(--border);
    color: var(--text);
    font-family: var(--font-body);
    font-size: 16px;
    text-decoration: none;
  }
  a.lp-file:hover { color: var(--amber); }
  .lp-file svg { color: var(--amber); flex: 0 0 auto; }
  .lp-file--pending { color: var(--muted); }
  .lp-nav { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .lp-nav-link {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-height: 64px;
    padding: 12px 14px;
    border: 1px solid var(--border);
    border-radius: 2px;
    color: var(--text);
    text-decoration: none;
    min-width: 0;
  }
  a.lp-nav-link:hover { border-color: var(--amber); }
  .lp-nav-link--next { text-align: right; }
  .lp-nav-link--locked { color: var(--muted); }
  .lp-nav-hint { font-family: var(--font-ui); font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--amber); }
  .lp-nav-link--locked .lp-nav-hint { color: var(--muted); }
  .lp-nav-title { font-family: var(--font-body); font-size: 15px; line-height: 1.35; overflow-wrap: anywhere; }
  .lp-aside {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding-top: 24px;
    border-top: 1px solid var(--border);
    min-width: 0;
  }
  .lp-aside-progress { margin: 0; font-family: var(--font-ui); font-size: 14px; color: var(--muted2); }
  .lp-aside-group { display: flex; flex-direction: column; gap: 10px; padding-top: 8px; }
  @media (min-width: 960px) {
    .lp-shell { grid-template-columns: minmax(0, 1fr) 320px; }
    .lp-aside {
      position: sticky;
      top: 88px;
      align-self: start;
      max-height: calc(100vh - 110px);
      overflow-y: auto;
      padding-top: 0;
      padding-left: 28px;
      border-top: 0;
      border-left: 1px solid var(--border);
    }
  }
`
