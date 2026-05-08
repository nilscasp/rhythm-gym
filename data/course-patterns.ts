import zyklus2 from './rhythmen_zyklus2.json';

// ─────────────────────────────────────────────────────────────────────────────
// Types — derived from SCHEMA.md (rhythmen_zyklus2.json schema 1.0)
// ─────────────────────────────────────────────────────────────────────────────

/** The four strike types in a Zyklus-2 pattern. */
export type Strike = 'ding' | 'slap' | 'tonfeld' | 'gn';

/** Hand for a single strike (null = freier Handsatz). */
export type Hand = 'R' | 'L' | null;

/** Hand-pattern key. `frei` = no fixed hand sequence per Takt. */
export type HandPatternKey = 'R-L' | 'L-R' | 'frei';

/** Pattern category. */
export type PatternType = 'basis' | 'stufe' | 'uebung';

/** Track of a Stufen-Variation. */
export type Track = 'perkussiv' | 'melodisch';

export interface StrikeMeta {
  label: string;
  color: string;
  description: string;
  is_accent: boolean;
}

export interface HandPatternMeta {
  label: string;
  pattern_per_takt: ('R' | 'L')[] | null;
}

/** A single 16th-note event — the sequencer-friendly representation. */
export interface PatternEvent {
  /** 0..15 within the four-Takt arc. */
  position: number;
  /** 1..4 (Takt within arc). */
  takt: number;
  /** 1..4 (Sechzehntel within Takt). */
  sub: number;
  /** German counting syllable: "1" | "e" | "und" | "de" | "2" | … */
  counting: string;
  strike: Strike;
  hand: Hand;
}

/** A complete 4-Takt pattern (16 strike positions). */
export interface CoursePattern {
  /** Deterministic ID — `basis`, `stufe_<N>_perkussiv`, `stufe_<N>_melodisch`, `uebung_a|b|c`, `schablone`. */
  id: string;
  label: string;
  type?: PatternType;
  /** 1..4 — only on `type: 'stufe'`. */
  stage?: number;
  track?: Track;
  /** 1..4 — which Takt the variation lives on. */
  focus_takt?: number;
  /** Compact 2D representation: `takte[Takt-1][Sub-1]` = strike key. */
  takte: Strike[][];
  /** Flat sequencer-friendly event list, length 16. */
  events: PatternEvent[];
  /** Used on Tag-21 Übungen — pattern loops on its own. */
  loop?: boolean;
}

export interface KombiSequenceEntry {
  bogen: number;
  pattern_id: string;
  /** Present on multi-round Kombis (Tag 17/18). */
  runde?: number;
}

export interface Kombi {
  name: string;
  description: string;
  loop: boolean;
  rounds: number;
  sequence: KombiSequenceEntry[];
}

export interface DayOption {
  id: string;
  name: string;
  description: string;
  structure: {
    bogen_count: number;
    loop: boolean;
    variation_starts_at_bogen?: number;
    source?: string;
  };
}

export interface CourseDay {
  /** 12..22 in Zyklus 2. */
  number: number;
  title: string;
  subtitle: string;
  summary: string;
  handsatz: HandPatternKey;
  /** 1..4 — `null` on Tag 12, 21, 22. */
  focus_takt: number | null;
  patterns: CoursePattern[];
  kombi: Kombi | null;
  options: DayOption[] | null;
}

export interface CourseConstants {
  strike_types: Record<Strike, StrikeMeta>;
  hand_pattern_types: Record<HandPatternKey, HandPatternMeta>;
  /** 4 arrays of 4 syllables. */
  counting_per_takt: string[][];
  structure: {
    takt_count: number;
    subdivisions_per_takt: number;
    total_subdivisions: number;
    subdivision_unit: string;
    time_signature_explanation: string;
  };
}

export interface Cycle {
  number: number;
  title: string;
  subtitle: string;
  day_count: number;
  day_range: [number, number];
}

export interface CourseCycle {
  schema_version: string;
  generated: string;
  cycle: Cycle;
  constants: CourseConstants;
  days: CourseDay[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Data — typed cast of the imported JSON.
// JSON is validated against SCHEMA.md at author-time; runtime types are trusted.
// ─────────────────────────────────────────────────────────────────────────────

export const zyklus2Data = zyklus2 as unknown as CourseCycle;

export const constants: CourseConstants = zyklus2Data.constants;
export const days: CourseDay[] = zyklus2Data.days;

/** Flat counting array of 16 syllables for a complete arc. */
export const counting16: string[] = constants.counting_per_takt.flat();

/** Look up a day by its number (12..22). Returns undefined if not in cycle. */
export function getDay(num: number): CourseDay | undefined {
  return days.find((d) => d.number === num);
}

/** Look up a pattern within a day by its id. Returns undefined if not present. */
export function getPattern(day: CourseDay, patternId: string): CoursePattern | undefined {
  return day.patterns.find((p) => p.id === patternId);
}

/** Default starting day for first-time visitors of /training. */
export const FIRST_DAY = zyklus2Data.cycle.day_range[0];
