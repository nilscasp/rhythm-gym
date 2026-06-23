import { promises as fs } from 'node:fs'
import path from 'node:path'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/server'
import { hasCourseAccess } from '../../../../lib/course-access'
import {
  RHYTHMUS_DAYS,
  cycleForDay,
  type RhythmusDay,
} from '../../../../../data/rhythmusfundament-days'
import { DayPlayer } from '../../_components/DayPlayer'
import { rowToHandpan, derivePitchMap, type PitchMap } from '../../../../lib/handpan'
import { MarkdownBody } from '../../_components/MarkdownBody'
import { BunnyVideoEmbed } from '../../_components/BunnyVideoEmbed'

// ─────────────────────────────────────────────────────────────────────────────
// /training/rhythmusfundament/tag/[n] — Server-Component shell.
//
// Reads:
//   1. The Markdown body for this day from content/rhythmusfundament/tag-N.md
//   2. The day metadata + presets from data/rhythmusfundament-days.ts
// Auth-gates first (same as the rest of /training).
// ─────────────────────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  return RHYTHMUS_DAYS.map((d) => ({ n: String(d.number) }))
}

interface PageProps {
  params: Promise<{ n: string }>
}

async function readDayMarkdown(num: number): Promise<string | null> {
  const file = path.join(
    process.cwd(),
    'content',
    'rhythmusfundament',
    `tag-${num}.md`,
  )
  try {
    return await fs.readFile(file, 'utf8')
  } catch {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[rhythmusfundament/tag/${num}] markdown nicht gefunden:`,
        file,
      )
    }
    return null
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { n } = await params
  const num = parseInt(n, 10)
  const day = RHYTHMUS_DAYS.find((d) => d.number === num)
  if (!day) {
    return { title: 'Rhythmus-Fundament · Tag nicht gefunden' }
  }
  return {
    title: `Tag ${day.number} · ${day.title} — Rhythmus-Fundament`,
    description: day.essence,
  }
}

export default async function RhythmusfundamentTagPage({ params }: PageProps) {
  const { n } = await params
  const num = parseInt(n, 10)
  if (!Number.isFinite(num)) notFound()

  const day: RhythmusDay | undefined = RHYTHMUS_DAYS.find(
    (d) => d.number === num,
  )
  if (!day) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Kurs-Gate: ohne Einschreibung zurück zum Hub (gesperrte Karte mit Code-Feld).
  if (!(await hasCourseAccess(supabase, user.id, 'rhythmusfundament'))) {
    redirect('/training')
  }

  const markdown = await readDayMarkdown(day.number)
  const cycle = cycleForDay(day.number)
  const prev = RHYTHMUS_DAYS.find((d) => d.number === day.number - 1)
  const next = RHYTHMUS_DAYS.find((d) => d.number === day.number + 1)

  // Aktives Instrument des Users → Pitch-Map. Damit klingt das Playback in den
  // echten Tönen seines Pans (Fallback A4/C2, wenn keins gewählt).
  let pitchMap: PitchMap | null = null
  const { data: prof } = await supabase
    .from('profiles')
    .select('active_handpan_id')
    .eq('id', user.id)
    .maybeSingle()
  if (prof?.active_handpan_id) {
    const { data: hp } = await supabase
      .from('handpans')
      .select('*')
      .eq('id', prof.active_handpan_id)
      .maybeSingle()
    if (hp) pitchMap = derivePitchMap(rowToHandpan(hp))
  }

  // Optional: graphics gallery — list files in /public/rhythmusfundament/grafiken/tag-N.
  // For now we just read the existence flag from the data file (set during scaffolding).
  const grafiken: string[] = []
  if (day.hasGrafik) {
    try {
      const dir = path.join(
        process.cwd(),
        'public',
        'rhythmusfundament',
        'grafiken',
        `tag-${day.number}`,
      )
      const files = await fs.readdir(dir)
      grafiken.push(
        ...files
          .filter((f) => f.toLowerCase().endsWith('.png'))
          .sort()
          .map((f) => `/rhythmusfundament/grafiken/tag-${day.number}/${f}`),
      )
    } catch {
      // No grafiken for this tag — that's OK.
    }
  }

  // Pick the "overview" graphic if present — that's the canonical hero.
  const overviewGraphic = grafiken.find((p) => p.includes('/overview_'))
  const lowerthirds = grafiken.filter((p) => p.includes('/lowerthird_'))

  return (
    <>
      <style>{TAG_CSS}</style>
      <main className="tag-page">
        <div className="tag-wrap">
          {/* Breadcrumb / cycle pill */}
          <div className="tag-breadcrumb">
            <Link href="/training/rhythmusfundament" className="tag-crumb-link">
              ← Rhythmus-Fundament
            </Link>
            <span className="tag-crumb-divider">·</span>
            <span className="tag-crumb-cycle">
              Zyklus {cycle.number} · {cycle.title}
            </span>
          </div>

          {/* Header */}
          <header className="tag-header">
            <div className="tag-num">TAG {day.number}</div>
            <h1 className="tag-title">{day.title}</h1>
            <p className="tag-subtitle">{day.subtitle}</p>
            {day.essence ? (
              <p className="tag-essence">„{day.essence}"</p>
            ) : null}
          </header>

          {/* Video — wenn dieser Tag eine Bunny-GUID hat, zeigen wir's hier. */}
          {day.videoId ? (
            <section className="tag-video" aria-label="Tages-Video">
              <BunnyVideoEmbed
                videoId={day.videoId}
                title={`Tag ${day.number} · ${day.title}`}
              />
            </section>
          ) : null}

          {/* Two-column layout: text + sticky player on desktop */}
          <div className="tag-layout">
            {/* Markdown body */}
            <section className="tag-body">
              {markdown ? (
                <MarkdownBody markdown={markdown} />
              ) : (
                <p className="tag-body-missing">
                  Markdown für diesen Tag fehlt noch (content/rhythmusfundament/tag-
                  {day.number}.md).
                </p>
              )}

              {/* Grafiken */}
              {overviewGraphic ? (
                <figure className="tag-overview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={overviewGraphic}
                    alt={`Übersicht für Tag ${day.number}`}
                    className="tag-overview-img"
                  />
                </figure>
              ) : null}

              {lowerthirds.length > 0 ? (
                <details className="tag-grafiken">
                  <summary>Pattern-Grafiken ({lowerthirds.length})</summary>
                  <div className="tag-grafiken-grid">
                    {lowerthirds.map((src) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={src}
                        src={src}
                        alt=""
                        className="tag-grafik-img"
                      />
                    ))}
                  </div>
                </details>
              ) : null}
            </section>

            {/* Player column */}
            <aside className="tag-player-col">
              <DayPlayer presets={day.presets} dayNumber={day.number} pitchMap={pitchMap} />
            </aside>
          </div>

          {/* Day navigation */}
          <nav className="tag-nav" aria-label="Tag-Navigation">
            {prev ? (
              <Link
                href={`/training/rhythmusfundament/tag/${prev.number}`}
                className="tag-nav-link tag-nav-link--prev"
              >
                <span className="tag-nav-hint">← Tag {prev.number}</span>
                <span className="tag-nav-title">{prev.title}</span>
              </Link>
            ) : (
              <div className="tag-nav-spacer" />
            )}
            {next ? (
              <Link
                href={`/training/rhythmusfundament/tag/${next.number}`}
                className="tag-nav-link tag-nav-link--next"
              >
                <span className="tag-nav-hint">Tag {next.number} →</span>
                <span className="tag-nav-title">{next.title}</span>
              </Link>
            ) : (
              <div className="tag-nav-spacer" />
            )}
          </nav>
        </div>
      </main>
    </>
  )
}

const TAG_CSS = `
  .tag-page {
    min-height: 100vh;
    background: var(--black);
    color: var(--cream);
    padding: 36px 20px 96px;
    font-family: 'Barlow', sans-serif;
  }
  .tag-wrap {
    max-width: 1180px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  .tag-breadcrumb {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    flex-wrap: wrap;
  }
  .tag-crumb-link {
    color: var(--amber);
    text-decoration: none;
  }
  .tag-crumb-link:hover {
    color: var(--amber2, var(--amber));
  }
  .tag-crumb-divider {
    opacity: 0.5;
  }
  .tag-crumb-cycle {
    color: var(--muted);
  }

  .tag-header {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
  }
  .tag-num {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 13px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .tag-title {
    font-family: 'Anton', sans-serif;
    font-size: clamp(32px, 5vw, 48px);
    letter-spacing: 1.5px;
    line-height: 1.05;
    color: var(--cream);
    margin: 0;
  }
  .tag-subtitle {
    font-size: 15px;
    color: var(--muted2, var(--muted));
    margin: 0;
  }
  .tag-essence {
    font-style: italic;
    font-size: 16px;
    color: var(--cream);
    margin: 8px 0 0;
    max-width: 60ch;
    line-height: 1.5;
  }

  .tag-video {
    margin: 0;
  }
  .tag-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 32px;
  }
  .tag-body {
    display: flex;
    flex-direction: column;
    gap: 24px;
    min-width: 0;
  }
  .tag-body-missing {
    color: var(--muted);
    font-style: italic;
  }

  .tag-overview {
    margin: 0;
    padding: 0;
  }
  .tag-overview-img {
    width: 100%;
    height: auto;
    display: block;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 6px;
  }

  .tag-grafiken {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 14px 16px;
  }
  .tag-grafiken summary {
    cursor: pointer;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .tag-grafiken-grid {
    margin-top: 14px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
  }
  .tag-grafik-img {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 4px;
  }

  .tag-player-col {
    display: flex;
    flex-direction: column;
  }

  .tag-nav {
    margin-top: 24px;
    padding-top: 24px;
    border-top: 1px solid var(--border);
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .tag-nav-link {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 16px 18px;
    color: var(--cream);
    text-decoration: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
    transition: border-color 0.15s, color 0.15s, transform 0.1s;
  }
  .tag-nav-link:hover {
    border-color: var(--amber);
    color: var(--amber);
    transform: translateY(-1px);
  }
  .tag-nav-link--next {
    align-items: flex-end;
    text-align: right;
  }
  .tag-nav-hint {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .tag-nav-title {
    font-family: 'Anton', sans-serif;
    font-size: 16px;
    letter-spacing: 1px;
    line-height: 1.2;
  }
  .tag-nav-spacer {
    /* keep the grid balanced even if only one neighbour exists */
  }

  /* Desktop: side-by-side */
  @media (min-width: 960px) {
    .tag-layout {
      grid-template-columns: minmax(0, 1fr) minmax(360px, 440px);
      gap: 40px;
      align-items: start;
    }
    .tag-player-col {
      position: sticky;
      top: 16px;
      min-width: 0;
    }
  }

  /* Mobile (≤480px) — rhythm-gym Pflicht: 100dvh, font-size ≥16, kein overflow:hidden */
  @media (max-width: 480px) {
    .tag-page {
      padding: 24px 14px 80px;
    }
    .tag-wrap {
      gap: 24px;
    }
    .tag-title {
      font-size: 28px;
    }
    .tag-essence {
      font-size: 15px;
    }
  }
`
