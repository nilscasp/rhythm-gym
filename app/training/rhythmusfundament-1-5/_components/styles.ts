// Gemeinsame Styles für Index und Tagesseite von RF 1.5 — gleiche Sprache wie
// das Rhythmus-Fundament (Karten, Bernstein-Akzent), eigenes Präfix `r15-`.

export const RF15_CSS = `
  .r15-page {
    min-height: 100vh;
    background: var(--black);
    color: var(--cream);
    padding: 48px 20px 96px;
    font-family: var(--font-body);
  }
  .r15-wrap {
    max-width: 1080px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 48px;
  }
  .r15-wrap--narrow { max-width: 860px; gap: 32px; }

  .r15-eyebrow {
    font-family: var(--font-ui);
    font-size: 12px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .r15-muted { color: var(--muted2, var(--muted)); }

  /* ── Hero ── */
  .r15-hero {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 36px 32px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    position: relative;
    overflow: hidden;
  }
  .r15-hero::before {
    content: '';
    position: absolute;
    top: -120px;
    right: -120px;
    width: 360px;
    height: 360px;
    background: radial-gradient(circle, rgba(245,166,35,0.08) 0%, transparent 70%);
    pointer-events: none;
  }
  .r15-title {
    font-family: var(--font-display);
    font-size: clamp(32px, 6vw, 52px);
    letter-spacing: 2px;
    line-height: 1.05;
    color: var(--cream);
    margin: 0;
  }
  .r15-lead {
    font-size: 15px;
    line-height: 1.6;
    color: var(--text, var(--cream));
    margin: 0;
    max-width: 68ch;
  }
  .r15-notice {
    margin: 4px 0 0;
    padding: 12px 14px;
    background: rgba(245,166,35,0.08);
    border: 1px solid rgba(245,166,35,0.35);
    border-radius: 6px;
    font-size: 14px;
    line-height: 1.55;
    max-width: 68ch;
  }
  .r15-notice strong { color: var(--amber); font-weight: 600; }
  .r15-chips { display: flex; flex-wrap: wrap; gap: 10px; }
  .r15-chip {
    display: inline-block;
    padding: 6px 12px;
    background: var(--amber-dim, rgba(245,166,35,0.12));
    color: var(--amber);
    border-radius: 4px;
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .r15-chip--done { background: var(--amber); color: var(--black); }

  /* ── Drei Blöcke (Legende) ── */
  .r15-blocks {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
    margin: 4px 0 0;
    padding: 0;
    list-style: none;
  }
  .r15-blocks li {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .r15-blocks-num {
    font-family: var(--font-ui);
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .r15-blocks-title { font-weight: 600; }
  .r15-blocks-sub { font-size: 13px; color: var(--muted2, var(--muted)); }

  .r15-continue {
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    min-height: 44px;
    padding: 10px 18px;
    background: var(--amber);
    color: var(--black);
    border-radius: 4px;
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    text-decoration: none;
  }
  .r15-continue:hover { background: var(--amber2, var(--amber)); }

  /* ── Sektionen ── */
  .r15-section { display: flex; flex-direction: column; gap: 18px; }
  .r15-section-head {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
  }
  .r15-h2 {
    font-family: var(--font-display);
    font-size: 26px;
    letter-spacing: 1px;
    line-height: 1.1;
    margin: 0;
  }
  .r15-section-sub { font-size: 14px; color: var(--muted2, var(--muted)); margin: 0; max-width: 64ch; }

  .r15-intro-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 18px;
  }
  .r15-intro {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }
  .r15-intro-title { font-weight: 600; font-size: 16px; margin: 0; }

  /* ── PDF-Karte ── */
  .r15-pdf {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 18px 20px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 14px 20px;
  }
  .r15-pdf-text { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .r15-pdf-title { font-family: var(--font-display); font-size: 20px; letter-spacing: 0.5px; }
  .r15-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 10px 18px;
    border: 1px solid var(--amber);
    color: var(--amber);
    border-radius: 4px;
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    text-decoration: none;
  }
  .r15-btn:hover { background: var(--amber); color: var(--black); }
  .r15-btn--disabled, .r15-btn--disabled:hover {
    border-color: var(--border);
    color: var(--muted);
    background: none;
    cursor: default;
  }

  /* ── Video ── */
  .r15-video { min-width: 0; }
  .r15-video-placeholder {
    aspect-ratio: 16 / 9;
    width: 100%;
    background: var(--dark, #111);
    border: 1px dashed var(--border);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 16px;
    text-align: center;
  }
  .r15-video-icon { font-size: 22px; color: var(--muted); }
  .r15-video-label {
    font-family: var(--font-ui);
    font-size: 12px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .r15-video-title { font-size: 13px; color: var(--muted2, var(--muted)); }

  /* ── Tageskarten ── */
  .r15-day-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .r15-day-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 16px 18px;
    color: var(--cream);
    text-decoration: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
    transition: border-color 0.15s, transform 0.1s;
  }
  a.r15-day-card:hover { border-color: var(--amber); transform: translateY(-1px); }
  .r15-day-card--locked { opacity: 0.55; }
  .r15-day-card--done { border-color: var(--amber); background: var(--amber-dim, rgba(245,166,35,0.12)); }
  .r15-day-num {
    font-family: var(--font-ui);
    font-size: 11px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .r15-day-card--locked .r15-day-num { color: var(--muted); }
  .r15-day-title { font-family: var(--font-display); font-size: 18px; letter-spacing: 0.5px; line-height: 1.15; }
  .r15-day-line { font-size: 13px; color: var(--muted2, var(--muted)); line-height: 1.45; }
  .r15-day-meta {
    font-family: var(--font-ui);
    font-size: 11px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--muted);
    margin-top: 4px;
  }
  .r15-day-meta--unlock { color: var(--amber); }

  /* ── Tagesseite ── */
  .r15-crumb {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    font-family: var(--font-ui);
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
  }
  .r15-crumb a { color: var(--amber); text-decoration: none; }
  .r15-day-header {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
  }
  .r15-block {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 22px 22px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  }
  .r15-block-head { display: flex; flex-direction: column; gap: 4px; }
  .r15-block-title { font-family: var(--font-display); font-size: 24px; letter-spacing: 0.5px; line-height: 1.1; margin: 0; }
  .r15-plan {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: 8px 16px;
    margin: 0;
    font-size: 14px;
  }
  .r15-plan dt {
    font-family: var(--font-ui);
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--muted);
    padding-top: 2px;
  }
  .r15-plan dd { margin: 0; }
  .r15-ref {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 14px 16px;
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--cream);
    text-decoration: none;
  }
  a.r15-ref:hover { border-color: var(--amber); }
  .r15-ref-title { font-weight: 600; }

  .r15-strip {
    display: grid;
    grid-template-columns: repeat(11, minmax(0, 1fr));
    gap: 6px;
  }
  .r15-strip a, .r15-strip span {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    border: 1px solid var(--border);
    border-radius: 4px;
    font-family: var(--font-ui);
    font-size: 13px;
    color: var(--cream);
    text-decoration: none;
  }
  .r15-strip a:hover { border-color: var(--amber); }
  .r15-strip .is-current { background: var(--amber); color: var(--black); border-color: var(--amber); font-weight: 700; }
  .r15-strip .is-done { border-color: var(--amber); color: var(--amber); }
  .r15-strip .is-locked { color: var(--muted); opacity: 0.5; }

  .r15-nav { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .r15-nav a, .r15-nav div {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 14px 16px;
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--cream);
    text-decoration: none;
    font-size: 14px;
  }
  .r15-nav a:hover { border-color: var(--amber); }
  .r15-nav .r15-nav-next { text-align: right; grid-column: 2; }
  .r15-nav .r15-nav-locked { color: var(--muted); }

  @media (min-width: 720px) {
    .r15-day-grid { grid-template-columns: repeat(2, 1fr); }
    .r15-intro-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .r15-blocks { grid-template-columns: repeat(3, 1fr); }
    .r15-hero { padding: 44px 48px; }
  }
  @media (min-width: 1000px) {
    .r15-day-grid { grid-template-columns: repeat(3, 1fr); }
  }
  @media (max-width: 560px) {
    .r15-strip { grid-template-columns: repeat(6, minmax(0, 1fr)); }
  }
  @media (max-width: 480px) {
    .r15-page { padding: 28px 14px 80px; }
    .r15-wrap { gap: 36px; }
    .r15-hero { padding: 24px 20px; }
    .r15-block { padding: 18px 16px 20px; }
    .r15-continue, .r15-btn { width: 100%; justify-content: center; align-self: stretch; }
    .r15-nav { grid-template-columns: 1fr; }
    .r15-nav .r15-nav-next { grid-column: 1; }
  }
`
