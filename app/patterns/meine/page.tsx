import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '../../lib/supabase/server'
import type { Database } from '../../lib/supabase/database.types'
import { PatternsTabBar } from '../_components/PatternsTabBar'
import { PatternCardActions } from './PatternCardActions'

export const metadata = {
  title: 'Meine Patterns — Rhythm Gym',
  description: 'Deine persönliche Pattern-Bibliothek — alles, was du im Tool gespeichert hast.',
}

type SavedPatternRow = Pick<
  Database['public']['Tables']['saved_patterns']['Row'],
  'id' | 'name' | 'notation' | 'bpm' | 'handsatz' | 'subdivision' | 'tags' | 'notes' | 'is_public' | 'created_at'
>

export default async function MeinePatternsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data } = await supabase
    .from('saved_patterns')
    .select('id, name, notation, bpm, handsatz, subdivision, tags, notes, is_public, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const patterns: SavedPatternRow[] = (data as SavedPatternRow[] | null) ?? []

  return (
    <>
      <style>{MEINE_CSS}</style>

      <main className="meine-page">
        <div className="meine-wrap">
          <header className="meine-head">
            <div className="meine-eyebrow">Pattern-Welt</div>
            <h1>
              <em>PATTERNS</em>
            </h1>
            <p className="meine-sub">
              Kurse zum Beitreten, eine kuratierte Bibliothek zum Stöbern, und deine eigene
              Pattern-Werkbank — alles unter einem Dach.
            </p>
          </header>

          <PatternsTabBar active="meine" />

          <section className="meine-section-head">
            <div className="meine-eyebrow">Deine Werkbank</div>
            <h2 className="meine-section-title">MEINE PATTERNS</h2>
            <p className="meine-section-sub">
              {patterns.length === 0
                ? 'Hier landen Patterns, die du im Tool speicherst.'
                : `${patterns.length} ${patterns.length === 1 ? 'Pattern' : 'Patterns'} in deiner Bibliothek. Neueste zuerst.`}
            </p>
          </section>

          {patterns.length === 0 ? (
            <div className="meine-empty">
              <p>
                Noch leer. Bau dir eines im{' '}
                <Link href="/tool" className="meine-inline-link">
                  Tool
                </Link>
                {' '}und klick „💾 Speichern" — alle deine Ideen landen dann hier.
              </p>
            </div>
          ) : (
            <div className="meine-grid">
              {patterns.map((sp) => {
                const toolHref = (() => {
                  const params = new URLSearchParams({
                    pattern: sp.notation,
                    bpm: String(sp.bpm ?? 60),
                    handsatz: sp.handsatz ?? 'frei',
                    subdivision: sp.subdivision ?? '16n',
                    from: 'meine',
                    label: sp.name,
                  })
                  return `/tool?${params.toString()}`
                })()
                const cells = sp.notation.split('')
                return (
                  <article key={sp.id} className="meine-card">
                    <header className="meine-card-head">
                      <h3 className="meine-card-title">{sp.name}</h3>
                      <span className="meine-card-meta">
                        {sp.bpm ?? 60} BPM · {sp.handsatz ?? 'frei'}
                      </span>
                    </header>
                    <div className="meine-card-mini" aria-hidden="true">
                      {cells.map((c, i) => (
                        <span
                          key={i}
                          className={`meine-cell meine-cell--${c === '.' ? 'rest' : c}${i % 4 === 0 ? ' meine-cell--downbeat' : ''}`}
                        />
                      ))}
                    </div>
                    {sp.notes && <p className="meine-card-notes">{sp.notes}</p>}
                    {sp.tags && sp.tags.length > 0 && (
                      <div className="meine-card-tags">
                        {sp.tags.map((t) => (
                          <span key={t} className="meine-tag">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="meine-card-foot">
                      <Link href={toolHref} className="meine-card-open">
                        Im Tool öffnen →
                      </Link>
                      <PatternCardActions patternId={sp.id} currentName={sp.name} />
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          <aside className="meine-future">
            <div className="meine-future-tag">Bald</div>
            <p>
              Tags-Filter, Suche, Umbenennen + Löschen direkt auf der Karte. Erstmal bauen wir
              das Speichern und Wiederfinden solide.
            </p>
          </aside>
        </div>
      </main>
    </>
  )
}

const MEINE_CSS = `
  .meine-page {
    min-height: 100vh;
    background: var(--black);
    color: var(--cream);
    padding: 56px 24px 96px;
    font-family: var(--font-body);
  }
  .meine-wrap {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .meine-head { margin-bottom: 32px; }
  .meine-eyebrow {
    font-family: var(--font-ui);
    font-size: 12px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--amber);
    margin-bottom: 12px;
  }
  .meine-head h1 {
    font-family: var(--font-display);
    font-size: clamp(36px, 5vw, 56px);
    line-height: 1;
    color: var(--cream);
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .meine-head h1 em { font-style: normal; color: var(--amber); }
  .meine-sub {
    margin: 16px 0 0;
    color: var(--muted);
    font-size: 15px;
    line-height: 1.65;
    max-width: 640px;
  }

  .meine-section-head { margin-bottom: 20px; }
  .meine-section-title {
    font-family: var(--font-display);
    font-size: clamp(24px, 3vw, 32px);
    line-height: 1;
    color: var(--cream);
    margin: 6px 0 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .meine-section-sub {
    margin: 12px 0 0;
    color: var(--muted);
    font-size: 14px;
    line-height: 1.6;
    max-width: 640px;
  }

  .meine-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
  }
  .meine-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: border-color 0.15s ease, transform 0.15s ease;
  }
  .meine-card:hover {
    border-color: var(--amber);
    transform: translateY(-2px);
  }
  .meine-card-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
  }
  .meine-card-title {
    font-family: var(--font-display);
    font-size: 18px;
    color: var(--cream);
    margin: 0;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    line-height: 1.1;
  }
  .meine-card-meta {
    font-family: var(--font-ui);
    font-size: 11px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--muted);
    white-space: nowrap;
  }
  .meine-card-mini {
    display: grid;
    grid-template-columns: repeat(16, 1fr);
    gap: 2px;
    height: 32px;
  }
  .meine-cell {
    display: block;
    border-radius: 1px;
    background: var(--border);
    opacity: 0.5;
  }
  .meine-cell--downbeat { border-left: 1px solid var(--amber); }
  .meine-cell--rest { background: var(--border); opacity: 0.25; }
  .meine-cell--g { background: var(--muted); opacity: 0.55; }
  .meine-cell--T { background: #9CA98A; opacity: 0.85; }
  .meine-cell--S { background: var(--amber); opacity: 0.95; }
  .meine-cell--D { background: var(--cream); opacity: 0.9; }

  .meine-card-notes {
    margin: 0;
    color: var(--text);
    font-size: 13px;
    line-height: 1.5;
    font-style: italic;
  }
  .meine-card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .meine-tag {
    font-family: var(--font-ui);
    font-size: 10px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--muted);
    padding: 2px 8px;
    border: 1px solid var(--border);
    border-radius: 2px;
  }
  .meine-card-foot {
    margin-top: auto;
    padding-top: 10px;
    border-top: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .meine-card-open {
    font-family: var(--font-ui);
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--amber);
    text-decoration: none;
    transition: color 0.15s ease;
  }
  .meine-card-open:hover { color: var(--cream); }

  .meine-card-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .meine-action {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted);
    font-family: var(--font-ui);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    padding: 5px 10px;
    border-radius: 3px;
    cursor: pointer;
    transition: color 0.15s ease, border-color 0.15s ease;
  }
  .meine-action:hover { color: var(--cream); border-color: var(--cream); }
  .meine-action--delete:hover { color: var(--warm); border-color: var(--warm); }
  .meine-action:disabled { opacity: 0.5; cursor: progress; }
  .meine-action-error {
    font-size: 11px;
    color: var(--warm);
    margin-left: 6px;
  }

  @media (max-width: 480px) {
    .meine-card-foot { gap: 8px; }
    .meine-action { padding: 6px 12px; font-size: 11px; }
  }

  .meine-empty {
    background: var(--card);
    border: 1px dashed var(--border);
    border-radius: 10px;
    padding: 40px;
    text-align: center;
    color: var(--muted);
  }
  .meine-inline-link {
    color: var(--amber);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .meine-future {
    margin-top: 40px;
    border: 1px dashed var(--border);
    border-radius: 10px;
    padding: 20px;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.6;
  }
  .meine-future-tag {
    font-family: var(--font-ui);
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--amber);
    margin-bottom: 6px;
  }

  @media (max-width: 480px) {
    .meine-page { padding: 40px 16px 80px; }
    .meine-card { padding: 16px; }
  }
`
