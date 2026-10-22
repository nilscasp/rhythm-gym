import Link from 'next/link'
import { Check, Lock } from 'lucide-react'
import { durationLabel, type RoomSection } from './load'

// Gliederung eines Kurses: Abschnitte mit Lektionsliste. Wird im Kursraum
// (voll) und in der Seitenleiste der Lektion (kompakt) benutzt.

export function CourseOutline({
  baseHref,
  sections,
  completed,
  currentLessonId,
  showProgress,
  compact = false,
}: {
  baseHref: string
  sections: RoomSection[]
  completed: ReadonlySet<string>
  currentLessonId?: string
  showProgress: boolean
  compact?: boolean
}) {
  return (
    <div className={compact ? 'co co--compact' : 'co'}>
      {sections.map((section, si) => (
        <section key={section.id ?? `s-${si}`} className="co-section">
          {section.title ? <h2 className="co-section-title">{section.title}</h2> : null}
          <ol className="co-list">
            {section.lessons.map((lesson) => {
              const done = showProgress && completed.has(lesson.id)
              const current = lesson.id === currentLessonId
              const meta = [lesson.subtitle, durationLabel(lesson.duration_seconds)]
                .filter(Boolean)
                .join(' · ')
              const marker = (
                <span
                  className={done ? 'co-mark co-mark--done' : 'co-mark'}
                  aria-hidden="true"
                >
                  {done ? <Check size={14} strokeWidth={2} /> : !lesson.unlocked ? <Lock size={13} strokeWidth={1.5} /> : null}
                </span>
              )
              const body = (
                <>
                  {marker}
                  <span className="co-text">
                    <span className="co-title">
                      {lesson.title}
                      {!lesson.published_at ? <span className="co-draft"> · Entwurf</span> : null}
                    </span>
                    {!compact && meta ? <span className="co-meta">{meta}</span> : null}
                    {!lesson.unlocked && lesson.unlockLabel ? (
                      <span className="co-meta">Frei ab {lesson.unlockLabel}</span>
                    ) : null}
                  </span>
                  <span className="sr-only">
                    {done ? ' (geübt)' : !lesson.unlocked ? ' (gesperrt)' : ''}
                  </span>
                </>
              )
              const className = [
                'co-row',
                current ? 'co-row--current' : '',
                lesson.unlocked ? '' : 'co-row--locked',
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <li key={lesson.id}>
                  {lesson.unlocked ? (
                    <Link
                      href={`${baseHref}/${lesson.slug}`}
                      className={className}
                      aria-current={current ? 'page' : undefined}
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className={className}>{body}</div>
                  )}
                </li>
              )
            })}
          </ol>
        </section>
      ))}
      <style>{OUTLINE_CSS}</style>
    </div>
  )
}

const OUTLINE_CSS = `
  .co { display: flex; flex-direction: column; gap: 28px; }
  .co--compact { gap: 18px; }
  .co-section { display: flex; flex-direction: column; gap: 6px; }
  .co-section-title {
    margin: 0 0 4px;
    font-family: var(--font-display);
    font-weight: 300;
    font-size: 22px;
    line-height: 1.2;
    color: var(--cream);
  }
  .co--compact .co-section-title {
    font-family: var(--font-ui);
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
  }
  .co-list { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--border); }
  .co-row {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    min-height: 52px;
    padding: 12px 4px;
    border-bottom: 1px solid var(--border);
    color: var(--text);
    text-decoration: none;
  }
  .co--compact .co-row { min-height: 44px; padding: 10px 2px; gap: 10px; }
  a.co-row:hover .co-title { color: var(--amber); }
  a.co-row:focus-visible { outline: 2px solid var(--amber); outline-offset: -2px; }
  .co-row--current { background: var(--amber-glow); }
  .co-row--current .co-title { color: var(--amber); }
  .co-row--locked { color: var(--muted); }
  .co-mark {
    flex: 0 0 auto;
    width: 22px;
    height: 22px;
    margin-top: 1px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border2);
    border-radius: 50%;
    color: var(--muted);
  }
  .co-mark--done { border-color: var(--amber); background: var(--amber); color: var(--black); }
  .co-text { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .co-title { font-family: var(--font-body); font-size: 17px; line-height: 1.35; overflow-wrap: anywhere; }
  .co--compact .co-title { font-size: 15px; }
  .co-meta { font-family: var(--font-ui); font-size: 13px; color: var(--muted); }
  .co-draft { font-family: var(--font-ui); font-size: 12px; color: var(--muted); }
  .sr-only {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
  }
`
