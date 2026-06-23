// ─────────────────────────────────────────────────────────────────────────────
// handpan — Brücke zwischen DB-Row und App-Typ + Ableitung der Playback-Pitchmap
//
// Die handpans.notes-Spalte ist jsonb → in database.types.ts als `Json` typisiert.
// rowToHandpan ist die EINZIGE Stelle, an der wir Json → HandpanNote[] verengen.
// ─────────────────────────────────────────────────────────────────────────────

import type { HandpanNote } from '../../data/handpan-templates';
import type { Database } from './supabase/database.types';

export type { HandpanNote };

type HandpanRow = Database['public']['Tables']['handpans']['Row'];

/** Gespeichertes User-Instrument mit verengtem notes-Typ. */
export interface Handpan extends Omit<HandpanRow, 'notes'> {
  notes: HandpanNote[];
}

/** DB-Row → App-Handpan. Einzige Json→HandpanNote[]-Verengungsgrenze. */
export function rowToHandpan(row: HandpanRow): Handpan {
  return {
    ...row,
    notes: (row.notes as unknown as HandpanNote[]) ?? [],
  };
}

/** Was der DayPlayer zum Klingen braucht — serialisierbar über die RSC-Grenze. */
export interface PitchMap {
  /** Tonhöhe des Dings, z.B. "D3". */
  ding: string;
  /** Tonfeld-Tonhöhen in Layout-Reihenfolge (max. 8 — siehe v1-Vereinfachung). */
  tonfields: string[];
}

/**
 * Normalisiert ein Pitch-Label zu einem gültigen Tone.js-Notennamen:
 * Unicode-Vorzeichen (♯/♭) → ASCII (#/b), Whitespace getrimmt.
 */
export function normalizePitch(label: string): string {
  return label.trim().replace(/♯/g, '#').replace(/♭/g, 'b');
}

/**
 * Leitet die PitchMap aus dem aktiven Handpan ab.
 *
 * v1-Vereinfachung (bewusst): notes[0] = Ding, die ersten 8 Nicht-Ding-Noten in
 * Layout-Reihenfolge = Tonfelder. Bottom-/Extra-Töne sind in v1 stumm (bis die
 * Stufe-3-Notennotation pro Step landet). Gibt null zurück, wenn kein Instrument
 * oder keine Tonfelder vorhanden sind → DayPlayer fällt auf A4/C2 zurück.
 */
export function derivePitchMap(h: Handpan | null): PitchMap | null {
  if (!h || h.notes.length === 0) return null;
  const ding = normalizePitch(h.notes[0].label);
  const tonfields = h.notes.slice(1, 9).map((n) => normalizePitch(n.label));
  if (tonfields.length === 0) return null;
  return { ding, tonfields };
}
