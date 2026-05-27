// ─────────────────────────────────────────────────────────────────────────────
// Rhythmus-Fundament — 40-Tage-Daten
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

export type RhythmusSubdivisionKey = '4n' | '8n' | '16n' | '32n';

export interface RhythmusPreset {
  /** Stable per-day-unique id, used in URLs + React keys. */
  id: string;
  /** Button-Label (kurz, max ~32 chars). */
  label: string;
  /** 1-line hint shown under label or in tooltip — optional. */
  hint?: string;
  /** Strike sequence: 1–32 chars from set `.gTSD`. Defaults to 16. */
  pattern: string;
  handsatz: RhythmusHandsatzKey;
  /** Empfohlenes Start-Tempo. User kann live ändern. */
  bpm: number;
  /** Optional — defaults to `16n` wenn nicht gesetzt. */
  subdivision?: RhythmusSubdivisionKey;
}

export interface RhythmusDay {
  /** 1..40 */
  number: number;
  /** Kurztitel — z.B. "Womit alles beginnt". */
  title: string;
  /** Untertitel — z.B. "Rhythmus und am Ende Kunst". Default fallback. */
  subtitle: string;
  /** 1-line ESSENZ-Auszug aus dem Markdown (für Index-Card + meta). */
  essence: string;
  /** Zyklus-Zugehörigkeit (1, 2, 3). */
  cycle: 1 | 2 | 3;
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
}

export interface RhythmusCycle {
  number: 1 | 2 | 3;
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
    title: 'Harmonik, Form, Komposition',
    subtitle: 'Vom Schlag zum Klang — und zur eigenen Komposition',
    dayRange: [23, 40],
  },
] as const;

export function cycleForDay(num: number): RhythmusCycle {
  for (const c of RHYTHMUS_CYCLES) {
    if (num >= c.dayRange[0] && num <= c.dayRange[1]) return c;
  }
  return RHYTHMUS_CYCLES[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// 40-Tage-Daten
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
    presets: [
      {
        id: 'vierer-rl',
        label: 'Vierer · R – L',
        hint: 'Ding auf 1, Ghostnotes 2/3/4 · Wechselschlag rechts beginnend',
        pattern: 'Dggggggggggggggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'vierer-lr',
        label: 'Vierer · L – R',
        hint: 'Wechselschlag links beginnend',
        pattern: 'Dggggggggggggggg',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'vierer-rrll',
        label: 'Vierer · R – R – L – L',
        hint: 'Doppelschlag rechts → links',
        pattern: 'Dggggggggggggggg',
        handsatz: 'RR-LL',
        bpm: 60,
      },
      {
        id: 'vierer-llrr',
        label: 'Vierer · L – L – R – R',
        hint: 'Doppelschlag links → rechts',
        pattern: 'Dggggggggggggggg',
        handsatz: 'LL-RR',
        bpm: 60,
      },
      {
        id: 'vierer-paradiddle',
        label: 'Vierer · Paradiddle',
        hint: 'R – L – R – R – L – R – L – L',
        pattern: 'Dggggggggggggggg',
        handsatz: 'paradiddle',
        bpm: 60,
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
    presets: [
      {
        id: 'slap-3-rl',
        label: 'Vierer · Slap auf 3 · R – L',
        hint: 'Ding 1 · Slap 3 · Ghostnotes',
        pattern: 'gggggggSggggggggg'.slice(0, 16),
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'slap-3-lr',
        label: 'Vierer · Slap auf 3 · L – R',
        pattern: 'gggggggSggggggggg'.slice(0, 16),
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'slap-3-rrll',
        label: 'Vierer · Slap auf 3 · R – R – L – L',
        pattern: 'gggggggSggggggggg'.slice(0, 16),
        handsatz: 'RR-LL',
        bpm: 60,
      },
      {
        id: 'slap-3-llrr',
        label: 'Vierer · Slap auf 3 · L – L – R – R',
        pattern: 'gggggggSggggggggg'.slice(0, 16),
        handsatz: 'LL-RR',
        bpm: 60,
      },
      {
        id: 'slap-3-paradiddle',
        label: 'Vierer · Slap auf 3 · Paradiddle',
        pattern: 'gggggggSggggggggg'.slice(0, 16),
        handsatz: 'paradiddle',
        bpm: 60,
      },
      {
        id: 'achtel',
        label: 'Achtel · Ding 1 · Slap 3',
        hint: 'Dichte 8 · Subdivision 8n',
        pattern: 'Dggg' + 'gggg' + 'Sggg' + 'gggg',
        handsatz: 'R-L',
        bpm: 60,
        subdivision: '16n',
      },
      {
        id: 'sechzehntel',
        label: 'Sechzehntel · Ding 1 · Slap 3',
        hint: 'Dichte 16 · alle Sechzehntel als Ghostnote',
        pattern: 'Dggg' + 'gggg' + 'Sggg' + 'gggg',
        handsatz: 'R-L',
        bpm: 60,
        subdivision: '16n',
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
    presets: [
      {
        id: 'slap-4-rl',
        label: 'Vierer · Slap auf 4 · R – L',
        hint: 'Ding 1 · Slap 4',
        pattern: 'Dggg' + 'gggg' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'slap-4-lr',
        label: 'Vierer · Slap auf 4 · L – R',
        pattern: 'Dggg' + 'gggg' + 'gggg' + 'Sggg',
        handsatz: 'L-R',
        bpm: 60,
      },
      {
        id: 'slap-4-rrll',
        label: 'Vierer · Slap auf 4 · R – R – L – L',
        pattern: 'Dggg' + 'gggg' + 'gggg' + 'Sggg',
        handsatz: 'RR-LL',
        bpm: 60,
      },
      {
        id: 'slap-4-llrr',
        label: 'Vierer · Slap auf 4 · L – L – R – R',
        pattern: 'Dggg' + 'gggg' + 'gggg' + 'Sggg',
        handsatz: 'LL-RR',
        bpm: 60,
      },
      {
        id: 'slap-4-paradiddle',
        label: 'Vierer · Slap auf 4 · Paradiddle',
        pattern: 'Dggg' + 'gggg' + 'gggg' + 'Sggg',
        handsatz: 'paradiddle',
        bpm: 60,
      },
      {
        id: 'beat-offbeat-wechsel',
        label: 'Beat ↔ Offbeat im Wechsel',
        hint: 'Takt 1: Slap 3 · Takt 2: Slap 4 · 2 × 4',
        pattern: 'Dggg' + 'Sggg' + 'Dggg' + 'gSgg',
        handsatz: 'R-L',
        bpm: 60,
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
    presets: [
      {
        id: 'tonleiter-rl',
        label: 'Tonleiter · Tonfeld 1 · Slap 3 · R – L',
        hint: 'Tonfeld auf 1 (Takt für Takt nächster Ton)',
        pattern: 'Tggg' + 'gggg' + 'Sggg' + 'gggg',
        handsatz: 'R-L',
        bpm: 56,
      },
      {
        id: 'tonleiter-lr',
        label: 'Tonleiter · Tonfeld 1 · Slap 3 · L – R',
        pattern: 'Tggg' + 'gggg' + 'Sggg' + 'gggg',
        handsatz: 'L-R',
        bpm: 56,
      },
      {
        id: 'tonleiter-rrll',
        label: 'Tonleiter · R – R – L – L',
        pattern: 'Tggg' + 'gggg' + 'Sggg' + 'gggg',
        handsatz: 'RR-LL',
        bpm: 56,
      },
      {
        id: 'tonleiter-llrr',
        label: 'Tonleiter · L – L – R – R',
        pattern: 'Tggg' + 'gggg' + 'Sggg' + 'gggg',
        handsatz: 'LL-RR',
        bpm: 56,
      },
      {
        id: 'tonleiter-paradiddle',
        label: 'Tonleiter · Paradiddle',
        hint: 'Hier öffnet sich die Übung — der Paradiddle trägt am weichsten.',
        pattern: 'Tggg' + 'gggg' + 'Sggg' + 'gggg',
        handsatz: 'paradiddle',
        bpm: 56,
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
        pattern: 'TgggTgggTgggTggg'.slice(0, 16),
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
        pattern: 'TgggTgggTgggTggg'.slice(0, 16),
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
        hint: 'Takt 4 — Slap-Sechzehntel vor der 4',
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
        label: 'Stufe 1 perkussiv · Takt 3 · L – R',
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
        label: 'Übung A · Lieblings-Variation Takt 4',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'SgTT',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'uebung-b',
        label: 'Übung B · Lieblings-Variation Takt 3',
        pattern: 'Dggg' + 'Sggg' + 'gTTT' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'uebung-c',
        label: 'Übung C · Lieblings-Variation Takt 2',
        pattern: 'Dggg' + 'STTT' + 'gggg' + 'Sggg',
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
    presets: [
      {
        id: 'spielweg-a',
        label: 'Spielweg A · einfach',
        hint: '3× Basis, 1× Stufe-2-melodisch in Takt 4',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'SgTT',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'spielweg-b',
        label: 'Spielweg B · mehrschichtig',
        hint: 'Variation auf Takt 3 + 4',
        pattern: 'Dggg' + 'Sggg' + 'gTTT' + 'SgTT',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'spielweg-c',
        label: 'Spielweg C · komponiert',
        hint: 'Alle vier Takte bewegen sich',
        pattern: 'DggT' + 'SggT' + 'gTTT' + 'SgTT',
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
        id: 'gespiegelt-basis',
        label: 'Gespiegelt · Basis · L – R',
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
        id: 'uebergang-1',
        label: 'Übergang · Slap → Tonfeld',
        hint: 'Auf der 4 wird der Slap zum Tonfeld',
        pattern: 'Dggg' + 'Sggg' + 'gggg' + 'Tggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'uebergang-2',
        label: 'Übergang · doppelt melodisch',
        pattern: 'Tggg' + 'Tggg' + 'gggg' + 'Tggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'uebergang-stufen',
        label: 'Übergang mit Stufe-2-melodisch',
        pattern: 'Dggg' + 'Sggg' + 'ggTT' + 'TgTT',
        handsatz: 'R-L',
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
    presets: [
      {
        id: 'melodie-takt3-langsam',
        label: 'Melodie · Takt 3 · langsam',
        pattern: 'Dggg' + 'Sggg' + 'Tggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 56,
      },
      {
        id: 'melodie-takt3-zwei-toene',
        label: 'Melodie · Takt 3 · 2 Töne',
        pattern: 'Dggg' + 'Sggg' + 'TgTg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'melodie-takt3-voll',
        label: 'Melodie · Takt 3 · voll',
        pattern: 'Dggg' + 'Sggg' + 'TgTT' + 'Sggg',
        handsatz: 'R-L',
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
    presets: [
      {
        id: 'mitte-zwei-tonfelder',
        label: 'Mitte · 2 Tonfelder',
        pattern: 'Dggg' + 'SgTg' + 'gTgg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'mitte-dreiklang',
        label: 'Mitte · drei Tonfelder',
        pattern: 'Dggg' + 'SgTT' + 'TTgg' + 'Sggg',
        handsatz: 'R-L',
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
        id: 'akkord-statisch',
        label: 'Akkord · statisch',
        hint: 'Tonfeld auf 1, perkussive Slaps · Akkord 1·3·5',
        pattern: 'Tggg' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 56,
      },
      {
        id: 'akkord-mit-fill',
        label: 'Akkord + Fill in Takt 4',
        pattern: 'Tggg' + 'Sggg' + 'gggg' + 'SgTT',
        handsatz: 'R-L',
        bpm: 56,
      },
      {
        id: 'akkord-bogen',
        label: 'Akkord · vier Bögen, ein Fill',
        hint: 'Erst drei Bögen klar, dann ein Fill',
        pattern: 'Tggg' + 'Sggg' + 'gggg' + 'Sggg',
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
        label: 'Wandern · chronologisch · 1·3·5 → 2·4·6 → 3·5·7',
        hint: 'Akkord auf 1 wechselt Bogen für Bogen einen Schritt nach oben',
        pattern: 'TgggSgggggggSggg'.slice(0, 16),
        handsatz: 'R-L',
        bpm: 56,
      },
      {
        id: 'wandern-mit-steigerung',
        label: 'Wandern + 3 wächst zur Steigerung',
        hint: 'Slaps auf der 3 nehmen Dichte zu',
        pattern: 'Tggg' + 'Sggg' + 'gSSS' + 'Sggg',
        handsatz: 'R-L',
        bpm: 56,
      },
      {
        id: 'wandern-vier-boegen',
        label: '4 Bögen · absteigender Klang oben',
        hint: 'Basis pendelt 2·4 ↔ 1·3, oben: 8 · 7 · 6 · 5',
        pattern: 'Tggg' + 'Sggg' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 56,
      },
      {
        id: 'wandern-mit-melodie-fill',
        label: '4 Bögen + Melodie-Fill am Ende',
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
        id: 'fusion-eins',
        label: 'Fusion · I',
        pattern: 'TgTg' + 'SgTg' + 'TgTg' + 'SgTg',
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
        id: 'break-eins',
        label: 'Break · ein Bogen Stille',
        hint: '3 Bögen voll · 1 Bogen Stille',
        pattern: 'TgTg' + 'SgTg' + 'gggg' + 'SgTg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'break-zwei',
        label: 'Break · halber Bogen',
        hint: 'Stille nur in Takt 3 und Takt 4 Anfang',
        pattern: 'TgTg' + 'SgTg' + 'gggg' + 'gggg',
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
        label: 'Tonfeld perkussiv',
        hint: 'Hart angeschlagene Tonfelder als Slap-Ersatz',
        pattern: 'Dggg' + 'Tggg' + 'gggg' + 'Tggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'tonfeld-akkord',
        label: 'Tonfeld als Akkord-Schlag',
        pattern: 'Tggg' + 'Tggg' + 'gggg' + 'Tggg',
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
    cycle: 3,
    hasGrafik: true,
    videoId: 'd120b5b1-30e4-4e19-ada9-6fe0f9f4fe6b',
    presets: [
      {
        id: 'dreier-basis',
        label: 'Dreier · Basis',
        hint: 'Ding · Slap · Stille · Slap im Dreiertakt',
        pattern: 'Dgg' + 'Sgg' + 'ggg' + 'Sgg',
        handsatz: 'R-L',
        bpm: 60,
        subdivision: '16n',
      },
      {
        id: 'dreier-melodisch',
        label: 'Dreier · melodisch',
        pattern: 'Tgg' + 'Sgg' + 'Tgg' + 'Sgg',
        handsatz: 'R-L',
        bpm: 60,
        subdivision: '16n',
      },
      {
        id: 'dreier-paradiddle',
        label: 'Dreier · Paradiddle',
        pattern: 'Dgg' + 'Sgg' + 'ggg' + 'Sgg',
        handsatz: 'paradiddle',
        bpm: 60,
        subdivision: '16n',
      },
    ],
  },
  {
    number: 35,
    title: 'Hören ehe du spielst',
    subtitle: 'Inneres Hören · der Ton vor dem Anschlag',
    essence:
      'Bevor du den Ton spielst, sei du schon bei ihm. Inneres Hören wird zur Praxis.',
    cycle: 3,
    hasGrafik: true,
    videoId: '2aa7f639-2cf0-47bf-80b8-b1e66038304c',
    presets: [
      {
        id: 'innen-aussen',
        label: 'Innen / Außen · langsam',
        hint: 'Spiele einen Ton, höre den nächsten, spiele ihn dann',
        pattern: 'Tggg' + 'gggg' + 'Tggg' + 'gggg',
        handsatz: 'R-L',
        bpm: 48,
      },
      {
        id: 'innen-aussen-dichter',
        label: 'Innen / Außen · dichter',
        pattern: 'Tggg' + 'Tggg' + 'Tggg' + 'Tggg',
        handsatz: 'R-L',
        bpm: 52,
      },
      {
        id: 'innen-aussen-akkord',
        label: 'Innen / Außen · Akkord',
        pattern: 'Tggg' + 'gggg' + 'Tggg' + 'gggg',
        handsatz: 'R-L',
        bpm: 48,
      },
    ],
  },
  {
    number: 36,
    title: 'Der kompositorische Körper',
    subtitle: 'Ein in sich geschlossenes Element · der erste Körper',
    essence:
      'Heute baust du den ersten kompositorischen Körper — ein Element, das in sich steht.',
    cycle: 3,
    hasGrafik: true,
    presets: [
      {
        id: 'koerper-eins',
        label: 'Erster Körper · dicht',
        hint: 'Zwei Tonfelder, klare Bewegung, in sich geschlossen',
        pattern: 'TgTg' + 'SgTg' + 'TgTg' + 'SgTg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'koerper-eins-paradiddle',
        label: 'Erster Körper · Paradiddle',
        pattern: 'TgTg' + 'SgTg' + 'TgTg' + 'SgTg',
        handsatz: 'paradiddle',
        bpm: 60,
      },
      {
        id: 'koerper-eins-mit-fill',
        label: 'Körper + Fill am Ende',
        pattern: 'TgTg' + 'SgTg' + 'TgTg' + 'STTT',
        handsatz: 'R-L',
        bpm: 60,
      },
    ],
  },
  {
    number: 37,
    title: 'Zwei Körper, die sich drehen',
    subtitle: 'Vier Bögen · zwei Körper · der erste Kreis',
    essence:
      'Zwei kompositorische Körper über vier Bögen. Der erste Kreis schließt sich.',
    cycle: 3,
    hasGrafik: true,
    videoId: '43b3b532-ef4a-49d1-a98d-8343592d6426',
    presets: [
      {
        id: 'koerper-eins',
        label: 'Körper 1 · Bogen 1+2',
        pattern: 'TgTg' + 'SgTg' + 'TgTg' + 'SgTg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'koerper-zwei',
        label: 'Körper 2 · Bogen 3+4',
        hint: 'Anderer Charakter — leichter, abfallend',
        pattern: 'Tggg' + 'Sggg' + 'gTgg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'kreis-gesamt',
        label: 'Beide Körper · ein Kreis',
        hint: '4 Bögen zusammen: Körper 1 + Körper 2',
        pattern: 'TgTg' + 'SgTg' + 'gTgg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
    ],
  },
  {
    number: 38,
    title: 'Die Form',
    subtitle: 'Said and Done · die Form als Werkzeug',
    essence:
      'Eine Form steht. Was bisher Praxis war, wird Komposition.',
    cycle: 3,
    hasGrafik: true,
    videoId: '6b7c0d7e-6494-4dcd-ae32-16bde57d1e4e',
    presets: [
      {
        id: 'form-said',
        label: 'Said · die Aussage',
        pattern: 'TgTg' + 'SgTg' + 'TgTg' + 'SgTg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'form-done',
        label: 'Done · die Auflösung',
        pattern: 'TgTg' + 'SgTg' + 'gggg' + 'Sggg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'form-ganz',
        label: 'Form · komplett',
        pattern: 'TgTg' + 'SgTg' + 'gggg' + 'STTT',
        handsatz: 'R-L',
        bpm: 60,
      },
    ],
  },
  {
    number: 39,
    title: 'Die dritte Ebene',
    subtitle: 'Melodie + Harmonik + perkussive Rhythmik gleichzeitig',
    essence:
      'Drei Ebenen gleichzeitig — der Frahm-Study-Bogen schließt sich.',
    cycle: 3,
    hasGrafik: true,
    videoId: '428772bd-44c2-46d2-b3ee-21ed1a7eff9e',
    presets: [
      {
        id: 'ebene-melodie',
        label: 'Nur Melodie',
        pattern: 'Tggg' + 'gggg' + 'Tggg' + 'gggg',
        handsatz: 'frei',
        bpm: 56,
      },
      {
        id: 'ebene-melodie-harmonik',
        label: 'Melodie + Harmonik',
        pattern: 'Tggg' + 'Tggg' + 'Tggg' + 'Tggg',
        handsatz: 'frei',
        bpm: 56,
      },
      {
        id: 'ebene-alle-drei',
        label: 'Alle drei Ebenen',
        hint: 'Melodie · Harmonik · perkussive Rhythmik',
        pattern: 'TgTg' + 'SgTg' + 'TgTg' + 'SgTg',
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'ebene-alle-drei-dicht',
        label: 'Alle drei · dicht',
        pattern: 'TTTT' + 'STTT' + 'TTTT' + 'STTT',
        handsatz: 'paradiddle',
        bpm: 60,
      },
    ],
  },
  {
    number: 40,
    title: 'Deine zwei Körper',
    subtitle: 'Kompositionsrhythmik · die Übergabe',
    essence:
      'Heute hörst du nicht mehr nach. Heute suchst du selbst — zwei Körper, vier Bögen, deine Komposition.',
    cycle: 3,
    hasGrafik: true,
    videoId: '799a540c-014b-4487-8efd-4fa22aff04fa',
    presets: [
      {
        id: 'phase-1-basis',
        label: 'Phase 1 · Basis-Rhythmus läuft',
        hint: 'Linke Hand frei laufen lassen — Teppich',
        pattern: 'gggg' + 'gggg' + 'gggg' + 'gggg',
        handsatz: 'frei',
        bpm: 60,
      },
      {
        id: 'phase-2-koerper-1',
        label: 'Phase 2 · Körper 1 · Bogen 1+2',
        hint: 'Akzente auf 1·3·4, die 2 atmet',
        pattern: 'TgggSggT' + 'TgggSgTT'.slice(0, 8),
        handsatz: 'frei',
        bpm: 60,
      },
      {
        id: 'phase-3-koerper-2',
        label: 'Phase 3 · Körper 2 · Bogen 3+4',
        hint: 'Anderer Charakter, leichter oder abfallend',
        pattern: 'TgggSggg' + 'gTggSggT'.slice(0, 8),
        handsatz: 'frei',
        bpm: 60,
      },
      {
        id: 'phase-4-perkussiv',
        label: 'Phase 4 · perkussive Ebene dazu',
        pattern: 'DgggSggg' + 'gggggggg'.slice(0, 8),
        handsatz: 'R-L',
        bpm: 60,
      },
      {
        id: 'phase-5-form-komplett',
        label: 'Phase 5 · Form komplett',
        hint: '2 Körper, perkussiv, Breaks und Fills',
        pattern: 'TgggSggT' + 'gTggSggT'.slice(0, 8),
        handsatz: 'frei',
        bpm: 60,
      },
    ],
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Convenience: lookup by day number.
// ─────────────────────────────────────────────────────────────────────────────

export function getDay(num: number): RhythmusDay | undefined {
  return RHYTHMUS_DAYS.find((d) => d.number === num);
}

export function daysInCycle(cycle: 1 | 2 | 3): readonly RhythmusDay[] {
  return RHYTHMUS_DAYS.filter((d) => d.cycle === cycle);
}

export const TOTAL_DAYS = RHYTHMUS_DAYS.length;
