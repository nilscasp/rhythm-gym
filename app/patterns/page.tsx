'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

// ─── Pattern data ────────────────────────────────────────────────────────────
// Extracted verbatim from _legacy/bundle/rhythm-tool-complete.html (82 patterns
// across 8 categories — note: header ad-copy elsewhere references 600+/612, but
// this file is the canonical curated set of 82).

type StepValue = 0 | 1 | 2 | 3;
type Density = 'low' | 'medium' | 'high';
type Symmetry = 'full' | 'half' | 'none';
type Category =
  | 'archetypen'
  | 'positionen'
  | 'mix'
  | 'clave'
  | 'latin'
  | 'funk';

type Pattern = {
  id: string;
  archetype: string;
  category: Category;
  name: string;
  steps: StepValue[];
  characteristics: {
    density: Density;
    symmetry: Symmetry;
    feel: string;
  };
};

const PATTERNS: Pattern[] = [
  // ARCHETYP A1: Viertel
  { id: 'P_A1_POS_ALL_V1', archetype: 'A1', category: 'archetypen', name: 'Viertel - alle normal', steps: [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0], characteristics: { density: 'low', symmetry: 'full', feel: 'steady_pulse' } },
  { id: 'P_A1_POS_ALL_V2', archetype: 'A1', category: 'archetypen', name: 'Viertel - alternierende Akzente', steps: [2,0,0,0, 1,0,0,0, 2,0,0,0, 1,0,0,0], characteristics: { density: 'low', symmetry: 'half', feel: 'march_like' } },
  { id: 'P_A1_POS_ALL_V3', archetype: 'A1', category: 'archetypen', name: 'Viertel - Downbeat-Betonung', steps: [3,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0], characteristics: { density: 'low', symmetry: 'none', feel: 'emphatic_start' } },
  { id: 'P_A1_POS_ALL_V4', archetype: 'A1', category: 'archetypen', name: 'Viertel - Backbeat (2+4)', steps: [1,0,0,0, 2,0,0,0, 1,0,0,0, 2,0,0,0], characteristics: { density: 'low', symmetry: 'half', feel: 'backbeat' } },

  // ARCHETYP A2: Achtel-Paar
  { id: 'P_A2_POS_ALL_V1', archetype: 'A2', category: 'archetypen', name: 'Achtel-Paar - alle normal', steps: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0], characteristics: { density: 'medium', symmetry: 'full', feel: 'steady_eighth' } },
  { id: 'P_A2_POS_ALL_V2', archetype: 'A2', category: 'archetypen', name: 'Achtel-Paar - Downbeats betont', steps: [2,0,1,0, 2,0,1,0, 2,0,1,0, 2,0,1,0], characteristics: { density: 'medium', symmetry: 'full', feel: 'walking' } },
  { id: 'P_A2_POS_ALL_V3', archetype: 'A2', category: 'archetypen', name: 'Achtel-Paar - Upbeats betont', steps: [1,0,2,0, 1,0,2,0, 1,0,2,0, 1,0,2,0], characteristics: { density: 'medium', symmetry: 'full', feel: 'offbeat' } },
  { id: 'P_A2_POS_ALL_V4', archetype: 'A2', category: 'archetypen', name: 'Achtel-Paar - 1+3 stark betont', steps: [3,0,1,0, 2,0,1,0, 3,0,1,0, 2,0,1,0], characteristics: { density: 'medium', symmetry: 'half', feel: 'strong_downbeats' } },
  { id: 'P_A2_POS_ALL_V5', archetype: 'A2', category: 'archetypen', name: 'Achtel-Paar - Offbeat-Charakter', steps: [1,0,2,0, 1,0,3,0, 1,0,2,0, 1,0,3,0], characteristics: { density: 'medium', symmetry: 'half', feel: 'reggae_like' } },

  // ARCHETYP A3: Sechzehntel
  { id: 'P_A3_POS_ALL_V1', archetype: 'A3', category: 'archetypen', name: 'Sechzehntel - alle normal', steps: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1], characteristics: { density: 'high', symmetry: 'full', feel: 'continuous' } },
  { id: 'P_A3_POS_ALL_V2', archetype: 'A3', category: 'archetypen', name: 'Sechzehntel - Downbeats betont', steps: [2,1,1,1, 2,1,1,1, 2,1,1,1, 2,1,1,1], characteristics: { density: 'high', symmetry: 'full', feel: 'running' } },
  { id: 'P_A3_POS_ALL_V3', archetype: 'A3', category: 'archetypen', name: 'Sechzehntel - 4er-Gruppen', steps: [2,1,1,1, 1,2,1,1, 1,1,2,1, 1,1,1,2], characteristics: { density: 'high', symmetry: 'none', feel: 'cascading' } },
  { id: 'P_A3_POS_ALL_V4', archetype: 'A3', category: 'archetypen', name: 'Sechzehntel - 3+3+3+3+4 Overlay', steps: [2,1,1,1, 1,1,2,1, 1,1,2,1, 1,1,2,1], characteristics: { density: 'high', symmetry: 'none', feel: 'polyrhythmic' } },

  // ARCHETYP A4: Synkope
  { id: 'P_A4_POS_ALL_V1', archetype: 'A4', category: 'archetypen', name: 'Synkope - alle normal', steps: [1,0,0,1, 1,0,0,1, 1,0,0,1, 1,0,0,1], characteristics: { density: 'medium', symmetry: 'full', feel: 'anticipation' } },
  { id: 'P_A4_POS_ALL_V2', archetype: 'A4', category: 'archetypen', name: 'Synkope - Downbeats betont', steps: [2,0,0,1, 2,0,0,1, 2,0,0,1, 2,0,0,1], characteristics: { density: 'medium', symmetry: 'full', feel: 'syncopated_march' } },
  { id: 'P_A4_POS_ALL_V3', archetype: 'A4', category: 'archetypen', name: 'Synkope - Synkopen betont', steps: [1,0,0,2, 1,0,0,2, 1,0,0,2, 1,0,0,2], characteristics: { density: 'medium', symmetry: 'full', feel: 'push_forward' } },
  { id: 'P_A4_POS_ALL_V4', archetype: 'A4', category: 'archetypen', name: 'Synkope - alternierend stark', steps: [3,0,0,1, 2,0,0,1, 3,0,0,1, 2,0,0,1], characteristics: { density: 'medium', symmetry: 'half', feel: 'emphatic_syncopation' } },

  // ARCHETYP A5: Offbeat
  { id: 'P_A5_POS_ALL_V1', archetype: 'A5', category: 'archetypen', name: 'Offbeat - alle normal', steps: [0,1,0,1, 0,1,0,1, 0,1,0,1, 0,1,0,1], characteristics: { density: 'medium', symmetry: 'full', feel: 'pure_offbeat' } },
  { id: 'P_A5_POS_ALL_V2', archetype: 'A5', category: 'archetypen', name: "Offbeat - 'e' betont", steps: [0,2,0,1, 0,2,0,1, 0,2,0,1, 0,2,0,1], characteristics: { density: 'medium', symmetry: 'full', feel: 'early_offbeat' } },
  { id: 'P_A5_POS_ALL_V3', archetype: 'A5', category: 'archetypen', name: "Offbeat - 'a' betont", steps: [0,1,0,2, 0,1,0,2, 0,1,0,2, 0,1,0,2], characteristics: { density: 'medium', symmetry: 'full', feel: 'late_offbeat' } },
  { id: 'P_A5_POS_ALL_V4', archetype: 'A5', category: 'archetypen', name: 'Offbeat - alternierende Betonung', steps: [0,2,0,1, 0,1,0,2, 0,2,0,1, 0,1,0,2], characteristics: { density: 'medium', symmetry: 'half', feel: 'shifting_offbeat' } },

  // ARCHETYP A6: Doppel-Sechzehntel
  { id: 'P_A6_POS_ALL_V1', archetype: 'A6', category: 'archetypen', name: 'Doppel-Sechzehntel - alle normal', steps: [1,1,0,0, 1,1,0,0, 1,1,0,0, 1,1,0,0], characteristics: { density: 'medium', symmetry: 'full', feel: 'double_stroke' } },
  { id: 'P_A6_POS_ALL_V2', archetype: 'A6', category: 'archetypen', name: 'Doppel-Sechzehntel - erste betont', steps: [2,1,0,0, 2,1,0,0, 2,1,0,0, 2,1,0,0], characteristics: { density: 'medium', symmetry: 'full', feel: 'flam_like' } },
  { id: 'P_A6_POS_ALL_V3', archetype: 'A6', category: 'archetypen', name: 'Doppel-Sechzehntel - zweite betont', steps: [1,2,0,0, 1,2,0,0, 1,2,0,0, 1,2,0,0], characteristics: { density: 'medium', symmetry: 'full', feel: 'grace_note' } },
  { id: 'P_A6_POS_ALL_V4', archetype: 'A6', category: 'archetypen', name: 'Doppel-Sechzehntel - starke erste', steps: [3,1,0,0, 2,1,0,0, 3,1,0,0, 2,1,0,0], characteristics: { density: 'medium', symmetry: 'half', feel: 'emphatic_double' } },

  // ARCHETYP A7: Punktierung >
  { id: 'P_A7_POS_ALL_V1', archetype: 'A7', category: 'archetypen', name: 'Punktierung > - alle normal', steps: [1,0,1,1, 1,0,1,1, 1,0,1,1, 1,0,1,1], characteristics: { density: 'high', symmetry: 'full', feel: 'dotted' } },
  { id: 'P_A7_POS_ALL_V2', archetype: 'A7', category: 'archetypen', name: 'Punktierung > - erste betont', steps: [2,0,1,1, 2,0,1,1, 2,0,1,1, 2,0,1,1], characteristics: { density: 'high', symmetry: 'full', feel: 'skip_rhythm' } },
  { id: 'P_A7_POS_ALL_V3', archetype: 'A7', category: 'archetypen', name: 'Punktierung > - Doppelschlag betont', steps: [1,0,2,1, 1,0,2,1, 1,0,2,1, 1,0,2,1], characteristics: { density: 'high', symmetry: 'full', feel: 'triplet_feel' } },
  { id: 'P_A7_POS_ALL_V4', archetype: 'A7', category: 'archetypen', name: 'Punktierung > - Galop', steps: [1,0,1,2, 1,0,1,2, 1,0,1,2, 1,0,1,2], characteristics: { density: 'high', symmetry: 'full', feel: 'galloping' } },

  // ARCHETYP A8: Punktierung <
  { id: 'P_A8_POS_ALL_V1', archetype: 'A8', category: 'archetypen', name: 'Punktierung < - alle normal', steps: [1,1,0,1, 1,1,0,1, 1,1,0,1, 1,1,0,1], characteristics: { density: 'high', symmetry: 'full', feel: 'reverse_dotted' } },
  { id: 'P_A8_POS_ALL_V2', archetype: 'A8', category: 'archetypen', name: 'Punktierung < - erste betont', steps: [2,1,0,1, 2,1,0,1, 2,1,0,1, 2,1,0,1], characteristics: { density: 'high', symmetry: 'full', feel: 'scotch_snap' } },
  { id: 'P_A8_POS_ALL_V3', archetype: 'A8', category: 'archetypen', name: 'Punktierung < - letzte betont', steps: [1,1,0,2, 1,1,0,2, 1,1,0,2, 1,1,0,2], characteristics: { density: 'high', symmetry: 'full', feel: 'push_to_beat' } },
  { id: 'P_A8_POS_ALL_V4', archetype: 'A8', category: 'archetypen', name: 'Punktierung < - Doppelschlag betont', steps: [2,1,0,1, 1,2,0,1, 2,1,0,1, 1,2,0,1], characteristics: { density: 'high', symmetry: 'half', feel: 'alternating_emphasis' } },

  // POSITIONEN - A2
  { id: 'P_A2_POS_14_V1', archetype: 'A2', category: 'positionen', name: 'Achtel - nur Position 1+4', steps: [2,0,1,0, 0,0,0,0, 0,0,0,0, 2,0,1,0], characteristics: { density: 'low', symmetry: 'none', feel: 'sparse_frame' } },
  { id: 'P_A2_POS_23_V1', archetype: 'A2', category: 'positionen', name: 'Achtel - nur Position 2+3', steps: [0,0,0,0, 2,0,1,0, 2,0,1,0, 0,0,0,0], characteristics: { density: 'low', symmetry: 'half', feel: 'middle_emphasis' } },
  { id: 'P_A2_POS_13_V1', archetype: 'A2', category: 'positionen', name: 'Achtel - nur Position 1+3', steps: [2,0,1,0, 0,0,0,0, 2,0,1,0, 0,0,0,0], characteristics: { density: 'low', symmetry: 'half', feel: 'strong_beats' } },
  { id: 'P_A2_POS_24_V1', archetype: 'A2', category: 'positionen', name: 'Achtel - nur Position 2+4 (Backbeat)', steps: [0,0,0,0, 2,0,1,0, 0,0,0,0, 2,0,1,0], characteristics: { density: 'low', symmetry: 'half', feel: 'classic_backbeat' } },

  // POSITIONEN - A4
  { id: 'P_A4_POS_14_V1', archetype: 'A4', category: 'positionen', name: 'Synkope - nur Position 1+4', steps: [2,0,0,1, 0,0,0,0, 0,0,0,0, 2,0,0,1], characteristics: { density: 'low', symmetry: 'none', feel: 'bookend_syncopation' } },
  { id: 'P_A4_POS_23_V1', archetype: 'A4', category: 'positionen', name: 'Synkope - nur Position 2+3', steps: [0,0,0,0, 2,0,0,1, 2,0,0,1, 0,0,0,0], characteristics: { density: 'low', symmetry: 'half', feel: 'middle_syncopation' } },
  { id: 'P_A4_POS_13_V1', archetype: 'A4', category: 'positionen', name: 'Synkope - nur Position 1+3', steps: [2,0,0,1, 0,0,0,0, 2,0,0,1, 0,0,0,0], characteristics: { density: 'low', symmetry: 'half', feel: 'strong_syncopation' } },
  { id: 'P_A4_POS_24_V1', archetype: 'A4', category: 'positionen', name: 'Synkope - nur Position 2+4', steps: [0,0,0,0, 2,0,0,1, 0,0,0,0, 2,0,0,1], characteristics: { density: 'low', symmetry: 'half', feel: 'backbeat_syncopation' } },

  // POSITIONEN - A6
  { id: 'P_A6_POS_14_V1', archetype: 'A6', category: 'positionen', name: 'Doppel - nur Position 1+4', steps: [2,1,0,0, 0,0,0,0, 0,0,0,0, 2,1,0,0], characteristics: { density: 'low', symmetry: 'none', feel: 'sparse_double' } },
  { id: 'P_A6_POS_23_V1', archetype: 'A6', category: 'positionen', name: 'Doppel - nur Position 2+3', steps: [0,0,0,0, 2,1,0,0, 2,1,0,0, 0,0,0,0], characteristics: { density: 'low', symmetry: 'half', feel: 'middle_double' } },
  { id: 'P_A6_POS_13_V1', archetype: 'A6', category: 'positionen', name: 'Doppel - nur Position 1+3', steps: [2,1,0,0, 0,0,0,0, 2,1,0,0, 0,0,0,0], characteristics: { density: 'low', symmetry: 'half', feel: 'strong_double' } },
  { id: 'P_A6_POS_24_V1', archetype: 'A6', category: 'positionen', name: 'Doppel - nur Position 2+4', steps: [0,0,0,0, 2,1,0,0, 0,0,0,0, 2,1,0,0], characteristics: { density: 'low', symmetry: 'half', feel: 'backbeat_double' } },

  // POSITIONEN - A7
  { id: 'P_A7_POS_13_V1', archetype: 'A7', category: 'positionen', name: 'Punktierung > - nur Position 1+3', steps: [2,0,1,1, 0,0,0,0, 2,0,1,1, 0,0,0,0], characteristics: { density: 'medium', symmetry: 'half', feel: 'sparse_dotted' } },
  { id: 'P_A7_POS_24_V1', archetype: 'A7', category: 'positionen', name: 'Punktierung > - nur Position 2+4', steps: [0,0,0,0, 2,0,1,1, 0,0,0,0, 2,0,1,1], characteristics: { density: 'medium', symmetry: 'half', feel: 'backbeat_dotted' } },

  // GEMISCHTE PATTERN
  { id: 'P_MIX_A1A2_V1', archetype: 'MIX', category: 'mix', name: 'Mix: Viertel + Achtel alternierend', steps: [2,0,0,0, 1,0,1,0, 2,0,0,0, 1,0,1,0], characteristics: { density: 'medium', symmetry: 'half', feel: 'varied_subdivision' } },
  { id: 'P_MIX_A2A4_V1', archetype: 'MIX', category: 'mix', name: 'Mix: Achtel + Synkope', steps: [2,0,1,0, 1,0,0,1, 2,0,1,0, 1,0,0,1], characteristics: { density: 'medium', symmetry: 'half', feel: 'syncopated_walk' } },
  { id: 'P_MIX_A6A7_V1', archetype: 'MIX', category: 'mix', name: 'Mix: Doppel + Punktierung', steps: [2,1,0,0, 1,0,1,1, 2,1,0,0, 1,0,1,1], characteristics: { density: 'high', symmetry: 'half', feel: 'complex_groove' } },
  { id: 'P_MIX_A1A3_V1', archetype: 'MIX', category: 'mix', name: 'Mix: Viertel + Sechzehntel', steps: [2,0,0,0, 1,1,1,1, 2,0,0,0, 1,1,1,1], characteristics: { density: 'high', symmetry: 'half', feel: 'fill_pattern' } },
  { id: 'P_MIX_A4A5_V1', archetype: 'MIX', category: 'mix', name: 'Mix: Synkope + Offbeat', steps: [1,0,0,1, 0,1,0,1, 1,0,0,1, 0,1,0,1], characteristics: { density: 'high', symmetry: 'half', feel: 'dense_syncopation' } },
  { id: 'P_MIX_A2A6_V1', archetype: 'MIX', category: 'mix', name: 'Mix: Achtel + Doppel', steps: [2,0,1,0, 2,1,0,0, 2,0,1,0, 2,1,0,0], characteristics: { density: 'high', symmetry: 'half', feel: 'varied_density' } },
  { id: 'P_MIX_A1A4_V1', archetype: 'MIX', category: 'mix', name: 'Mix: Viertel + Synkope', steps: [2,0,0,0, 1,0,0,1, 2,0,0,0, 1,0,0,1], characteristics: { density: 'low', symmetry: 'half', feel: 'sparse_syncopation' } },
  { id: 'P_MIX_A7A8_V1', archetype: 'MIX', category: 'mix', name: 'Mix: Beide Punktierungen', steps: [2,0,1,1, 1,1,0,1, 2,0,1,1, 1,1,0,1], characteristics: { density: 'high', symmetry: 'half', feel: 'complex_dotted' } },

  // CLAVE PATTERN
  { id: 'P_CLAVE_SON_32', archetype: 'CLAVE', category: 'clave', name: 'Son Clave (3-2)', steps: [2,0,0,1, 0,0,2,0, 0,1,0,0, 2,0,1,0], characteristics: { density: 'medium', symmetry: 'none', feel: 'son_clave' } },
  { id: 'P_CLAVE_SON_23', archetype: 'CLAVE', category: 'clave', name: 'Son Clave (2-3)', steps: [2,0,1,0, 0,0,0,0, 2,0,0,1, 0,0,2,0], characteristics: { density: 'medium', symmetry: 'none', feel: 'reverse_son' } },
  { id: 'P_CLAVE_RUMBA_32', archetype: 'CLAVE', category: 'clave', name: 'Rumba Clave (3-2)', steps: [2,0,0,1, 0,0,2,0, 1,0,0,0, 2,0,1,0], characteristics: { density: 'medium', symmetry: 'none', feel: 'rumba_clave' } },
  { id: 'P_CLAVE_RUMBA_23', archetype: 'CLAVE', category: 'clave', name: 'Rumba Clave (2-3)', steps: [2,0,1,0, 0,0,0,0, 2,0,0,1, 0,0,2,0], characteristics: { density: 'medium', symmetry: 'none', feel: 'reverse_rumba' } },
  { id: 'P_CLAVE_BOSSA', archetype: 'CLAVE', category: 'clave', name: 'Bossa Clave', steps: [2,0,0,0, 1,0,2,0, 0,0,1,0, 2,0,0,0], characteristics: { density: 'medium', symmetry: 'none', feel: 'bossa_clave' } },
  { id: 'P_CLAVE_SON_STRONG', archetype: 'CLAVE', category: 'clave', name: 'Son Clave (stark betont)', steps: [3,0,0,1, 0,0,3,0, 0,2,0,0, 3,0,2,0], characteristics: { density: 'medium', symmetry: 'none', feel: 'emphatic_son' } },

  // LATIN PATTERN
  { id: 'P_LATIN_TRESILLO', archetype: 'LATIN', category: 'latin', name: 'Tresillo (3+3+2)', steps: [2,0,0,1, 0,0,2,0, 0,1,0,0, 0,0,0,0], characteristics: { density: 'low', symmetry: 'none', feel: 'tresillo' } },
  { id: 'P_LATIN_TRESILLO_FULL', archetype: 'LATIN', category: 'latin', name: 'Tresillo - voller Takt', steps: [2,0,0,1, 0,0,2,0, 0,1,0,0, 2,0,0,1], characteristics: { density: 'medium', symmetry: 'none', feel: 'extended_tresillo' } },
  { id: 'P_LATIN_BOSSA_BASIS', archetype: 'LATIN', category: 'latin', name: 'Bossa Nova Basis', steps: [2,0,0,0, 1,0,2,0, 0,0,1,0, 2,0,0,0], characteristics: { density: 'medium', symmetry: 'none', feel: 'bossa_nova' } },
  { id: 'P_LATIN_SAMBA', archetype: 'LATIN', category: 'latin', name: 'Samba Surdo', steps: [2,0,1,0, 0,0,2,0, 1,0,0,0, 2,0,1,0], characteristics: { density: 'medium', symmetry: 'none', feel: 'samba' } },
  { id: 'P_LATIN_SALSA', archetype: 'LATIN', category: 'latin', name: 'Salsa Tumbao', steps: [2,0,1,1, 0,1,2,0, 0,1,1,0, 2,0,1,0], characteristics: { density: 'high', symmetry: 'none', feel: 'salsa' } },
  { id: 'P_LATIN_MERENGUE', archetype: 'LATIN', category: 'latin', name: 'Merengue', steps: [2,1,1,0, 2,1,1,0, 2,1,1,0, 2,1,1,0], characteristics: { density: 'high', symmetry: 'full', feel: 'merengue' } },
  { id: 'P_LATIN_CUMBIA', archetype: 'LATIN', category: 'latin', name: 'Cumbia', steps: [2,0,0,0, 1,0,1,0, 2,0,0,0, 1,0,1,0], characteristics: { density: 'medium', symmetry: 'half', feel: 'cumbia' } },
  { id: 'P_LATIN_BAIAO', archetype: 'LATIN', category: 'latin', name: 'Baião', steps: [2,0,1,0, 2,0,1,1, 2,0,1,0, 2,0,1,1], characteristics: { density: 'high', symmetry: 'half', feel: 'baiao' } },
  { id: 'P_LATIN_BEMBE', archetype: 'LATIN', category: 'latin', name: 'Bembé 6/8', steps: [2,0,0,2, 0,0,1,0, 0,2,0,0, 1,0,0,0], characteristics: { density: 'medium', symmetry: 'none', feel: 'bembe' } },
  { id: 'P_LATIN_CASCARA', archetype: 'LATIN', category: 'latin', name: 'Cascara', steps: [2,0,1,0, 1,0,2,0, 1,0,1,0, 2,0,1,0], characteristics: { density: 'high', symmetry: 'none', feel: 'cascara' } },

  // FUNK PATTERN
  { id: 'P_FUNK_GHOST_NOTES', archetype: 'FUNK', category: 'funk', name: 'Funk - Ghost Notes', steps: [2,1,0,1, 0,1,2,1, 0,1,0,1, 2,1,0,1], characteristics: { density: 'high', symmetry: 'none', feel: 'funky' } },
  { id: 'P_FUNK_ONE_DROP', archetype: 'FUNK', category: 'funk', name: 'Funk - One Drop', steps: [0,0,0,0, 2,0,1,0, 0,0,0,0, 2,0,1,0], characteristics: { density: 'low', symmetry: 'half', feel: 'one_drop' } },
  { id: 'P_FUNK_BREAKBEAT', archetype: 'FUNK', category: 'funk', name: 'Funk - Breakbeat', steps: [2,0,1,0, 0,1,3,0, 1,0,2,0, 0,1,2,1], characteristics: { density: 'high', symmetry: 'none', feel: 'breakbeat' } },
  { id: 'P_FUNK_PURDIE', archetype: 'FUNK', category: 'funk', name: 'Funk - Purdie Shuffle', steps: [2,0,1,1, 0,1,2,0, 1,1,2,0, 0,1,2,1], characteristics: { density: 'high', symmetry: 'none', feel: 'purdie_shuffle' } },
  { id: 'P_FUNK_CLYDE', archetype: 'FUNK', category: 'funk', name: 'Funk - Clyde Stubblefield', steps: [2,1,0,1, 3,0,1,1, 2,1,0,1, 3,0,1,0], characteristics: { density: 'high', symmetry: 'half', feel: 'funky_drummer' } },
  { id: 'P_FUNK_DELAYED', archetype: 'FUNK', category: 'funk', name: 'Funk - Delayed Backbeat', steps: [2,0,0,0, 0,2,1,0, 2,0,0,0, 0,2,1,0], characteristics: { density: 'medium', symmetry: 'half', feel: 'delayed_backbeat' } },
  { id: 'P_FUNK_SYNCOPATED', archetype: 'FUNK', category: 'funk', name: 'Funk - Heavy Syncopation', steps: [2,0,0,1, 0,1,3,0, 0,1,2,0, 0,1,3,1], characteristics: { density: 'high', symmetry: 'none', feel: 'heavy_funk' } },
  { id: 'P_FUNK_LINEAR', archetype: 'FUNK', category: 'funk', name: 'Funk - Linear Pattern', steps: [2,0,0,1, 0,0,3,0, 0,1,0,0, 2,0,0,1], characteristics: { density: 'medium', symmetry: 'none', feel: 'linear_funk' } },
  { id: 'P_FUNK_HIP_HOP', archetype: 'FUNK', category: 'funk', name: 'Funk - Hip Hop Boom Bap', steps: [2,0,0,0, 3,0,1,0, 2,0,0,0, 3,0,1,1], characteristics: { density: 'medium', symmetry: 'half', feel: 'boom_bap' } },
  { id: 'P_FUNK_TRAP', archetype: 'FUNK', category: 'funk', name: 'Funk - Trap Hi-Hat', steps: [1,1,1,1, 1,1,3,1, 1,1,1,1, 1,1,3,1], characteristics: { density: 'high', symmetry: 'half', feel: 'trap' } },
];

// ─── Display constants ────────────────────────────────────────────────────────
const STEP_SYMBOLS: Record<StepValue, string> = { 0: '.', 1: 'x', 2: 'X', 3: '!' };
const STEP_CLASSES: Record<StepValue, string> = { 0: 'empty', 1: 'normal', 2: 'accent', 3: 'strong' };
const STEP_DESCRIPTIONS: Record<StepValue, string> = { 0: 'Pause', 1: 'Normal', 2: 'Akzent', 3: 'Starker Akzent' };
const COUNTS = ['1','e','+','a', '2','e','+','a', '3','e','+','a', '4','e','+','a'] as const;
const IS_MAIN_BEAT = [true,false,false,false, true,false,false,false, true,false,false,false, true,false,false,false] as const;

type Section = 'overview' | Category | 'alle';

const NAV_TABS: { id: Section; label: string }[] = [
  { id: 'overview', label: 'Übersicht' },
  { id: 'archetypen', label: 'Archetypen (A1-A8)' },
  { id: 'positionen', label: 'Positionen' },
  { id: 'mix', label: 'Gemischte Pattern' },
  { id: 'clave', label: 'Clave' },
  { id: 'latin', label: 'Latin' },
  { id: 'funk', label: 'Funk' },
  { id: 'alle', label: 'Alle Pattern' },
];

type CategoryCard = {
  target: Section;
  name: string;
  count: number;
  description: string;
  examples: string[];
};

const CATEGORY_CARDS: CategoryCard[] = [
  {
    target: 'archetypen',
    name: 'Archetypen',
    count: PATTERNS.filter((p) => p.category === 'archetypen').length,
    description: 'Die 8 fundamentalen rhythmischen Bausteine (A1-A8) mit je 4-5 Akzent-Variationen. Basis aller Pattern.',
    examples: ['Viertel', 'Achtel', 'Sechzehntel', 'Synkope'],
  },
  {
    target: 'positionen',
    name: 'Positionen',
    count: PATTERNS.filter((p) => p.category === 'positionen').length,
    description: 'Archetypen an spezifischen Positionen im Takt. Sparse Patterns mit gezielten Betonungen.',
    examples: ['1+4', '2+3', '1+3', 'Backbeat'],
  },
  {
    target: 'mix',
    name: 'Gemischte Pattern',
    count: PATTERNS.filter((p) => p.category === 'mix').length,
    description: 'Kombinationen verschiedener Archetypen innerhalb eines Taktes für komplexere Grooves.',
    examples: ['Viertel+Achtel', 'Achtel+Synkope'],
  },
  {
    target: 'clave',
    name: 'Clave',
    count: PATTERNS.filter((p) => p.category === 'clave').length,
    description: 'Klassische afro-kubanische Clave-Pattern: Son, Rumba, Bossa in 3-2 und 2-3 Orientierung.',
    examples: ['Son 3-2', 'Rumba 3-2', '2-3'],
  },
  {
    target: 'latin',
    name: 'Latin',
    count: PATTERNS.filter((p) => p.category === 'latin').length,
    description: 'Lateinamerikanische Rhythmen: Tresillo, Bossa Nova, Samba, Salsa, Merengue.',
    examples: ['Tresillo', 'Bossa', 'Samba'],
  },
  {
    target: 'funk',
    name: 'Funk',
    count: PATTERNS.filter((p) => p.category === 'funk').length,
    description: 'Funky Grooves mit Ghost Notes, Synkopen und One-Drop. Hochdichte Pattern.',
    examples: ['Ghost Notes', 'One Drop', 'Breakbeat'],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function PatternsPage() {
  const [section, setSection] = useState<Section>('overview');
  const [search, setSearch] = useState('');
  const [densityFilter, setDensityFilter] = useState<Density | 'all'>('all');
  const [symmetryFilter, setSymmetryFilter] = useState<Symmetry | 'all'>('all');

  const filteredPatterns = useMemo(() => {
    if (section === 'overview') return [];
    const term = search.trim().toLowerCase();

    return PATTERNS.filter((p) => {
      if (section !== 'alle' && p.category !== section) return false;
      if (term && !p.name.toLowerCase().includes(term)) return false;
      if (densityFilter !== 'all' && p.characteristics.density !== densityFilter) return false;
      if (symmetryFilter !== 'all' && p.characteristics.symmetry !== symmetryFilter) return false;
      return true;
    });
  }, [section, search, densityFilter, symmetryFilter]);

  const handleSelectSection = (next: Section) => {
    setSection(next);
    if (next !== 'overview') {
      setSearch('');
      setDensityFilter('all');
      setSymmetryFilter('all');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setDensityFilter('all');
    setSymmetryFilter('all');
  };

  const showFilters = section !== 'overview';
  const showOverview = section === 'overview';

  return (
    <>
      <style>{PB_CSS}</style>

      <main className="pb">
        <div className="pb-container">
          <header className="pb-header">
            <div className="pb-header-eyebrow">Pattern-Bibliothek</div>
            <h1 className="pb-title">RHYTHMUS-TOOL</h1>
            <p className="pb-subtitle">
              Vollständige systematische Pattern-Bibliothek für 4/4-Takt — {PATTERNS.length} Pattern in {CATEGORY_CARDS.length} Kategorien
            </p>
            <div className="pb-back">
              <Link href="/" className="pb-back-link">← Zurück zur Startseite</Link>
            </div>
          </header>

          <nav className="pb-nav" aria-label="Pattern-Kategorien">
            <div className="pb-nav-tabs" role="tablist">
              {NAV_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={section === tab.id}
                  className={`pb-nav-tab${section === tab.id ? ' pb-active' : ''}`}
                  onClick={() => handleSelectSection(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>

          {showOverview && (
            <section className="pb-overview" aria-label="Übersicht">
              <div className="pb-stats-grid">
                <div className="pb-stat-card">
                  <div className="pb-stat-value">{PATTERNS.length}</div>
                  <div className="pb-stat-label">Gesamt Pattern</div>
                </div>
                <div className="pb-stat-card">
                  <div className="pb-stat-value">8</div>
                  <div className="pb-stat-label">Archetypen</div>
                </div>
                <div className="pb-stat-card">
                  <div className="pb-stat-value">16</div>
                  <div className="pb-stat-label">Steps pro Takt</div>
                </div>
                <div className="pb-stat-card">
                  <div className="pb-stat-value">4</div>
                  <div className="pb-stat-label">Akzentstufen</div>
                </div>
              </div>

              <div className="pb-legend">
                <h3 className="pb-legend-title">Legende</h3>
                <div className="pb-legend-items">
                  <div className="pb-legend-item">
                    <div className="pb-legend-symbol pb-step-empty">.</div>
                    <span>Pause (0)</span>
                  </div>
                  <div className="pb-legend-item">
                    <div className="pb-legend-symbol pb-step-normal">x</div>
                    <span>Normal (1)</span>
                  </div>
                  <div className="pb-legend-item">
                    <div className="pb-legend-symbol pb-step-accent">X</div>
                    <span>Akzent (2)</span>
                  </div>
                  <div className="pb-legend-item">
                    <div className="pb-legend-symbol pb-step-strong">!</div>
                    <span>Starker Akzent (3)</span>
                  </div>
                </div>
              </div>

              <h2 className="pb-categories-title">Kategorien</h2>
              <div className="pb-category-overview">
                {CATEGORY_CARDS.map((cat) => (
                  <button
                    key={cat.target}
                    type="button"
                    className="pb-category-card"
                    onClick={() => handleSelectSection(cat.target)}
                  >
                    <div className="pb-category-header">
                      <div className="pb-category-name">{cat.name}</div>
                      <div className="pb-category-count">{cat.count} Pattern</div>
                    </div>
                    <div className="pb-category-description">{cat.description}</div>
                    <div className="pb-category-examples">
                      {cat.examples.map((ex) => (
                        <div key={ex} className="pb-example-badge">{ex}</div>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {showFilters && (
            <div className="pb-filters">
              <div className="pb-filter-group">
                <label htmlFor="pb-search">Suche</label>
                <input
                  id="pb-search"
                  type="text"
                  placeholder="Pattern-Name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="pb-filter-group">
                <label htmlFor="pb-density">Dichte</label>
                <select
                  id="pb-density"
                  value={densityFilter}
                  onChange={(e) => setDensityFilter(e.target.value as Density | 'all')}
                >
                  <option value="all">Alle</option>
                  <option value="low">Niedrig</option>
                  <option value="medium">Mittel</option>
                  <option value="high">Hoch</option>
                </select>
              </div>
              <div className="pb-filter-group">
                <label htmlFor="pb-symmetry">Symmetrie</label>
                <select
                  id="pb-symmetry"
                  value={symmetryFilter}
                  onChange={(e) => setSymmetryFilter(e.target.value as Symmetry | 'all')}
                >
                  <option value="all">Alle</option>
                  <option value="full">Vollständig</option>
                  <option value="half">Halb</option>
                  <option value="none">Keine</option>
                </select>
              </div>
              <div className="pb-filter-group">
                <label>&nbsp;</label>
                <button type="button" onClick={resetFilters} className="pb-reset-btn">
                  Filter zurücksetzen
                </button>
              </div>
            </div>
          )}

          {showFilters && (
            <div className="pb-result-count">
              {filteredPatterns.length} {filteredPatterns.length === 1 ? 'Pattern' : 'Pattern'} gefunden
            </div>
          )}

          {showFilters && filteredPatterns.length === 0 && (
            <div className="pb-empty-state">
              Keine Pattern entsprechen deinen Filtern. <button type="button" className="pb-link-btn" onClick={resetFilters}>Filter zurücksetzen</button>
            </div>
          )}

          {showFilters && filteredPatterns.length > 0 && (
            <div className="pb-pattern-grid">
              {filteredPatterns.map((pattern) => (
                <PatternCard key={pattern.id} pattern={pattern} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

// Step-value (0-3 generic perc) → /tool 5-cycle token.
// 0 = Pause → '.' (Pause), 1 = weak → 'g' (gn), 2 = medium → 'S' (slap),
// 3 = strong → 'D' (ding). Tonfeld is melodic and not present in this dataset.
const STEP_TO_TOOL_TOKEN = ['.', 'g', 'S', 'D'] as const;

function encodePatternForTool(steps: readonly number[]): string {
  if (steps.length !== 16) return '.'.repeat(16);
  return steps.map((v) => STEP_TO_TOOL_TOKEN[v] ?? '.').join('');
}

// ─── Pattern card ────────────────────────────────────────────────────────────
function PatternCard({ pattern }: { pattern: Pattern }) {
  const toolHref = useMemo(() => {
    const params = new URLSearchParams({
      pattern: encodePatternForTool(pattern.steps),
      bpm: '90',
      handsatz: 'R-L',
      from: 'patterns',
      label: `${pattern.id} · ${pattern.name}`,
    });
    return `/tool?${params.toString()}`;
  }, [pattern]);

  return (
    <article className="pb-pattern-card">
      <div className="pb-pattern-header">
        <div className="pb-pattern-id">{pattern.id}</div>
        <div className="pb-pattern-name">{pattern.name}</div>
        <span className="pb-archetype-badge">{pattern.archetype}</span>
      </div>

      <div className="pb-rhythm-display">
        <div className="pb-counting-row">
          {COUNTS.map((count, i) => (
            <div
              key={`count-${i}`}
              className={`pb-count-cell ${IS_MAIN_BEAT[i] ? 'pb-count-main' : 'pb-count-sub'}`}
            >
              {count}
            </div>
          ))}
        </div>

        <div className="pb-rhythm-grid">
          {pattern.steps.map((value, index) => {
            const stepClass = STEP_CLASSES[value];
            const isBeatStart = index % 4 === 0;
            return (
              <div
                key={`step-${index}`}
                className={`pb-step pb-step-${stepClass}${isBeatStart ? ' pb-beat-start' : ''}`}
                title={`Position ${index + 1}: ${STEP_DESCRIPTIONS[value]}`}
              >
                {STEP_SYMBOLS[value]}
              </div>
            );
          })}
        </div>
      </div>

      <div className="pb-pattern-foot">
        <div className="pb-characteristics">
          <div className="pb-char-tag">Dichte: {pattern.characteristics.density}</div>
          <div className="pb-char-tag">Symmetrie: {pattern.characteristics.symmetry}</div>
          <div className="pb-char-tag">Feel: {pattern.characteristics.feel}</div>
        </div>
        <Link href={toolHref} className="pb-tool-link" aria-label={`${pattern.name} im Tool öffnen`}>
          Im Tool öffnen →
        </Link>
      </div>
    </article>
  );
}

// ─── CSS (recolored to dark/amber design tokens, all selectors prefixed pb-) ──
const PB_CSS = `
.pb {
  color: var(--text);
  font-family: 'Barlow', sans-serif;
  line-height: 1.6;
  min-height: 100vh;
  padding: 24px 0 80px;
}

.pb-container {
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 24px;
}

/* ─── Header ─── */
.pb-header {
  background: var(--card);
  border: 1px solid var(--border);
  padding: 36px 32px;
  border-radius: 6px;
  margin-bottom: 28px;
}
.pb-header-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 12px;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: var(--amber);
  margin-bottom: 12px;
}
.pb-title {
  font-family: 'Anton', sans-serif;
  color: var(--cream);
  font-size: clamp(36px, 5vw, 56px);
  letter-spacing: -1px;
  line-height: 1;
  margin-bottom: 14px;
}
.pb-subtitle {
  color: var(--muted);
  font-size: 15px;
  font-weight: 300;
}
.pb-back {
  margin-top: 18px;
}
.pb-back-link {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--muted);
  border-bottom: 1px solid var(--border);
  padding-bottom: 2px;
  transition: color 0.2s, border-color 0.2s;
}
.pb-back-link:hover { color: var(--amber); border-color: var(--amber); }

/* ─── Nav ─── */
.pb-nav {
  background: var(--card);
  border: 1px solid var(--border);
  padding: 18px 20px;
  border-radius: 6px;
  margin-bottom: 28px;
}
.pb-nav-tabs {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.pb-nav-tab {
  background: rgba(245, 166, 35, 0.08);
  color: var(--amber);
  border: 1px solid rgba(245, 166, 35, 0.25);
  padding: 11px 22px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, transform 0.2s, color 0.2s, box-shadow 0.2s;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}
.pb-nav-tab:hover {
  background: rgba(245, 166, 35, 0.18);
  transform: translateY(-2px);
}
.pb-nav-tab.pb-active {
  background: var(--amber);
  color: var(--black);
  border-color: var(--amber);
  box-shadow: 0 4px 18px rgba(245, 166, 35, 0.3);
}

/* ─── Stats ─── */
.pb-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
  margin-bottom: 28px;
}
.pb-stat-card {
  background: rgba(245, 166, 35, 0.06);
  padding: 22px;
  border-radius: 6px;
  border: 1px solid rgba(245, 166, 35, 0.22);
  text-align: center;
}
.pb-stat-value {
  font-family: 'Anton', sans-serif;
  font-size: 44px;
  line-height: 1;
  color: var(--amber);
}
.pb-stat-label {
  color: var(--muted);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 12px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-top: 8px;
}

/* ─── Legend ─── */
.pb-legend {
  background: var(--card);
  border: 1px solid var(--border);
  padding: 22px;
  border-radius: 6px;
  margin-bottom: 28px;
}
.pb-legend-title {
  color: var(--amber);
  margin-bottom: 16px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 14px;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 700;
}
.pb-legend-items {
  display: flex;
  gap: 30px;
  flex-wrap: wrap;
}
.pb-legend-item {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text);
}
.pb-legend-symbol {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  font-size: 1.4em;
  border: 1px solid var(--border);
}
.pb-legend-symbol.pb-step-empty {
  background: rgba(122, 112, 96, 0.12);
  color: var(--muted);
  border-color: var(--border);
}
.pb-legend-symbol.pb-step-normal {
  background: rgba(245, 166, 35, 0.2);
  color: var(--amber);
  border-color: rgba(245, 166, 35, 0.4);
}
.pb-legend-symbol.pb-step-accent {
  background: rgba(255, 107, 53, 0.3);
  color: var(--warm);
  border-color: rgba(255, 107, 53, 0.5);
}
.pb-legend-symbol.pb-step-strong {
  background: rgba(245, 237, 216, 0.18);
  color: var(--cream);
  border-color: rgba(245, 237, 216, 0.4);
}

/* ─── Category overview ─── */
.pb-categories-title {
  font-family: 'Anton', sans-serif;
  color: var(--cream);
  margin-bottom: 20px;
  font-size: clamp(28px, 3.5vw, 40px);
  letter-spacing: -0.5px;
}
.pb-category-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(330px, 1fr));
  gap: 18px;
}
.pb-category-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 24px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, transform 0.2s, box-shadow 0.2s;
  text-align: left;
  font-family: inherit;
  color: inherit;
  width: 100%;
}
.pb-category-card:hover {
  background: var(--card2);
  border-color: var(--amber);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(245, 166, 35, 0.18);
}
.pb-category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  gap: 12px;
}
.pb-category-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 20px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--cream);
  font-weight: 700;
}
.pb-category-count {
  background: rgba(245, 166, 35, 0.18);
  color: var(--amber);
  padding: 4px 12px;
  border-radius: 16px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 12px;
  letter-spacing: 1px;
  text-transform: uppercase;
  font-weight: 700;
  white-space: nowrap;
}
.pb-category-description {
  color: var(--muted);
  margin-bottom: 14px;
  line-height: 1.55;
  font-size: 14px;
}
.pb-category-examples {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.pb-example-badge {
  background: rgba(46, 42, 30, 0.6);
  border: 1px solid var(--border);
  padding: 4px 10px;
  border-radius: 4px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--text);
}

/* ─── Filters ─── */
.pb-filters {
  background: var(--card);
  border: 1px solid var(--border);
  padding: 20px;
  border-radius: 6px;
  margin-bottom: 24px;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: flex-end;
}
.pb-filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pb-filter-group label {
  color: var(--amber);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 700;
}
.pb-filters input[type="text"],
.pb-filters select {
  background: var(--dark);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 10px 14px;
  border-radius: 4px;
  font-family: 'Barlow', sans-serif;
  font-size: 14px;
  min-width: 180px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.pb-filters input[type="text"]::placeholder { color: var(--muted); }
.pb-filters input[type="text"]:focus,
.pb-filters select:focus {
  outline: none;
  border-color: var(--amber);
  box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.18);
}
.pb-reset-btn {
  background: var(--amber);
  color: var(--black);
  border: 1px solid var(--amber);
  padding: 11px 22px;
  border-radius: 4px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 2px;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
}
.pb-reset-btn:hover {
  background: var(--amber2);
  transform: translateY(-2px);
  box-shadow: 0 5px 16px rgba(245, 166, 35, 0.32);
}

/* ─── Result count + empty state ─── */
.pb-result-count {
  color: var(--muted);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 18px;
}
.pb-empty-state {
  background: var(--card);
  border: 1px dashed var(--border);
  border-radius: 6px;
  padding: 60px 32px;
  text-align: center;
  color: var(--muted);
  font-size: 15px;
}
.pb-link-btn {
  background: none;
  border: none;
  color: var(--amber);
  cursor: pointer;
  font: inherit;
  text-decoration: underline;
  padding: 0;
}
.pb-link-btn:hover { color: var(--cream); }

/* ─── Pattern grid + cards ─── */
.pb-pattern-grid {
  display: grid;
  gap: 22px;
}
.pb-pattern-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 24px;
  transition: background 0.2s, border-color 0.2s, transform 0.2s, box-shadow 0.2s;
}
.pb-pattern-card:hover {
  background: var(--card2);
  border-color: var(--amber);
  transform: translateY(-3px);
  box-shadow: 0 6px 22px rgba(245, 166, 35, 0.18);
}
.pb-pattern-header {
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}
.pb-pattern-id {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--amber);
  font-weight: 700;
  letter-spacing: 0.5px;
}
.pb-pattern-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 20px;
  color: var(--cream);
  margin: 8px 0;
  letter-spacing: 0.5px;
  font-weight: 600;
}
.pb-archetype-badge {
  background: var(--amber);
  color: var(--black);
  padding: 4px 12px;
  border-radius: 4px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 700;
  display: inline-block;
}

/* ─── Rhythm display ─── */
.pb-rhythm-display {
  background: rgba(10, 9, 7, 0.6);
  border: 1px solid var(--border);
  padding: 22px;
  border-radius: 6px;
  margin: 18px 0;
  overflow-x: auto;
}
.pb-counting-row {
  display: grid;
  grid-template-columns: repeat(16, 1fr);
  gap: 2px;
  margin-bottom: 12px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  min-width: 640px;
}
.pb-count-cell {
  text-align: center;
  color: var(--amber);
  font-weight: 700;
  padding: 4px 0;
}
.pb-count-main { font-size: 1.15em; }
.pb-count-sub { color: var(--muted); font-size: 0.85em; }

.pb-rhythm-grid {
  display: grid;
  grid-template-columns: repeat(16, 1fr);
  gap: 2px;
  min-width: 640px;
}
.pb-step {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 1.7em;
  font-weight: bold;
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
}
.pb-step.pb-beat-start { border-left: 3px solid var(--amber); }
.pb-step.pb-step-empty {
  background: rgba(122, 112, 96, 0.08);
  color: var(--border);
}
.pb-step.pb-step-normal {
  background: rgba(245, 166, 35, 0.18);
  color: var(--amber);
  border-color: rgba(245, 166, 35, 0.35);
}
.pb-step.pb-step-accent {
  background: rgba(255, 107, 53, 0.28);
  color: var(--warm);
  border-color: rgba(255, 107, 53, 0.5);
  box-shadow: 0 0 8px rgba(255, 107, 53, 0.22);
}
.pb-step.pb-step-strong {
  background: rgba(245, 237, 216, 0.18);
  color: var(--cream);
  border-color: rgba(245, 237, 216, 0.4);
  box-shadow: 0 0 12px rgba(245, 237, 216, 0.22);
  animation: pb-pulse 1.5s ease-in-out infinite;
}

@keyframes pb-pulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.05); }
}

/* ─── Pattern foot (characteristics + Tool link) ─── */
.pb-pattern-foot {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-top: 14px;
  flex-wrap: wrap;
}
.pb-characteristics {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1 1 auto;
  min-width: 0;
}
.pb-char-tag {
  background: rgba(46, 42, 30, 0.55);
  border: 1px solid var(--border);
  padding: 4px 11px;
  border-radius: 4px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 12px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--muted);
}
.pb-tool-link {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 14px;
  border: 1px solid var(--border);
  color: var(--muted);
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  text-decoration: none;
  border-radius: 3px;
  transition: color 0.15s ease, border-color 0.15s ease;
  white-space: nowrap;
}
.pb-tool-link:hover {
  color: var(--amber);
  border-color: var(--amber);
}

/* ─── Responsive ─── */
@media (max-width: 768px) {
  .pb-container { padding: 0 16px; }
  .pb-header { padding: 28px 22px; }
  .pb-title { font-size: 32px; }
  .pb-nav { padding: 14px; }
  .pb-nav-tabs { gap: 8px; }
  .pb-nav-tab { padding: 9px 16px; font-size: 12px; letter-spacing: 1px; }
  .pb-category-overview { grid-template-columns: 1fr; }
  .pb-rhythm-display { overflow-x: scroll; }
  .pb-filters { flex-direction: column; align-items: stretch; }
  .pb-filters input[type="text"],
  .pb-filters select { min-width: 0; width: 100%; }
  .pb-reset-btn { width: 100%; }
  .pb-step { height: 52px; font-size: 1.4em; }
}
`;
