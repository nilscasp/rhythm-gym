// ─────────────────────────────────────────────────────────────────────────────
// Handpan-Skalen — Seed-Templates
//
// Quelle: handpan_editor (eikhen.github.io), src/templates/*.json — übernommen
// als Start-Bibliothek für den Onboarding-Instrument-Picker und den freien
// Pan-Builder. Koordinaten (x/y/r) sind im 1000×1000-Layoutraum des Editors;
// der Builder rendert daraus direkt einen Top-Down-Pan.
//
// Konvention: notes[0] = Ding (Zentrum, größter Radius). Übrige Einträge sind
// Tonfelder/Bottom-Töne in Layout-Reihenfolge.
//
// GENERIERT — nicht von Hand editieren. Quelle: /tmp/gen-handpan-templates.ts
// ─────────────────────────────────────────────────────────────────────────────

export interface HandpanNote {
  /** Stable id innerhalb eines Pans (n1, n2, …). */
  id: string;
  /** Pitch-Label, z.B. "D3", "Bb3", "F#4". */
  label: string;
  /** Position im 1000×1000-Layoutraum. */
  x: number;
  y: number;
  /** Radius des Tonfelds (visuell + grobe Größenhierarchie). */
  r: number;
}

export interface HandpanTemplate {
  /** Anzeigename, z.B. "D Kurd 18". */
  name: string;
  /** Stabiler Key, z.B. "d-kurd-18" — wird zu handpans.scale_name. */
  scaleKey: string;
  /** Pan-Geometrie (Zentrum + Außenradius) im 1000×1000-Layoutraum. */
  pan: { cx: number; cy: number; r: number };
  /** notes[0] = Ding (Zentrum). Übrige = Tonfelder/Bottom-Töne in Layout-Reihenfolge. */
  notes: HandpanNote[];
}

export const HANDPAN_TEMPLATES: HandpanTemplate[] = [
  {
    "name": "D Kurd 10",
    "scaleKey": "d-kurd-10",
    "pan": {
      "cx": 500,
      "cy": 500,
      "r": 320
    },
    "notes": [
      {
        "id": "n1",
        "label": "D3",
        "x": 500,
        "y": 500,
        "r": 76
      },
      {
        "id": "n2",
        "label": "A3",
        "x": 578,
        "y": 669,
        "r": 64
      },
      {
        "id": "n3",
        "label": "Bb3",
        "x": 410,
        "y": 671,
        "r": 63
      },
      {
        "id": "n4",
        "label": "C4",
        "x": 693,
        "y": 563,
        "r": 61
      },
      {
        "id": "n5",
        "label": "D4",
        "x": 305,
        "y": 556,
        "r": 59
      },
      {
        "id": "n6",
        "label": "E4",
        "x": 690,
        "y": 431,
        "r": 57
      },
      {
        "id": "n7",
        "label": "F4",
        "x": 291,
        "y": 426,
        "r": 56
      },
      {
        "id": "n8",
        "label": "G4",
        "x": 610,
        "y": 329,
        "r": 54
      },
      {
        "id": "n9",
        "label": "A4",
        "x": 375,
        "y": 325,
        "r": 52
      },
      {
        "id": "n10",
        "label": "C5",
        "x": 488,
        "y": 291,
        "r": 49
      }
    ]
  },
  {
    "name": "D Celtic 10",
    "scaleKey": "d-celtic-10",
    "pan": {
      "cx": 500,
      "cy": 500,
      "r": 320
    },
    "notes": [
      {
        "id": "n1",
        "label": "D3",
        "x": 500,
        "y": 500,
        "r": 76
      },
      {
        "id": "n2",
        "label": "A3",
        "x": 597,
        "y": 669,
        "r": 64
      },
      {
        "id": "n3",
        "label": "C4",
        "x": 418,
        "y": 671,
        "r": 61
      },
      {
        "id": "n4",
        "label": "D4",
        "x": 690,
        "y": 556,
        "r": 59
      },
      {
        "id": "n5",
        "label": "E4",
        "x": 312,
        "y": 554,
        "r": 57
      },
      {
        "id": "n6",
        "label": "F4",
        "x": 685,
        "y": 420,
        "r": 56
      },
      {
        "id": "n7",
        "label": "G4",
        "x": 321,
        "y": 420,
        "r": 54
      },
      {
        "id": "n8",
        "label": "A4",
        "x": 607,
        "y": 319,
        "r": 52
      },
      {
        "id": "n9",
        "label": "C5",
        "x": 390,
        "y": 328,
        "r": 49
      },
      {
        "id": "n10",
        "label": "D5",
        "x": 495,
        "y": 288,
        "r": 47
      }
    ]
  },
  {
    "name": "D Aegean 20",
    "scaleKey": "d-aegean-20",
    "pan": {
      "cx": 500,
      "cy": 500,
      "r": 320
    },
    "notes": [
      {
        "id": "n1",
        "label": "D3",
        "x": 500,
        "y": 500,
        "r": 80
      },
      {
        "id": "n2",
        "label": "F#3",
        "x": 500,
        "y": 710,
        "r": 56
      },
      {
        "id": "n3",
        "label": "A3",
        "x": 365,
        "y": 661,
        "r": 54
      },
      {
        "id": "n4",
        "label": "C#4",
        "x": 635,
        "y": 661,
        "r": 52
      },
      {
        "id": "n5",
        "label": "D4",
        "x": 293,
        "y": 536,
        "r": 51
      },
      {
        "id": "n6",
        "label": "F#4",
        "x": 707,
        "y": 536,
        "r": 49
      },
      {
        "id": "n7",
        "label": "G#4",
        "x": 318,
        "y": 395,
        "r": 48
      },
      {
        "id": "n8",
        "label": "A4",
        "x": 682,
        "y": 395,
        "r": 47
      },
      {
        "id": "n9",
        "label": "C#5",
        "x": 428,
        "y": 303,
        "r": 45
      },
      {
        "id": "n10",
        "label": "D5",
        "x": 572,
        "y": 303,
        "r": 44
      },
      {
        "id": "n11",
        "label": "F#5",
        "x": 500,
        "y": 372,
        "r": 26
      },
      {
        "id": "n12",
        "label": "G#5",
        "x": 582,
        "y": 402,
        "r": 25
      },
      {
        "id": "n13",
        "label": "A5",
        "x": 418,
        "y": 402,
        "r": 25
      },
      {
        "id": "n14",
        "label": "G#3",
        "x": 819,
        "y": 741,
        "r": 62
      },
      {
        "id": "n15",
        "label": "E4",
        "x": 900,
        "y": 500,
        "r": 56
      },
      {
        "id": "n16",
        "label": "B4",
        "x": 819,
        "y": 259,
        "r": 50
      },
      {
        "id": "n17",
        "label": "B2",
        "x": 500,
        "y": 100,
        "r": 70
      },
      {
        "id": "n18",
        "label": "E5",
        "x": 181,
        "y": 259,
        "r": 46
      },
      {
        "id": "n19",
        "label": "B3",
        "x": 100,
        "y": 500,
        "r": 60
      },
      {
        "id": "n20",
        "label": "E3",
        "x": 181,
        "y": 741,
        "r": 66
      }
    ]
  },
  {
    "name": "D Kurd 18",
    "scaleKey": "d-kurd-18",
    "pan": {
      "cx": 500,
      "cy": 500,
      "r": 324
    },
    "notes": [
      {
        "id": "n1",
        "label": "D3",
        "x": 502,
        "y": 510,
        "r": 80
      },
      {
        "id": "n2",
        "label": "A3",
        "x": 585,
        "y": 652,
        "r": 62
      },
      {
        "id": "n3",
        "label": "Bb3",
        "x": 417,
        "y": 658,
        "r": 62
      },
      {
        "id": "n4",
        "label": "C4",
        "x": 688,
        "y": 553,
        "r": 50
      },
      {
        "id": "n5",
        "label": "D4",
        "x": 305,
        "y": 548,
        "r": 50
      },
      {
        "id": "n6",
        "label": "E4",
        "x": 695,
        "y": 439,
        "r": 50
      },
      {
        "id": "n7",
        "label": "F4",
        "x": 309,
        "y": 421,
        "r": 50
      },
      {
        "id": "n8",
        "label": "G4",
        "x": 635,
        "y": 339,
        "r": 50
      },
      {
        "id": "n9",
        "label": "A4",
        "x": 388,
        "y": 327,
        "r": 50
      },
      {
        "id": "n10",
        "label": "C5",
        "x": 506,
        "y": 295,
        "r": 50
      },
      {
        "id": "n15",
        "label": "F5",
        "x": 647,
        "y": 134,
        "r": 43
      },
      {
        "id": "n17",
        "label": "E3",
        "x": 180,
        "y": 774,
        "r": 71
      },
      {
        "id": "n18",
        "label": "Bb2",
        "x": 842,
        "y": 753,
        "r": 77
      },
      {
        "id": "n19",
        "label": "D5",
        "x": 456,
        "y": 386,
        "r": 32
      },
      {
        "id": "n20",
        "label": "E5",
        "x": 548,
        "y": 385,
        "r": 32
      },
      {
        "id": "n21",
        "label": "C3",
        "x": 84,
        "y": 531,
        "r": 77
      },
      {
        "id": "n22",
        "label": "F3",
        "x": 909,
        "y": 531,
        "r": 71
      },
      {
        "id": "n23",
        "label": "G3",
        "x": 193,
        "y": 206,
        "r": 71
      }
    ]
  },
  {
    "name": "E Amara 20",
    "scaleKey": "e-amara-20",
    "pan": {
      "cx": 500,
      "cy": 500,
      "r": 320
    },
    "notes": [
      {
        "id": "n1",
        "label": "E3",
        "x": 498,
        "y": 532,
        "r": 74
      },
      {
        "id": "n2",
        "label": "B3",
        "x": 500,
        "y": 716,
        "r": 62
      },
      {
        "id": "n3",
        "label": "D4",
        "x": 353,
        "y": 660,
        "r": 59
      },
      {
        "id": "n4",
        "label": "E4",
        "x": 650,
        "y": 663,
        "r": 57
      },
      {
        "id": "n5",
        "label": "F#4",
        "x": 269,
        "y": 548,
        "r": 55
      },
      {
        "id": "n6",
        "label": "G4",
        "x": 726,
        "y": 537,
        "r": 54
      },
      {
        "id": "n7",
        "label": "A4",
        "x": 291,
        "y": 413,
        "r": 52
      },
      {
        "id": "n8",
        "label": "B4",
        "x": 711,
        "y": 403,
        "r": 50
      },
      {
        "id": "n9",
        "label": "D5",
        "x": 363,
        "y": 288,
        "r": 47
      },
      {
        "id": "n10",
        "label": "E5",
        "x": 641,
        "y": 291,
        "r": 45
      },
      {
        "id": "n11",
        "label": "F#5",
        "x": 414,
        "y": 397,
        "r": 43
      },
      {
        "id": "n12",
        "label": "G5",
        "x": 596,
        "y": 408,
        "r": 42
      },
      {
        "id": "n13",
        "label": "A5",
        "x": 508,
        "y": 339,
        "r": 40
      },
      {
        "id": "n14",
        "label": "C3",
        "x": 110,
        "y": 632,
        "r": 73
      },
      {
        "id": "n15",
        "label": "D3",
        "x": 785,
        "y": 805,
        "r": 71
      },
      {
        "id": "n16",
        "label": "F#3",
        "x": 257,
        "y": 820,
        "r": 67
      },
      {
        "id": "n17",
        "label": "G3",
        "x": 175,
        "y": 258,
        "r": 66
      },
      {
        "id": "n18",
        "label": "A3",
        "x": 815,
        "y": 246,
        "r": 64
      },
      {
        "id": "n19",
        "label": "C4",
        "x": 889,
        "y": 452,
        "r": 61
      },
      {
        "id": "n20",
        "label": "C5",
        "x": 502,
        "y": 111,
        "r": 49
      }
    ]
  },
  {
    "name": "E Kurd 21",
    "scaleKey": "e-kurd-21",
    "pan": {
      "cx": 500,
      "cy": 500,
      "r": 320
    },
    "notes": [
      {
        "id": "n1",
        "label": "E3",
        "x": 498,
        "y": 532,
        "r": 74
      },
      {
        "id": "n2",
        "label": "B3",
        "x": 500,
        "y": 716,
        "r": 62
      },
      {
        "id": "n3",
        "label": "D4",
        "x": 652,
        "y": 668,
        "r": 59
      },
      {
        "id": "n4",
        "label": "E4",
        "x": 270,
        "y": 556,
        "r": 57
      },
      {
        "id": "n5",
        "label": "F#4",
        "x": 731,
        "y": 550,
        "r": 55
      },
      {
        "id": "n6",
        "label": "G4",
        "x": 264,
        "y": 408,
        "r": 54
      },
      {
        "id": "n7",
        "label": "A4",
        "x": 728,
        "y": 401,
        "r": 52
      },
      {
        "id": "n8",
        "label": "B4",
        "x": 341,
        "y": 296,
        "r": 50
      },
      {
        "id": "n9",
        "label": "D5",
        "x": 503,
        "y": 238,
        "r": 47
      },
      {
        "id": "n10",
        "label": "E5",
        "x": 557,
        "y": 369,
        "r": 45
      },
      {
        "id": "n11",
        "label": "F#5",
        "x": 441,
        "y": 362,
        "r": 43
      },
      {
        "id": "n12",
        "label": "G5",
        "x": 614,
        "y": 455,
        "r": 42
      },
      {
        "id": "n13",
        "label": "A5",
        "x": 370,
        "y": 444,
        "r": 40
      },
      {
        "id": "n14",
        "label": "C3",
        "x": 822,
        "y": 770,
        "r": 73
      },
      {
        "id": "n15",
        "label": "D3",
        "x": 155,
        "y": 729,
        "r": 71
      },
      {
        "id": "n16",
        "label": "F#3",
        "x": 497,
        "y": 902,
        "r": 67
      },
      {
        "id": "n17",
        "label": "G3",
        "x": 175,
        "y": 258,
        "r": 66
      },
      {
        "id": "n18",
        "label": "A3",
        "x": 815,
        "y": 246,
        "r": 64
      },
      {
        "id": "n19",
        "label": "C4",
        "x": 351,
        "y": 668,
        "r": 61
      },
      {
        "id": "n20",
        "label": "C5",
        "x": 643,
        "y": 290,
        "r": 49
      },
      {
        "id": "n21",
        "label": "B5",
        "x": 502,
        "y": 105,
        "r": 50
      }
    ]
  },
  {
    "name": "F# Low Pygmy 21",
    "scaleKey": "fs-low-pygmy-21",
    "pan": {
      "cx": 500,
      "cy": 500,
      "r": 320
    },
    "notes": [
      {
        "id": "n1",
        "label": "F#3",
        "x": 500,
        "y": 561,
        "r": 78
      },
      {
        "id": "n2",
        "label": "A3",
        "x": 405,
        "y": 713,
        "r": 55
      },
      {
        "id": "n3",
        "label": "G#3",
        "x": 584,
        "y": 720,
        "r": 54
      },
      {
        "id": "n4",
        "label": "E4",
        "x": 287,
        "y": 591,
        "r": 54
      },
      {
        "id": "n5",
        "label": "C#4",
        "x": 709,
        "y": 603,
        "r": 51
      },
      {
        "id": "n6",
        "label": "G#4",
        "x": 287,
        "y": 435,
        "r": 50
      },
      {
        "id": "n7",
        "label": "F#4",
        "x": 709,
        "y": 458,
        "r": 49
      },
      {
        "id": "n8",
        "label": "C#5",
        "x": 359,
        "y": 325,
        "r": 45
      },
      {
        "id": "n9",
        "label": "A4",
        "x": 641,
        "y": 325,
        "r": 47
      },
      {
        "id": "n10",
        "label": "E5",
        "x": 500,
        "y": 264,
        "r": 43
      },
      {
        "id": "n11",
        "label": "F#5",
        "x": 447,
        "y": 409,
        "r": 26
      },
      {
        "id": "n12",
        "label": "G#5",
        "x": 549,
        "y": 409,
        "r": 26
      },
      {
        "id": "n13",
        "label": "A5",
        "x": 390,
        "y": 477,
        "r": 25
      },
      {
        "id": "n14",
        "label": "B5",
        "x": 603,
        "y": 477,
        "r": 24
      },
      {
        "id": "n15",
        "label": "B2",
        "x": 500,
        "y": 100,
        "r": 70
      },
      {
        "id": "n16",
        "label": "D3",
        "x": 855,
        "y": 720,
        "r": 64
      },
      {
        "id": "n17",
        "label": "E3",
        "x": 140,
        "y": 720,
        "r": 62
      },
      {
        "id": "n18",
        "label": "D4",
        "x": 95,
        "y": 470,
        "r": 58
      },
      {
        "id": "n19",
        "label": "B3",
        "x": 895,
        "y": 495,
        "r": 56
      },
      {
        "id": "n20",
        "label": "B4",
        "x": 215,
        "y": 270,
        "r": 50
      },
      {
        "id": "n21",
        "label": "D5",
        "x": 790,
        "y": 280,
        "r": 44
      }
    ]
  },
  {
    "name": "F#2 Nordlys 15",
    "scaleKey": "fs-nordlys-15",
    "pan": {
      "cx": 500,
      "cy": 500,
      "r": 320
    },
    "notes": [
      {
        "id": "n1",
        "label": "F#2",
        "x": 508,
        "y": 488,
        "r": 102
      },
      {
        "id": "n2",
        "label": "F#3",
        "x": 500,
        "y": 710,
        "r": 56
      },
      {
        "id": "n3",
        "label": "G#3",
        "x": 352,
        "y": 648,
        "r": 55
      },
      {
        "id": "n4",
        "label": "Bb3",
        "x": 648,
        "y": 648,
        "r": 54
      },
      {
        "id": "n5",
        "label": "C4",
        "x": 290,
        "y": 500,
        "r": 52
      },
      {
        "id": "n6",
        "label": "C#4",
        "x": 710,
        "y": 500,
        "r": 52
      },
      {
        "id": "n7",
        "label": "F4",
        "x": 352,
        "y": 352,
        "r": 49
      },
      {
        "id": "n8",
        "label": "G#4",
        "x": 648,
        "y": 352,
        "r": 48
      },
      {
        "id": "n9",
        "label": "C5",
        "x": 500,
        "y": 290,
        "r": 45
      },
      {
        "id": "n10",
        "label": "Bb2",
        "x": 821,
        "y": 795,
        "r": 95
      },
      {
        "id": "n11",
        "label": "C#3",
        "x": 180,
        "y": 788,
        "r": 84
      },
      {
        "id": "n12",
        "label": "F5",
        "x": 297,
        "y": 156,
        "r": 46
      },
      {
        "id": "n13",
        "label": "G#5",
        "x": 598,
        "y": 128,
        "r": 43
      },
      {
        "id": "n14",
        "label": "C#5",
        "x": 826,
        "y": 276,
        "r": 49
      },
      {
        "id": "n15",
        "label": "F3",
        "x": 91,
        "y": 508,
        "r": 67
      }
    ]
  }
];
