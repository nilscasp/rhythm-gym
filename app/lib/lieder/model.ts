// Übernommen aus ~/Code/handpan-tabs (Tab-Player). Rein, ohne DOM.
// Datenmodell eines Handpan-Tabs.
// Ein Takt besteht aus Zellen, getrennt für rechte Hand (R, über der Linie) und linke Hand (L, darunter).
// Normalfall: `beats` Schläge mit je `sub` Zellen. Abweichende Takte (Triolen, geteilte Zellen,
// 5/4 …) tragen ein eigenes Raster `durs` (Dauer jeder Zelle in Schlägen).

export type Hand = "R" | "L";
/**
 * Feldnummer (1, 2, …) oder Spielweise:
 * D Ding · T Ding-Schulter · S Slap/Tak · P Palm mute · F Faust · K Klopfen · "*" Geisternote (Antippen)
 */
export type Perc = "T" | "S" | "P" | "F" | "K" | "*";
export type NoteRef = number | "D" | Perc;
export const PERC: Perc[] = ["T", "S", "P", "F", "K", "*"];
export const PERC_NAME: Record<Perc, string> = {
  T: "Ding-Schulter",
  S: "Slap / Tak",
  P: "Palm mute",
  F: "Faust",
  K: "Klopfen",
  "*": "Geisternote",
};
/** Effekte: M gedämpft · O Oktav-Flageolett · H Quint-Flageolett · G Vorschlag/Flam · R Fingerwirbel */
export type Fx = "M" | "O" | "H" | "G" | "R";

export interface Hit {
  n: NoteRef;
  /** Lautstärke 0 (sehr leise) … 4 (sehr laut), fehlt = 2 (normal) */
  dyn?: number;
  fx?: Fx;
}
export type Cell = Hit[];

export interface Measure {
  R: Cell[];
  L: Cell[];
  /** eigenes Raster: Dauer jeder Zelle in Schlägen (fehlt = beats × sub gleich lang) */
  durs?: number[];
}

export interface Section {
  name: string;
  /** erster Takt (Index) */
  start: number;
  /** Takt nach dem letzten (exklusiv) */
  end: number;
}

export interface Tempo {
  measure: number;
  beat: number;
  bpm: number;
  /** allmählich zu diesem Tempo … */
  to?: number;
  /** … über so viele Schläge */
  over?: number;
}

export type Difficulty = "Leicht" | "Mittel" | "Schwer";

export interface PadDef {
  num: number | "D";
  name: string;
  /** Mittelpunkt und Radius in beliebigen Einheiten (wird eingepasst) */
  x: number;
  y: number;
  r: number;
  bottom?: boolean;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  difficulty: Difficulty;
  handpan: string;
  /** mitgelieferte Handpan (z. B. aus einem Import), hat Vorrang vor `handpan` */
  handpanDef?: { name: string; pads: PadDef[] };
  bpm: number;
  beats: number;
  sub: number;
  measures: Measure[];
  sections: Section[];
  tempos?: Tempo[];
  notes?: { measure: number; text: string }[];
  custom?: boolean;
  /** nur zum Ausprobieren: nicht für andere freigeben */
  privat?: boolean;
}

/** Schreibform zum Notieren von Hand: ein Takt = eine Zeile Tokens pro Hand. */
export interface SongSource extends Omit<Song, "measures" | "sections"> {
  sections: { name: string; repeat?: number; measures: { R: string; L: string; grid?: string }[] }[];
}

// ---------- Token ----------
// "." leer · "8" Feld · "D" Ding · "S" Tak … · "4+8" zugleich
// Lautstärke: "8>" laut, "8>>" sehr laut, "(8)" leise, "((8))" sehr leise
// Effekt: "8~G" (Vorschlag) usw.
export function parseCell(tok: string): Cell {
  if (tok === "." || tok === "") return [];
  const out: Cell = [];
  for (const raw of tok.split("+")) {
    let p = raw.trim();
    let dyn = 2;
    let fx: Fx | undefined;
    const fxm = /~([MOHGR])$/.exec(p);
    if (fxm) {
      fx = fxm[1] as Fx;
      p = p.slice(0, -2);
    }
    if (p.startsWith("((") && p.endsWith("))")) {
      dyn = 0;
      p = p.slice(2, -2);
    } else if (p.startsWith("(") && p.endsWith(")")) {
      dyn = 1;
      p = p.slice(1, -1);
    } else if (p.endsWith(">>")) {
      dyn = 4;
      p = p.slice(0, -2);
    } else if (p.endsWith(">")) {
      dyn = 3;
      p = p.slice(0, -1);
    }
    const up = p.toUpperCase();
    let n: NoteRef | null = null;
    if (up === "D" || (PERC as string[]).includes(up)) n = up as NoteRef;
    else if (/^\d+$/.test(p) && Number(p) > 0) n = Number(p);
    if (n === null) continue;
    const hit: Hit = { n };
    if (dyn !== 2) hit.dyn = dyn;
    if (fx) hit.fx = fx;
    out.push(hit);
  }
  return out;
}

export function hitToken(h: Hit): string {
  let t = String(h.n);
  const d = h.dyn ?? 2;
  if (d === 3) t += ">";
  if (d === 4) t += ">>";
  if (d === 1) t = `(${t})`;
  if (d === 0) t = `((${t}))`;
  if (h.fx) t += `~${h.fx}`;
  return t;
}

export function cellToken(c: Cell): string {
  return c.length ? c.map(hitToken).join("+") : ".";
}

// ---------- Raster ----------
/** Raster-Schreibweise je Schlag: "4" = 4 Zellen, "4:2" = 4 Zellen, die dritte geteilt, "3" = Triole */
export function parseGrid(grid: string): number[] {
  const durs: number[] = [];
  for (const g of grid.trim().split(/\s+/)) {
    const [subS, ...splits] = g.split(":");
    const sub = Number(subS);
    const split = new Set(splits.map(Number));
    for (let i = 0; i < sub; i++) {
      if (split.has(i)) durs.push(1 / sub / 2, 1 / sub / 2);
      else durs.push(1 / sub);
    }
  }
  return durs;
}

export function gridToString(durs: number[]): string {
  // in Schläge zerlegen und je Schlag Unterteilung + geteilte Zellen ermitteln
  const out: string[] = [];
  let i = 0;
  while (i < durs.length) {
    let sum = 0;
    const beat: number[] = [];
    while (i < durs.length && sum < 1 - 1e-6) {
      beat.push(durs[i]);
      sum += durs[i++];
    }
    const sub = Math.round(1 / Math.max(...beat));
    const splits: number[] = [];
    for (let j = 0, k = 0; j < beat.length; k++) {
      if (Math.abs(beat[j] - 1 / sub / 2) < 1e-6) {
        splits.push(k);
        j += 2;
      } else j += 1;
    }
    out.push([sub, ...splits].join(":"));
  }
  return out.join(" ");
}

export function measureDurs(song: Song, m: Measure): number[] {
  return m.durs ?? Array.from({ length: song.beats * song.sub }, () => 1 / song.sub);
}

const sameDurs = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) < 1e-9);

// ---------- Lesen / Schreiben ----------
export function parseSong(src: SongSource): Song {
  const spm = src.beats * src.sub;
  const measures: Measure[] = [];
  const sections: Section[] = [];
  for (const sec of src.sections) {
    const start = measures.length;
    for (let r = 0; r < (sec.repeat ?? 1); r++) {
      sec.measures.forEach((m, i) => {
        const durs = m.grid ? parseGrid(m.grid) : undefined;
        const n = durs?.length ?? spm;
        const line = (s: string, hand: string) => {
          const toks = s.trim().split(/\s+/).filter(Boolean);
          if (toks.length && toks.length !== n) console.warn(`${src.title} / ${sec.name} / Takt ${i + 1} ${hand}: ${toks.length} statt ${n} Zellen`);
          return Array.from({ length: n }, (_, k) => parseCell(toks[k] ?? "."));
        };
        const meas: Measure = { R: line(m.R, "R"), L: line(m.L, "L") };
        if (durs) meas.durs = durs;
        measures.push(meas);
      });
    }
    sections.push({ name: sec.name, start, end: measures.length });
  }
  const meta: Partial<SongSource> = { ...src };
  delete meta.sections;
  return { ...(meta as Omit<SongSource, "sections">), measures, sections };
}

export function songToSource(song: Song): SongSource {
  const { measures, sections, ...meta } = song;
  const secs = sections.length ? sections : [{ name: "Teil", start: 0, end: measures.length }];
  const regular = Array.from({ length: song.beats * song.sub }, () => 1 / song.sub);
  return {
    ...meta,
    sections: secs.map((s) => ({
      name: s.name,
      measures: measures.slice(s.start, s.end).map((m) => {
        const out: { R: string; L: string; grid?: string } = {
          R: m.R.map(cellToken).join(" "),
          L: m.L.map(cellToken).join(" "),
        };
        if (m.durs && !sameDurs(m.durs, regular)) out.grid = gridToString(m.durs);
        return out;
      }),
    })),
  };
}

export function emptyMeasure(song: Song): Measure {
  const spm = song.beats * song.sub;
  return { R: Array.from({ length: spm }, () => []), L: Array.from({ length: spm }, () => []) };
}

// ---------- Zeitachse ----------
export interface SongIndex {
  /** erster Schritt (Zelle) jedes Takts, plus Gesamtzahl am Ende */
  start: number[];
  total: number;
  measureOf: Int32Array;
  /** Position in Schlägen ab Songbeginn */
  beatPos: Float64Array;
  dur: Float64Array;
  /** Zelle beginnt auf einem Schlag; Wert = Schlag im Takt (0 = Taktanfang), sonst -1 */
  onBeat: Int16Array;
  /** Sekunden ab Songbeginn beim Grundtempo des Songs */
  sec: Float64Array;
  /** Takt-Index → Startschlag */
  measureBeat: number[];
}

const cache = new WeakMap<Song, SongIndex>();

export function invalidate(song: Song) {
  cache.delete(song);
}

export function index(song: Song): SongIndex {
  const hit = cache.get(song);
  if (hit) return hit;
  const start: number[] = [];
  const measureBeat: number[] = [];
  let total = 0;
  let beatAcc = 0;
  for (const m of song.measures) {
    start.push(total);
    measureBeat.push(beatAcc);
    const d = measureDurs(song, m);
    total += d.length;
    beatAcc += d.reduce((a, b) => a + b, 0);
  }
  start.push(total);
  const measureOf = new Int32Array(total);
  const beatPos = new Float64Array(total + 1);
  const dur = new Float64Array(total);
  const onBeat = new Int16Array(total);
  let s = 0;
  let pos = 0;
  song.measures.forEach((m, mi) => {
    let inMeasure = 0;
    for (const d of measureDurs(song, m)) {
      measureOf[s] = mi;
      beatPos[s] = pos;
      dur[s] = d;
      const r = Math.round(inMeasure);
      onBeat[s] = Math.abs(inMeasure - r) < 1e-6 ? r : -1;
      inMeasure += d;
      pos += d;
      s++;
    }
  });
  beatPos[total] = pos;

  // Tempokarte in absoluten Schlägen
  const tempos = (song.tempos?.length ? song.tempos : [{ measure: 0, beat: 0, bpm: song.bpm }])
    .map((t) => ({ at: (measureBeat[t.measure] ?? 0) + t.beat, bpm: t.bpm, to: t.to, over: t.over }))
    .sort((a, b) => a.at - b.at);
  const bpmAt = (b: number) => {
    let cur = tempos[0];
    for (const t of tempos) if (t.at <= b + 1e-9) cur = t;
    if (cur.to && cur.over && b < cur.at + cur.over) return cur.bpm + ((cur.to - cur.bpm) * (b - cur.at)) / cur.over;
    if (cur.to && cur.over) return cur.to;
    return cur.bpm;
  };
  const sec = new Float64Array(total + 1);
  for (let i = 0; i < total; i++) {
    // Mittelpunktregel genügt für die kurzen Zellen
    sec[i + 1] = sec[i] + (dur[i] * 60) / bpmAt(beatPos[i] + dur[i] / 2);
  }
  const idx = { start, total, measureOf, beatPos, dur, onBeat, sec, measureBeat };
  cache.set(song, idx);
  return idx;
}

export function totalSteps(song: Song): number {
  return index(song).total;
}

export function stepOfMeasure(song: Song, m: number): number {
  return index(song).start[Math.max(0, Math.min(m, song.measures.length))];
}

export function locate(song: Song, step: number): { m: number; i: number } {
  const ix = index(song);
  const m = ix.measureOf[Math.max(0, Math.min(step, ix.total - 1))] ?? 0;
  return { m, i: step - ix.start[m] };
}

export function cellAt(song: Song, step: number, hand: Hand): Cell {
  const ix = index(song);
  if (step < 0 || step >= ix.total) return [];
  const { m, i } = locate(song, step);
  return song.measures[m]?.[hand][i] ?? [];
}

/** Nächster Schritt ab `from` (inklusive), an dem die Hand etwas spielt. */
export function nextHitStep(song: Song, from: number, hand: Hand, until = totalSteps(song)): number | null {
  for (let s = Math.max(0, from); s < until; s++) if (cellAt(song, s, hand).length) return s;
  return null;
}

export function sectionOfMeasure(song: Song, m: number): Section | undefined {
  return song.sections.find((s) => m >= s.start && m < s.end);
}

/** Grundtempo an einem Takt (für die Anzeige der Tempo-Marken) */
export function tempoMarks(song: Song): Map<number, Tempo[]> {
  const map = new Map<number, Tempo[]>();
  for (const t of song.tempos ?? []) {
    const list = map.get(t.measure) ?? [];
    list.push(t);
    map.set(t.measure, list);
  }
  return map;
}
