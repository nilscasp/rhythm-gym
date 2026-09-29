// ─────────────────────────────────────────────────────────────────────────────
// Rhythmus-Fundament — 44-Tage-Daten (Tag 41–44 folgen; siehe COURSE_TOTAL_DAYS)
//
// Pro Tag:
//   - Metadaten (Titel, Untertitel, Zyklus-Zugehörigkeit)
//   - mehrere Presets (jeweils 16-Step .gTSD-Pattern + Handsatz + BPM)
//   - Markdown-Body wird at request time aus content/rhythmusfundament/tag-N.md
//     gelesen — nicht hier embedded, damit der TS-Build schlank bleibt.
//
// Pattern-Encoding (gleich wie /tool):
//   . = Pause   g = Ghostnote   T = Tonfeld   S = Slap   D = Ding
//
// 16-Step-Grid: 4 Takte × 4 Sechzehntel pro Takt.
//   Position 0  → Takt 1 · 1
//   Position 4  → Takt 2 · 1
//   Position 8  → Takt 3 · 1
//   Position 12 → Takt 4 · 1
//
// Handsatz-Keys mirror /tool exakt (HandsatzKey).
// ─────────────────────────────────────────────────────────────────────────────

export type RhythmusHandsatzKey =
  | 'R-L'
  | 'L-R'
  | 'RR-LL'
  | 'LL-RR'
  | 'paradiddle'
  | 'frei';

export type RhythmusSubdivisionKey = '4n' | '8n' | '8t' | '16n' | '32n';

export interface RhythmusPreset {
  /** Stable per-day-unique id, used in URLs + React keys. */
  id: string;
  /** Button-Label (kurz, max ~32 chars). */
  label: string;
  /** 1-line hint shown under label or in tooltip — optional. */
  hint?: string;
  /** Strike sequence: 1–128 chars (über 16 bricht der Player in Zeilen à 16 um) from set `.gTSDXP` (X = Slap + Tonfeld gleichzeitig, P = Wiederholungston: immer dasselbe Tonfeld). */
  pattern: string;
  /**
   * Optional: die durchlaufende Hand als eigene Spur (gleiche Länge wie
   * `pattern`, meist `P` oder `g`) — ein Tonfeld, das einfach wiederholt wird
   * und trägt (nicht „der Puls": der ist die 1). Dann ist `pattern` die
   * Spielhand, und beide klingen pro Schritt gleichzeitig.
   */
  wiederholung?: string;
  handsatz: RhythmusHandsatzKey;
  /** Empfohlenes Start-Tempo. User kann live ändern. */
  bpm: number;
  /** Optional — defaults to `16n` wenn nicht gesetzt. */
  subdivision?: RhythmusSubdivisionKey;
}

export interface RhythmusDay {
  /** 1..44 */
  number: number;
  /** Kurztitel — z.B. "Womit alles beginnt". */
  title: string;
  /** Untertitel — z.B. "Rhythmus und am Ende Kunst". Default fallback. */
  subtitle: string;
  /** 1-line ESSENZ-Auszug aus dem Markdown (für Index-Card + meta). */
  essence: string;
  /** Zyklus-Zugehörigkeit (1, 2, 3). */
  cycle: 1 | 2 | 3 | 4;
  /** Mehrere Presets — User wechselt per Klick. */
  presets: RhythmusPreset[];
  /** Hat dieser Tag Overview/LowerThird PNGs unter /public/rhythmusfundament/grafiken/tag-N/? */
  hasGrafik: boolean;
  /**
   * Bunny Stream Video-GUID für diesen Tag — wenn gesetzt, rendert die
   * Tag-Seite den Video-Player oben (über dem Markdown-Body). Format:
   * `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (UUID). Wird aus dem
   * Bunny-Stream-Dashboard kopiert. Library-ID liegt in NEXT_PUBLIC_BUNNY_LIBRARY_ID.
   */
  videoId?: string;
  /**
   * Sprungmarken ins Tagesvideo, eine je Aufgabe — Grundlage der Übe-Station
   * unter dem Video. Vorschläge erzeugt `scripts/chapters/propose.ts` aus dem
   * Whisper-Transkript; Nils prüft, bevor sie hier landen.
   */
  chapters?: VideoChapter[];
}

export interface VideoChapter {
  /** Kurz, z. B. "Stufe 2 · zwei Töne im Fill". */
  label: string;
  /** Sekunden ab Videobeginn, immer auf einem Satzanfang. */
  start: number;
  /** Sekunden; fehlt → Start des nächsten Kapitels bzw. Videoende. */
  end?: number;
  /** Preset-ID dieses Tages für „Selbst üben". */
  presetId?: string;
  /** Unterübung der vorherigen Übung (z. B. „Bass dazu") — eingerückt gelistet. */
  sub?: boolean;
}

export interface RhythmusCycle {
  number: 1 | 2 | 3 | 4;
  title: string;
  subtitle: string;
  dayRange: [number, number];
}

// ─────────────────────────────────────────────────────────────────────────────
// Zyklen
// ─────────────────────────────────────────────────────────────────────────────

export const RHYTHMUS_CYCLES: readonly RhythmusCycle[] = [
  {
    number: 1,
    title: 'Das Fundament',
    subtitle: 'Puls, Offbeat, Tonleiter, Pattern, Hände',
    dayRange: [1, 11],
  },
  {
    number: 2,
    title: 'Fill-Ins und Breaks',
    subtitle: 'Vom statischen Vier-Takt-Bogen zur ersten eigenen Komposition',
    dayRange: [12, 22],
  },
  {
    number: 3,
    title: 'Unabhängigkeit und Harmonik',
    subtitle: 'Der Handsatz bricht auf — zwei Stimmen, Akkorde, der erste Break',
    dayRange: [23, 33],
  },
  {
    number: 4,
    title: 'Kompositionsrhythmik',
    subtitle: 'Jedem Element seinen eigenen Atem geben — die Drei, die Form, deine Sprache',
    dayRange: [34, 44],
  },
] as const;

export function cycleForDay(num: number): RhythmusCycle {
  for (const c of RHYTHMUS_CYCLES) {
    if (num >= c.dayRange[0] && num <= c.dayRange[1]) return c;
  }
  return RHYTHMUS_CYCLES[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Tages-Daten (bisher Tag 1–40 hochgeladen)
//
// Die `presets[]` arrays werden in Slots gefüllt — leer = Default "Basis" wird
// vom Player aus title/handsatz abgeleitet. Ein leeres `presets` array ist
// ein Hinweis: Tag noch nicht final mit Presets bestückt; Player fällt auf
// das letzte tag-Preset zurück.
// ─────────────────────────────────────────────────────────────────────────────

export const RHYTHMUS_DAYS: readonly RhythmusDay[] = [
  // ─── ZYKLUS 1 — Das Fundament ───────────────────────────────────────────
  {
    number: 1,
    title: 'Womit alles beginnt',
    subtitle: 'Der Puls · Ein Vierer mit fünf Handsätzen',
    essence:
      'Alles beginnt mit einem Puls. Ein Viererrhythmus, fünf Handsätze — das Fundament der Reise.',
    cycle: 1,
    hasGrafik: false,
    videoId: '95686885-6b2b-4934-8d67-f06ffe42db86',
    chapters: [
      { label: 'Einführung · Willkommen zum Kurs', start: 0 },
      { label: 'Vierer · R – L', start: 260, presetId: 'vierer-rl' },
      { label: 'Vierer · L – R', start: 363, presetId: 'vierer-lr' },
      { label: 'Vierer · R – R – L – L', start: 485, presetId: 'vierer-rrll' },
      { label: 'Vierer · L – L – R – R', start: 605, presetId: 'vierer-llrr' },
      { label: 'Paradiddle', start: 697, presetId: 'vierer-paradiddle' },
    ],
    presets: [
      {
        id: 'vierer-rl',
        label: 'Vierer · R – L',
        hint: 'Ding auf 1, Ghostnotes 2/3/4 · Wechselschlag rechts beginnend',
        pattern: 'Dggg',
        handsatz: 'R-L',
        bpm: 60,
        subdivision: '4n',
      },
      {
        id: 'vierer-lr',
        label: 'Vierer · L – R',
        hint: 'Wechselschlag links beginnend',
        pattern: 'Dggg',
        handsatz: 'L-R',
        bpm: 60,
        subdivision: '4n',
      },
      {
        id: 'vierer-rrll',
        label: 'Vierer · R – R – L – L',
        hint: 'Doppelschlag rechts → links',
        pattern: 'Dggg',
        handsatz: 'RR-LL',
        bpm: 60,
        subdivision: '4n',
      },
      {
        id: 'vierer-llrr',
        label: 'Vierer · L – L – R – R',
        hint: 'Doppelschlag links → rechts',
        pattern: 'Dggg',
        handsatz: 'LL-RR',
        bpm: 60,
        subdivision: '4n',
      },
      {
        id: 'vierer-paradiddle',
        label: 'Vierer · Paradiddle',
        hint: 'R – L – R – R – L – R – L – L',
        pattern: 'Dggg' + 'Dggg',
        handsatz: 'paradiddle',
        bpm: 60,
        subdivision: '4n',
      },
    ],
  },
  {
    number: 2,
    title: 'Vom Puls zur Bewegung',
    subtitle: 'Slap auf der 3 · Achtel und Sechzehntel',
    essence:
      'Gestern war der Puls. Heute wird er zur Bewegung. Ein Slap kommt dazu, die Unterteilungen öffnen sich.',
    cycle: 1,
    hasGrafik: false,
    videoId: '3f71bf4d-47e4-4c1e-8077-58b3a3db042f',
    chapters: [
      { label: 'Einführung · Slap 3 · R–L', start: 0, presetId: 'slap-3-rl' },
      { label: 'Handsatz 2 · Slap 3 · L–R', start: 39, presetId: 'slap-3-lr' },
      { label: 'Handsatz 3 · R–R–L–L', start: 109, presetId: 'slap-3-rrll' },
      { label: 'Handsatz 4 · L–L–R–R', start: 166, presetId: 'slap-3-llrr' },
      { label: 'Handsatz 5 · Paradiddle', start: 231, presetId: 'slap-3-paradiddle' },
      { label: 'Subdivisions · Achtel zählen', start: 310, presetId: 'achtel' },
      { label: 'Sechzehntel spüren', start: 469, presetId: 'sechzehntel' },
    ],
    presets: [
      {
        id: 'slap-3-rl',
        label: 'Vierer · Slap 3 · R – L',
        hint: 'Ding 1 · Slap 3 · Ghostnotes 2 und 4',
        pattern: 'DgSg',
        handsatz: 'R-L',
        bpm: 60,
        subdivision: '4n',
      },
      {
        id: 'slap-3-lr',
        label: 'Vierer · Slap 3 · L – R',
        pattern: 'DgSg',
        handsatz: 'L-R',
        bpm: 60,
        subdivision: '4n',
      },
      {
        id: 'slap-3-rrll',
        label: 'Vierer · Slap 3 · R – R – L – L',
        pattern: 'DgSg',
        handsatz: 'RR-LL',
        bpm: 60,
        subdivision: '4n',
      },
      {
        id: 'slap-3-llrr',
        label: 'Vierer · Slap 3 · L – L – R – R',
        pattern: 'DgSg',
        handsatz: 'LL-RR',
        bpm: 60,
        subdivision: '4n',
      },
      {
        id: 'slap-3-paradiddle',
        label: 'Vierer · Slap 3 · Paradiddle',
        pattern: 'DgSg' + 'DgSg',
        handsatz: 'paradiddle',
        bpm: 60,
        subdivision: '4n',
      },
      {
        id: 'viertel',
        label: 'Viertel · Ding 1 · Slap 3',
        hint: '4 Schläge · derselbe Puls, gleich feiner geteilt',
        pattern: 'DgSg',
        handsatz: 'R-L',
        bpm: 60,
        subdivision: '4n',
      },
      {
        id: 'achtel',
        label: 'Achtel · Ding 1 · Slap 3',
        hint: '8 Schläge · Ding und Slap bleiben an ihrem Platz',
        pattern: 'Dg' + 'gg' + 'Sg' + 'gg',
        handsatz: 'R-L',
        bpm: 60,
        subdivision: '8n',
      },
      {
        id: 'sechzehntel',
        label: 'Sechzehntel · Ding 1 · Slap 3',
        hint: 'Dichte 16 · alle Sechzehntel als Ghostnote',
        pattern: 'Dggg' + 'gggg' + 'Sggg' + 'gggg',
        handsatz: 'R-L',
        bpm: 60,
      },
    ],
  },
  {
    number: 3,
    title: 'Der Offbeat erscheint',
    subtitle: 'Slap auf der 4 · Beat und Offbeat im Wechsel',
    essence:
      'Der Akzent wandert. Von der 3 auf die 4 — willkommen im Offbeat.',
    cycle: 1,
    hasGrafik: false,
    videoId: 'afe12704-f38a-4535-bda0-821620cc4f69',
    chapters: [
      { label: 'Einführung · Akzent auf 4', start: 0 },
      { label: 'Handsatz 1 · R – L', start: 94, presetId: 'slap-4-rl' },
      { label: 'Handsatz 2 · L – R', start: 105, presetId: 'slap-4-lr' },
      { label: 'Handsatz 3 · R – R – L – L', start: 159, presetId: 'slap-4-rrll' },
      { label: 'Handsatz 4 · L – L – R – R', start: 233, presetId: 'slap-4-llrr' },
      { label: 'Handsatz 5 · Paradiddle', start: 330, presetId: 'slap-4-paradiddle' },
      { label: 'Beat ↔ Offbeat kombiniert', start: 363, presetId: 'beat-offbeat-wechsel' },
    ],
    presets: [
      {
        id: 'slap-4-rl',
        label: 'Vierer · Slap 4 · R – L',
        hint: 'Ding 1 · Slap 4 · Ghostnotes 2 und 3',
        pattern: 'DggS',
        handsatz: 'R-L',
        bpm: 60,
        subdivision: '4n',
      },
      {
        id: 'slap-4-lr',
        label: 'Vierer · Slap 4 · L – R',
        pattern: 'DggS',
        handsatz: 'L-R',
        bpm: 60,
        subdivision: '4n',
      },
      {
        id: 'slap-4-rrll',
        label: 'Vierer · Slap 4 · R – R – L – L',
        pattern: 'DggS',
        handsatz: 'RR-LL',
        bpm: 60,
        subdivision: '4n',
      },
      {
        id: 'slap-4-llrr',
        label: 'Vierer · Slap 4 · L – L – R – R',
        pattern: 'DggS',
        handsatz: 'LL-RR',
        bpm: 60,
        subdivision: '4n',
      },
      {
        id: 'slap-4-paradiddle',
        label: 'Vierer · Slap 4 · Paradiddle',
        pattern: 'DggS' + 'DggS',
        handsatz: 'paradiddle',
        bpm: 60,
        subdivision: '4n',
      },
      {
        id: 'beat-offbeat-wechsel',
        label: 'Beat ↔ Offbeat im Wechsel',
        hint: 'Takt 1: Slap auf 3 · Takt 2: Slap auf 4 · nur Viertel',
        pattern: 'DgSg' + 'DggS',
        handsatz: 'R-L',
        bpm: 60,
        subdivision: '4n',
      },
    ],
  },
  {
    number: 4,
    title: 'Die Tonleiter erwacht',
    subtitle: 'Tonfeld auf der 1 · Slap auf der 3 · 8 Tonfelder im Kreis',
    essence:
      'Der Rhythmus bekommt eine Stimme. Aus dem Ding auf der 1 werden acht Töne — die Tonleiter beginnt sich zu öffnen.',
    cycle: 1,
    hasGrafik: false,
    videoId: '68dafc41-93e2-4981-9238-19ba5d0695de',
    chapters: [
      { label: 'Einführung · Tonleiter & Rhythmus', start: 0 },
      { label: 'Handsatz 1 · R – L', start: 69, presetId: 'tonleiter-rl' },
      { label: 'Handsatz 2 · L – R', start: 198, presetId: 'tonleiter-lr' },
      { label: 'Handsatz 3 · R–R–L–L', start: 296, presetId: 'tonleiter-rrll' },
      { label: 'Handsatz 4 · L–L–R–R', start: 407, presetId: 'tonleiter-llrr' },
      { label: 'Handsatz 5 · Paradiddle', start: 496, presetId: 'tonleiter-paradiddle' },
    ],
    presets: [
      {
        id: 'tonleiter-rl',
        label: 'Tonleiter · Slap 3 · R – L',
        hint: 'Tonfeld 1 · Slap 3 · mit jeder Wiederholung ein Tonfeld höher',
        pattern: 'TgSg',
        handsatz: 'R-L',
        bpm: 56,
        subdivision: '4n',
      },
      {
        id: 'tonleiter-lr',
        label: 'Tonleiter · Slap 3 · L – R',
        pattern: 'TgSg',
        handsatz: 'L-R',
        bpm: 56,
        subdivision: '4n',
      },
      {
        id: 'tonleiter-rrll',
        label: 'Tonleiter · R – R – L – L',
        pattern: 'TgSg',
        handsatz: 'RR-LL',
        bpm: 56,
        subdivision: '4n',
      },
      {
        id: 'tonleiter-llrr',
        label: 'Tonleiter · L – L – R – R',
        pattern: 'TgSg',
        handsatz: 'LL-RR',
        bpm: 56,
        subdivision: '4n',
      },
      {
        id: 'tonleiter-paradiddle',
        label: 'Tonleiter · Paradiddle',
        hint: 'Hier öffnet sich die Übung — der Paradiddle trägt am weichsten.',
        pattern: 'TgSg' + 'TgSg',
        handsatz: 'paradiddle',
        bpm: 56,
        subdivision: '4n',
      },
    ],
  },
  {
    number: 5,
    title: 'Rhythmus ohne Grenzen',
    subtitle: 'Tonleiter abwärts · freie Bewegung über die ganze Pan',
    essence:
      'Die Tonleiter darf wandern — auf, ab, quer. Der Rhythmus bleibt, nur die Tonfelder werden frei.',
    cycle: 1,
    hasGrafik: false,
    videoId: 'e5f459c4-ccce-4484-a555-e34c064597e5',
    chapters: [
      { label: 'Einführung · Split-Hand Fingerübung', start: 0, presetId: 'paradiddle-quer' },
      { label: 'Nur Zeigefinger · 4er-Rhythmus', start: 112 },
      { label: 'Auf Ding + freie Tonfeld-Akzente', start: 243, presetId: 'frei-quer' },
      { label: 'Unterseite · Faust statt Ding', start: 411 },
      { label: 'Freie Handposition · alle Finger', start: 547 },
      { label: 'Pan quer im Schoß · Offbeat', start: 710 },
    ],
    presets: [
      {
        id: 'aufwaerts',
        label: 'Tonleiter aufwärts · R – L',
        pattern: 'Tggg' + 'gggg' + 'Sggg' + 'gggg',
        handsatz: 'R-L',
        bpm: 56,
      },
      {
        id: 'abwaerts',
        label: 'Tonleiter abwärts · R – L',
        pattern: 'Tggg' + 'gggg' + 'Sggg' + 'gggg',
        handsatz: 'R-L',
        bpm: 56,
      },
      {
        id: 'frei-quer',
        label: 'Frei quer über die Pan',
        hint: 'Freier Handsatz, frei gewählte Tonfelder',
        pattern: 'Tggg' + 'gggg' + 'Sggg' + 'gggg',
        handsatz: 'frei',
        bpm: 60,
      },
      {
        id: 'paradiddle-quer',
        label: 'Paradiddle quer',
        pattern: 'Tggg' + 'gggg' + 'Sggg' + 'gggg',
        handsatz: 'paradiddle',
        bpm: 56,
      },
    ],
  },
  {
    number: 6,
    title: 'Der Rhythmus wird zum Pattern',
    subtitle: 'Erste Verdichtung · feste Tonfeld-Folge wird zur Figur',
    essence:
      'Aus dem Vierer mit wandernder Tonleiter entsteht das erste richtige Pattern — eine wiedererkennbare Figur.',
    cycle: 1,
    hasGrafik: false,
    videoId: 'c597c615-90ae-4bc8-ba76-4b04c577f3b8',
    presets: [
      {
        id: 'pattern-basis',
        label: 'Pattern · Ding · Tonfeld · Slap',
        hint: 'Vier Bögen mit Tonfeld-Antwort',
        pattern: 'Dggg' + 'Tggg' + 'Sggg' + 'Tggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'pattern-verdichtet',
        label: 'Pattern verdichtet',
        hint: 'Mehr Tonfelder auf den Off-Sechzehnteln',
        pattern: 'DgTg' + 'gTgT' + 'SgTg' + 'gTgT',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'pattern-paradiddle',
        label: 'Pattern · Paradiddle',
        pattern: 'Dggg' + 'Tggg' + 'Sggg' + 'Tggg',
        handsatz: 'paradiddle',
        bpm: 60,
      },
    ],
  },
  {
    number: 7,
    title: 'Atem und Architektur',
    subtitle: 'Wenn das Pattern atmet · der Bogen bekommt eine Form',
    essence:
      'Pattern und Atem werden eins. Der Bogen bekommt eine erkennbare Architektur.',
    cycle: 1,
    hasGrafik: false,
    videoId: 'fd7eb077-1e4a-4cbe-8c5a-9cc63dcfd80e',
    presets: [
      {
        id: 'bogen-architektur',
        label: 'Bogen · Architektur',
        hint: 'Vier Takte als eine Form — Anfang, Antwort, Stille, Schluss',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'bogen-melodisch',
        label: 'Bogen · melodisch',
        hint: 'Tonfeld in Takt 3 füllt die Stille',
        pattern: 'Dggg' + 'Sggg' + 'Tggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'bogen-paradiddle',
        label: 'Bogen · Paradiddle',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'paradiddle',
        bpm: 60,
      },
    ],
  },
  {
    number: 8,
    title: 'Die Hände erwachen',
    subtitle: 'Fingerdrill · Hand-Augen-Koordination · freies Spiel · Feuer',
    essence:
      'Kraft, Präzision, Augen-Hand-Koordination — und ein freies Spiel unter dem Impuls des Feuers.',
    cycle: 1,
    hasGrafik: false,
    videoId: '08dc907d-fab1-4e3b-b362-76f5e6ee6685',
    presets: [
      {
        id: 'fingerkraft',
        label: 'Station 1 · Fingerkraft',
        hint: 'Alle fünf Finger einzeln auf einem Tonfeld',
        pattern: 'TTTT' + 'TTTT' + 'TTTT' + 'TTTT',
        handsatz: 'frei',
        bpm: 60,
      },
      {
        id: 'schulter-arm',
        label: 'Station 2 · Schulter & Arm',
        hint: 'Große Bewegung — Tonfeld weit weg, dann nahe',
        pattern: 'Tggg' + 'Tggg' + 'Tggg' + 'Tggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'tonfeld-praezision',
        label: 'Station 3 · Tonfeld-Präzision',
        hint: 'Rand, Kern, Übergang — gezielt treffen',
        pattern: 'TgTg' + 'TgTg' + 'TgTg' + 'TgTg',
        handsatz: 'frei',
        bpm: 60,
      },
      {
        id: 'tonleiter-fuenf-finger',
        label: 'Station 4 · Tonleiter · alle 5 Finger',
        hint: 'Tonleiter hoch und zurück',
        pattern: 'Tggg' + 'Tggg' + 'Tggg' + 'Tggg',
        handsatz: 'frei',
        bpm: 56,
      },
      {
        id: 'freispiel-feuer',
        label: 'Station 5 · Freies Spiel · Feuer',
        hint: '5 Minuten frei — kein Pattern, der Impuls trägt',
        pattern: 'Tggg' + 'Tggg' + 'Tggg' + 'Tggg',
        handsatz: 'frei',
        bpm: 60,
      },
    ],
  },
  {
    number: 9,
    title: 'Die Hand findet ihren Fluss',
    subtitle: 'Tag 2 von 3 · Hand-Drill · freies Spiel unter Wasser',
    essence:
      'Die zweite Etappe der Hand-Arbeit. Wasser als Impuls — fließend, formend, tragend.',
    cycle: 1,
    hasGrafik: false,
    videoId: 'cc22aed4-a5db-4d69-8188-3cc64871b9f5',
    presets: [
      {
        id: 'fingerdrill',
        label: 'Fingerdrill · alle fünf',
        pattern: 'TTTT' + 'TTTT' + 'TTTT' + 'TTTT',
        handsatz: 'frei',
        bpm: 64,
      },
      {
        id: 'unabhaengigkeit',
        label: 'Unabhängigkeit · linke und rechte Hand',
        hint: 'Linke Hand hält den Puls — rechte spielt',
        pattern: 'TgTg' + 'TgTg' + 'TgTg' + 'TgTg',
        handsatz: 'R-L',
        bpm: 64,
      },
      {
        id: 'fluss',
        label: 'Fluss · weiche Tonleiter',
        pattern: 'Tggg' + 'Tggg' + 'Tggg' + 'Tggg',
        handsatz: 'paradiddle',
        bpm: 60,
      },
      {
        id: 'freispiel-wasser',
        label: 'Freies Spiel · Wasser',
        hint: '5 Minuten — flüssig, weich, tragend',
        pattern: 'Tggg' + 'Tggg' + 'Tggg' + 'Tggg',
        handsatz: 'frei',
        bpm: 56,
      },
    ],
  },
  {
    number: 10,
    title: 'Urlaub für die Finger',
    subtitle: 'Tag 3 von 3 · Lockerung · freies Spiel unter Erde',
    essence:
      'Der letzte Tag der Hand-Etappe. Lockerung statt Drill — und Erde als Impuls.',
    cycle: 1,
    hasGrafik: false,
    videoId: 'd16f9088-c03c-46a1-b820-9ff2c1301a43',
    presets: [
      {
        id: 'lockerung',
        label: 'Lockerung · weiche Schläge',
        pattern: 'gggT' + 'gggT' + 'gggT' + 'gggT',
        handsatz: 'frei',
        bpm: 56,
      },
      {
        id: 'aus-der-ruhe',
        label: 'Aus der Ruhe heraus',
        hint: 'Lange Pausen zwischen den Tonfeldern',
        pattern: 'Tggg' + 'gggg' + 'Tggg' + 'gggg',
        handsatz: 'R-L',
        bpm: 52,
      },
      {
        id: 'freispiel-erde',
        label: 'Freies Spiel · Erde',
        hint: '5 Minuten — getragen, fest, im Boden',
        pattern: 'Dggg' + 'gggg' + 'Dggg' + 'gggg',
        handsatz: 'frei',
        bpm: 52,
      },
    ],
  },
  {
    number: 11,
    title: 'Hören und Atmen',
    subtitle: 'Abschluss Zyklus 1 · freies Spiel unter Luft',
    essence:
      'Abschluss der Fundament-Wochen. Heute geht es ums Hören — und ums Atmen. Luft als Impuls.',
    cycle: 1,
    hasGrafik: false,
    videoId: '2b529cb1-0b54-49ea-bdba-a95d3a18f89f',
    presets: [
      {
        id: 'hoeren-basis',
        label: 'Höre den eigenen Klang',
        hint: 'Vierer mit Tonfeld — höre jeden Ton bis zu Ende',
        pattern: 'Tggg' + 'gggg' + 'Sggg' + 'gggg',
        handsatz: 'R-L',
        bpm: 56,
      },
      {
        id: 'atmen-in-die-pause',
        label: 'Atmen in die Pause',
        hint: 'Pause auf 2, 3 wird zum Atemzug',
        pattern: 'Tggg' + 'gggg' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 52,
      },
      {
        id: 'freispiel-luft',
        label: 'Freies Spiel · Luft',
        hint: '5 Minuten — weit, leicht, durchlässig',
        pattern: 'Tggg' + 'gggg' + 'Tggg' + 'gggg',
        handsatz: 'frei',
        bpm: 52,
      },
    ],
  },

  // ─── ZYKLUS 2 — Fill-Ins und Breaks (Tag 12-22) ───────────────────────
  // Patterns sind aus dem bestehenden data/rhythmen_zyklus2.json abgeleitet.
  // Pro Tag mehrere Presets: Basis + Stufen (perkussiv + melodisch) + ggf Kombi.
  {
    number: 12,
    title: "Jetzt geht's tiefer",
    subtitle: 'Der Vier-Takt-Rhythmus · Wechselschlag R – L und L – R',
    essence:
      'Ein neuer Rhythmus über vier Takte. Drei Akzente, eine Stille, ein Bogen.',
    cycle: 2,
    hasGrafik: false,
    videoId: 'fe8c5b02-cf9d-4722-96f9-de1dc9646006',
    presets: [
      {
        id: 'basis-rl',
        label: 'Basisrhythmus · R – L',
        hint: 'Ding · Slap · Stille · Slap',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'basis-lr',
        label: 'Basisrhythmus · L – R',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'basis-rrll',
        label: 'Basisrhythmus · R – R – L – L',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'RR-LL',
        bpm: 60,
      },
      {
        id: 'basis-llrr',
        label: 'Basisrhythmus · L – L – R – R',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'LL-RR',
        bpm: 60,
      },
      {
        id: 'basis-paradiddle',
        label: 'Basisrhythmus · Paradiddle',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'paradiddle',
        bpm: 60,
      },
    ],
  },
  {
    number: 13,
    title: 'Vom Zählen zum Füllen',
    subtitle: 'Takt 4 · Stufen 1 → 3 · Handsatz R – L',
    essence:
      'Im vierten Takt fangen wir an, die Lücken zu füllen — vom Ende rückwärts, Stufe für Stufe.',
    cycle: 2,
    hasGrafik: true,
    videoId: 'b2f8e342-b375-45db-85ca-b22c2f740244',
    presets: [
      {
        id: 'basis',
        label: 'Basisrhythmus',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'stufe-1-perkussiv',
        label: 'Stufe 1 perkussiv · 1 Slap',
        hint: 'Takt 4 — Slap auf dem letzten e vor der 1',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'SggS',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'stufe-1-melodisch',
        label: 'Stufe 1 melodisch · 1 Tonfeld',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'SggT',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'stufe-2-perkussiv',
        label: 'Stufe 2 perkussiv · 2 Slaps',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'SgSS',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'stufe-2-melodisch',
        label: 'Stufe 2 melodisch · 2 Tonfelder',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'SgTT',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'stufe-3-perkussiv',
        label: 'Stufe 3 perkussiv · 3 Slaps',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'SSSS',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'stufe-3-melodisch',
        label: 'Stufe 3 melodisch · 3 Tonfelder',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'STTT',
        handsatz: 'R-L',
        bpm: 60,
      },
    ],
  },
  // — Tag 14-22 placeholders — werden von Forge-Agent gefüllt —
  {
    number: 14,
    title: 'Die andere Hand',
    subtitle: 'Takt 4 · Stufen 1 → 3 · Handsatz L – R',
    essence:
      'Gleicher Bogen, andere Hand. Die linke Hand übernimmt das Echo.',
    cycle: 2,
    hasGrafik: true,
    videoId: '06939a8d-6cbb-4b8e-aed5-2669fe5d4f53',
    presets: [
      {
        id: 'basis',
        label: 'Basisrhythmus · L – R',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'stufe-1-perkussiv',
        label: 'Stufe 1 perkussiv · L – R',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'SggS',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'stufe-1-melodisch',
        label: 'Stufe 1 melodisch · L – R',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'SggT',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'stufe-2-perkussiv',
        label: 'Stufe 2 perkussiv · L – R',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'SgSS',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'stufe-2-melodisch',
        label: 'Stufe 2 melodisch · L – R',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'SgTT',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'stufe-3-perkussiv',
        label: 'Stufe 3 perkussiv · L – R',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'SSSS',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'stufe-3-melodisch',
        label: 'Stufe 3 melodisch · L – R',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'STTT',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'kombi',
        label: 'Kombi · 4 Bögen · 1 → 2 → 3 → 2',
        hint: 'vier Bögen · ein Wellenbogen · und wieder von vorn',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'SggS' + 'Dggg' + 'Sggg' + 'gggg' + 'SgTT' + 'Dggg' + 'Sggg' + 'gggg' + 'STTT' + 'Dggg' + 'Sggg' + 'gggg' + 'SgTT',
        handsatz: 'L-R',
        bpm: 60,
      },
    ],
  },
  {
    number: 15,
    title: 'Wenn die Stille spricht · I',
    subtitle: 'Takt 3 · Stufen 1 → 3 · Handsatz R – L · die Stille wird Klang',
    essence:
      'Heute öffnen wir den dritten Takt — die Stille. Sie wird langsam zum Klang.',
    cycle: 2,
    hasGrafik: true,
    videoId: 'aa3664d1-0a62-41e5-872b-d72bbf6b5d5e',
    presets: [
      {
        id: 'basis',
        label: 'Basisrhythmus',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'stufe-1-perkussiv',
        label: 'Stufe 1 perkussiv · Takt 3',
        hint: 'Slap vor der 4 in Takt 3',
        pattern: 'Dggg' + 'Sggg' + 'gggS' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'stufe-1-melodisch',
        label: 'Stufe 1 melodisch · Takt 3',
        pattern: 'Dggg' + 'Sggg' + 'gggT' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'stufe-2-perkussiv',
        label: 'Stufe 2 perkussiv · Takt 3',
        pattern: 'Dggg' + 'Sggg' + 'ggSS' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'stufe-2-melodisch',
        label: 'Stufe 2 melodisch · Takt 3',
        pattern: 'Dggg' + 'Sggg' + 'ggTT' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'stufe-3-perkussiv',
        label: 'Stufe 3 perkussiv · Takt 3',
        pattern: 'Dggg' + 'Sggg' + 'gSSS' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'stufe-3-melodisch',
        label: 'Stufe 3 melodisch · Takt 3',
        pattern: 'Dggg' + 'Sggg' + 'gTTT' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'stufe-4-perkussiv',
        label: 'Stufe 4 perkussiv · Takt 3',
        hint: 'Takt 3 ganz gefüllt · vier Slaps ab der 3',
        pattern: 'Dggg' + 'Sggg' + 'SSSS' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'stufe-4-melodisch',
        label: 'Stufe 4 melodisch · Takt 3',
        hint: 'Takt 3 ganz gefüllt · vier Tonfelder ab der 3',
        pattern: 'Dggg' + 'Sggg' + 'TTTT' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'kombi',
        label: 'Kombi · 1m → 2m → 3m → 4p',
        hint: 'vier Bögen · drei Mal Melodie, dann ein perkussiver Hammer',
        pattern: 'Dggg' + 'Sggg' + 'gggT' + 'Sggg' + 'Dggg' + 'Sggg' + 'ggTT' + 'Sggg' + 'Dggg' + 'Sggg' + 'gTTT' + 'Sggg' + 'Dggg' + 'Sggg' + 'SSSS' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
    ],
  },
  {
    number: 16,
    title: 'Wenn die Stille spricht · II',
    subtitle: 'Takt 3 · Stufen 1 → 3 · Handsatz L – R',
    essence:
      'Dieselbe Arbeit am dritten Takt — jetzt linkshändig geführt.',
    cycle: 2,
    hasGrafik: true,
    videoId: 'ce0f0493-8de6-40aa-950b-3ec9f57f90e4',
    presets: [
      {
        id: 'basis',
        label: 'Basisrhythmus · L – R',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'stufe-1-perkussiv',
        label: 'Stufe 1 perkussiv · L – R',
        pattern: 'Dggg' + 'Sggg' + 'gggS' + 'Sggg',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'stufe-1-melodisch',
        label: 'Stufe 1 melodisch · L – R',
        pattern: 'Dggg' + 'Sggg' + 'gggT' + 'Sggg',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'stufe-2-perkussiv',
        label: 'Stufe 2 perkussiv · L – R',
        pattern: 'Dggg' + 'Sggg' + 'ggSS' + 'Sggg',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'stufe-2-melodisch',
        label: 'Stufe 2 melodisch · L – R',
        pattern: 'Dggg' + 'Sggg' + 'ggTT' + 'Sggg',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'stufe-3-perkussiv',
        label: 'Stufe 3 perkussiv · L – R',
        pattern: 'Dggg' + 'Sggg' + 'gSSS' + 'Sggg',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'stufe-3-melodisch',
        label: 'Stufe 3 melodisch · L – R',
        pattern: 'Dggg' + 'Sggg' + 'gTTT' + 'Sggg',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'stufe-4-perkussiv',
        label: 'Stufe 4 perkussiv · L – R',
        hint: 'Takt 3 ganz gefüllt · vier Slaps ab der 3',
        pattern: 'Dggg' + 'Sggg' + 'SSSS' + 'Sggg',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'stufe-4-melodisch',
        label: 'Stufe 4 melodisch · L – R',
        hint: 'Takt 3 ganz gefüllt · vier Tonfelder ab der 3',
        pattern: 'Dggg' + 'Sggg' + 'TTTT' + 'Sggg',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'kombi',
        label: 'Kombi · 1m → 2m → 3m → 4p',
        hint: 'vier Bögen · drei Mal Melodie, dann ein perkussiver Hammer',
        pattern: 'Dggg' + 'Sggg' + 'gggT' + 'Sggg' + 'Dggg' + 'Sggg' + 'ggTT' + 'Sggg' + 'Dggg' + 'Sggg' + 'gTTT' + 'Sggg' + 'Dggg' + 'Sggg' + 'SSSS' + 'Sggg',
        handsatz: 'L-R',
        bpm: 60,
      },
    ],
  },
  {
    number: 17,
    title: 'Das Echo verlängern · I',
    subtitle: 'Takt 2 · Stufen 1 → 3 · Handsatz R – L',
    essence:
      'Wir gehen einen Takt zurück. Das Echo nach dem Ding wird länger.',
    cycle: 2,
    hasGrafik: true,
    videoId: '6d351105-26ad-401d-b170-35159c561fca',
    presets: [
      {
        id: 'basis',
        label: 'Basisrhythmus',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'stufe-1-perkussiv',
        label: 'Stufe 1 perkussiv · Takt 2',
        hint: 'Slap vor der 3 in Takt 2',
        pattern: 'Dggg' + 'SggS' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'stufe-1-melodisch',
        label: 'Stufe 1 melodisch · Takt 2',
        pattern: 'Dggg' + 'SggT' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'stufe-2-perkussiv',
        label: 'Stufe 2 perkussiv · Takt 2',
        pattern: 'Dggg' + 'SgSS' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'stufe-2-melodisch',
        label: 'Stufe 2 melodisch · Takt 2',
        pattern: 'Dggg' + 'SgTT' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'stufe-3-perkussiv',
        label: 'Stufe 3 perkussiv · Takt 2',
        pattern: 'Dggg' + 'SSSS' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'stufe-3-melodisch',
        label: 'Stufe 3 melodisch · Takt 2',
        pattern: 'Dggg' + 'STTT' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'kombi',
        label: 'Kombi · 2 Runden · 8 Bögen',
        hint: 'Runde 1: 1m · 1m · 1m · 3m → Runde 2: 1m · 1m · 2m · 3m',
        pattern: 'Dggg' + 'SggT' + 'gggg' + 'Sggg' + 'Dggg' + 'SggT' + 'gggg' + 'Sggg' + 'Dggg' + 'SggT' + 'gggg' + 'Sggg' + 'Dggg' + 'STTT' + 'gggg' + 'Sggg' + 'Dggg' + 'SggT' + 'gggg' + 'Sggg' + 'Dggg' + 'SggT' + 'gggg' + 'Sggg' + 'Dggg' + 'SgTT' + 'gggg' + 'Sggg' + 'Dggg' + 'STTT' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
    ],
  },
  {
    number: 18,
    title: 'Das Echo verlängern · II',
    subtitle: 'Takt 2 · Stufen 1 → 3 · Handsatz L – R',
    essence:
      'Takt 2, linkshändig — das Echo wandert nochmal anders.',
    cycle: 2,
    hasGrafik: true,
    videoId: '8aba1a4b-633e-499a-9e0b-71e22bde4455',
    presets: [
      {
        id: 'basis',
        label: 'Basisrhythmus · L – R',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'stufe-1-perkussiv',
        label: 'Stufe 1 perkussiv · L – R',
        pattern: 'Dggg' + 'SggS' + 'gggg' + 'Sggg',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'stufe-1-melodisch',
        label: 'Stufe 1 melodisch · L – R',
        pattern: 'Dggg' + 'SggT' + 'gggg' + 'Sggg',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'stufe-2-perkussiv',
        label: 'Stufe 2 perkussiv · L – R',
        pattern: 'Dggg' + 'SgSS' + 'gggg' + 'Sggg',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'stufe-2-melodisch',
        label: 'Stufe 2 melodisch · L – R',
        pattern: 'Dggg' + 'SgTT' + 'gggg' + 'Sggg',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'stufe-3-perkussiv',
        label: 'Stufe 3 perkussiv · L – R',
        pattern: 'Dggg' + 'SSSS' + 'gggg' + 'Sggg',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'stufe-3-melodisch',
        label: 'Stufe 3 melodisch · L – R',
        pattern: 'Dggg' + 'STTT' + 'gggg' + 'Sggg',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'kombi',
        label: 'Kombi · 2 Runden · 8 Bögen',
        hint: 'Runde 1: 1m · 1m · 1m · 3m → Runde 2: 1m · 1m · 2m · 3m',
        pattern: 'Dggg' + 'SggT' + 'gggg' + 'Sggg' + 'Dggg' + 'SggT' + 'gggg' + 'Sggg' + 'Dggg' + 'SggT' + 'gggg' + 'Sggg' + 'Dggg' + 'STTT' + 'gggg' + 'Sggg' + 'Dggg' + 'SggT' + 'gggg' + 'Sggg' + 'Dggg' + 'SggT' + 'gggg' + 'Sggg' + 'Dggg' + 'SgTT' + 'gggg' + 'Sggg' + 'Dggg' + 'STTT' + 'gggg' + 'Sggg',
        handsatz: 'L-R',
        bpm: 60,
      },
    ],
  },
  {
    number: 19,
    title: 'Dem Ding folgen · I',
    subtitle: 'Takt 1 · Stufen 1 → 3 · Handsatz R – L',
    essence:
      'Der erste Takt selbst öffnet sich. Direkt nach dem Ding beginnt die Bewegung.',
    cycle: 2,
    hasGrafik: true,
    videoId: 'b0714962-05f0-4a11-ab2a-c5747e0caec6',
    presets: [
      {
        id: 'basis',
        label: 'Basisrhythmus',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'stufe-1-perkussiv',
        label: 'Stufe 1 perkussiv · Takt 1',
        pattern: 'DggS' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'stufe-1-melodisch',
        label: 'Stufe 1 melodisch · Takt 1',
        pattern: 'DggT' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'stufe-2-perkussiv',
        label: 'Stufe 2 perkussiv · Takt 1',
        pattern: 'DgSS' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'stufe-2-melodisch',
        label: 'Stufe 2 melodisch · Takt 1',
        pattern: 'DgTT' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'stufe-3-perkussiv',
        label: 'Stufe 3 perkussiv · Takt 1',
        pattern: 'DSSS' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'stufe-3-melodisch',
        label: 'Stufe 3 melodisch · Takt 1',
        pattern: 'DTTT' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'kombi',
        label: 'Kombi · 2m → 2m → 2m → 3m',
        hint: 'vier Bögen · drei mal Stufe 2, dann Stufe 3 · Takt 1',
        pattern: 'DgTT' + 'Sggg' + 'gggg' + 'Sggg' + 'DgTT' + 'Sggg' + 'gggg' + 'Sggg' + 'DgTT' + 'Sggg' + 'gggg' + 'Sggg' + 'DTTT' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
    ],
  },
  {
    number: 20,
    title: 'Dem Ding folgen · II',
    subtitle: 'Takt 1 · Stufen 1 → 3 · Handsatz L – R · Inventur abgeschlossen',
    essence:
      'Takt 1, linkshändig — und damit hast du den ganzen Bogen einmal durchgespielt.',
    cycle: 2,
    hasGrafik: true,
    videoId: 'e0e132dc-c437-4cc1-bb88-89605e9bd782',
    presets: [
      {
        id: 'basis',
        label: 'Basisrhythmus · L – R',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'stufe-1-perkussiv',
        label: 'Stufe 1 perkussiv · L – R',
        pattern: 'DggS' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'stufe-1-melodisch',
        label: 'Stufe 1 melodisch · L – R',
        pattern: 'DggT' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'stufe-2-perkussiv',
        label: 'Stufe 2 perkussiv · L – R',
        pattern: 'DgSS' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'stufe-2-melodisch',
        label: 'Stufe 2 melodisch · L – R',
        pattern: 'DgTT' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'stufe-3-perkussiv',
        label: 'Stufe 3 perkussiv · L – R',
        pattern: 'DSSS' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'stufe-3-melodisch',
        label: 'Stufe 3 melodisch · L – R',
        pattern: 'DTTT' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'kombi',
        label: 'Kombi · 2m → 2m → 2m → 3m',
        hint: 'vier Bögen · drei mal Stufe 2, dann Stufe 3 · Takt 1',
        pattern: 'DgTT' + 'Sggg' + 'gggg' + 'Sggg' + 'DgTT' + 'Sggg' + 'gggg' + 'Sggg' + 'DgTT' + 'Sggg' + 'gggg' + 'Sggg' + 'DTTT' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'L-R',
        bpm: 60,
      },
    ],
  },
  {
    number: 21,
    title: 'Was geblieben ist',
    subtitle: 'Zusammenfassung · die schönsten Variationen aus Tag 13-20',
    essence:
      'Die Inventur ist geschlossen. Heute spielst du, was geblieben ist.',
    cycle: 2,
    hasGrafik: true,
    videoId: '3dff9679-9709-4978-91a3-dabcf9b20dc1',
    presets: [
      {
        id: 'uebung-a',
        label: 'Übung A · Rahmen und Stille',
        hint: 'Stufe 3m in Takt 1 und 4 · die Mitte bleibt Basis',
        pattern: 'DTTT' + 'Sggg' + 'gggg' + 'STTT',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'wandernde-verzierung',
        label: 'Wandernde Verzierung · 4 Bögen',
        hint: 'dieselbe Stufe 2m wandert: Takt 4 → 3 → 2 → 1',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'SgTT' + 'Dggg' + 'Sggg' + 'ggTT' + 'Sggg' + 'Dggg' + 'SgTT' + 'gggg' + 'Sggg' + 'DgTT' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'uebung-b',
        label: 'Übung B · Vier mal Zwei',
        hint: 'Stufe 2m in jedem Takt · gleichmäßige mittlere Dichte',
        pattern: 'DgTT' + 'SgTT' + 'ggTT' + 'SgTT',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'aufbau',
        label: 'Aufbau · 4 Bögen',
        hint: 'Bogen für Bogen kommt ein Takt mit Stufe 1m hinzu',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'SggT' + 'Dggg' + 'Sggg' + 'gggT' + 'SggT' + 'Dggg' + 'SggT' + 'gggT' + 'SggT' + 'DggT' + 'SggT' + 'gggT' + 'SggT',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'uebung-c',
        label: 'Übung C · Volle Dichte',
        hint: 'Stufe 3m in jedem Takt · Splithand · linke Hand startet',
        pattern: 'DTTT' + 'STTT' + 'gTTT' + 'STTT',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'frage-antwort',
        label: 'Frage und Antwort · 2 Bögen',
        hint: 'Frage in Takt 1 → Antwort in Takt 4 · spiele das Paar zweimal',
        pattern: 'DgTT' + 'Sggg' + 'gggg' + 'Sggg' + 'Dggg' + 'Sggg' + 'gggg' + 'SgTT',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'uebung-d',
        label: 'Übung D · Lieblings-Variation Takt 1',
        pattern: 'DTTT' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
    ],
  },
  {
    number: 22,
    title: 'Aus den Teilen ein Stück',
    subtitle: 'Spielwege · die ersten kompositorischen Bögen',
    essence:
      'Die Teile fügen sich. Heute findest du deine ersten Spielwege.',
    cycle: 2,
    hasGrafik: true,
    videoId: '92e1ef26-afa2-4307-8c56-29abf8ff89bc',
    presets: [
      {
        id: 'basis',
        label: 'Basisrhythmus',
        hint: 'wo wir angefangen haben · drei Schläge und eine Pause',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'spielweg-a',
        label: 'Option 1 · Beispiel A',
        hint: 'ein Bogen als Loop · Stufe 2m in Takt 1 und 4',
        pattern: 'DgTT' + 'Sggg' + 'gggg' + 'SgTT',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'spielweg-b',
        label: 'Option 1 · Beispiel B',
        hint: 'ein Bogen als Loop · ein Tonfeld am Ende jedes Takts',
        pattern: 'DggT' + 'SggT' + 'gggT' + 'SggT',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'spielweg-c',
        label: 'Option 1 · Beispiel C',
        hint: 'ein Bogen als Loop · Takt 3 ganz gefüllt',
        pattern: 'Dggg' + 'Sggg' + 'TTTT' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'option-2-vier-boegen',
        label: 'Option 2 · 4 Bögen mit Variation',
        hint: 'Variation wandert: Takt 1 → 2 → 3 → 4',
        pattern: 'DgTT' + 'Sggg' + 'gggg' + 'Sggg' + 'Dggg' + 'STTT' + 'gggg' + 'Sggg' + 'Dggg' + 'Sggg' + 'TTTT' + 'Sggg' + 'Dggg' + 'Sggg' + 'gggg' + 'SgTT',
        handsatz: 'R-L',
        bpm: 60,
      },
    ],
  },

  // ─── ZYKLUS 3 — Harmonik, Form, Komposition (Tag 23-40) ────────────────
  {
    number: 23,
    title: 'Zwei Stimmen, ein Bogen',
    subtitle: 'Dialog im Pattern · zwei Hände, zwei Aussagen',
    essence:
      'Heute trennen sich die Hände — und sprechen miteinander. Zwei Stimmen in einem Bogen.',
    cycle: 3,
    hasGrafik: true,
    videoId: '0d15315e-672f-4109-98ba-008dbc914b6d',
    presets: [
      {
        id: 'puls-achtel',
        label: 'Stufe 1 · rechts auf Achteln',
        hint: 'rechte Hand pulsiert auf jedem Achtel · linke Hand trägt den Groove',
        pattern: 'D.g.' + 'S.g.' + 'g.g.' + 'S.g.',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'puls-offbeat',
        label: 'Stufe 2 · rechts auf Offbeats',
        hint: 'rechte Hand sitzt auf jedem „e“ · linke Hand bleibt im Groove',
        pattern: 'Dg.g' + 'Sg.g' + '.g.g' + 'Sg.g',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'puls-sechzehntel',
        label: 'Stufe 3 · rechts alle 16tel',
        hint: 'rechte Hand füllt jeden Schlag · linke Hand trägt den Groove',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'dialog-basis',
        label: 'Dialog · Basis',
        pattern: 'Dggg' + 'TgSg' + 'gggg' + 'TgSg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'dialog-melodisch',
        label: 'Dialog · melodisch',
        pattern: 'TgTg' + 'TgSg' + 'TgTg' + 'TgSg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'dialog-paradiddle',
        label: 'Dialog · Paradiddle',
        pattern: 'Dggg' + 'TgSg' + 'gggg' + 'TgSg',
        handsatz: 'paradiddle',
        bpm: 60,
      },
    ],
  },
  {
    number: 24,
    title: 'Die andere Seite',
    subtitle: 'Hände tauschen · die linke Hand führt',
    essence:
      'Was bisher rechts war, geht jetzt nach links. Die Pan wird gespiegelt.',
    cycle: 3,
    hasGrafik: true,
    videoId: '1d798db4-f176-49db-84b3-610e336c30dd',
    presets: [
      {
        id: 'gespiegelt-achtel',
        label: 'Stufe 1 · links auf Achteln',
        hint: 'linke Hand pulsiert auf jedem Achtel · rechte Hand trägt den Groove',
        pattern: 'D.g.' + 'S.g.' + 'g.g.' + 'S.g.',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'gespiegelt-offbeat',
        label: 'Stufe 2 · links auf Offbeats',
        hint: 'linke Hand sitzt auf jedem „e“ · rechte Hand bleibt im Groove',
        pattern: 'Dg.g' + 'Sg.g' + '.g.g' + 'Sg.g',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'gespiegelt-basis',
        label: 'Stufe 3 · links alle 16tel',
        hint: 'linke Hand füllt jeden Schlag · rechte Hand trägt den Groove',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'gespiegelt-melodisch',
        label: 'Gespiegelt · melodisch · L – R',
        pattern: 'Tggg' + 'Sggg' + 'Tggg' + 'Sggg',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'gespiegelt-dialog',
        label: 'Gespiegelt · Dialog · L – R',
        pattern: 'Dggg' + 'TgSg' + 'gggg' + 'TgSg',
        handsatz: 'L-R',
        bpm: 60,
      },
    ],
  },
  {
    number: 25,
    title: 'Vom Schlag zum Klang',
    subtitle: 'Klang-Übergänge · perkussiv wird melodisch',
    essence:
      'Heute beginnt die Verwandlung. Was bisher Schlag war, wird Klang.',
    cycle: 3,
    hasGrafik: true,
    videoId: '9f543eb1-67be-431d-ad6b-a39f16b7d1da',
    presets: [
      {
        id: 'uebergang-2',
        label: 'Grundbogen · noch ohne Fill',
        hint: 'Bass alterniert · Mitte · Melodie · der vierte Takt bleibt offen',
        pattern: 'T...' + 'T...' + '....' + 'T...',
        wiederholung: 'gggg' + 'gggg' + 'gggg' + 'gggg',
        handsatz: 'frei',
        bpm: 60,
      },
      {
        id: 'uebergang-1',
        label: 'Fill Takt 4 · ein Ton',
        hint: 'der vierte Takt öffnet sich von hinten — der erste Schlag',
        pattern: 'T...' + 'T...' + '....' + 'T..T',
        wiederholung: 'gggg' + 'gggg' + 'gggg' + 'gggg',
        handsatz: 'frei',
        bpm: 60,
      },
      {
        id: 'uebergang-stufen',
        label: 'Fill Takt 4 · zwei Töne',
        hint: 'der Fill wächst um eine Position nach vorn',
        pattern: 'T...' + 'T...' + '....' + 'T.TT',
        wiederholung: 'gggg' + 'gggg' + 'gggg' + 'gggg',
        handsatz: 'frei',
        bpm: 60,
      },
      {
        id: 'fill-takt4-voll',
        label: 'Fill Takt 4 · drei Töne',
        hint: 'derselbe Bogen · im vierten Takt drei Töne im Fill',
        pattern: 'T...' + 'T...' + '....' + 'TTTT',
        wiederholung: 'gggg' + 'gggg' + 'gggg' + 'gggg',
        handsatz: 'frei',
        bpm: 60,
      },
    ],
  },
  {
    number: 26,
    title: 'Aus der Stille tritt Klang',
    subtitle: 'Der dritte Takt wird zur Melodie',
    essence:
      'Aus dem stillsten Takt — Takt 3 — wächst eine Melodie heraus.',
    cycle: 3,
    hasGrafik: true,
    videoId: '147872fe-318a-4099-90be-d7db4533516f',
    chapters: [
      { label: 'Einführung · Fill im 3. Takt', start: 0 },
      { label: 'Stufe 1 · ein Ton im Fill', start: 23, presetId: 'melodie-takt3-langsam' },
      { label: 'Bass dazu', start: 51, presetId: 'melodie-takt3-langsam', sub: true },
      { label: 'Alles zur Wiederholung', start: 71, presetId: 'melodie-takt3-langsam', sub: true },
      { label: 'Stufe 2 · zwei Töne im Fill', start: 140, presetId: 'melodie-takt3-zwei-toene' },
      { label: 'Bass dazu', start: 181, presetId: 'melodie-takt3-zwei-toene', sub: true },
      { label: 'Stufe 3 · drei Töne im Fill', start: 223, presetId: 'melodie-takt3-voll' },
      { label: 'Bass dazu', start: 288, presetId: 'melodie-takt3-voll', sub: true },
      { label: 'Stufe 4 · der ganze Takt klingt', start: 338, presetId: 'melodie-takt3-vier-toene' },
    ],
    presets: [
      {
        id: 'grundbogen-takt3-offen',
        label: 'Grundbogen · Takt 3 offen',
        hint: 'Bass alterniert · Mitte und Melodie laufen · der dritte Takt bleibt offen',
        pattern: 'T...' + 'T...' + '....' + 'T...',
        wiederholung: 'gggg' + 'gggg' + 'gggg' + 'gggg',
        handsatz: 'frei',
        bpm: 56,
      },
      {
        id: 'melodie-takt3-langsam',
        label: 'Fill Takt 3 · ein Ton',
        hint: 'der dritte Takt öffnet sich von hinten — der erste Schlag',
        pattern: 'T...' + 'T...' + '...T' + 'T...',
        wiederholung: 'gggg' + 'gggg' + 'gggg' + 'gggg',
        handsatz: 'frei',
        bpm: 56,
      },
      {
        id: 'melodie-takt3-zwei-toene',
        label: 'Fill Takt 3 · zwei Töne',
        hint: 'der Fill wächst um eine Position nach vorn',
        pattern: 'T...' + 'T...' + '..TT' + 'T...',
        wiederholung: 'gggg' + 'gggg' + 'gggg' + 'gggg',
        handsatz: 'frei',
        bpm: 60,
      },
      {
        id: 'melodie-takt3-voll',
        label: 'Fill Takt 3 · drei Töne',
        hint: 'drei Töne im Fill vor der Melodie',
        pattern: 'T...' + 'T...' + '.TTT' + 'T...',
        wiederholung: 'gggg' + 'gggg' + 'gggg' + 'gggg',
        handsatz: 'frei',
        bpm: 60,
      },
      {
        id: 'melodie-takt3-vier-toene',
        label: 'Fill Takt 3 · ganzer Takt',
        hint: 'ganzer dritter Takt klingt (4 Töne)',
        pattern: 'T...' + 'T...' + 'TTTT' + 'T...',
        wiederholung: 'gggg' + 'gggg' + 'gggg' + 'gggg',
        handsatz: 'frei',
        bpm: 60,
      },
    ],
  },
  {
    number: 27,
    title: 'Hinter der Mitte',
    subtitle: 'Takt 2 + 3 · der hintere Bogen wird voller',
    essence:
      'Die Mitte des Bogens öffnet sich. Was zwischen den Slaps lag, wird zur Brücke.',
    cycle: 3,
    hasGrafik: true,
    videoId: '28ae9c17-2f3f-4034-92fe-84e27d8414eb',
    presets: [
      {
        id: 'grundbogen-takt2-offen',
        label: 'Grundbogen · Takt 2 offen',
        hint: 'Bass alterniert · Mitte und Melodie laufen · der zweite Takt bleibt offen',
        pattern: 'T...' + 'T...' + '....' + 'T...',
        wiederholung: 'gggg' + 'gggg' + 'gggg' + 'gggg',
        handsatz: 'frei',
        bpm: 60,
      },
      {
        id: 'fill-takt2-ein-ton',
        label: 'Fill Takt 2 · ein Ton',
        hint: 'der zweite Takt öffnet sich von hinten — der erste Schlag',
        pattern: 'T...' + 'T..T' + '....' + 'T...',
        wiederholung: 'gggg' + 'gggg' + 'gggg' + 'gggg',
        handsatz: 'frei',
        bpm: 60,
      },
      {
        id: 'mitte-zwei-tonfelder',
        label: 'Fill Takt 2 · zwei Töne',
        hint: 'Bass · Mitte · Melodie · Fill (2 Töne)',
        pattern: 'T...' + 'T.TT' + '....' + 'T...',
        wiederholung: 'gggg' + 'gggg' + 'gggg' + 'gggg',
        handsatz: 'frei',
        bpm: 60,
      },
      {
        id: 'mitte-dreiklang',
        label: 'Fill Takt 2 · drei Töne',
        hint: 'Bass · Mitte · Melodie · Fill (3 Töne)',
        pattern: 'T...' + 'TTTT' + '....' + 'T...',
        wiederholung: 'gggg' + 'gggg' + 'gggg' + 'gggg',
        handsatz: 'frei',
        bpm: 60,
      },
      {
        id: 'mitte-fluss',
        label: 'Mitte · Fluss',
        pattern: 'Dggg' + 'STTT' + 'TTTT' + 'Sggg',
        handsatz: 'paradiddle',
        bpm: 60,
      },
    ],
  },
  {
    number: 28,
    title: 'Der Bogen wird voll',
    subtitle: 'Alle vier Takte tragen Bewegung',
    essence:
      'Heute ist nichts mehr leer. Jeder Takt im Bogen trägt eine Aussage.',
    cycle: 3,
    hasGrafik: true,
    videoId: '172e0bb2-c897-4745-9f35-a858a7992b85',
    presets: [
      {
        id: 'grundbogen-takt1-offen',
        label: 'Grundbogen · Takt 1 offen',
        hint: 'Bass alterniert · Mitte und Melodie laufen · der erste Takt bleibt offen',
        pattern: 'T...' + 'T...' + '....' + 'T...',
        wiederholung: 'gggg' + 'gggg' + 'gggg' + 'gggg',
        handsatz: 'frei',
        bpm: 60,
      },
      {
        id: 'fill-takt1-ein-ton',
        label: 'Fill Takt 1 · ein Ton',
        hint: 'Bass · Mitte · Melodie · Fill (1 Ton)',
        pattern: 'T..T' + 'T...' + '....' + 'T...',
        wiederholung: 'gggg' + 'gggg' + 'gggg' + 'gggg',
        handsatz: 'frei',
        bpm: 60,
      },
      {
        id: 'fill-takt1-zwei-toene',
        label: 'Fill Takt 1 · zwei Töne',
        hint: 'Bass · Mitte · Melodie · Fill (2 Töne)',
        pattern: 'T.TT' + 'T...' + '....' + 'T...',
        wiederholung: 'gggg' + 'gggg' + 'gggg' + 'gggg',
        handsatz: 'frei',
        bpm: 60,
      },
      {
        id: 'fill-takt1-drei-toene',
        label: 'Fill Takt 1 · drei Töne',
        hint: 'Bass · Mitte · Melodie · Fill (3 Töne)',
        pattern: 'TTTT' + 'T...' + '....' + 'T...',
        wiederholung: 'gggg' + 'gggg' + 'gggg' + 'gggg',
        handsatz: 'frei',
        bpm: 60,
      },
      {
        id: 'voll-basis',
        label: 'Voll · Basis',
        pattern: 'DgTg' + 'SgTg' + 'TgTg' + 'SgTg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'voll-melodisch',
        label: 'Voll · melodisch',
        pattern: 'TgTT' + 'STgT' + 'TgTT' + 'SgTg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'voll-paradiddle',
        label: 'Voll · Paradiddle',
        pattern: 'DgTg' + 'SgTg' + 'TgTg' + 'SgTg',
        handsatz: 'paradiddle',
        bpm: 60,
      },
    ],
  },
  {
    number: 29,
    title: 'Aus dem Schlag wird der Akkord',
    subtitle: 'Drei Tonfelder gleichzeitig · Harmonik beginnt',
    essence:
      'Aus dem einzelnen Tonfeld wird ein Akkord — drei Töne gleichzeitig.',
    cycle: 3,
    hasGrafik: true,
    videoId: '076094dc-11e8-426a-91b9-7d85183d94fd',
    presets: [
      {
        id: 'standard-perkussiv',
        label: 'Standard-Rhythmus · perkussiv',
        hint: 'der Vier-Takt-Bogen · perkussiv · von hier aus öffnen wir den Akkord',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 56,
      },
      {
        id: 'akkord-statisch',
        label: 'Akkord auf der 1',
        hint: 'der Bass wird zum Akkord · die perkussiven Akzente bleiben',
        pattern: 'Tggg' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 56,
      },
      {
        id: 'akkord-auf-2',
        label: 'Akkord auf der 2',
        hint: 'Ding · Akkord · still · Slap',
        pattern: 'Dggg' + 'Tggg' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 56,
      },
      {
        id: 'akkord-auf-4',
        label: 'Akkord auf der 4',
        hint: 'Ding · Slap · still · Akkord',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'Tggg',
        handsatz: 'R-L',
        bpm: 56,
      },
      {
        id: 'akkord-bogen',
        label: 'Vierer-Struktur · Bogen 1–3',
        hint: 'drei Anläufe: Akkord auf 1 + ein Ton am Bogenende',
        pattern: 'Tggg' + 'Sggg' + 'gggg' + 'SggT',
        handsatz: 'R-L',
        bpm: 56,
      },
      {
        id: 'akkord-mit-fill',
        label: 'Vierer-Struktur · Bogen 4',
        hint: 'der vierte Bogen schließt mit drei Tönen nach dem Slap',
        pattern: 'Tggg' + 'Sggg' + 'gggg' + 'STTT',
        handsatz: 'R-L',
        bpm: 56,
      },
    ],
  },
  {
    number: 30,
    title: 'Der Akkord wandert',
    subtitle: 'Bogen für Bogen ändert sich der Akkord',
    essence:
      'Der Akkord bleibt an seinem Platz — aber seine Tonfelder wandern. Aus Stille wird Reise.',
    cycle: 3,
    hasGrafik: true,
    videoId: '19f781b1-34fe-429e-99ce-f40acd9a7fa3',
    presets: [
      {
        id: 'wandern-chronologisch',
        label: 'Übung 1 · Akkord wandert',
        hint: 'Akkord auf 1 wandert Bogen für Bogen: 1·3·5 → 2·4·6 → 3·5·7 …',
        pattern: 'Tggg' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 56,
      },
      {
        id: 'wandern-mit-steigerung',
        label: 'Übung 1 · die 3 wächst',
        hint: 'Slaps auf der 3 · ansteigende Intensität von der 3 weg',
        pattern: 'Tggg' + 'Sggg' + 'SSSS' + 'Sggg',
        handsatz: 'R-L',
        bpm: 56,
      },
      {
        id: 'wandern-vier-boegen',
        label: 'Übung 2 · Basis pendelt',
        hint: 'Basis pendelt 2·4 ↔ 1·3, oben: 8 · 7 · 6 · 5',
        pattern: 'Tggg' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 56,
      },
      {
        id: 'wandern-mit-melodie-fill',
        label: 'Übung 2 · Bogen 4 mit Fill',
        hint: 'der vierte Bogen schließt mit drei Tonfeldern',
        pattern: 'Tggg' + 'Sggg' + 'gggg' + 'STTT',
        handsatz: 'R-L',
        bpm: 56,
      },
    ],
  },
  {
    number: 31,
    title: 'Wo die Rhythmiken sich treffen',
    subtitle: 'Pattern-Fusion · Rhythmik trifft Harmonik',
    essence:
      'Heute laufen alle Stränge zusammen. Rhythmik, Melodie und Harmonik in einem Bogen.',
    cycle: 3,
    hasGrafik: true,
    videoId: '379b3ff4-d351-497a-a6af-c775a5813e64',
    presets: [
      {
        id: 'schicht-1-perkussion',
        label: 'Schicht 1 · perkussive Basis',
        hint: 'ein zusätzliches Ding nach der 2 erweitert die Bass-Struktur',
        pattern: 'Dggg' + 'SggD' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'schicht-2-harmonie',
        label: 'Schicht 2 · + Harmonie',
        hint: 'Akkord auf der 1 statt Ding · Slap und Ding bleiben',
        pattern: 'Tggg' + 'SggD' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'fusion-eins',
        label: 'Schicht 3 · + Melodie',
        hint: 'Melodie-Fill nach der 4 · das Pattern ist komplett',
        pattern: 'Tggg' + 'SggD' + 'gggg' + 'STTT',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'fusion-zwei',
        label: 'Fusion · II · dichter',
        pattern: 'TgTT' + 'STTg' + 'TgTT' + 'STgT',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'fusion-paradiddle',
        label: 'Fusion · Paradiddle',
        pattern: 'TgTg' + 'SgTg' + 'TgTg' + 'SgTg',
        handsatz: 'paradiddle',
        bpm: 60,
      },
    ],
  },
  {
    number: 32,
    title: 'Wenn der Klang aussetzt',
    subtitle: 'Breaks im Pattern · die Stille wird Werkzeug',
    essence:
      'Heute schweigen wir bewusst. Ein Break ist kein Loch — er ist eine Aussage.',
    cycle: 3,
    hasGrafik: true,
    videoId: '907fb281-bb95-450a-b103-7b954939139f',
    presets: [
      {
        id: 'break-grundbogen',
        label: 'Grundbogen · ohne Break',
        hint: 'Basis-Rhythmus: Bass alterniert · Mitte · Melodie',
        pattern: 'Tggg' + 'Tggg' + 'gggg' + 'Tggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'break-mikro',
        label: 'Mikro-Break · letzte 16tel',
        hint: 'der Grundbogen läuft · die letzte Sechzehntel verstummt',
        pattern: 'Tggg' + 'Tggg' + 'gggg' + 'Tgg.',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'break-solo',
        label: 'Solo-Break · Takt 2 + 3',
        hint: 'die linke Hand pausiert · die rechte Hand spielt allein durch Takt 2 + 3',
        pattern: 'Tggg' + 'T...' + '....' + 'Tggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'break-zwei',
        label: 'Stop-Time · Takt 3 Stille',
        hint: 'alle Stimmen halten gemeinsam an · Takt 3 wird Stille',
        pattern: 'Tggg' + 'Tggg' + '....' + 'Tggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'break-eins',
        label: 'Break · ein Bogen Stille',
        hint: '3 Bögen voll · 1 Bogen Stille',
        pattern: 'TgTg' + 'SgTg' + 'gggg' + 'SgTg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'break-fill',
        label: 'Break + Fill am Ende',
        pattern: 'TgTg' + 'SgTg' + 'gggg' + 'STTT',
        handsatz: 'R-L',
        bpm: 60,
      },
    ],
  },
  {
    number: 33,
    title: 'Wenn der Klang zum Schlag wird',
    subtitle: 'Melodisch wird perkussiv · Tonfelder als Akzente',
    essence:
      'Die Umkehrung von Tag 25 — Klang wird wieder Schlag. Tonfeld als Schlagwerkzeug.',
    cycle: 3,
    hasGrafik: true,
    videoId: '0068f9f6-f791-41b5-8e82-472ee83cd77b',
    presets: [
      {
        id: 'tonfeld-perkussiv',
        label: 'Station 1 · Basis-Rhythmus',
        hint: 'Ding auf 1, Slap auf 2 und 4, Takt 3 still',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'bogen-1-drei-tonfelder',
        label: 'Bogen 1 · 3 · 5 · 7 · drei Töne',
        hint: 'Takt 4: Slap, dann drei Tonfelder',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'STTT',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'bogen-2-zwei-tonfelder',
        label: 'Bogen 2 · 6 · zwei Tonfelder',
        hint: 'Takt 4: Slap · gn · Ton · Ton',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'SgTT',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'bogen-4-ein-schlag',
        label: 'Bogen 4 · ein perkussiver Schlag',
        hint: 'Takt 4: Slap · gn · gn · Slap',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'SggS',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'bogen-8-vier-slaps',
        label: 'Bogen 8 · vier Slaps im Finale',
        hint: 'Takt 4: die perkussive Welle',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'SSSS',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'tonfeld-akkord',
        label: 'Bogen 9 + 10 · Break mit Akkord',
        hint: 'Akkord statt Ding auf der 1, ohne Fill',
        pattern: 'Tggg' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'gemischt',
        label: 'Gemischt · Klang ↔ Schlag',
        pattern: 'DgTg' + 'SgTg' + 'gggg' + 'TgSg',
        handsatz: 'paradiddle',
        bpm: 60,
      },
    ],
  },
  {
    number: 34,
    title: 'Die Drei tritt ein',
    subtitle: 'Dreier-Rhythmik · 12 Sechzehntel statt 16',
    essence:
      'Eine neue Welt: der Dreier. Nicht mehr 4 × 4, sondern 4 × 3.',
    cycle: 4,
    hasGrafik: true,
    videoId: 'd120b5b1-30e4-4e19-ada9-6fe0f9f4fe6b',
    presets: [
      {
        id: 'station-1-drei',
        label: 'Station 1 · Die Drei einsaugen',
        hint: 'Ding auf jeder 1 der Dreiergruppe, Handsatz wechselt je Gruppe',
        pattern: 'Dgg' + 'Dgg',
        handsatz: 'R-L',
        bpm: 36,
        subdivision: '8t',
      },
      {
        id: 'station-2-sechs',
        label: 'Station 2 · Verdoppeln auf Sechs',
        hint: 'Nur das erste Ding, der Rest läuft leise mit',
        pattern: 'Dgg' + 'ggg',
        handsatz: 'R-L',
        bpm: 36,
        subdivision: '8t',
      },
      {
        id: 'station-3-zwoelfer',
        label: 'Station 3 · Der Zwölfer-Takt',
        hint: 'Ding auf 1, Slap auf 2 und 4, Bogen 3 still',
        pattern: 'Dgg' + 'Sgg' + 'ggg' + 'Sgg',
        handsatz: 'R-L',
        bpm: 36,
        subdivision: '8t',
      },
      {
        id: 'station-4-tonfelder',
        label: 'Station 4 · Slaps wandern auf Tonfelder',
        hint: 'Probier die komischsten Kombinationen',
        pattern: 'Dgg' + 'Tgg' + 'ggg' + 'Tgg',
        handsatz: 'R-L',
        bpm: 36,
        subdivision: '8t',
      },
      {
        id: 'station-5-links',
        label: 'Station 5 · Die andere Hand startet',
        hint: 'Derselbe Zwölfer, mit links beginnend',
        pattern: 'Dgg' + 'Sgg' + 'ggg' + 'Sgg',
        handsatz: 'L-R',
        bpm: 36,
        subdivision: '8t',
      },
      {
        id: 'station-5-tonfelder-links',
        label: 'Station 5 · Tonfelder, links',
        hint: 'Hand-to-Hand links beginnend',
        pattern: 'Dgg' + 'Tgg' + 'ggg' + 'Tgg',
        handsatz: 'L-R',
        bpm: 36,
        subdivision: '8t',
      },
      {
        id: 'station-6-entkoppeln',
        label: 'Station 6 · Entkoppeln',
        hint: 'Linke Hand durchgehend, rechte verteilt Bass · Mitte · Melodie',
        pattern: 'T..' + 'T..' + '...' + 'T..',
        wiederholung: 'ggg' + 'ggg' + 'ggg' + 'ggg',
        handsatz: 'frei',
        bpm: 36,
        subdivision: '8t',
      },
    ],
  },
  {
    number: 35,
    title: 'Hören ehe du spielst',
    subtitle: 'Inneres Hören · der Ton vor dem Anschlag',
    essence:
      'Bevor du den Ton spielst, sei du schon bei ihm. Inneres Hören wird zur Praxis.',
    cycle: 4,
    hasGrafik: true,
    videoId: '2aa7f639-2cf0-47bf-80b8-b1e66038304c',
    presets: [
      {
        id: 'frahm-puls',
        label: 'Nachempfinden · eine Taste',
        hint: 'Ein Ton auf jeder Triole — Frahms Beginn als Ausgangspunkt',
        pattern: 'PPP' + 'PPP' + 'PPP' + 'PPP',
        handsatz: 'frei',
        bpm: 56,
        subdivision: '8t',
      },
    ],
  },
  {
    number: 36,
    title: 'Der kompositorische Körper',
    subtitle: 'Ein in sich geschlossenes Element · der erste Körper',
    essence:
      'Heute baust du den ersten kompositorischen Körper — ein Element, das in sich steht.',
    cycle: 4,
    hasGrafik: true,
    videoId: '22a92ead-fa13-46f7-8809-9b175a8b1bcd',
    presets: [
      {
        id: 'unterlage',
        label: 'Unterlage für deinen Körper',
        hint: 'Der Zwölfer aus Tag 34 — wie lang dein Körper wird, bestimmt dein Ohr',
        pattern: 'Dgg' + 'Sgg' + 'ggg' + 'Sgg',
        handsatz: 'R-L',
        bpm: 56,
        subdivision: '8t',
      },
    ],
  },
  {
    number: 37,
    title: 'Zwei Körper, die sich drehen',
    subtitle: 'Vier Bögen · zwei Körper · der erste Kreis',
    essence:
      'Zwei kompositorische Körper über vier Bögen. Der erste Kreis schließt sich.',
    cycle: 4,
    hasGrafik: true,
    videoId: '43b3b532-ef4a-49d1-a98d-8343592d6426',
    presets: [
      {
        id: 'pulston',
        label: 'Linke Hand · Wiederholung',
        hint: 'Ein einziger Ton, auf jeder Triole',
        pattern: 'PPP' + 'PPP' + 'PPP' + 'PPP',
        handsatz: 'frei',
        bpm: 56,
        subdivision: '8t',
      },
      {
        id: 'motiv-1-akkorde',
        label: 'Bogen 1+2 · zwei Akkorde',
        hint: 'Akzent auf 1 · 3 · 4, Schlag 2 still — Akkord A, dann B',
        pattern: 'T..' + '...' + 'T..' + 'T..' + 'T..' + '...' + 'T..' + 'T..',
        wiederholung: 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP',
        handsatz: 'frei',
        bpm: 56,
        subdivision: '8t',
      },
      {
        id: 'motiv-2-einzeltoene',
        label: 'Bogen 3–6 · drei Einzeltöne',
        hint: 'Dieselben Zählzeiten, jetzt Einzeltöne im Wechsel',
        pattern: 'T..' + '...' + 'T..' + 'T..' + 'T..' + '...' + 'T..' + 'T..',
        wiederholung: 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP',
        handsatz: 'frei',
        bpm: 56,
        subdivision: '8t',
      },
    ],
  },
  {
    number: 38,
    title: 'Die Form',
    subtitle: 'Said and Done · die Form als Werkzeug',
    essence:
      'Eine Form steht. Was bisher Praxis war, wird Komposition.',
    cycle: 4,
    hasGrafik: true,
    videoId: '6b7c0d7e-6494-4dcd-ae32-16bde57d1e4e',
    presets: [
      {
        id: 'phase-1-eine-taste',
        label: 'Phase 1 · Eine Taste',
        hint: 'Ein Tonfeld wiederholt — eine Minute, nur Anschlag und Dynamik',
        pattern: 'PPP' + 'PPP' + 'PPP' + 'PPP',
        handsatz: 'frei',
        bpm: 56,
        subdivision: '8t',
      },
      {
        id: 'phase-2-bass',
        label: 'Phase 2 · Die Bassnote tritt ein',
        hint: 'Ein tiefer Ton unter der Wiederholung',
        pattern: 'D..' + '...' + '...' + '...',
        wiederholung: 'PPP' + 'PPP' + 'PPP' + 'PPP',
        handsatz: 'frei',
        bpm: 56,
        subdivision: '8t',
      },
      {
        id: 'phase-3-motiv',
        label: 'Phase 3 · Das Motiv aus gestern',
        hint: 'Akzent auf 1 · 3 · 4 über der Wiederholung',
        pattern: 'T..' + '...' + 'T..' + 'T..' + 'T..' + '...' + 'T..' + 'T..',
        wiederholung: 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP',
        handsatz: 'frei',
        bpm: 56,
        subdivision: '8t',
      },
      {
        id: 'phase-4-break',
        label: 'Phase 4 · Break',
        hint: 'Stille — dann kommt das Motiv aus dem Nichts zurück',
        pattern: '...' + '...' + '...' + '...' + 'T..' + '...' + 'T..' + 'T..',
        wiederholung: '...' + '...' + '...' + '...' + 'PPP' + 'PPP' + 'PPP' + 'PPP',
        handsatz: 'frei',
        bpm: 56,
        subdivision: '8t',
      },
    ],
  },
  {
    number: 39,
    title: 'Die dritte Ebene',
    subtitle: 'Melodie + Harmonik + perkussive Rhythmik gleichzeitig',
    essence:
      'Drei Ebenen gleichzeitig — der Frahm-Study-Bogen schließt sich.',
    cycle: 4,
    hasGrafik: true,
    videoId: '428772bd-44c2-46d2-b3ee-21ed1a7eff9e',
    presets: [
      {
        id: 'phase-1-anker',
        label: 'Phase 1 · Der perkussive Anker',
        hint: 'Ding auf 1, Slap auf 2, dazwischen die Wiederholung',
        pattern: 'D..' + 'S..' + '...' + '...',
        wiederholung: 'PPP' + 'PPP' + 'PPP' + 'PPP',
        handsatz: 'frei',
        bpm: 48,
        subdivision: '8t',
      },
      {
        id: 'phase-2-ein-akkord',
        label: 'Phase 2 · Ein einziger Akkord',
        hint: 'Akkord auf 1 · 3 · 4 · Slap auf 2 · darunter die Wiederholung',
        pattern: 'T..' + 'S..' + 'T..' + 'T..',
        wiederholung: 'PPP' + 'PPP' + 'PPP' + 'PPP',
        handsatz: 'frei',
        bpm: 48,
        subdivision: '8t',
      },
      {
        id: 'phase-3-motiv-1',
        label: 'Phase 3 · Motiv 1 · zwei Akkorde',
        hint: 'Akkord A in Bogen 1, Akkord B in Bogen 2',
        pattern: 'T..' + 'S..' + 'T..' + 'T..' + 'T..' + 'S..' + 'T..' + 'T..',
        wiederholung: 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP',
        handsatz: 'frei',
        bpm: 48,
        subdivision: '8t',
      },
      {
        id: 'phase-4-motiv-2',
        label: 'Phase 4 · Motiv 2 · drei Tonfelder',
        hint: 'Einzeltöne X · Y · Z auf 1 · 3 · 4 · Slap auf 2 · darunter die Wiederholung',
        pattern: 'T..' + 'S..' + 'T..' + 'T..' + 'T..' + 'S..' + 'T..' + 'T..',
        wiederholung: 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP',
        handsatz: 'frei',
        bpm: 48,
        subdivision: '8t',
      },
    ],
  },
  {
    number: 40,
    title: 'Deine zwei Körper',
    subtitle: 'Kompositionsrhythmik · die Übergabe',
    essence:
      'Heute hörst du nicht mehr nach. Heute suchst du selbst — zwei Körper, vier Bögen, deine Komposition.',
    cycle: 4,
    hasGrafik: true,
    videoId: '799a540c-014b-4487-8efd-4fa22aff04fa',
    presets: [
      {
        id: 'phase-1-basis',
        label: 'Phase 1 · Der Basis-Rhythmus läuft',
        hint: 'Die Wiederholung — ruhig und schlicht',
        pattern: 'PPP' + 'PPP' + 'PPP' + 'PPP',
        handsatz: 'frei',
        bpm: 48,
        subdivision: '8t',
      },
      {
        id: 'phase-2-koerper-1',
        label: 'Phase 2 · Körper 1 · Bogen 1+2',
        hint: 'Akzente auf 1 · 3 · 4, die 2 atmet',
        pattern: 'T..' + '...' + 'T..' + 'T..' + 'T..' + '...' + 'T..' + 'T..',
        wiederholung: 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP',
        handsatz: 'frei',
        bpm: 48,
        subdivision: '8t',
      },
      {
        id: 'phase-3-koerper-2',
        label: 'Phase 3 · Körper 2 · Bogen 3+4',
        hint: 'Gleiche Zählzeiten, anderer Charakter',
        pattern: 'T..' + '...' + 'T..' + 'T..' + 'T..' + '...' + 'T..' + 'T..',
        wiederholung: 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP',
        handsatz: 'frei',
        bpm: 48,
        subdivision: '8t',
      },
      {
        id: 'phase-4-perkussiv',
        label: 'Phase 4 · Die perkussive Ebene dazu',
        hint: 'Slap auf 2 dazu — der Akkord trägt die 1',
        pattern: 'T..' + 'S..' + 'T..' + 'T..' + 'T..' + 'S..' + 'T..' + 'T..',
        wiederholung: 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP',
        handsatz: 'frei',
        bpm: 48,
        subdivision: '8t',
      },
      {
        id: 'phase-5-break',
        label: 'Phase 5 · Twist · ein Break',
        hint: 'Am Ende eines Bogens einen Schlag auslassen',
        pattern: 'T..' + 'S..' + 'T..' + 'T..' + 'T..' + 'S..' + 'T..' + '...',
        wiederholung: 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + '.PP',
        handsatz: 'frei',
        bpm: 48,
        subdivision: '8t',
      },
    ],
  },
  // Tag 41–44: Triolen-Raster (1 · und · die), wie in Tag 39/40 notiert und in den
  // Videos gemessen (12er-Periodik, ~56–60 BPM). Grundbogen = Tag-39-Anker:
  // Tonfeld/Akkord auf 1 · 3 · 4, Slap auf 2, dazwischen die Wiederholung als Pulston (P).
  // X = Slap + Tonfeld gleichzeitig (Tag 42/43).
  {
    number: 41,
    title: 'Das Motiv beginnt zu erzählen',
    subtitle: 'Kompositionsrhythmik · Variation auf einem Motiv',
    essence:
      'Eine Stelle im Motiv, jedes Mal etwas anderes gesetzt — so beginnt ein Körper zu erzählen.',
    cycle: 4,
    hasGrafik: false,
    videoId: '9736848c-eeed-404e-85f0-a1e402976c3a',
    presets: [
      {
        id: 'phase-1-motiv-1',
        label: 'Phase 1 · Motiv 1 · Bogen 1+2',
        hint: 'Ding auf 1, Tonfeld auf 3 · 4, Slap auf 2, dazwischen die Wiederholung',
        pattern: 'D..' + 'S..' + 'T..' + 'T..' + 'D..' + 'S..' + 'T..' + 'T..',
        wiederholung: 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP',
        handsatz: 'frei',
        bpm: 56,
        subdivision: '8t',
      },
      {
        id: 'phase-4-stelle',
        label: 'Phase 4 · Die eine Stelle variiert',
        hint: 'Schlusston von Bogen 2 als Wiederholung — wie im Video',
        pattern: 'D..' + 'S..' + 'T..' + 'T..' + 'D..' + 'S..' + 'T..' + 'TTT',
        wiederholung: 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP',
        handsatz: 'frei',
        bpm: 56,
        subdivision: '8t',
      },
      {
        id: 'phase-6-break',
        label: 'Phase 6 · Bögen aneinander + Break',
        hint: 'Am Ende ein ausgelassener Schlag — eine Mikropause',
        pattern: 'D..' + 'S..' + 'T..' + 'T..' + 'D..' + 'S..' + 'T..' + '...',
        wiederholung: 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + '.PP',
        handsatz: 'frei',
        bpm: 56,
        subdivision: '8t',
      },
    ],
  },
  {
    number: 42,
    title: 'Der zweite Körper antwortet',
    subtitle: 'Kompositionsrhythmik · Variation auf dem zweiten Motiv',
    essence:
      'Ein einziger zusätzlicher Anschlag an einer Stelle — und Motiv 2 ist nicht mehr dasselbe.',
    cycle: 4,
    hasGrafik: false,
    videoId: '05daed3f-6986-4a1b-8cdf-6757fb847e85',
    presets: [
      {
        id: 'phase-1-motiv-2',
        label: 'Phase 1 · Motiv 2 · Bogen 3+4',
        hint: 'Unverändert, wie gestern',
        pattern: 'D..' + 'S..' + 'T..' + 'T..' + 'D..' + 'S..' + 'T..' + 'T..',
        wiederholung: 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP',
        handsatz: 'frei',
        bpm: 56,
        subdivision: '8t',
      },
      {
        id: 'phase-3-slap-tonfeld',
        label: 'Phase 3 · Slap + Tonfeld',
        hint: 'Bogen 3 bleibt gleich, in Bogen 4 fällt ein Tonfeld auf den Slap',
        pattern: 'D..' + 'S..' + 'T..' + 'T..' + 'D..' + 'X..' + 'T..' + 'T..',
        wiederholung: 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP',
        handsatz: 'frei',
        bpm: 56,
        subdivision: '8t',
      },
      {
        id: 'phase-4-fill',
        label: 'Phase 4 · Fill-In zum Ende',
        hint: 'Zwei Töne als weicher Übergang zurück zu Motiv 1',
        pattern: 'D..' + 'S..' + 'T..' + 'T..' + 'D..' + 'X..' + 'T..' + 'TTT',
        wiederholung: 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP',
        handsatz: 'frei',
        bpm: 56,
        subdivision: '8t',
      },
      {
        id: 'phase-5-break',
        label: 'Phase 5 · Break-Figur',
        hint: 'Slap pausiert, Tonfelder und Wiederholung laufen weiter',
        pattern: 'D..' + 'S..' + 'T..' + 'T..' + 'D..' + '...' + 'T..' + 'T..',
        wiederholung: 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP',
        handsatz: 'frei',
        bpm: 56,
        subdivision: '8t',
      },
    ],
  },
  {
    number: 43,
    title: 'Die Welle',
    subtitle: 'Kompositionsrhythmik · die zwei Teile werden eine Bewegung',
    essence:
      'Die zwei Teile zusammengelegt — Anstieg, Gipfel, Durchatmen. So entsteht die Welle, die dein Spiel trägt.',
    cycle: 4,
    hasGrafik: false,
    videoId: 'e7e2ed0a-da6e-4834-be90-392be1229d6b',
    presets: [
      {
        id: 'phase-1-basis',
        label: 'Phase 1 · Basis festigen',
        hint: 'Grundbogen, bis beide Teile von selbst tragen',
        pattern: 'D..' + 'S..' + 'T..' + 'T..' + 'D..' + 'S..' + 'T..' + 'T..',
        wiederholung: 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP',
        handsatz: 'frei',
        bpm: 60,
        subdivision: '8t',
      },
      {
        id: 'phase-2-zusammen',
        label: 'Phase 2 · Motiv 1 → Motiv 2',
        hint: 'Beide variierten Stellen: Schlusston wiederholt, dann Slap + Tonfeld',
        pattern: 'D..' + 'S..' + 'T..' + 'TTT' + 'D..' + 'X..' + 'T..' + 'T..',
        wiederholung: 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP',
        handsatz: 'frei',
        bpm: 60,
        subdivision: '8t',
      },
      {
        id: 'phase-4-break',
        label: 'Phase 4 · Break und wieder rein',
        hint: 'Ausatmen ohne Slap — dann zurück in den Körper',
        pattern: 'D..' + '...' + 'T..' + 'T..' + 'D..' + 'S..' + 'T..' + 'T..',
        wiederholung: 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP' + 'PPP',
        handsatz: 'frei',
        bpm: 60,
        subdivision: '8t',
      },
    ],
  },
  // Tag 44: bewusst ohne Übungsvorlage — „Heute keine Stationen, keine Notation.“
  {
    number: 44,
    title: 'Am Fluss',
    subtitle: 'Der letzte Tag · die Ausrichtung auf das Wesentliche',
    essence:
      'Am letzten Tag keine Übung mehr, sondern eine Frage: Wer bist du, und was willst du in deiner Musik?',
    cycle: 4,
    hasGrafik: false,
    videoId: '0fcc2259-d59c-4b86-9cce-b12226664891',
    presets: [],
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Convenience: lookup by day number.
// ─────────────────────────────────────────────────────────────────────────────

export function getDay(num: number): RhythmusDay | undefined {
  return RHYTHMUS_DAYS.find((d) => d.number === num);
}

export function daysInCycle(cycle: 1 | 2 | 3 | 4): readonly RhythmusDay[] {
  return RHYTHMUS_DAYS.filter((d) => d.cycle === cycle);
}

export const TOTAL_DAYS = RHYTHMUS_DAYS.length;

// ─────────────────────────────────────────────────────────────────────────────
// Geplante Kurslänge. Der Kurs hat 44 Tage; Tag 41–44 werden nachgeliefert.
// Drip-Unlock (app/lib/course-access.ts) rechnet IMMER mit COURSE_TOTAL_DAYS,
// nicht mit der Zahl der bereits hochgeladenen Tage — sonst würde die
// Freischalt-Kette der Teilnehmer bei Tag 40 abreißen und beim Nachladen
// springen. Beim Hinzufügen von Tag 41–44: Eintrag in RHYTHMUS_DAYS +
// content/rhythmusfundament/tag-N.md anlegen, sonst nichts anfassen.
// ─────────────────────────────────────────────────────────────────────────────
export const COURSE_TOTAL_DAYS = 44;

/** Tagesnummern, die geplant, aber noch nicht hochgeladen sind (z. B. 41..44). */
export const PLANNED_DAY_NUMBERS: readonly number[] = Array.from(
  { length: Math.max(0, COURSE_TOTAL_DAYS - RHYTHMUS_DAYS.length) },
  (_, i) => RHYTHMUS_DAYS.length + 1 + i,
);
