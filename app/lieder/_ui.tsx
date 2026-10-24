import Link from 'next/link'
import type { ReactNode } from 'react'
import { STATUS_LABELS, messageFor } from '../lib/lieder'
import { SCHULE_PAGE_CSS } from '../_schule/pages-css'
import { COURSE_CSS } from '../training/_course/views'

// ─────────────────────────────────────────────────────────────────────────────
// Bausteine der Lieder-Seiten. Schule-Tokens, Gold als einziger Akzent,
// Fraunces 300 für Überschriften, Spectral für Text, Jost für Bedienung,
// Radius 2px, Tippflächen ≥ 44px. Ergänzt COURSE_CSS (cr-…) und SCHULE_PAGE_CSS (sp-…).
// ─────────────────────────────────────────────────────────────────────────────

export const LIEDER_CSS = `
  .ld-wrap { max-width: 1180px; gap: 40px; }
  .ld-page button.cr-btn { cursor: pointer; font-family: var(--font-ui); }
  .ld-kicker { margin: 0; font-family: var(--font-display); font-style: italic; font-weight: 300; font-size: 16px; letter-spacing: 0.04em; color: var(--amber); }
  .ld-h1 { margin: 0; font-family: var(--font-display); font-weight: 300; font-size: clamp(34px, 7vw, 52px); line-height: 1.08; color: var(--cream); overflow-wrap: anywhere; }
  .ld-h2 { margin: 0; font-family: var(--font-display); font-weight: 300; font-size: clamp(24px, 5vw, 30px); line-height: 1.2; color: var(--cream); }
  .ld-lead { margin: 0; max-width: 62ch; font-family: var(--font-body); font-size: 18px; line-height: 1.65; color: var(--text); }
  .ld-meta { margin: 0; font-family: var(--font-ui); font-size: 14px; line-height: 1.5; color: var(--muted2); }
  .ld-hint { margin: 0; font-family: var(--font-body); font-style: italic; font-size: 15px; line-height: 1.55; color: var(--muted); }

  .ld-hero { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 24px; }
  .ld-hero-main { flex: 999 1 460px; display: flex; flex-direction: column; gap: 14px; min-width: 0; }
  .ld-hero-act { flex: 1 1 220px; display: flex; justify-content: flex-end; }
  @media (max-width: 560px) { .ld-hero-act .cr-btn { flex: 1 1 100%; } }

  /* Reiter und Suche */
  .ld-bar { display: flex; flex-wrap: wrap; gap: 12px 24px; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); padding-bottom: 12px; }
  .ld-tabs { display: flex; gap: 4px 24px; flex-wrap: wrap; }
  .ld-tabs a {
    display: inline-flex; align-items: center; gap: 8px; min-height: 44px;
    font-family: var(--font-ui); font-size: 15px; letter-spacing: 0.5px; text-decoration: none;
    color: var(--muted2); border-bottom: 1px solid transparent;
  }
  .ld-tabs a:hover { color: var(--cream); }
  .ld-tabs a[aria-current="page"] { color: var(--amber); border-bottom-color: var(--amber); }
  .ld-tabs .ld-badge { min-width: 22px; height: 22px; padding: 0 6px; display: inline-grid; place-items: center; font-size: 12px; color: var(--black); background: var(--amber); border-radius: 11px; }
  .ld-search { display: flex; gap: 8px; flex: 1 1 320px; max-width: 520px; }
  .ld-search input, .ld-search select, .ld-field input, .ld-field select, .ld-field textarea {
    min-height: 44px; padding: 0 12px; border-radius: 2px; font-family: var(--font-ui); font-size: 15px;
    color: var(--cream); background: var(--card); border: 1px solid var(--border2);
  }
  .ld-search input { flex: 1 1 auto; min-width: 0; }
  .ld-search input:focus, .ld-field input:focus, .ld-field select:focus, .ld-field textarea:focus { outline: none; border-color: var(--amber); }

  /* Karten */
  .ld-grid { list-style: none; margin: 0; padding: 0; display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); }
  @media (min-width: 680px) { .ld-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (min-width: 1020px) { .ld-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  .ld-card {
    position: relative; height: 100%; box-sizing: border-box; overflow: hidden;
    display: flex; flex-direction: column; gap: 12px; padding: 22px 20px 20px;
    border: 1px solid var(--border2); border-radius: 2px; background: rgba(255, 255, 255, 0.02);
    color: inherit; text-decoration: none;
  }
  .ld-card:hover { border-color: var(--amber); }
  .ld-card:focus-visible { outline: 2px solid var(--amber); outline-offset: 3px; }
  .ld-card-art { position: absolute; right: -28px; top: -28px; width: 120px; height: 120px; opacity: 0.18; pointer-events: none; }
  .ld-card h3 { margin: 0; font-family: var(--font-display); font-weight: 300; font-size: 23px; line-height: 1.2; color: var(--cream); overflow-wrap: anywhere; padding-right: 48px; }
  .ld-card-by { margin: 0; font-family: var(--font-body); font-style: italic; font-size: 15px; color: var(--muted2); }
  .ld-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: auto; }
  .ld-tag {
    display: inline-flex; align-items: center; min-height: 28px; padding: 0 10px;
    border: 1px solid var(--border2); border-radius: 2px;
    font-family: var(--font-ui); font-size: 12px; letter-spacing: 0.8px; color: var(--muted2);
  }
  .ld-tag--gold { color: var(--amber); }
  .ld-tag--state { color: var(--black); background: var(--amber); border-color: var(--amber); }
  .ld-tag--muted { color: var(--muted); border-style: dashed; }
  .ld-note { margin: 0; padding: 10px 12px; border-left: 2px solid var(--amber); font-family: var(--font-body); font-size: 15px; color: var(--muted2); background: var(--amber-glow); }

  .ld-empty { display: flex; flex-direction: column; gap: 12px; align-items: flex-start; padding: 32px 24px; border: 1px dashed var(--border2); border-radius: 2px; }

  /* Formulare */
  .ld-form { display: flex; flex-direction: column; gap: 18px; }
  .ld-form-grid { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); }
  @media (min-width: 760px) { .ld-form-grid { grid-template-columns: 2fr 2fr 1fr; } }
  .ld-field { display: flex; flex-direction: column; gap: 6px; font-family: var(--font-ui); font-size: 13px; letter-spacing: 0.5px; color: var(--muted2); }
  .ld-field textarea { padding: 10px 12px; min-height: 88px; font-family: var(--font-body); }
  .ld-check { display: flex; gap: 12px; align-items: flex-start; font-family: var(--font-body); font-size: 16px; line-height: 1.5; color: var(--text); cursor: pointer; }
  .ld-check input { width: 22px; height: 22px; margin-top: 2px; accent-color: var(--amber); flex: 0 0 auto; }
  .ld-drop {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center;
    padding: 36px 20px; border: 1px dashed var(--border2); border-radius: 2px; background: rgba(255, 255, 255, 0.015);
  }
  .ld-drop.is-over { border-color: var(--amber); background: var(--amber-glow); }
  .ld-choice { display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); }
  @media (min-width: 760px) { .ld-choice { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .ld-actions { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
  @media (max-width: 520px) { .ld-actions .cr-btn { flex: 1 1 100%; } }
  .ld-back { font-family: var(--font-ui); font-size: 14px; color: var(--muted2); text-decoration: none; min-height: 44px; display: inline-flex; align-items: center; }
  .ld-back:hover { color: var(--amber); }
  .ld-review { display: flex; flex-direction: column; gap: 12px; padding: 18px; border: 1px solid var(--amber); border-radius: 2px; background: var(--amber-glow); }
`

export function LiederPage({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{COURSE_CSS}</style>
      <style>{SCHULE_PAGE_CSS}</style>
      <style>{LIEDER_CSS}</style>
      <main className="cr-page sp-page ld-page">
        <div className="cr-wrap sp-wrap ld-wrap">{children}</div>
      </main>
    </>
  )
}

const OK_TEXTS: Record<string, string> = {
  eingereicht: 'Danke! Dein Lied ist eingereicht. Sobald Nils es angeschaut hat, sehen es alle.',
  geloescht: 'Das Lied ist gelöscht.',
  freigegeben: 'Freigegeben. Jetzt sehen es alle Mitglieder.',
  abgelehnt: 'Nicht freigegeben. Die Person sieht deine Notiz.',
}

export function Notice({ fehler, ok }: { fehler?: string; ok?: string }) {
  const error = messageFor(fehler)
  if (error) return <p className="cr-notice" role="alert">{error}</p>
  const done = ok ? OK_TEXTS[ok] : undefined
  return done ? <p className="cr-notice" role="status">{done}</p> : null
}

export function StatusTag({ status }: { status: string }) {
  if (status === 'freigegeben') return null
  return <span className={`ld-tag ${status === 'eingereicht' ? 'ld-tag--state' : 'ld-tag--muted'}`}>{STATUS_LABELS[status] ?? status}</span>
}

/** Kleines Handpan-Signet als Kartenschmuck (dekorativ). */
export function PanArt() {
  const ring = Array.from({ length: 8 }, (_, i) => {
    const a = ((90 + (i === 0 ? 0 : (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 45)) * Math.PI) / 180
    return { x: 50 + Math.cos(a) * 30, y: 50 + Math.sin(a) * 30 }
  })
  return (
    <svg className="ld-card-art" viewBox="0 0 100 100" aria-hidden>
      <circle cx="50" cy="50" r="46" fill="none" stroke="var(--amber)" strokeWidth="1" />
      <circle cx="50" cy="50" r="11" fill="none" stroke="var(--amber)" strokeWidth="1" />
      {ring.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="7" fill="none" stroke="var(--amber)" strokeWidth="1" />
      ))}
    </svg>
  )
}

export function BackLink({ href = '/lieder', children = '← Alle Lieder' }: { href?: string; children?: ReactNode }) {
  return <Link className="ld-back" href={href}>{children}</Link>
}

/** Für Nicht-Mitglieder: was die Bibliothek ist und wie man hineinkommt. */
export function MembersOnly() {
  return (
    <LiederPage>
      <header className="ld-hero">
        <div className="ld-hero-main">
          <p className="ld-kicker">Lieder der Gemeinschaft</p>
          <h1 className="ld-h1">Spielt einander eure Lieder vor</h1>
          <p className="ld-lead">
            Hier teilen Mitglieder ihre eigenen Stücke als Handpan-Tab. Du siehst, welches Feld wann klingt,
            hörst das Lied und spielst mit — langsamer, Abschnitt für Abschnitt, eine Hand nach der anderen.
          </p>
        </div>
      </header>
      <div className="ld-empty">
        <p className="ld-h2">Die Lieder-Bibliothek gehört zur Mitgliedschaft</p>
        <p className="ld-hint">Mit einem Abo oder einem Kurs der Schule bist du dabei.</p>
        <Link className="cr-btn" href="/mitgliedschaft">Mitgliedschaft ansehen</Link>
      </div>
    </LiederPage>
  )
}
