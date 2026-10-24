import { index, measureDurs, sectionOfMeasure, tempoMarks, type Cell, type Hand, type Hit, type Song } from "./model";
import type { Pad } from "./scales";

// Zeichnet den Tab als SVG-Zeilen: oben rechte Hand, unten linke Hand,
// lange Linien für Schläge, kurze für Unterteilungen, dicke für Taktstriche.
// Jede Zelle ist gleich breit (wie in Notepan); Schläge mit mehr Zellen werden breiter.

const NS = "http://www.w3.org/2000/svg";
const TOP_PAD = 44; // Platz für Abschnitt, Tempo und Taktnummer
const STACK = 17; // Abstand gestapelter Noten
const MIN_CELL = 26;

export interface StepGeo {
  row: SVGSVGElement;
  x: number;
  w: number;
}

export interface TabRender {
  steps: StepGeo[];
  /** Linienbereich je Zeile (für den Cursor) */
  rowBand: Map<SVGSVGElement, { top: number; bottom: number; height: number }>;
  /** Textelemente je Schritt, für das Aufleuchten beim Abspielen */
  textsByStep: Map<number, SVGTextElement[]>;
}

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent?: Element) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  parent?.appendChild(e);
  return e;
}

function hitLabel(h: Hit, pads: Map<string, Pad>, names: boolean): string {
  if (h.n === "*") return "•";
  if (typeof h.n === "string" && h.n !== "D") return h.n;
  if (names) return pads.get(String(h.n))?.name.replace(/-?\d$/, "") ?? String(h.n);
  return String(h.n);
}

const maxStack = (cells: Cell[]) => cells.reduce((a, c) => Math.max(a, c.length), 0);

export function renderTab(
  host: HTMLElement,
  song: Song,
  opts: { perRow: number; showNames: boolean; pads: Pad[]; loop: null | { from: number; to: number } },
): TabRender {
  host.replaceChildren();
  const ix = index(song);
  const width = host.clientWidth || 800;
  const left = 8;
  const usable = width - left * 2;
  const padMap = new Map(opts.pads.map((p) => [String(p.num), p]));
  const known = new Set(opts.pads.map((p) => String(p.num)));
  const steps: StepGeo[] = [];
  const rowBand: TabRender["rowBand"] = new Map();
  const textsByStep = new Map<number, SVGTextElement[]>();
  const tempos = tempoMarks(song);
  const notes = new Map((song.notes ?? []).map((n) => [n.measure, n.text]));

  // Takte auf Zeilen verteilen
  const cellsOf = (m: number) => song.measures[m].R.length;
  const rows: number[][] = [];
  if (opts.perRow) {
    for (let m = 0; m < song.measures.length; m += opts.perRow) rows.push(Array.from({ length: Math.min(opts.perRow, song.measures.length - m) }, (_, k) => m + k));
  } else {
    const typical = song.beats * song.sub;
    const per = Math.max(1, Math.min(4, Math.floor(usable / (typical * MIN_CELL * 1.15))));
    let cur: number[] = [];
    let cells = 0;
    const budget = per * typical;
    song.measures.forEach((_, m) => {
      if (cur.length && cells + cellsOf(m) > budget * 1.15) {
        rows.push(cur);
        cur = [];
        cells = 0;
      }
      cur.push(m);
      cells += cellsOf(m);
    });
    if (cur.length) rows.push(cur);
  }
  const typicalRowCells = Math.max(...rows.map((r) => r.reduce((a, m) => a + cellsOf(m), 0)));

  for (const rowMeasures of rows) {
    const rowCells = rowMeasures.reduce((a, m) => a + cellsOf(m), 0);
    // letzte, kurze Zeile nicht auf volle Breite ziehen
    const cellW = usable / Math.max(rowCells, rowMeasures.length < rows[0].length ? typicalRowCells : rowCells);
    const upStack = Math.max(1, ...rowMeasures.map((m) => maxStack(song.measures[m].R)));
    const downStack = Math.max(1, ...rowMeasures.map((m) => maxStack(song.measures[m].L)));
    const hasNote = rowMeasures.some((m) => notes.has(m));
    const top = TOP_PAD + (hasNote ? 16 : 0);
    const mid = top + 22 + (upStack - 1) * STACK;
    const bot = mid + 22 + (downStack - 1) * STACK + 8;
    const rowH = bot + 14;
    const row = el("svg", { width, height: rowH, class: "tab-row" }) as SVGSVGElement;
    host.appendChild(row);
    rowBand.set(row, { top, bottom: bot, height: rowH });
    let x = left;
    el("line", { x1: left, x2: left + rowCells * cellW, y1: mid, y2: mid, class: "mid" }, row);

    for (const m of rowMeasures) {
      const meas = song.measures[m];
      const durs = measureDurs(song, meas);
      const x0 = x;
      const mw = durs.length * cellW;
      if (opts.loop && m >= opts.loop.from && m < opts.loop.to) {
        el("rect", { x: x0, y: top, width: mw, height: bot - top, class: "loop-bg" }, row);
      }
      // Kopf: Abschnitt, Tempo, Hinweis, Taktnummer
      let headX = x0;
      const sec = sectionOfMeasure(song, m);
      if (sec && sec.start === m) {
        const g = el("g", { class: "section-label", "data-measure": m }, row);
        const w = sec.name.length * 7.6 + 12;
        el("rect", { x: x0, y: 1, width: w, height: 21, rx: 2 }, g);
        el("text", { x: x0 + 6, y: 16 }, g).textContent = sec.name;
        headX += w + 8;
      }
      for (const t of tempos.get(m) ?? []) {
        const label = `♩ = ${Math.round(t.bpm)}${t.to ? ` → ${Math.round(t.to)}` : ""}`;
        const tx = x0 + (t.beat ? (t.beat / durs.reduce((a, b) => a + b, 0)) * mw : 0);
        el("text", { x: Math.max(tx, headX), y: 16, class: "tempo-mark" }, row).textContent = label;
        headX = Math.max(tx, headX) + label.length * 7 + 8;
      }
      if (notes.has(m)) el("text", { x: x0 + 2, y: 34, class: "note-mark" }, row).textContent = notes.get(m)!;
      el("text", { x: x0 + 1, y: top - 6, class: "measure-num", "data-measure": m }, row).textContent = String(m + 1);

      // Zellen
      let inMeasure = 0;
      const halves = secondHalves(durs);
      durs.forEach((d, i) => {
        const cx = x0 + i * cellW;
        if (i > 0) {
          const onBeat = Math.abs(inMeasure - Math.round(inMeasure)) < 1e-6;
          // geteilte Zelle: nur ein kurzer Strich in der Mitte
          const h = onBeat ? null : halves[i] ? 6 : 22;
          if (h === null) el("line", { x1: cx, x2: cx, y1: top, y2: bot, class: "beat" }, row);
          else el("line", { x1: cx, x2: cx, y1: mid - h, y2: mid + h, class: "subtick" }, row);
        }
        inMeasure += d;
        const step = ix.start[m] + i;
        steps[step] = { row, x: cx, w: cellW };
        for (const hand of ["R", "L"] as Hand[]) {
          el("rect", {
            x: cx + 1,
            y: hand === "R" ? top : mid,
            width: cellW - 2,
            height: hand === "R" ? mid - top : bot - mid,
            class: "cell-hit",
            "data-step": step,
            "data-hand": hand,
          }, row);
          drawCell(row, meas[hand][i], hand, cx + cellW / 2, mid, step, padMap, known, opts.showNames, textsByStep);
        }
      });
      el("line", { x1: x0, x2: x0, y1: top, y2: bot, class: "bar" }, row);
      x += mw;
    }
    el("line", { x1: x, x2: x, y1: top, y2: bot, class: "bar" }, row);
  }
  return { steps, rowBand, textsByStep };
}

/** Markiert je Zelle, ob sie die zweite Hälfte einer geteilten Zelle ist. */
function secondHalves(durs: number[]): boolean[] {
  const out = durs.map(() => false);
  let i = 0;
  while (i < durs.length) {
    // einen Schlag sammeln
    const startI = i;
    let sum = 0;
    while (i < durs.length && sum < 1 - 1e-6) sum += durs[i++];
    const longest = Math.max(...durs.slice(startI, i));
    let pending = false;
    for (let k = startI; k < i; k++) {
      const half = durs[k] < longest * 0.75;
      if (half && pending) {
        out[k] = true;
        pending = false;
      } else pending = half;
    }
  }
  return out;
}

function drawCell(
  row: SVGSVGElement,
  cell: Cell,
  hand: Hand,
  cx: number,
  mid: number,
  step: number,
  pads: Map<string, Pad>,
  known: Set<string>,
  names: boolean,
  out: Map<number, SVGTextElement[]>,
) {
  cell.forEach((h, k) => {
    const y = hand === "R" ? mid - 7 - k * STACK : mid + 18 + k * STACK;
    const cls = ["n", hand === "R" ? "rh" : "lh"];
    const perc = typeof h.n === "string" && h.n !== "D";
    if (perc) cls.push("perc");
    if (h.n === "D") cls.push("ding");
    cls.push(`dyn${h.dyn ?? 2}`);
    if (!perc && !known.has(String(h.n))) cls.push("missing");
    const t = el("text", { x: cx, y, class: cls.join(" ") }, row) as SVGTextElement;
    t.textContent = hitLabel(h, pads, names) + (h.fx === "G" ? "ᵍ" : "");
    const list = out.get(step) ?? [];
    list.push(t);
    out.set(step, list);
  });
}
