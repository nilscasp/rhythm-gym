// Zusätze zu COURSE_CSS (app/training/_course/views.tsx) für /mitgliedschaft.
// Gleiche Tokens: dunkel, Gold einziger Akzent, Fraunces 300, Spectral,
// Radius 2px, Haarlinien, Touch-Ziele ≥ 44px. Mobil untereinander, ab 760px
// nebeneinander.

export const MEMBERSHIP_CSS = `
  .ms-wrap { max-width: 980px; }
  .ms-note {
    margin: 0;
    padding: 14px 16px;
    border: 1px solid var(--border2);
    border-left: 2px solid var(--amber);
    border-radius: 2px;
    font-family: var(--font-body);
    font-size: 16px;
    line-height: 1.55;
    color: var(--text);
  }
  .ms-note a { color: var(--amber); }
  .ms-toggle {
    display: inline-flex;
    align-self: flex-start;
    border: 1px solid var(--border2);
    border-radius: 2px;
  }
  .ms-toggle button {
    min-height: 44px;
    min-width: 96px;
    padding: 10px 18px;
    border: 0;
    border-radius: 2px;
    background: transparent;
    color: var(--muted2);
    font-family: var(--font-ui);
    font-size: 15px;
    letter-spacing: 0.5px;
    cursor: pointer;
  }
  .ms-toggle button[aria-pressed="true"] { background: var(--amber); color: var(--black); }
  .ms-toggle button:focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; }
  .ms-gift { margin: 0; font-family: var(--font-body); font-size: 16px; color: var(--muted2); min-height: 1.5em; }
  .ms-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; }
  @media (min-width: 760px) { .ms-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .ms-card {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 24px 20px;
    border: 1px solid var(--border2);
    border-radius: 2px;
    min-width: 0;
  }
  .ms-card--current { border-color: var(--amber); }
  .ms-card-head { display: flex; flex-direction: column; gap: 6px; }
  .ms-badge {
    align-self: flex-start;
    font-family: var(--font-ui);
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--amber);
  }
  .ms-name {
    margin: 0;
    font-family: var(--font-display);
    font-weight: 300;
    font-size: clamp(28px, 6vw, 36px);
    line-height: 1.1;
    color: var(--cream);
  }
  .ms-steps { margin: 0; font-family: var(--font-ui); font-size: 13px; letter-spacing: 1px; color: var(--amber); }
  .ms-price { margin: 0; display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .ms-amount { font-family: var(--font-display); font-weight: 300; font-size: 32px; color: var(--cream); }
  .ms-per { font-family: var(--font-ui); font-size: 14px; color: var(--muted2); }
  .ms-theme { margin: 0; font-family: var(--font-body); font-size: 17px; line-height: 1.55; color: var(--text); }
  .ms-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; border-top: 1px solid var(--border); padding-top: 16px; }
  .ms-list li { position: relative; padding-left: 20px; font-family: var(--font-body); font-size: 16px; line-height: 1.5; color: var(--text); }
  .ms-list li::before { content: ''; position: absolute; left: 2px; top: 0.7em; width: 6px; height: 1px; background: var(--amber); }
  .ms-sub { margin: 8px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
  .ms-sub li { color: var(--muted2); }
  .ms-feeling { margin: 0; font-family: var(--font-body); font-style: italic; font-size: 16px; color: var(--muted2); }
  .ms-card form { margin-top: auto; }
  .ms-card .cr-btn { width: 100%; cursor: pointer; }
  .ms-card .cr-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .ms-small { margin: 0; font-family: var(--font-body); font-size: 15px; line-height: 1.55; color: var(--muted2); }
  .ms-small a { color: var(--amber); }
  .cr-locked-text a { color: var(--amber); }
  .cr-locked .cr-btn { cursor: pointer; }
`
