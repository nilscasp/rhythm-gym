import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { createClient } from '../lib/supabase/server'
import type { Database } from '../lib/supabase/database.types'
import { PatternsTabBar } from './_components/PatternsTabBar'

export const metadata = {
  title: 'Kurse — Rhythm Gym',
  description: 'Alle Kurse des Rhythm Gym — Rhythmusfundament, Breaks & Fills und mehr.',
}

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────
type ProgramRow = Pick<
  Database['public']['Tables']['programs']['Row'],
  'id' | 'slug' | 'title' | 'description' | 'level' | 'category' | 'total_exercises' | 'published_at'
>

// ──────────────────────────────────────────────────────────────────────
// Server Action — enroll user in a program
// ──────────────────────────────────────────────────────────────────────
async function enrollAction(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const programId = String(formData.get('program_id') ?? '').trim()
  const programSlug = String(formData.get('program_slug') ?? '').trim()
  if (!programId) return

  await supabase
    .from('enrollments')
    .upsert(
      { user_id: user.id, program_id: programId, status: 'active' },
      { onConflict: 'user_id,program_id', ignoreDuplicates: true }
    )

  revalidatePath('/patterns')
  revalidatePath('/training')

  // After joining, send the user straight into that course's training space.
  if (programSlug) {
    redirect(`/training/${programSlug}`)
  } else {
    redirect('/training')
  }
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────
function levelLabel(level: string | null | undefined): string {
  if (!level) return 'OFFEN'
  const v = level.toLowerCase()
  if (v.startsWith('anf')) return 'ANFÄNGER'
  if (v.startsWith('mit')) return 'MITTEL'
  if (v.startsWith('fort')) return 'FORTGESCHRITTEN'
  return level.toUpperCase()
}

function categoryLabel(category: string | null | undefined): string {
  if (!category) return ''
  return category.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ──────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────
export default async function PatternsKursePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Load all published programs + the user's existing enrollments in parallel.
  const [programsRes, enrollmentsRes] = await Promise.all([
    supabase
      .from('programs')
      .select('id, slug, title, description, level, category, total_exercises, published_at')
      .not('published_at', 'is', null)
      .order('level', { ascending: true })
      .order('title', { ascending: true }),
    supabase.from('enrollments').select('program_id').eq('user_id', user.id),
  ])

  const programs: ProgramRow[] = (programsRes.data as ProgramRow[] | null) ?? []
  const enrolledProgramIds = new Set(
    (enrollmentsRes.data ?? []).map((e) => e.program_id as string)
  )

  return (
    <>
      <style>{KURSE_CSS}</style>

      <main className="kurse-page">
        <div className="kurse-wrap">
          <header className="kurse-head">
            <div className="kurse-eyebrow">Pattern-Welt</div>
            <h1>
              <em>PATTERNS</em>
            </h1>
            <p className="kurse-sub">
              Kurse zum Beitreten, eine kuratierte Bibliothek zum Stöbern, und deine eigene
              Pattern-Werkbank — alles unter einem Dach.
            </p>
          </header>

          <PatternsTabBar active="kurse" />

          <section className="kurse-section-head">
            <div className="kurse-eyebrow">Kurs-Katalog</div>
            <h2 className="kurse-section-title">DEINE KURSE</h2>
            <p className="kurse-section-sub">
              Klick auf einen Kurs, um dich einzuschreiben — danach landet er in deinem
              Training-Hub.
            </p>
          </section>

          {programs.length === 0 ? (
            <div className="kurse-empty">
              <p>Noch keine Kurse veröffentlicht. Schau bald wieder vorbei.</p>
            </div>
          ) : (
            <div className="kurse-grid">
              {programs.map((p) => {
                const isEnrolled = enrolledProgramIds.has(p.id)
                return (
                  <article key={p.id} className="kurse-card">
                    <div className="kurse-card-top">
                      <span className="kurse-chip">{levelLabel(p.level)}</span>
                      {p.category && (
                        <span className="kurse-chip kurse-chip--ghost">
                          {categoryLabel(p.category)}
                        </span>
                      )}
                    </div>
                    <h2 className="kurse-card-title">{p.title}</h2>
                    {p.description && <p className="kurse-card-desc">{p.description}</p>}
                    <div className="kurse-card-meta">
                      {typeof p.total_exercises === 'number' && p.total_exercises > 0 && (
                        <span>{p.total_exercises} Übungen</span>
                      )}
                    </div>
                    <div className="kurse-card-foot">
                      {isEnrolled ? (
                        <>
                          <span className="kurse-enrolled">Eingeschrieben ✓</span>
                          <Link href={`/training/${p.slug}`} className="kurse-cta-secondary">
                            Zum Kurs →
                          </Link>
                        </>
                      ) : (
                        <form action={enrollAction} className="kurse-enroll-form">
                          <input type="hidden" name="program_id" value={p.id} />
                          <input type="hidden" name="program_slug" value={p.slug} />
                          <button type="submit" className="kurse-cta-primary">
                            Beitreten →
                          </button>
                        </form>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          <aside className="kurse-future">
            <div className="kurse-future-tag">Bald</div>
            <p>
              Weitere Kurse sind in Vorbereitung. Filter nach Level und Thema folgen sobald die
              Kurs-Bibliothek wächst.
            </p>
          </aside>
        </div>
      </main>
    </>
  )
}

const KURSE_CSS = `
  .kurse-page {
    min-height: 100vh;
    background: var(--black);
    color: var(--cream);
    padding: 56px 24px 96px;
    font-family: 'Barlow', sans-serif;
  }
  .kurse-wrap {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .kurse-head {
    margin-bottom: 32px;
  }
  .kurse-section-head {
    margin-bottom: 20px;
  }
  .kurse-section-title {
    font-family: 'Anton', sans-serif;
    font-size: clamp(24px, 3vw, 32px);
    line-height: 1;
    color: var(--cream);
    margin: 6px 0 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .kurse-section-sub {
    margin: 12px 0 0;
    color: var(--muted);
    font-size: 14px;
    line-height: 1.6;
    max-width: 640px;
  }
  .kurse-eyebrow {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: var(--amber);
    margin-bottom: 12px;
  }
  .kurse-head h1 {
    font-family: 'Anton', sans-serif;
    font-size: clamp(36px, 5vw, 56px);
    line-height: 1;
    color: var(--cream);
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .kurse-head h1 em { font-style: normal; color: var(--amber); }
  .kurse-sub {
    margin: 16px 0 0;
    color: var(--muted);
    font-size: 15px;
    line-height: 1.65;
    max-width: 640px;
  }

  /* Grid of course cards */
  .kurse-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 20px;
  }
  .kurse-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    transition: border-color 0.15s ease, transform 0.15s ease;
  }
  .kurse-card:hover {
    border-color: var(--amber);
    transform: translateY(-2px);
  }
  .kurse-card-top {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .kurse-chip {
    display: inline-block;
    background: var(--amber-dim);
    color: var(--amber);
    border: 1px solid var(--amber);
    border-radius: 2px;
    padding: 4px 10px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .kurse-chip--ghost {
    background: transparent;
    color: var(--muted);
    border-color: var(--border);
  }
  .kurse-card-title {
    font-family: 'Anton', sans-serif;
    font-size: 24px;
    color: var(--cream);
    margin: 0;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .kurse-card-desc {
    margin: 0;
    color: var(--text);
    font-size: 14px;
    line-height: 1.6;
    font-weight: 300;
  }
  .kurse-card-meta {
    display: flex;
    gap: 12px;
    color: var(--muted);
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }
  .kurse-card-foot {
    margin-top: auto;
    padding-top: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    border-top: 1px solid var(--border);
  }
  .kurse-cta-primary {
    background: var(--amber);
    color: var(--black);
    border: none;
    padding: 10px 20px;
    border-radius: 3px;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }
  .kurse-cta-primary:hover { background: var(--cream); }
  .kurse-enroll-form { margin-left: auto; }
  .kurse-cta-secondary {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--amber);
    text-decoration: none;
    padding: 8px 16px;
    border: 1px solid var(--amber);
    border-radius: 3px;
    transition: background-color 0.15s ease, color 0.15s ease;
  }
  .kurse-cta-secondary:hover {
    background: var(--amber);
    color: var(--black);
  }
  .kurse-enrolled {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
  }

  .kurse-empty {
    background: var(--card);
    border: 1px dashed var(--border);
    border-radius: 10px;
    padding: 40px;
    text-align: center;
    color: var(--muted);
  }

  .kurse-future {
    margin-top: 40px;
    border: 1px dashed var(--border);
    border-radius: 10px;
    padding: 20px;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.6;
  }
  .kurse-future-tag {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--amber);
    margin-bottom: 6px;
  }

  @media (max-width: 480px) {
    .kurse-page { padding: 40px 16px 80px; }
    .kurse-grid { gap: 14px; }
    .kurse-card { padding: 20px; }
    .kurse-cta-primary,
    .kurse-cta-secondary { width: 100%; text-align: center; }
    .kurse-card-foot { flex-direction: column; align-items: stretch; }
    .kurse-enroll-form { margin-left: 0; width: 100%; }
  }
`
