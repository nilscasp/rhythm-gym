import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { RHYTHMUS_DAYS } from '../../data/rhythmusfundament-days'
import { BunnyVideoEmbed } from '../training/rhythmusfundament/_components/BunnyVideoEmbed'
import { DayPlayer } from '../training/rhythmusfundament/_components/DayPlayer'
import { MarkdownBody } from '../training/rhythmusfundament/_components/MarkdownBody'

// ─────────────────────────────────────────────────────────────────────────────
// /tag-1 — der geschenkte erste Tag (Lead-Magnet, Plan §3, Idee A).
//
// Öffentlich erreichbar (PUBLIC_PATHS in app/lib/supabase/middleware.ts) und
// bewusst `noindex, nofollow`: die Seite ist das Geschenk hinter dem
// Brief-Eintrag, kein Suchmaschinen-Futter. Sie zeigt denselben Tag wie
// /training/rhythmusfundament/tag/1 — Video, Text, Übung — nur ohne Konto,
// ohne Einschreibung, ohne Fortschritt.
//
// Alles kommt aus denselben Quellen wie der Kurs selbst:
//   - Metadaten + Bunny-GUID: data/rhythmusfundament-days.ts (nie kopiert)
//   - Text: content/rhythmusfundament/tag-1.md
//   - Video: BunnyVideoEmbed · Text: MarkdownBody · Übung: DayPlayer
// Der DayPlayer ist eine reine Client-Komponente (Tone.js, kein Supabase, kein
// Schreiben) — er läuft deshalb auch ohne Sitzung. Ohne `pitchMap` klingt er im
// A4/C2-Default, genau wie für Eingeloggte ohne gewähltes Instrument.
// ─────────────────────────────────────────────────────────────────────────────

const DAY_NUMBER = 1

export const metadata: Metadata = {
  title: 'Dein erster Tag — Handpan Schule des Lebens',
  description:
    'So fühlt sich ein Tag im Rhythmus-Fundament an: ein Video, eine Übung, eine Frage für den Weg.',
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams: Promise<{ bestaetigt?: string }>
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
      console.warn('[tag-1] Markdown nicht gefunden:', file)
    }
    return null
  }
}

export default async function Tag1Page({ searchParams }: PageProps) {
  const { bestaetigt } = await searchParams
  const day = RHYTHMUS_DAYS.find((d) => d.number === DAY_NUMBER)
  if (!day) notFound()

  const markdown = await readDayMarkdown(day.number)
  const justConfirmed = bestaetigt === '1'

  return (
    <>
      <style>{TAG1_CSS}</style>
      <main className="t1-page">
        <div className="t1-wrap">
          {justConfirmed ? (
            <p className="t1-banner" role="status">
              Danke, deine Adresse ist bestätigt. Der erste Brief kommt in den
              nächsten Minuten.
            </p>
          ) : null}

          <header className="t1-header">
            <p className="t1-eyebrow">Dein erster Tag, geschenkt</p>
            <h1 className="t1-title">{day.title}</h1>
            <p className="t1-intro">
              So fühlt sich ein Tag im Rhythmus-Fundament an: ein Video, eine
              Übung, eine Frage für den Weg.
            </p>
          </header>

          {day.videoId ? (
            <section className="t1-video" aria-label="Video zu Tag 1">
              <BunnyVideoEmbed
                videoId={day.videoId}
                title={`Tag ${day.number} · ${day.title}`}
              />
            </section>
          ) : null}

          <section className="t1-body">
            {markdown ? (
              <MarkdownBody markdown={markdown} />
            ) : (
              <p className="t1-body-missing">
                Der Text zu diesem Tag fehlt gerade. Schreib mir kurz, dann
                schicke ich ihn dir.
              </p>
            )}
          </section>

          <section className="t1-player" aria-label="Übung zu Tag 1">
            <DayPlayer presets={day.presets} dayNumber={day.number} />
          </section>

          <section className="t1-next">
            <h2 className="t1-next-title">Wenn du weitergehen willst</h2>
            <p className="t1-next-text">
              Ein Konto kostet nichts. Es öffnet dir das Werkzeug, die Termine
              und den Weg durch die Schule — in deinem Tempo.
            </p>
            <div className="t1-cta-row">
              <Link href="/auth/login?mode=signup" className="t1-cta t1-cta--primary">
                Kostenloses Konto anlegen
              </Link>
              <Link href="/" className="t1-cta t1-cta--secondary">
                Zur Übersicht
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}

const TAG1_CSS = `
  .t1-page {
    min-height: 100vh;
    min-height: 100dvh;
    background: var(--black);
    color: var(--cream);
    padding: 40px 20px 96px;
    font-family: var(--font-body);
  }
  .t1-wrap {
    max-width: 760px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 32px;
    min-width: 0;
  }

  .t1-banner {
    margin: 0;
    background: var(--amber-dim);
    border: 1px solid var(--amber);
    border-radius: 6px;
    padding: 14px 16px;
    color: var(--cream);
    font-size: 16px;
    line-height: 1.5;
  }

  .t1-header {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .t1-eyebrow {
    margin: 0;
    font-family: var(--font-ui);
    font-size: 13px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .t1-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(32px, 7vw, 48px);
    letter-spacing: 1.5px;
    line-height: 1.05;
    color: var(--cream);
    overflow-wrap: anywhere;
  }
  .t1-intro {
    margin: 0;
    font-size: 17px;
    line-height: 1.6;
    color: var(--muted2);
    max-width: 60ch;
  }

  .t1-video,
  .t1-body,
  .t1-player {
    min-width: 0;
  }
  .t1-body-missing {
    margin: 0;
    color: var(--muted);
    font-style: italic;
  }

  .t1-next {
    border-top: 1px solid var(--border);
    padding-top: 28px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .t1-next-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(24px, 5vw, 32px);
    letter-spacing: 1px;
    line-height: 1.1;
    color: var(--cream);
  }
  .t1-next-text {
    margin: 0;
    font-size: 16px;
    line-height: 1.6;
    color: var(--muted2);
    max-width: 56ch;
  }
  .t1-cta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 6px;
  }
  .t1-cta {
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
  .t1-cta--primary {
    background: var(--amber);
    color: var(--black);
    border: 1px solid var(--amber);
  }
  .t1-cta--primary:hover {
    background: var(--amber2);
    border-color: var(--amber2);
  }
  .t1-cta--secondary {
    background: transparent;
    color: var(--cream);
    border: 1px solid var(--border2);
  }
  .t1-cta--secondary:hover {
    border-color: var(--amber);
    color: var(--amber);
  }

  /* Mobil (iPhone 390×844 ist die Pflichtprobe): eine Spalte, Buttons voll
     breit, nichts läuft über den Rand. */
  @media (max-width: 480px) {
    .t1-page {
      padding: 28px 14px 80px;
    }
    .t1-wrap {
      gap: 26px;
    }
    .t1-intro {
      font-size: 16px;
    }
    .t1-cta-row {
      flex-direction: column;
      align-items: stretch;
    }
    .t1-cta {
      width: 100%;
    }
  }
`
