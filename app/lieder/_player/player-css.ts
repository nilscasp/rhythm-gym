// ─────────────────────────────────────────────────────────────────────────────
// Gestaltung des Lieder-Players im Stil der Handpan Schule des Lebens:
// Nachtblau, Gold als Akzent und Farbe der rechten Hand, Creme für die linke,
// Fraunces/Spectral/Jost, Radius 2px, Tippflächen ≥ 44px.
// Die Klassen tab-row/pad/… kommen aus app/lib/lieder/tab.ts und handpan.ts.
// ─────────────────────────────────────────────────────────────────────────────

export const PLAYER_CSS = `
  .ld-player {
    --ld-r: var(--amber);
    --ld-l: var(--cream);
    --ld-line: rgba(212, 165, 116, 0.18);
    --ld-line-soft: rgba(212, 165, 116, 0.09);
    display: flex; flex-direction: column; gap: 16px; min-width: 0;
  }

  /* Abschnitte */
  .ld-sections { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: thin; }
  .ld-sec {
    flex: 0 0 auto; min-height: 40px; padding: 0 14px; cursor: pointer;
    font-family: var(--font-ui); font-size: 14px; letter-spacing: 0.4px; white-space: nowrap;
    color: var(--muted2); background: transparent; border: 1px solid var(--border2); border-radius: 2px;
  }
  .ld-sec:hover { color: var(--cream); border-color: var(--amber); }
  .ld-sec.is-current { color: var(--amber); border-color: var(--amber); }
  .ld-sec.is-loop { background: var(--amber-dim); }

  /* Bühne: Tab und Handpan */
  .ld-stage { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; }
  @media (min-width: 1000px) {
    .ld-stage { grid-template-columns: minmax(0, 1fr) 340px; align-items: start; }
    .ld-pan { position: sticky; top: 88px; order: 2; }
  }
  .ld-tab-scroll {
    position: relative; overflow: auto; max-height: min(62vh, 640px);
    padding: 8px 12px 24px; border: 1px solid var(--border); border-radius: 2px;
    background: rgba(255, 255, 255, 0.015);
  }
  @media (max-width: 999px) { .ld-tab-scroll { max-height: 48vh; order: 2; } .ld-pan { order: 1; } }
  .ld-tab { position: relative; }
  .ld-cursor {
    position: absolute; left: 0; top: 0; width: 2px; pointer-events: none; z-index: 2;
    background: var(--amber); box-shadow: 0 0 10px rgba(212, 165, 116, 0.7);
    will-change: transform;
  }

  /* Tab-Zeilen */
  .ld-player .tab-row { display: block; margin-bottom: 6px; overflow: visible; user-select: none; }
  .ld-player .tab-row .mid { stroke: var(--ld-line); stroke-width: 1; }
  .ld-player .tab-row .beat { stroke: var(--ld-line); stroke-width: 1; }
  .ld-player .tab-row .subtick { stroke: var(--ld-line-soft); stroke-width: 1; }
  .ld-player .tab-row .bar { stroke: rgba(232, 230, 227, 0.55); stroke-width: 1.5; }
  .ld-player .tab-row .measure-num { font-family: var(--font-ui); font-size: 11px; fill: var(--muted); cursor: pointer; }
  .ld-player .tab-row .loop-bg { fill: var(--amber-glow); }
  .ld-player .section-label { cursor: pointer; }
  .ld-player .section-label rect { fill: transparent; stroke: var(--border2); }
  .ld-player .section-label text { font-family: var(--font-display); font-style: italic; font-size: 14px; fill: var(--amber); }
  .ld-player .tempo-mark { font-family: var(--font-ui); font-size: 12px; fill: var(--muted2); }
  .ld-player .note-mark { font-family: var(--font-body); font-style: italic; font-size: 12px; fill: var(--muted); }
  .ld-player .cell-hit { fill: transparent; cursor: pointer; }
  .ld-player .cell-hit:hover { fill: rgba(212, 165, 116, 0.06); }
  .ld-player .cell-hit.sel { fill: rgba(212, 165, 116, 0.1); stroke: var(--amber); stroke-width: 1; }
  .ld-player.is-editing .cell-hit.sel { fill: rgba(212, 165, 116, 0.18); stroke-width: 1.5; }
  .ld-player .tab-row .n {
    font-family: var(--font-ui); font-size: 15px; text-anchor: middle; pointer-events: none;
    transition: transform 0.08s; transform-box: fill-box; transform-origin: center;
  }
  .ld-player .tab-row .rh { fill: var(--ld-r); }
  .ld-player .tab-row .lh { fill: var(--ld-l); }
  .ld-player .tab-row .dyn0 { font-size: 11px; opacity: 0.5; }
  .ld-player .tab-row .dyn1 { font-size: 13px; opacity: 0.75; }
  .ld-player .tab-row .dyn3 { font-weight: 600; }
  .ld-player .tab-row .dyn4 { font-weight: 700; font-size: 17px; }
  .ld-player .tab-row .perc { font-family: var(--font-display); font-style: italic; }
  .ld-player .tab-row .missing { opacity: 0.35; text-decoration: line-through; }
  .ld-player .tab-row .n.hot { font-weight: 700; transform: scale(1.4); filter: drop-shadow(0 0 4px rgba(212, 165, 116, 0.8)); }

  /* Handpan */
  .ld-pan { position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .ld-pan-svg { width: min(100%, 340px); aspect-ratio: 1; display: block; overflow: visible; }
  @media (max-width: 999px) { .ld-pan-svg { width: min(60vw, 230px); } }
  .ld-player .pan-backdrop { fill: transparent; }
  .ld-player .pan-shell { fill: rgba(212, 165, 116, 0.05); stroke: rgba(212, 165, 116, 0.35); stroke-width: 1.2; }
  .ld-player .pad { cursor: pointer; }
  .ld-player .pad .face { fill: var(--card2); stroke: rgba(212, 165, 116, 0.4); stroke-width: 1; transition: fill 0.06s; }
  .ld-player .pad.bottom .face { fill: transparent; stroke-dasharray: 3 3; }
  .ld-player .pad.ding .ding-outer { fill: var(--card); stroke: rgba(212, 165, 116, 0.5); stroke-width: 1; }
  .ld-player .pad.ding .face { fill: rgba(212, 165, 116, 0.08); stroke: none; }
  .ld-player .pad .ring { fill: none; stroke: transparent; stroke-width: 3; }
  .ld-player .pad text { text-anchor: middle; pointer-events: none; fill: var(--muted2); font-family: var(--font-ui); }
  .ld-player .pad .pad-name { font-size: 11px; }
  .ld-player .pad .pad-num { font-size: 13px; fill: var(--cream); }
  .ld-player .pad.now-r .face, .ld-player .pad.now-r.ding .ding-outer { fill: var(--ld-r); stroke: var(--ld-r); }
  .ld-player .pad.now-l .face, .ld-player .pad.now-l.ding .ding-outer { fill: var(--ld-l); stroke: var(--ld-l); }
  .ld-player .pad.now text { fill: var(--black); font-weight: 600; }
  .ld-player .pad.next-r .ring { stroke: var(--ld-r); }
  .ld-player .pad.next-l .ring { stroke: var(--ld-l); }
  .ld-player .pad.tapped .face { fill: rgba(212, 165, 116, 0.3); }
  .ld-count {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -60%);
    width: 84px; height: 84px; border-radius: 50%; display: grid; place-items: center;
    font-family: var(--font-display); font-size: 44px; font-weight: 300; color: var(--black);
    background: var(--amber); box-shadow: 0 0 40px rgba(212, 165, 116, 0.45);
  }
  .ld-legend { margin: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 14px; font-family: var(--font-ui); font-size: 12px; color: var(--muted); }
  .ld-legend span { display: inline-flex; align-items: center; gap: 6px; }
  .ld-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
  .ld-dot--r { background: var(--ld-r); }
  .ld-dot--l { background: var(--ld-l); }
  .ld-ring { width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--ld-r); display: inline-block; }

  /* Wiedergabe-Leiste */
  .ld-transport {
    position: sticky; bottom: 12px; z-index: 5;
    display: flex; flex-wrap: wrap; align-items: center; gap: 12px 18px;
    padding: 12px 16px; border: 1px solid var(--border2); border-radius: 2px;
    background: rgba(14, 19, 27, 0.94); backdrop-filter: blur(8px);
  }
  @media (max-width: 767px) { .ld-transport { bottom: calc(76px + env(safe-area-inset-bottom)); } }
  .ld-play {
    flex: 0 0 auto; width: 56px; height: 56px; border-radius: 50%; cursor: pointer;
    display: grid; place-items: center; color: var(--black);
    background: var(--amber); border: 1px solid var(--amber);
    box-shadow: 0 0 0 6px rgba(212, 165, 116, 0.12);
  }
  .ld-play:hover { background: var(--amber2); }
  .ld-play:focus-visible { outline: 2px solid var(--cream); outline-offset: 3px; }
  .ld-play.is-playing { background: transparent; color: var(--amber); }
  .ld-tempo { display: flex; flex-direction: column; gap: 2px; min-width: 96px; }
  .ld-tempo-num { font-family: var(--font-display); font-weight: 300; font-size: 22px; color: var(--cream); line-height: 1.1; }
  .ld-speed { display: flex; align-items: center; gap: 6px; font-family: var(--font-ui); font-size: 13px; color: var(--muted2); }
  .ld-speed button {
    width: 32px; height: 32px; cursor: pointer; border-radius: 2px; font-size: 16px; line-height: 1;
    color: var(--amber); background: transparent; border: 1px solid var(--border2);
  }
  .ld-speed button:disabled { opacity: 0.35; cursor: default; }
  .ld-speed span { min-width: 46px; text-align: center; }
  .ld-toggles { display: flex; flex-wrap: wrap; gap: 8px; flex: 1 1 320px; }
  .ld-chip {
    min-height: 44px; padding: 0 14px; cursor: pointer;
    font-family: var(--font-ui); font-size: 14px; letter-spacing: 0.3px; color: var(--muted2);
    background: transparent; border: 1px solid var(--border2); border-radius: 2px;
  }
  .ld-chip:hover { color: var(--cream); border-color: var(--amber); }
  .ld-chip.is-on { color: var(--black); background: var(--amber); border-color: var(--amber); }
  .ld-chip--l.is-on { background: var(--cream); border-color: var(--cream); }
  .ld-bpm { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font-ui); font-size: 13px; color: var(--muted2); }
  .ld-bpm input {
    width: 72px; min-height: 40px; padding: 0 8px; border-radius: 2px;
    background: var(--card); color: var(--cream); border: 1px solid var(--border2); font-family: var(--font-ui);
  }
  /* Handy: eine Zeile, Schalter seitlich wischbar */
  @media (max-width: 767px) { .ld-tab-scroll { padding-bottom: 96px; } }
  @media (max-width: 767px) {
    .ld-transport { flex-wrap: nowrap; gap: 10px; padding: 8px 10px; }
    .ld-play { width: 48px; height: 48px; box-shadow: 0 0 0 4px rgba(212, 165, 116, 0.12); }
    .ld-tempo { flex: 0 0 auto; min-width: 0; }
    .ld-tempo-num { font-size: 18px; }
    .ld-speed button { width: 28px; height: 28px; }
    .ld-speed span { min-width: 38px; font-size: 12px; }
    .ld-toggles { flex: 1 1 auto; min-width: 0; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
    .ld-toggles::-webkit-scrollbar { display: none; }
    .ld-chip { flex: 0 0 auto; padding: 0 12px; font-size: 13px; }
    .ld-legend { display: none; }
  }

  /* Werkstatt */
  .ld-editbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 16px; }
  .ld-edit-hint { font-family: var(--font-body); font-style: italic; font-size: 14px; color: var(--muted); }
  .ld-edit-actions { display: flex; flex-wrap: wrap; gap: 8px; }
`
