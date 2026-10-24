import type { Cell, Fx, Hit, Measure, NoteRef, PadDef, Song, Tempo } from "./model";

// Liest eine aus Notepan exportierte Datei (.pan, Format 2.x).
// Aufbau (Little Endian, Texte mit 7-Bit-Längenpräfix wie bei .NET):
//   "PAN" · Version · Titel · Künstler · Handpan (Felder mit Ton und Lage) ·
//   Taktraster (je Schlag: Takt, Schlag, Unterteilung) · geteilte Zellen ·
//   Noten (12 Byte: Zelle, Zeile, Feld, Lautstärke, Effekte) · Hinweise · Abschnitte · Tempi

const PITCH = ["C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B"];
const PERC_CODE: Record<number, NoteRef> = { 150: "*", 151: "S", 152: "T", 153: "F", 154: "K", 161: "P" };

class Reader {
  o = 0;
  dv: DataView;
  constructor(readonly b: Uint8Array) {
    this.dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  }
  u8() { return this.b[this.o++]; }
  u16() { const v = this.dv.getUint16(this.o, true); this.o += 2; return v; }
  i32() { const v = this.dv.getInt32(this.o, true); this.o += 4; return v; }
  f32() { const v = this.dv.getFloat32(this.o, true); this.o += 4; return v; }
  f64() { const v = this.dv.getFloat64(this.o, true); this.o += 8; return v; }
  str() {
    let len = 0, sh = 0, x: number;
    do { x = this.u8(); len |= (x & 0x7f) << sh; sh += 7; } while (x & 0x80);
    const s = new TextDecoder().decode(this.b.slice(this.o, this.o + len));
    this.o += len;
    return s;
  }
}

interface RawPad { id: number; pitch: number; oct: number; x: number; y: number; w: number; h: number; label: string; end: number }

function padAt(r: Reader, o: number): RawPad | null {
  const b = r.b;
  if (o + 48 > b.length) return null;
  const id = b[o], pitch = b[o + 1], oct = b[o + 2];
  if (pitch > 16 || oct > 8) return null;
  const d = [0, 1, 2, 3, 4].map((i) => r.dv.getFloat64(o + 7 + i * 8, true));
  if (d.some((v) => !Number.isFinite(v) || v < -10 || v > 5000)) return null;
  const ll = b[o + 47];
  if (ll > 4) return null;
  const label = new TextDecoder().decode(b.slice(o + 48, o + 48 + ll));
  if (!/^[0-9A-Za-z]*$/.test(label)) return null;
  return { id, pitch, oct, x: d[0], y: d[1], w: d[2], h: d[3], label, end: o + 48 + ll };
}

/** Taktraster suchen: Anzahl, dann (Takt 0, Schlag 0), (0, 1) … streng fortlaufend. */
function findBeatTable(r: Reader, from: number): number {
  const b = r.b;
  for (let o = from; o < b.length - 16; o++) {
    const n = r.dv.getInt32(o, true);
    if (n < 1 || n > 200000 || o + 4 + n * 4 > b.length) continue;
    let ok = true;
    let pm = 0, pb = -1;
    for (let i = 0; i < Math.min(n, 64) && ok; i++) {
      const p = o + 4 + i * 4;
      const m = r.dv.getUint16(p, true), beat = b[p + 2], sub = b[p + 3];
      if (sub < 1 || sub > 16) ok = false;
      else if (m === pm && beat === pb + 1) pb = beat;
      else if (m === pm + 1 && beat === 0 && i > 0) { pm = m; pb = 0; }
      else ok = false;
    }
    if (ok) return o;
  }
  throw new Error("Taktraster nicht gefunden");
}

export function importPan(buf: ArrayBuffer): Song {
  const r = new Reader(new Uint8Array(buf));
  if (new TextDecoder().decode(r.b.slice(0, 3)) !== "PAN") throw new Error("Keine Notepan-Datei");
  r.o = 3;
  const version = r.str();
  if (!version.startsWith("2.")) console.warn("Unbekannte Notepan-Version", version);
  r.i32();
  r.u16();
  const title = r.str();
  const artist = r.str();
  const afterHeader = r.o;

  // Handpan-Felder: erstes gültiges Feld mit Nummer "1" suchen, dann Feld für Feld weiter
  const pads: RawPad[] = [];
  for (let o = afterHeader; o < Math.min(r.b.length, 4096) && !pads.length; o++) {
    const p = padAt(r, o);
    if (p && p.label === "1" && p.pitch > 0 && p.oct > 0) {
      let q: RawPad | null = p;
      while (q) {
        pads.push(q);
        q = padAt(r, q.end);
      }
    }
  }
  let handpanName = "";
  {
    // Name der Handpan steht zwischen Kopf und Feldern
    const r2 = new Reader(r.b);
    r2.o = afterHeader;
    for (let i = 0; i < 6 && r2.o < r.b.length; i++) {
      const save = r2.o;
      try {
        const s = r2.str();
        if (/^[A-G][#b]? .{2,40}$/.test(s)) { handpanName = s; break; }
      } catch {}
      r2.o = save + 1;
    }
  }
  const tonePads = pads.filter((p) => p.pitch > 0 && p.oct > 0 && p.label);
  const idToNum = new Map<number, number | "D">();
  const padDefs: PadDef[] = tonePads.map((p) => {
    const num: number | "D" = p.label.toUpperCase() === "D" ? "D" : Number(p.label);
    idToNum.set(p.id, num);
    return { num, name: `${PITCH[p.pitch]}${p.oct}`, x: p.x + p.w / 2, y: p.y + p.h / 2, r: p.w / 2, bottom: p.id >= 30 && p.id < 50 };
  });

  // Taktraster
  r.o = findBeatTable(r, pads.length ? pads[pads.length - 1].end : afterHeader);
  const nb = r.i32();
  const beats: { m: number; beat: number; sub: number }[] = [];
  for (let i = 0; i < nb; i++) beats.push({ m: r.u16(), beat: r.u8(), sub: r.u8() });
  const ns = r.i32();
  const splits = new Set<string>();
  for (let i = 0; i < ns; i++) splits.add(`${r.u16()}.${r.u8()}.${r.u8()}`);

  const nMeasures = beats.length ? beats[beats.length - 1].m + 1 : 0;
  const durs: number[][] = Array.from({ length: nMeasures }, () => []);
  const slotPos: { m: number; i: number }[] = [];
  for (const bt of beats) {
    for (let c = 0; c < bt.sub; c++) {
      const parts = splits.has(`${bt.m}.${bt.beat}.${c}`) ? 2 : 1;
      for (let k = 0; k < parts; k++) {
        slotPos.push({ m: bt.m, i: durs[bt.m].length });
        durs[bt.m].push(1 / bt.sub / parts);
      }
    }
  }
  // Zeilen 0/1 = rechte Hand (0 außen), 2/3 = linke Hand (3 außen)
  const rows: Cell[][][] = durs.map((d) => [0, 1, 2, 3].map(() => d.map(() => [] as Cell)));
  const nn = r.i32();
  let skipped = 0;
  for (let i = 0; i < nn; i++) {
    const slot = r.u16();
    const row = r.u8();
    r.o += 4;
    const code = r.u8();
    const dyn = r.u8();
    const e1 = r.u8();
    const e2 = r.u8();
    r.u8();
    const pos = slotPos[slot];
    const n: NoteRef | undefined = idToNum.get(code) ?? PERC_CODE[code];
    if (!pos || n === undefined || row > 3) { skipped++; continue; }
    const hit: Hit = { n };
    if (dyn !== 2 && dyn <= 4) hit.dyn = dyn;
    const fx: Fx | undefined = e2 === 1 ? "G" : e1 === 1 ? "M" : e1 === 3 ? "O" : undefined;
    if (fx) hit.fx = fx;
    rows[pos.m][row][pos.i].push(hit);
  }
  if (skipped) console.warn(`${skipped} Noten nicht zugeordnet`);

  const notes: { measure: number; text: string }[] = [];
  const na = r.i32();
  for (let i = 0; i < na; i++) {
    const slot = r.u16();
    notes.push({ measure: slotPos[slot]?.m ?? 0, text: r.str() });
  }

  const sections: Song["sections"] = [];
  const nm = r.i32();
  for (let i = 0; i < nm; i++) {
    r.i32();
    const hasSec = r.u8();
    const hasSub = r.u8();
    const sec = hasSec ? r.str() : "";
    const sub = hasSub ? r.str() : "";
    const name = sec && sub ? `${sec} · ${sub}` : sec || sub;
    if (name) {
      if (sections.length) sections[sections.length - 1].end = i;
      sections.push({ name, start: i, end: nMeasures });
    }
  }

  const tempos: Tempo[] = [];
  const nt = r.o + 4 <= r.b.length ? r.i32() : 0;
  for (let i = 0; i < nt; i++) {
    const bpm = r.f32();
    const measure = r.u16();
    const beat = r.u8();
    const to = r.f32();
    const over = r.u8();
    const t: Tempo = { measure, beat, bpm: Math.round(bpm * 10) / 10 };
    if (to > 0 && over > 0) { t.to = Math.round(to * 10) / 10; t.over = over; }
    tempos.push(t);
  }

  const measures: Measure[] = durs.map((d, m) => {
    const [r0, r1, r2, r3] = rows[m];
    const meas: Measure = {
      // Zeile nah an der Linie zuerst, dann die äußere
      R: d.map((_, i) => [...r1[i], ...r0[i]]),
      L: d.map((_, i) => [...r2[i], ...r3[i]]),
    };
    const regular = d.length === 16 && d.every((x) => Math.abs(x - 0.25) < 1e-9);
    if (!regular) meas.durs = d;
    return meas;
  });

  const bpm = tempos[0]?.bpm ?? 80;
  return {
    id: `pan-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title,
    artist,
    difficulty: "Schwer",
    handpan: "song",
    handpanDef: padDefs.length ? { name: handpanName || "Handpan aus Notepan", pads: padDefs } : undefined,
    bpm,
    beats: 4,
    sub: 4,
    measures,
    sections: sections.length ? sections : [{ name: "Teil", start: 0, end: measures.length }],
    tempos,
    notes,
    custom: true,
    privat: true,
  };
}
