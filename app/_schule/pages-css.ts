// ─────────────────────────────────────────────────────────────────────────────
// Gemeinsame Stile der neuen Schul-Seiten (Kurse, Miteinander, Mein Weg,
// Beiträge, Neuigkeiten auf „Heute“). Ergänzt COURSE_CSS (cr-page, cr-btn …)
// aus app/training/_course/views.tsx. Schule-Tokens aus app/globals.css.
// ─────────────────────────────────────────────────────────────────────────────

export const SCHULE_PAGE_CSS = `
  .sp-page { min-height: 100dvh; }
  .sp-wrap { max-width: 720px; gap: 32px; }
  .sp-section { display: flex; flex-direction: column; gap: 14px; }
  .sp-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

  /* Karten */
  .sp-cards { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
  .sp-card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 18px;
    border: 1px solid var(--border2);
    border-radius: 2px;
    background: linear-gradient(180deg, var(--amber-glow), transparent 70%);
  }
  .sp-card--locked { background: transparent; border-color: var(--border); }
  .sp-card-kicker {
    margin: 0;
    font-family: var(--font-ui);
    font-size: 11px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .sp-card-title {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 300;
    font-size: 24px;
    line-height: 1.2;
    color: var(--cream);
    overflow-wrap: anywhere;
  }
  .sp-card-text { margin: 0; font-family: var(--font-body); font-size: 16px; line-height: 1.55; color: var(--muted2); }
  .sp-card-hint { margin: 0; font-family: var(--font-body); font-style: italic; font-size: 15px; color: var(--muted); }
  .sp-card-progress { display: flex; align-items: center; gap: 12px; }
  .sp-card-progress .cr-bar { flex: 1 1 auto; }
  .sp-card-count { font-family: var(--font-ui); font-size: 13px; color: var(--muted2); }
  .sp-badge {
    display: inline-block;
    margin-left: 8px;
    padding: 1px 6px;
    border: 1px solid var(--border2);
    border-radius: 2px;
    font-size: 10px;
    letter-spacing: 1.5px;
    color: var(--muted2);
    vertical-align: middle;
  }
  .sp-link {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    font-family: var(--font-ui);
    font-size: 14px;
    letter-spacing: 1px;
    color: var(--amber);
    text-decoration: none;
    border-bottom: 1px solid transparent;
  }
  .sp-link:hover { border-bottom-color: var(--amber); }
  .sp-note { margin: 0; font-family: var(--font-body); font-style: italic; font-size: 16px; color: var(--muted2); }

  /* Liste mit Haarlinien */
  .sp-list { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--border); }
  .sp-list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 52px;
    padding: 12px 4px;
    border-bottom: 1px solid var(--border);
    font-family: var(--font-body);
    font-size: 17px;
    color: var(--text);
    text-decoration: none;
    background: none;
    border-left: 0;
    border-right: 0;
    border-top: 0;
    width: 100%;
    text-align: left;
    cursor: pointer;
  }
  a.sp-list-item:hover, button.sp-list-item:hover { color: var(--amber); }
  .sp-list-meta { font-family: var(--font-ui); font-size: 13px; color: var(--muted2); white-space: nowrap; }

  /* Avatar / Profil-Kopf */
  .sp-avatar {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--amber);
    color: var(--black);
    font-family: var(--font-display);
    font-weight: 300;
    font-size: 26px;
    line-height: 1;
  }
  .sp-avatar--sm { width: 40px; height: 40px; font-size: 19px; }
  .sp-profile { display: flex; align-items: center; gap: 16px; }
  .sp-profile .cr-title { font-size: clamp(30px, 7vw, 44px); }

  /* Kasten (WhatsApp) */
  .sp-box {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px;
    border: 1px solid var(--border2);
    border-radius: 2px;
  }
  .sp-box-text { margin: 0; font-family: var(--font-body); font-size: 17px; line-height: 1.55; color: var(--cream); }

  /* Neuigkeiten auf „Heute“ */
  .sp-newsbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 4px 16px;
    padding: 4px 0 4px 14px;
    border-left: 2px solid var(--amber);
  }
  .sp-newsbar-link {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    min-width: 0;
    font-family: var(--font-body);
    font-size: 16px;
    color: var(--cream);
    text-decoration: none;
    overflow-wrap: anywhere;
  }
  .sp-newsbar-link:hover { color: var(--amber); }
  .sp-newsbar-all {
    min-height: 44px;
    padding: 0;
    border: 0;
    background: none;
    font-family: var(--font-ui);
    font-size: 13px;
    letter-spacing: 1px;
    color: var(--amber);
    cursor: pointer;
  }
  .sp-newsbar-all:hover { text-decoration: underline; }
  .sp-newsbar-all:focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; }
  .sp-postcard { flex-direction: row; align-items: flex-start; gap: 14px; }
  .sp-postcard-body { display: flex; flex-direction: column; gap: 8px; min-width: 0; flex: 1 1 auto; }
  .sp-postcard .cr-btn { align-self: flex-start; }

  /* Beitrag */
  .sp-post-shell { max-width: 1120px; margin: 0 auto; display: grid; grid-template-columns: minmax(0, 1fr); gap: 48px; }
  .sp-post-main { display: flex; flex-direction: column; gap: 28px; min-width: 0; max-width: 720px; }
  .sp-byline { display: flex; align-items: center; gap: 12px; font-family: var(--font-ui); font-size: 14px; color: var(--muted2); }
  .sp-byline strong { color: var(--cream); font-weight: 400; }
  .sp-post-body .md-body { font-size: 18px; max-width: 68ch; }
  .sp-post-body .md-section-head { font-family: var(--font-display); font-weight: 300; font-size: 22px; letter-spacing: 0; text-transform: none; color: var(--cream); }
  .sp-post-body .md-section-symbol { color: var(--amber); font-size: 14px; }
  .sp-post-video .bunny-wrap { border-radius: 2px; border-color: var(--border); background: var(--dark); }
  .sp-post-aside { display: flex; flex-direction: column; gap: 12px; padding-top: 24px; border-top: 1px solid var(--border); min-width: 0; }
  @media (min-width: 960px) {
    .sp-post-shell { grid-template-columns: minmax(0, 720px) 300px; justify-content: center; }
    .sp-post-aside { position: sticky; top: 88px; align-self: start; padding-top: 0; padding-left: 28px; border-top: 0; border-left: 1px solid var(--border); }
  }

  /* Konto-Zeile */
  .sp-account { display: flex; flex-wrap: wrap; gap: 8px 24px; padding-top: 20px; border-top: 1px solid var(--border); }
  .sp-account-link {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 0;
    border: 0;
    background: none;
    font-family: var(--font-ui);
    font-size: 14px;
    letter-spacing: 1px;
    color: var(--muted2);
    text-decoration: none;
    cursor: pointer;
  }
  .sp-account-link:hover { color: var(--amber); }
`
