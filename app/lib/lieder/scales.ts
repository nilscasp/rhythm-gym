import type { PadDef, Song } from "./model";

// Handpan-Stimmungen und ihre Anordnung.
// Felder auf der Oberseite werden im Zickzack nummeriert: 1 unten, dann abwechselnd links/rechts nach oben.
// Bodenfelder (Bottoms) folgen mit den nächsten Nummern und liegen außerhalb des Rings.

export interface Handpan {
  id: string;
  name: string;
  ding: string;
  top: string[];
  bottoms?: { name: string; angle: number }[];
}

export interface Pad {
  num: number | "D";
  name: string;
  freq: number;
  x: number;
  y: number;
  r: number;
  bottom?: boolean;
}

export const HANDPANS: Handpan[] = [
  {
    id: "cs-annaziska-12",
    name: "C# Annaziska 12+1",
    ding: "C#3",
    top: ["G#3", "A3", "B3", "C#4", "D#4", "E4", "F#4", "G#4"],
    // Winkel in Grad, Bildschirmkoordinaten (0° = rechts, 90° = unten)
    bottoms: [
      { name: "E3", angle: 26 },
      { name: "F#3", angle: 154 },
      { name: "B4", angle: -19 },
      { name: "C#5", angle: 199 },
    ],
  },
  {
    id: "cs-annaziska-9",
    name: "C# Annaziska 9",
    ding: "C#3",
    top: ["G#3", "A3", "B3", "C#4", "D#4", "E4", "F#4", "G#4", "B4"],
  },
  {
    id: "d-kurd-9",
    name: "D Kurd 9",
    ding: "D3",
    top: ["A3", "Bb3", "C4", "D4", "E4", "F4", "G4", "A4", "C5"],
  },
  {
    id: "d-kurd-10",
    name: "D Kurd 10",
    ding: "D3",
    top: ["A3", "Bb3", "C4", "D4", "E4", "F4", "G4", "A4", "C5"],
    bottoms: [{ name: "D5", angle: -20 }],
  },
  {
    id: "d-celtic-8",
    name: "D Celtic Minor 8",
    ding: "D3",
    top: ["A3", "C4", "D4", "E4", "F4", "G4", "A4", "C5"],
  },
];

/** Kennung für „die Handpan, die im Tab mitgeliefert ist“ */
export const SONG_PAN = "song";

export function handpanById(id: string): Handpan {
  return HANDPANS.find((h) => h.id === id) ?? HANDPANS[0];
}

export function handpanName(song: Song, id = song.handpan): string {
  if (id === SONG_PAN && song.handpanDef) return song.handpanDef.name;
  return handpanById(id).name;
}

const SEMI: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function noteFreq(name: string): number {
  const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(name.trim());
  if (!m) return 0;
  const semi = SEMI[m[1].toUpperCase()] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
  const midi = (Number(m[3]) + 1) * 12 + semi;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Koordinaten im SVG-Rahmen -200…200. */
export function layout(hp: Handpan): Pad[] {
  const n = hp.top.length;
  const step = 360 / n;
  const ringR = 100;
  const padR = n > 9 ? 21 : 24;
  const pads: Pad[] = [{ num: "D", name: hp.ding, freq: noteFreq(hp.ding), x: 0, y: 0, r: 38 }];
  hp.top.forEach((name, i) => {
    const k = Math.ceil(i / 2);
    const side = i === 0 ? 0 : i % 2 === 1 ? 1 : -1;
    const a = ((90 + side * k * step) * Math.PI) / 180;
    pads.push({ num: i + 1, name, freq: noteFreq(name), x: Math.cos(a) * ringR, y: Math.sin(a) * ringR, r: padR });
  });
  (hp.bottoms ?? []).forEach((b, j) => {
    const a = (b.angle * Math.PI) / 180;
    pads.push({ num: n + 1 + j, name: b.name, freq: noteFreq(b.name), x: Math.cos(a) * 160, y: Math.sin(a) * 160, r: 24, bottom: true });
  });
  return pads;
}

/** Mitgelieferte Felder (z. B. aus Notepan) in den Rahmen -200…200 einpassen. */
export function layoutFromDef(def: { pads: PadDef[] }): Pad[] {
  const ding = def.pads.find((p) => p.num === "D") ?? def.pads[0];
  const cx = ding.x;
  const cy = ding.y;
  const reach = Math.max(...def.pads.map((p) => Math.hypot(p.x - cx, p.y - cy) + p.r));
  const k = 182 / reach;
  return def.pads.map((p) => {
    return {
      num: p.num,
      name: p.name,
      freq: noteFreq(p.name),
      x: (p.x - cx) * k,
      y: (p.y - cy) * k,
      r: Math.max(p.num === "D" ? 34 : 20, p.r * k),
      bottom: p.bottom,
    };
  });
}

export function padsFor(song: Song, id: string): Pad[] {
  if (id === SONG_PAN && song.handpanDef) return layoutFromDef(song.handpanDef);
  return layout(handpanById(id));
}
