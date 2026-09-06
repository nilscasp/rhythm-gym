'use client';

import { Suspense, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import * as Tone from 'tone';
import { Hand, Volume2, Play, Pause, Square, RotateCcw, Copy, Save, SlidersHorizontal, X } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '../lib/supabase/client';
import HandpanVisualizer from '../../components/HandpanVisualizer';

// Vorübergehend ausgeblendet (Nils, 2026-06-10): Visualizer ist noch im Bau.
// Zum Wieder-Einschalten einfach auf true setzen — Komponente bleibt
// importiert und typgecheckt, nichts wurde gelöscht.
const SHOW_HANDPAN_VISUALIZER = false;

// ─────────────────────────────────────────────────────────────────────────────
// Handpan-Maschine — 5-state click cycle (Pause / gn / tonfeld / slap / ding)
// Strikes synthesized via Tone.js; samples may replace these later.
//
// URL-driven preset hand-off:
//   ?pattern=<1..32 char string from .gTSD>   (default 16 = canonical Sechzehntel)
//   ?bpm=<20..160>
//   ?handsatz=<R-L|L-R|frei>
//   ?subdivision=<4n|8n|16n|32n>              (optional; default 16n)
//   ?from=<source-route>
//   ?label=<URL-encoded label>
// The Maschine pre-loads that pattern with the appropriate step count.
// Mapping: . = Pause, g = gn (Ghostnote), T = tonfeld, S = slap, D = ding.
// ─────────────────────────────────────────────────────────────────────────────

type StrikeIndex = 0 | 1 | 2 | 3 | 4;
type HandsatzKey = 'R-L' | 'L-R' | 'RR-LL' | 'LL-RR' | 'paradiddle' | 'frei';
type SubdivisionKey = '4n' | '8n' | '16n' | '32n';

const STRIKE_DECODE: Record<string, number> = { '.': 0, g: 1, T: 2, S: 3, D: 4 };

const MIN_STEP_COUNT = 1;
// = MAX_BEATS (9) × Sechzehntel (4): the longest pattern the builder can create.
// decodePatternParam uses this as the accept ceiling, so every constructible
// pattern round-trips through ?pattern= / saved notation (no silent reset to empty).
const MAX_STEP_COUNT = 36;
const DEFAULT_STEP_COUNT = 16;

// ───────── Beats × subdivision model ─────────
// The grid is built from two axes the user picks directly: the number of beats
// (Schläge, 2–9) and how each beat is subdivided. Total cells = beats × perBeat.
const MIN_BEATS = 2;
const MAX_BEATS = 9;

// Unterteilung choices offered in the UI. 32n stays decodable for back-compat
// URLs (e.g. older saved patterns) but is intentionally not offered here.
const SUBDIVISION_CHOICES: { key: SubdivisionKey; label: string; perBeat: number }[] = [
  { key: '4n', label: 'Viertel', perBeat: 1 },
  { key: '8n', label: 'Achtel', perBeat: 2 },
  { key: '16n', label: 'Sechzehntel', perBeat: 4 },
];

// Off-beat counting labels per stride; the downbeat itself shows the beat number.
const COUNT_OFFBEATS: Record<number, string[]> = {
  1: [],
  2: ['und'],
  4: ['e', 'und', 'de'],
  8: ['e', 'und', 'de', 'e', 'und', 'de', 'a'], // 32n — back-compat only
};

// Desktop layout target: keep beats intact, ~16 cells per row before wrapping.
const TARGET_CELLS_PER_ROW = 16;

function decodePatternParam(raw: string | null | undefined): number[] | null {
  if (!raw) return null;
  if (raw.length < MIN_STEP_COUNT || raw.length > MAX_STEP_COUNT) return null;
  // Fail closed if any char is invalid — don't silently coerce to Pause.
  if (!/^[.gTSD]+$/.test(raw)) return null;
  return raw.split('').map((c) => STRIKE_DECODE[c] ?? 0);
}

function decodeBpmParam(raw: string | null | undefined): number | null {
  const n = parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n >= 20 && n <= 160 ? n : null;
}

function decodeHandsatzParam(raw: string | null | undefined): HandsatzKey | null {
  return (
    raw === 'R-L' || raw === 'L-R' ||
    raw === 'RR-LL' || raw === 'LL-RR' ||
    raw === 'paradiddle' || raw === 'frei'
  ) ? raw : null;
}

// Cycle a rudiment unit out to N steps. R L R R extended to 7 → R L R R R L R.
function tileHandsatz(unit: readonly ('R' | 'L')[], length: number): ('R' | 'L')[] {
  return Array.from({ length }, (_, i) => unit[i % unit.length]);
}

const PARADIDDLE_UNIT = ['R', 'L', 'R', 'R', 'L', 'R', 'L', 'L'] as const; // klassisches single paradiddle

function decodeSubdivisionParam(raw: string | null | undefined): SubdivisionKey | null {
  return raw === '4n' || raw === '8n' || raw === '16n' || raw === '32n' ? raw : null;
}

// Number of steps per beat for a given subdivision. Used for downbeat highlight
// and metronome (which clicks on every full beat).
function beatStrideFor(sub: SubdivisionKey): number {
  switch (sub) {
    case '32n': return 8;
    case '16n': return 4;
    case '8n':  return 2;
    case '4n':  return 1;
  }
}

// Cells per row for the grid: keep whole beats together, wrap near the desktop target.
function cellsPerRowFor(stepCount: number, stride: number): number {
  const beatsPerRow = Math.max(1, Math.floor(TARGET_CELLS_PER_ROW / stride));
  return Math.min(stepCount, beatsPerRow * stride);
}

const FROM_LABELS: Record<string, string> = {
  training: 'Training',
  patterns: 'Patterns',
  glossar: 'Glossar',
  bibliothek: 'Glossar', // backward-compat — alte ?from=bibliothek Links zeigen weiterhin korrektes Label
  bausteine: 'Bausteine',
};

type SynthMap = {
  gn: Tone.NoiseSynth | null;
  tonfeld: Tone.PluckSynth | null;
  slap: Tone.NoiseSynth | null;
  ding: Tone.MembraneSynth | null;
  subPulse: Tone.NoiseSynth | null;
  metronome: Tone.Synth | null;
};

// ───────── Sound mixer ─────────
// Each sound is voiced at a baseline level (dB). The mixer slider runs 0–100 %,
// where 100 % = that baseline; lower attenuates, 0 % mutes. The baselines live
// here (not inline in initializeAudio) so they are the single source of truth
// shared by audio-init and the live volume effect.
const SOUND_BASELINE_DB = {
  ding: -6,
  tonfeld: -10,
  slap: -10,
  gn: -22,
  metronome: -15,
  subPulse: -28,
} as const;
type SoundKey = keyof typeof SOUND_BASELINE_DB;

// Display order + labels for the mixer popup (most prominent sound first).
const MIXER_ROWS: { key: SoundKey; label: string; hint: string }[] = [
  { key: 'ding', label: 'Ding (D)', hint: 'Tiefer Bass-Akzent' },
  { key: 'slap', label: 'Slap (S)', hint: 'Lauter Slap' },
  { key: 'tonfeld', label: 'Tonfeld (T)', hint: 'Klingende Note' },
  { key: 'gn', label: 'Ghostnote (g)', hint: 'Leiser Slap' },
  { key: 'metronome', label: 'Metronom', hint: 'Klick auf den Vierteln' },
  { key: 'subPulse', label: 'Sub-Klick', hint: 'Unterteilungen' },
];

const DEFAULT_VOLUMES: Record<SoundKey, number> = {
  ding: 100, tonfeld: 100, slap: 100, gn: 100, metronome: 100, subPulse: 100,
};
const MIXER_STORAGE_KEY = 'rg-tool-volumes';

// Slider percent (0–100, 100 = baseline) → Tone.js dB. 0 % → -Infinity (mute).
function mixerDb(baselineDb: number, percent: number): number {
  if (percent <= 0) return -Infinity;
  return baselineDb + 20 * Math.log10(percent / 100);
}

// Read persisted volumes, tolerating missing/corrupt storage and stray keys.
function loadStoredVolumes(): Record<SoundKey, number> {
  if (typeof window === 'undefined') return { ...DEFAULT_VOLUMES };
  try {
    const raw = window.localStorage.getItem(MIXER_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_VOLUMES };
    const parsed = JSON.parse(raw) as Partial<Record<SoundKey, number>>;
    const next = { ...DEFAULT_VOLUMES };
    (Object.keys(DEFAULT_VOLUMES) as SoundKey[]).forEach((key) => {
      const v = parsed[key];
      if (typeof v === 'number' && v >= 0 && v <= 100) next[key] = Math.round(v);
    });
    return next;
  } catch {
    return { ...DEFAULT_VOLUMES };
  }
}

function HandpanMaschineInner() {
  // ───────── URL-param preset hand-off (read once + sync on URL change) ───────
  const searchParams = useSearchParams();
  const paramPattern = searchParams?.get('pattern') ?? null;
  const paramBpm = searchParams?.get('bpm') ?? null;
  const paramHandsatz = searchParams?.get('handsatz') ?? null;
  const paramSubdivision = searchParams?.get('subdivision') ?? null;
  const fromSource = searchParams?.get('from') ?? null;
  const fromLabelRaw = searchParams?.get('label') ?? null;
  const fromLabel = useMemo(() => {
    if (!fromLabelRaw) return null;
    try {
      return decodeURIComponent(fromLabelRaw);
    } catch {
      return fromLabelRaw;
    }
  }, [fromLabelRaw]);

  const decoded = useMemo(
    () => ({
      pattern: decodePatternParam(paramPattern),
      bpm: decodeBpmParam(paramBpm),
      handsatz: decodeHandsatzParam(paramHandsatz),
      subdivision: decodeSubdivisionParam(paramSubdivision),
    }),
    [paramPattern, paramBpm, paramHandsatz, paramSubdivision],
  );

  // Pattern state: 0 = Pause, 1 = gn (Ghostnote), 2 = tonfeld, 3 = slap, 4 = ding
  const [pattern, setPattern] = useState<number[]>(() => decoded.pattern ?? Array(DEFAULT_STEP_COUNT).fill(0));
  const [selectedHandsatz, setSelectedHandsatz] = useState<HandsatzKey>(() => decoded.handsatz ?? 'R-L');
  // Subdivision: each "step" is this note value. 16n = sixteenth-note grid (canonical), 4n = each step is a quarter beat (Bausteine handoff), etc.
  const [subdivision, setSubdivision] = useState<SubdivisionKey>(() => decoded.subdivision ?? '16n');

  // ─── derived ──────────────────────────────────────────────────────────────
  const stepCount = pattern.length;
  const beatStride = useMemo(() => beatStrideFor(subdivision), [subdivision]);
  // Beats (Schläge) is DERIVED from the grid, never a separate state. `beats` is
  // a best-effort count (used to carry the count across a subdivision change).
  const beats = beatStride > 0 ? Math.round(stepCount / beatStride) : stepCount;
  // The chip highlights ONLY when the grid is an EXACT whole-beat multiple in
  // range. Rounding must never fabricate an active chip that disagrees with the
  // grid — otherwise a saved/deep-linked pattern reloaded at a different stride
  // (subdivision isn't persisted) would light a wrong chip whose click mutates it.
  const activeBeats =
    beatStride > 0 && stepCount % beatStride === 0 ? stepCount / beatStride : null;
  const cellsPerRow = useMemo(() => cellsPerRowFor(stepCount, beatStride), [stepCount, beatStride]);

  // Dynamics derives from stepCount — currently all-mf, but the array shape
  // tracks the pattern so the audio callback never reads out of bounds.
  const dynamics = useMemo<number[]>(() => Array(stepCount).fill(1), [stepCount]);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(() => decoded.bpm ?? 90);

  // Re-sync state when the URL params change on the same-mounted route (Next.js
  // does not unmount /tool when navigating from /tool?pattern=A → /tool?pattern=B).
  // Guard with a key ref so we don't clobber user edits when params stay the same.
  const presetKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const key = `${paramPattern}|${paramBpm}|${paramHandsatz}|${paramSubdivision}`;
    if (key === presetKeyRef.current) return;
    presetKeyRef.current = key;
    if (decoded.pattern) setPattern(decoded.pattern);
    if (decoded.bpm !== null) setBpm(decoded.bpm);
    if (decoded.handsatz) setSelectedHandsatz(decoded.handsatz);
    if (decoded.subdivision) setSubdivision(decoded.subdivision);
  }, [paramPattern, paramBpm, paramHandsatz, paramSubdivision, decoded]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);
  const [metronomeEnabled, setMetronomeEnabled] = useState(true);
  const [subdivisionsEnabled, setSubdivisionsEnabled] = useState(false);
  const [showMixer, setShowMixer] = useState(false);
  const [volumes, setVolumes] = useState<Record<SoundKey, number>>(() => loadStoredVolumes());

  // ───────── Auth + Save (Phase 3: save pattern to Supabase) ─────────
  // Browser-only Supabase client; RLS enforces user_id === auth.uid() on insert.
  // We stash it in a ref so we don't re-create it on every render.
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (supabaseRef.current === null && typeof window !== 'undefined') {
    supabaseRef.current = createClient();
  }
  const [authUser, setAuthUser] = useState<{ id: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  // ───────── Save Modal — replaces window.prompt() with multi-field inline UI ─────────
  // State lives next to `saving`/`saveToast` so the modal owns its own form state
  // and the existing toast/auth pipeline is untouched.
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveTags, setSaveTags] = useState('');
  const [saveNotes, setSaveNotes] = useState('');
  const saveNameInputRef = useRef<HTMLInputElement | null>(null);

  // Fire-and-forget: read current user once on mount. If anonymous, button stays hidden.
  useEffect(() => {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      if (data.user) setAuthUser({ id: data.user.id });
    }).catch(() => {
      // Silent — anonymous browsing is a valid state for /tool.
    });
    return () => { cancelled = true; };
  }, []);

  // Auto-clear save toast — success after 3s, error after 5s (caller picks duration).
  const saveToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (saveToastTimerRef.current) clearTimeout(saveToastTimerRef.current);
    };
  }, []);

  // Refs for Tone.js
  const sequenceRef = useRef<Tone.Sequence | null>(null);
  const synthsRef = useRef<SynthMap>({
    gn: null,
    tonfeld: null,
    slap: null,
    ding: null,
    subPulse: null,
    metronome: null,
  });

  // Refs to always read current state inside the Tone.Sequence callback
  // without restarting the sequence. This pattern is preserved verbatim
  // from the original drum machine — it is the only way to keep the
  // sequence audio-thread accurate while reacting to React state changes.
  const patternRef = useRef(pattern);
  const dynamicsRef = useRef(dynamics);
  const metronomeEnabledRef = useRef(metronomeEnabled);
  const subdivisionsEnabledRef = useRef(subdivisionsEnabled);
  const beatStrideRef = useRef(beatStride);

  useEffect(() => {
    patternRef.current = pattern;
  }, [pattern]);
  useEffect(() => {
    dynamicsRef.current = dynamics;
  }, [dynamics]);
  useEffect(() => {
    metronomeEnabledRef.current = metronomeEnabled;
  }, [metronomeEnabled]);
  useEffect(() => {
    subdivisionsEnabledRef.current = subdivisionsEnabled;
  }, [subdivisionsEnabled]);
  useEffect(() => {
    beatStrideRef.current = beatStride;
  }, [beatStride]);

  // Keep a ref of the current mixer levels so initializeAudio can apply them to
  // freshly-created synths before the volume effect below has had a chance to run.
  const volumesRef = useRef(volumes);

  // Push a volume map onto the live Tone.js synths. Stable (touches only the
  // synth ref + module constants) so it is safe to call from init and effects.
  const applyVolumes = useCallback((vols: Record<SoundKey, number>) => {
    const synths = synthsRef.current;
    (Object.keys(SOUND_BASELINE_DB) as SoundKey[]).forEach((key) => {
      const synth = synths[key];
      if (synth) synth.volume.value = mixerDb(SOUND_BASELINE_DB[key], vols[key]);
    });
  }, []);

  // Reflect slider changes onto the synths immediately (even mid-playback) and
  // persist them so the mix survives a reload.
  useEffect(() => {
    volumesRef.current = volumes;
    applyVolumes(volumes);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(MIXER_STORAGE_KEY, JSON.stringify(volumes));
      } catch {
        /* storage unavailable (private mode / quota) — non-fatal */
      }
    }
  }, [volumes, applyVolumes]);

  // Escape closes the mixer popup.
  useEffect(() => {
    if (!showMixer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowMixer(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showMixer]);

  // ───────── Strike vocabulary (5 states; index = pattern value 0..4) ─────────
  const symbols = ['.', 'g', 'T', 'S', 'D'] as const;
  const symbolNames = ['Pause', 'Ghostnote (g)', 'Tonfeld (T)', 'Slap (S)', 'Ding (D)'] as const;
  // Counting row — beat number on each downbeat, German off-beat syllables in
  // between ("e und de" for sixteenths, "und" for eighths, nothing for quarters).
  const counting = useMemo<string[]>(() => {
    const offbeats = COUNT_OFFBEATS[beatStride] ?? [];
    return Array.from({ length: stepCount }, (_, i) => {
      const posInBeat = i % beatStride;
      if (posInBeat === 0) return String(Math.floor(i / beatStride) + 1);
      return offbeats[posInBeat - 1] ?? '';
    });
  }, [stepCount, beatStride]);

  // ───────── Handsatz patterns ─────────
  // `name` = long form for the eyebrow header, `short` = chip label
  const handsatzPatterns: Record<HandsatzKey, { name: string; short: string; pattern: ('R' | 'L')[] | null }> = useMemo(() => ({
    'R-L':        { name: 'Wechselschlag R-L', short: 'R-L',        pattern: tileHandsatz(['R', 'L'], stepCount) },
    'L-R':        { name: 'Wechselschlag L-R', short: 'L-R',        pattern: tileHandsatz(['L', 'R'], stepCount) },
    'RR-LL':      { name: 'Doubles R-L',       short: 'RR-LL',      pattern: tileHandsatz(['R', 'R', 'L', 'L'], stepCount) },
    'LL-RR':      { name: 'Doubles L-R',       short: 'LL-RR',      pattern: tileHandsatz(['L', 'L', 'R', 'R'], stepCount) },
    'paradiddle': { name: 'Paradiddle',        short: 'Paradiddle', pattern: tileHandsatz(PARADIDDLE_UNIT, stepCount) },
    'frei':       { name: 'Freier Handsatz',   short: 'Frei',       pattern: null },
  }), [stepCount]);

  // ───────── Presets ─────────
  // TODO: course presets injected via /training (Tag 12-22) — Tag-detail page links here with ?pattern=<id>&day=<num>
  const presetPatterns: { name: string; pattern: number[] }[] = [];

  // ───────── Audio init ─────────
  const initializeAudio = async () => {
    if (isAudioInitialized) return;
    try {
      await Tone.start();

      // 1 = gn (Ghostnote): leiser Slap — sehr kurze White-Noise transient.
      const gn = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.025, sustain: 0, release: 0.02 },
      }).toDestination();
      synthsRef.current.gn = gn;

      // 2 = tonfeld: gezupfte, klingende Note — 'A4' als Basisfrequenz.
      // Falls 'A4' im Mix zu hoch klingt, auf 'D5' runterstimmen — beides musikalisch valide für ein klingendes Tonfeld.
      const tonfeld = new Tone.PluckSynth({
        attackNoise: 0.4,
        dampening: 4500,
        resonance: 0.7,
      }).toDestination();
      synthsRef.current.tonfeld = tonfeld;

      // 3 = slap: lauter Slap — Pink-Noise burst mit längerem Decay.
      const slap = new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.05 },
      }).toDestination();
      synthsRef.current.slap = slap;

      // 4 = ding: tiefer Bass-Akzent — MembraneSynth als Kick-Substitut.
      const ding = new Tone.MembraneSynth({
        pitchDecay: 0.12,
        octaves: 4,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.45, sustain: 0, release: 0.4 },
      }).toDestination();
      synthsRef.current.ding = ding;

      // Optionaler Sub-Klick — sehr leise, auf jedem 16tel.
      const subPulse = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.012, sustain: 0, release: 0.012 },
      }).toDestination();
      synthsRef.current.subPulse = subPulse;

      // Woodblock-artiges Metronom auf Vierteln.
      const metronome = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
      }).toDestination();
      synthsRef.current.metronome = metronome;

      // Apply the current mixer levels onto the freshly-created synths before the
      // first play — the volume effect won't have fired yet at this point.
      applyVolumes(volumesRef.current);

      setIsAudioInitialized(true);
    } catch (error) {
      // Audio init can fail if the browser blocks AudioContext. Log loudly and
      // leave isAudioInitialized = false so the next click attempts again.
      console.error('Audio initialization error:', error);
    }
  };

  // ───────── Playback control ─────────
  const togglePlayback = async () => {
    if (!isAudioInitialized) await initializeAudio();
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  const startPlayback = () => {
    Tone.Transport.bpm.value = bpm;

    sequenceRef.current = new Tone.Sequence(
      (time, step) => {
        setCurrentStep(step);
        const currentPattern = patternRef.current;
        const currentDynamics = dynamicsRef.current;
        const currentMetronomeEnabled = metronomeEnabledRef.current;
        const currentSubdivisionsEnabled = subdivisionsEnabledRef.current;

        const patternValue = currentPattern[step];
        const dynamicLevel = currentDynamics[step];
        const baseVelocities = [0.3, 0.6, 0.9];
        const velocity = baseVelocities[dynamicLevel] ?? 0.6;

        const synths = synthsRef.current;

        if (patternValue === 1 && synths.gn) {
          synths.gn.triggerAttackRelease('32n', time, velocity);
        } else if (patternValue === 2 && synths.tonfeld) {
          // 'A4' as the resonant tonfeld pitch. Drop to 'D5' if it sits too high in the mix.
          // PluckSynth's TS signature only types `(note, time)` — pass velocity via the
          // attack-release variant which exposes the 4-arg form including velocity.
          synths.tonfeld.triggerAttackRelease('A4', '16n', time, velocity);
        } else if (patternValue === 3 && synths.slap) {
          synths.slap.triggerAttackRelease('16n', time, velocity);
        } else if (patternValue === 4 && synths.ding) {
          synths.ding.triggerAttackRelease('C2', '8n', time, velocity);
        }
        // patternValue === 0 → Pause, intentionally no sound.

        if (currentSubdivisionsEnabled && synths.subPulse) {
          synths.subPulse.triggerAttackRelease('32n', time, 0.4);
        }

        const currentBeatStride = beatStrideRef.current;
        if (currentMetronomeEnabled && step % currentBeatStride === 0 && synths.metronome) {
          synths.metronome.triggerAttackRelease('C6', '32n', time, 0.3);
        }
      },
      [...Array(patternRef.current.length).keys()],
      subdivision
    );

    sequenceRef.current.start(0);
    Tone.Transport.start();
    setIsPlaying(true);
  };

  const stopPlayback = () => {
    if (sequenceRef.current) {
      sequenceRef.current.stop();
      sequenceRef.current.dispose();
      sequenceRef.current = null;
    }
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    setIsPlaying(false);
    setCurrentStep(-1);
  };

  const updateBPM = (newBpm: number) => {
    setBpm(newBpm);
    if (isPlaying) {
      Tone.Transport.bpm.value = newBpm;
    }
  };

  // When stepCount or subdivision changes mid-playback, the running Tone.Sequence
  // still iterates the OLD step array at the OLD interval — rebuild it cleanly.
  // BPM changes are routed through Tone.Transport.bpm and don't need this.
  useEffect(() => {
    if (!isPlaying) return;
    if (sequenceRef.current) {
      sequenceRef.current.stop();
      sequenceRef.current.dispose();
      sequenceRef.current = null;
    }
    sequenceRef.current = new Tone.Sequence(
      (time, step) => {
        setCurrentStep(step);
        const currentPattern = patternRef.current;
        const currentDynamics = dynamicsRef.current;
        const currentMetronomeEnabled = metronomeEnabledRef.current;
        const currentSubdivisionsEnabled = subdivisionsEnabledRef.current;
        const patternValue = currentPattern[step];
        const dynamicLevel = currentDynamics[step];
        const baseVelocities = [0.3, 0.6, 0.9];
        const velocity = baseVelocities[dynamicLevel] ?? 0.6;
        const synths = synthsRef.current;
        if (patternValue === 1 && synths.gn) {
          synths.gn.triggerAttackRelease('32n', time, velocity);
        } else if (patternValue === 2 && synths.tonfeld) {
          synths.tonfeld.triggerAttackRelease('A4', '16n', time, velocity);
        } else if (patternValue === 3 && synths.slap) {
          synths.slap.triggerAttackRelease('16n', time, velocity);
        } else if (patternValue === 4 && synths.ding) {
          synths.ding.triggerAttackRelease('C2', '8n', time, velocity);
        }
        if (currentSubdivisionsEnabled && synths.subPulse) {
          synths.subPulse.triggerAttackRelease('32n', time, 0.4);
        }
        const currentBeatStride = beatStrideRef.current;
        if (currentMetronomeEnabled && step % currentBeatStride === 0 && synths.metronome) {
          synths.metronome.triggerAttackRelease('C6', '32n', time, 0.3);
        }
      },
      [...Array(stepCount).keys()],
      subdivision,
    );
    sequenceRef.current.start(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepCount, subdivision]);

  // Cleanup on unmount — dispose sequence + every synth so the AudioContext
  // doesn't leak nodes across navigations.
  useEffect(() => {
    return () => {
      if (sequenceRef.current) {
        sequenceRef.current.stop();
        sequenceRef.current.dispose();
        sequenceRef.current = null;
      }
      Tone.Transport.stop();
      const synths = synthsRef.current;
      if (synths.gn) synths.gn.dispose();
      if (synths.tonfeld) synths.tonfeld.dispose();
      if (synths.slap) synths.slap.dispose();
      if (synths.ding) synths.ding.dispose();
      if (synths.subPulse) synths.subPulse.dispose();
      if (synths.metronome) synths.metronome.dispose();
    };
  }, []);

  // ───────── Step interaction ─────────
  const handleStepClick = (index: number) => {
    const newPattern = [...pattern];
    newPattern[index] = (newPattern[index] + 1) % 5;
    setPattern(newPattern);
  };

  const resetPattern = () => setPattern(Array(stepCount).fill(0));
  const loadPreset = (preset: number[]) => setPattern(preset);

  // Resize the pattern to a target length, preserving existing cells (truncate if
  // shorter, pad with Pause if longer). Length is hard-clamped to [1, MAX_STEP_COUNT]
  // so NO path — including a legacy 32n deep-link where beats × stride could exceed
  // 36 — can build a grid that decodePatternParam would later reject. Every state round-trips.
  const resizePatternTo = (rawLen: number) => {
    const len = Math.max(MIN_STEP_COUNT, Math.min(MAX_STEP_COUNT, Math.round(rawLen)));
    setPattern((prev) => {
      if (len === prev.length) return prev;
      const next = Array<number>(len).fill(0);
      for (let i = 0; i < Math.min(prev.length, len); i++) next[i] = prev[i];
      return next;
    });
  };

  // Schläge wählen → Raster = Schläge × Unterteilung. Ein Beat ist immer eine
  // Viertelnote (stride × Notenwert = 1/4), also bleibt BPM = Schläge pro Minute.
  // `beats` ist abgeleitet (kein eigener State), darum gibt es keine Drift und
  // resizePatternTo (idempotent) macht aus einem Klick auf den aktiven Chip ein No-op.
  const setBeatsAndResize = (nextBeats: number) => {
    const clamped = Math.max(MIN_BEATS, Math.min(MAX_BEATS, nextBeats));
    resizePatternTo(clamped * beatStride);
  };

  // Unterteilung wählen → behalte die aktuelle Schläge-Zahl, aber deckle die Länge
  // auf MAX_STEP_COUNT, damit jedes baubare Raster speicher-/linkbar bleibt.
  const setSubdivisionAndResize = (nextSub: SubdivisionKey) => {
    const nextStride = beatStrideFor(nextSub);
    const keptBeats = Math.max(1, Math.min(beats, Math.floor(MAX_STEP_COUNT / nextStride)));
    setSubdivision(nextSub);
    resizePatternTo(keptBeats * nextStride);
  };

  const copyPattern = () => {
    const patternString = pattern.map((v) => symbols[v as StrikeIndex]).join('');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(patternString).catch((err) => {
        // Surface clipboard failure rather than silently swallowing it.
        console.error('Clipboard write failed:', err);
      });
    }
    if (typeof window !== 'undefined') {
      window.alert('Pattern kopiert: ' + patternString);
    }
  };

  // Inverse of STRIKE_DECODE — collapses the 0..4 cells back into the canonical
  // `.gTSD` notation string we persist in saved_patterns.notation.
  // Out-of-range values fall back to '.' (Pause) so we never store garbage.
  function cellsToNotation(cells: number[]): string {
    return cells.map((v) => symbols[v as StrikeIndex] ?? '.').join('');
  }

  // Show a toast and schedule auto-clear. `kind` picks the timeout window.
  const showSaveToast = (msg: string, kind: 'success' | 'error') => {
    setSaveToast(msg);
    if (saveToastTimerRef.current) clearTimeout(saveToastTimerRef.current);
    saveToastTimerRef.current = setTimeout(() => setSaveToast(null), kind === 'success' ? 3000 : 5000);
  };

  // Open the save modal — primes the name field with a sensible default and
  // clears the secondary fields so a previous draft never leaks into a new save.
  const openSaveModal = () => {
    if (!authUser || saving) return;
    const defaultName = fromLabel ?? `Pattern ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
    setSaveName(defaultName);
    setSaveTags('');
    setSaveNotes('');
    setShowSaveModal(true);
  };

  // Save current pattern + bpm + handsatz + tags + notes to Supabase. RLS
  // guarantees user_id === auth.uid(), so we only need to attach our own id.
  // Tags arrive as a comma-separated string from the modal UI — we split, trim,
  // and drop empties so blank tokens never persist.
  const performSave = async () => {
    if (!authUser || saving) return;
    const supabase = supabaseRef.current;
    if (!supabase) return;
    const name = saveName.trim() || 'Unbenannt';
    const tagsArray = saveTags
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const notesTrimmed = saveNotes.trim();
    setSaving(true);
    try {
      const { error } = await supabase.from('saved_patterns').insert({
        user_id: authUser.id,
        name,
        notation: cellsToNotation(pattern),
        bpm,
        handsatz: selectedHandsatz,
        subdivision,
        tags: tagsArray,
        notes: notesTrimmed.length > 0 ? notesTrimmed : null,
        is_public: false,
      });
      if (error) {
        showSaveToast('✗ Speichern fehlgeschlagen: ' + error.message, 'error');
      } else {
        showSaveToast('✓ Pattern gespeichert', 'success');
        setShowSaveModal(false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unbekannter Fehler';
      showSaveToast('✗ Speichern fehlgeschlagen: ' + msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ESC closes the modal; autofocus the name input when it opens.
  // We attach the keydown to window (not the card) so ESC works regardless of focus.
  useEffect(() => {
    if (!showSaveModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) setShowSaveModal(false);
    };
    window.addEventListener('keydown', onKey);
    // Defer focus so the modal is in the DOM before we focus it.
    const t = setTimeout(() => saveNameInputRef.current?.focus(), 30);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(t);
    };
  }, [showSaveModal, saving]);

  // ───────── Step colors (per value 0..4) ─────────
  const getStepColor = (value: number): string => {
    const colors = [
      'rgba(122,112,96,0.1)',     // 0 Pause
      'rgba(213,204,184,0.35)',   // 1 gn
      'rgba(156,169,138,0.55)',   // 2 tonfeld
      'rgba(245,166,35,0.7)',     // 3 slap
      'rgba(245,237,216,0.95)',   // 4 ding
    ];
    return colors[value] ?? colors[0];
  };

  const getStepTextColor = (value: number): string => {
    const colors = [
      'var(--muted)',                // 0 Pause
      'rgba(213,204,184,0.95)',      // 1 gn
      'rgba(156,169,138,1)',         // 2 tonfeld
      'var(--amber)',                // 3 slap
      'var(--cream)',                // 4 ding
    ];
    return colors[value] ?? colors[0];
  };

  // Derived view — handsatz row, with `frei` rendered as muted dashes.
  const handsatzRow: (string)[] =
    handsatzPatterns[selectedHandsatz].pattern ??
    Array(stepCount).fill('—');

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{TOOL_CSS}</style>

      <main
        className="tool-page"
        style={{
          minHeight: '100vh',
          background: 'var(--black)',
          fontFamily: "var(--font-body)",
          padding: '40px 20px',
          color: 'var(--text)',
        }}
      >
        {/* Header */}
        <div style={{ maxWidth: '1400px', margin: '0 auto 40px', textAlign: 'center' }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 'clamp(36px, 6vw, 64px)',
              fontWeight: 400,
              letterSpacing: '-1px',
              color: 'var(--cream)',
              textTransform: 'uppercase',
              marginBottom: '16px',
              lineHeight: 1.0,
            }}
          >
            RHYTHM <span style={{ color: 'var(--amber)' }}>GYM</span> — <span style={{ color: 'var(--amber)' }}>HANDPAN</span>-MASCHINE
          </h1>
          <p
            style={{
              fontSize: '17px',
              color: 'var(--muted)',
              maxWidth: '720px',
              margin: '0 auto',
              lineHeight: 1.65,
              fontWeight: 300,
            }}
          >
            Baue dein Pattern. Klick durch Pause → Ghostnote → Tonfeld → Slap → Ding. Dann auf Play.
          </p>
        </div>

        {fromSource && (
          <div
            className="tool-loaded-banner"
            style={{
              maxWidth: 1400,
              margin: '0 auto 24px',
              padding: '12px 20px',
              background: 'var(--amber-dim, rgba(245,166,35,0.12))',
              border: '1px solid rgba(245,166,35,0.35)',
              borderRadius: 6,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 14,
                color: 'var(--text)',
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: 'var(--amber)',
                  marginRight: 10,
                }}
              >
                Geladen aus {FROM_LABELS[fromSource] ?? fromSource}
              </span>
              {fromLabel && <span style={{ color: 'var(--cream)', fontWeight: 500 }}>{fromLabel}</span>}
            </div>
            <Link
              href={`/${fromSource}`}
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: 'var(--muted)',
                textDecoration: 'none',
                borderBottom: '1px solid var(--border)',
                paddingBottom: 1,
              }}
            >
              ← zurück zu {FROM_LABELS[fromSource] ?? fromSource}
            </Link>
          </div>
        )}

        <div className="tool-page-cards" style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gap: '30px' }}>
          {/* ───────── Pattern Builder ───────── */}
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '32px',
            }}
          >
            <div
              className="tool-page-builder-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '28px',
                gap: '16px',
                flexWrap: 'wrap',
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: '26px',
                  color: 'var(--cream)',
                  margin: 0,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}
              >
                Rhythmus &amp; Handsatz
              </h2>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={resetPattern}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--warm)',
                    padding: '10px 20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontFamily: "var(--font-ui)",
                    fontWeight: 700,
                    fontSize: '13px',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <RotateCcw size={16} />
                  Reset
                </button>
                <button
                  onClick={copyPattern}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--amber)',
                    padding: '10px 20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontFamily: "var(--font-ui)",
                    fontWeight: 700,
                    fontSize: '13px',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Copy size={16} />
                  Kopieren
                </button>
                {authUser && (
                  <button
                    onClick={openSaveModal}
                    disabled={saving}
                    aria-label="Pattern speichern"
                    className="tool-page-save-btn"
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--amber)',
                      color: 'var(--amber)',
                      padding: '10px 20px',
                      borderRadius: '4px',
                      cursor: saving ? 'wait' : 'pointer',
                      fontFamily: "var(--font-ui)",
                      fontWeight: 700,
                      fontSize: '13px',
                      letterSpacing: '2px',
                      textTransform: 'uppercase',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      opacity: saving ? 0.6 : 1,
                      transition: 'background 0.15s, color 0.15s',
                    }}
                  >
                    {saving ? (
                      <span
                        aria-hidden
                        style={{
                          width: 14,
                          height: 14,
                          border: '2px solid var(--amber)',
                          borderTopColor: 'transparent',
                          borderRadius: '50%',
                          display: 'inline-block',
                          animation: 'tool-page-spin 0.8s linear infinite',
                        }}
                      />
                    ) : (
                      <Save size={16} />
                    )}
                    Speichern
                  </button>
                )}
              </div>
            </div>

            {/* Play + BPM — sticky, inline an der Spitze des Rhythmus-Bereichs */}
            <div
              className="tool-page-playbar"
              style={{
                position: 'sticky',
                top: 75,
                zIndex: 50,
                background: 'rgba(28,26,20,0.92)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '12px 18px',
                marginBottom: '28px',
              }}
            >
              <div className="tool-page-playbar-row">
                <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                  <button
                    onClick={togglePlayback}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: isPlaying
                        ? 'linear-gradient(135deg, var(--warm) 0%, #E55A2B 100%)'
                        : 'linear-gradient(135deg, var(--amber) 0%, var(--amber2) 100%)',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                      color: 'var(--black)',
                      flexShrink: 0,
                    }}
                  >
                    {isPlaying ? <Pause size={20} color="var(--black)" /> : <Play size={20} color="var(--black)" />}
                  </button>
                  <button
                    onClick={stopPlayback}
                    aria-label="Stop"
                    style={{
                      width: '40px',
                      height: '48px',
                      borderRadius: '6px',
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--muted)',
                      flexShrink: 0,
                    }}
                  >
                    <Square size={16} />
                  </button>
                </div>

                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '2px',
                      textTransform: 'uppercase',
                      color: 'var(--muted)',
                      flexShrink: 0,
                    }}
                  >
                    Tempo
                  </span>
                  <input
                    type="range"
                    min={20}
                    max={240}
                    value={bpm}
                    onChange={(e) => updateBPM(parseInt(e.target.value, 10))}
                    aria-label="Tempo in BPM"
                    style={{
                      flex: 1,
                      height: '4px',
                      borderRadius: '2px',
                      background: 'linear-gradient(90deg, var(--amber-dim) 0%, var(--amber) 100%)',
                      outline: 'none',
                      cursor: 'pointer',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: '22px',
                      color: 'var(--cream)',
                      letterSpacing: '0.5px',
                      minWidth: 70,
                      textAlign: 'right',
                      flexShrink: 0,
                    }}
                  >
                    {bpm}<span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: 3, fontFamily: "var(--font-ui)", letterSpacing: '1.5px' }}>BPM</span>
                  </span>
                </div>

                <div className="tool-page-bpm-presets" style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  {[60, 90, 120, 160, 200].map((presetBpm) => {
                    const isActive = bpm === presetBpm;
                    return (
                      <button
                        key={presetBpm}
                        onClick={() => updateBPM(presetBpm)}
                        style={{
                          background: isActive ? 'var(--amber-dim)' : 'transparent',
                          border: `1px solid ${isActive ? 'var(--amber)' : 'var(--border)'}`,
                          borderRadius: '3px',
                          padding: '5px 9px',
                          cursor: 'pointer',
                          color: isActive ? 'var(--amber)' : 'var(--muted)',
                          fontFamily: "var(--font-ui)",
                          fontWeight: 700,
                          fontSize: '11px',
                          letterSpacing: '1px',
                        }}
                      >
                        {presetBpm}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Beats × Unterteilung — ersetzt die rohe Schritt-Anzahl:
                  erst Schläge (2–9), dann Unterteilung; Felder = Schläge × Unterteilung. */}
              <div
                className="tool-page-stepcount"
                style={{
                  marginTop: '10px',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div className="tool-page-axis-row">
                  <span className="tool-page-axis-label">Schläge</span>
                  <div className="tool-page-stepcount-chips">
                    {Array.from({ length: MAX_BEATS - MIN_BEATS + 1 }, (_, i) => MIN_BEATS + i).map((n) => {
                      const isActive = activeBeats === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setBeatsAndResize(n)}
                          aria-pressed={isActive}
                          className="tool-page-axis-chip"
                          style={{
                            background: isActive ? 'var(--amber-dim)' : 'transparent',
                            borderColor: isActive ? 'var(--amber)' : 'var(--border)',
                            color: isActive ? 'var(--amber)' : 'var(--muted)',
                          }}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="tool-page-axis-row">
                  <span className="tool-page-axis-label">Unterteilung</span>
                  <div className="tool-page-stepcount-chips">
                    {SUBDIVISION_CHOICES.map(({ key, label, perBeat }) => {
                      const isActive = subdivision === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSubdivisionAndResize(key)}
                          aria-pressed={isActive}
                          className="tool-page-axis-chip tool-page-axis-chip-wide"
                          style={{
                            background: isActive ? 'var(--amber-dim)' : 'transparent',
                            borderColor: isActive ? 'var(--amber)' : 'var(--border)',
                            color: isActive ? 'var(--amber)' : 'var(--muted)',
                          }}
                        >
                          {label}
                          <span className="tool-page-axis-chip-sub">{perBeat}/Schlag</span>
                        </button>
                      );
                    })}
                    <span className="tool-page-grid-hint" aria-live="polite">= {stepCount} Felder</span>
                  </div>
                </div>
              </div>

              {/* Metronom + Sub-Klick — gedämpft */}
              <div
                style={{
                  marginTop: '10px',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  gap: '10px',
                  justifyContent: 'flex-end',
                  flexWrap: 'wrap',
                  opacity: 0.75,
                }}
              >
                <button
                  onClick={() => setMetronomeEnabled(!metronomeEnabled)}
                  aria-pressed={metronomeEnabled}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${metronomeEnabled ? 'var(--border2)' : 'transparent'}`,
                    borderRadius: '3px',
                    padding: '4px 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Volume2 size={11} color={metronomeEnabled ? 'var(--muted2)' : 'var(--border2)'} />
                  <span
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: '10px',
                      fontWeight: 600,
                      letterSpacing: '1.5px',
                      textTransform: 'uppercase',
                      color: metronomeEnabled ? 'var(--muted2)' : 'var(--muted)',
                    }}
                  >
                    Metronom
                  </span>
                </button>
                <button
                  onClick={() => setSubdivisionsEnabled(!subdivisionsEnabled)}
                  aria-pressed={subdivisionsEnabled}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${subdivisionsEnabled ? 'var(--border2)' : 'transparent'}`,
                    borderRadius: '3px',
                    padding: '4px 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Volume2 size={11} color={subdivisionsEnabled ? 'var(--muted2)' : 'var(--border2)'} />
                  <span
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: '10px',
                      fontWeight: 600,
                      letterSpacing: '1.5px',
                      textTransform: 'uppercase',
                      color: subdivisionsEnabled ? 'var(--muted2)' : 'var(--muted)',
                    }}
                  >
                    Sub-Klick
                  </span>
                </button>
                <button
                  onClick={() => setShowMixer(true)}
                  aria-haspopup="dialog"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border2)',
                    borderRadius: '3px',
                    padding: '4px 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <SlidersHorizontal size={11} color="var(--amber)" />
                  <span
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: '10px',
                      fontWeight: 600,
                      letterSpacing: '1.5px',
                      textTransform: 'uppercase',
                      color: 'var(--muted2)',
                    }}
                  >
                    Lautstärke
                  </span>
                </button>
              </div>
            </div>

            {/* Handpan-Visualisierung — top-down view, glows synchron zum Sequencer.
                Vorübergehend ausgeblendet via SHOW_HANDPAN_VISUALIZER (s. oben). */}
            {SHOW_HANDPAN_VISUALIZER && (
              <div
                style={{
                  marginBottom: '20px',
                  display: 'flex',
                  justifyContent: 'center',
                  padding: '8px 0',
                }}
              >
                <HandpanVisualizer
                  pattern={pattern}
                  currentStep={currentStep}
                  handsatzRow={handsatzRow}
                  isPlaying={isPlaying}
                />
              </div>
            )}

            {/* Counting + Grid wrapper — switches to 2 rows of 8 on mobile */}
            <div className="tool-page-grid-wrapper">
              {/* Counting */}
              <div
                className="tool-page-counting"
                style={{
                  display: 'grid',
                  gap: '4px',
                  marginBottom: '12px',
                  ['--step-cols' as string]: String(cellsPerRow),
                }}
              >
                {counting.map((count, idx) => {
                  const isMain = idx % beatStride === 0;
                  return (
                    <div
                      key={idx}
                      style={{
                        textAlign: 'center',
                        fontSize: isMain ? '18px' : '13px',
                        color: isMain ? 'var(--amber)' : 'var(--muted)',
                        fontWeight: isMain ? 700 : 400,
                        fontFamily: "'Courier New', monospace",
                      }}
                    >
                      {count}
                    </div>
                  );
                })}
              </div>

              {/* Pattern Grid */}
              <div
                className="tool-page-pattern"
                style={{
                  display: 'grid',
                  gap: '4px',
                  marginBottom: '8px',
                  ['--step-cols' as string]: String(cellsPerRow),
                }}
              >
                {pattern.map((value, idx) => {
                  const isCurrentStep = idx === currentStep;
                  const isDownbeat = idx % beatStride === 0;
                  const symbol = symbols[value as StrikeIndex] ?? '.';
                  const cellBorder = isCurrentStep
                    ? '4px solid var(--amber)'
                    : `3px solid ${getStepTextColor(value)}`;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleStepClick(idx)}
                      role="button"
                      aria-label={`Step ${idx + 1}: ${symbolNames[value as StrikeIndex] ?? 'Pause'}`}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleStepClick(idx);
                        }
                      }}
                      style={{
                        height: '70px',
                        background: isCurrentStep
                          ? 'rgba(245,166,35,0.5)'
                          : getStepColor(value),
                        borderTop: cellBorder,
                        borderRight: cellBorder,
                        borderBottom: cellBorder,
                        borderLeft: isDownbeat ? '4px solid var(--amber)' : cellBorder,
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '30px',
                        fontWeight: 'bold',
                        color: getStepTextColor(value),
                        cursor: 'pointer',
                        fontFamily: "'Courier New', monospace",
                        transform: isCurrentStep ? 'scale(1.05)' : 'scale(1)',
                        boxShadow: isCurrentStep
                          ? '0 8px 24px rgba(245,166,35,0.6)'
                          : 'none',
                        transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                        userSelect: 'none',
                      }}
                    >
                      {symbol}
                    </div>
                  );
                })}
              </div>

              {/* Strike Legend — klein, unter dem Rhythmus (zwischen Pattern und Handsatz) */}
              <div className="tool-strike-legend">
                {symbols.map((symbol, idx) => (
                  <div key={idx} className="tool-strike-legend-item">
                    <span
                      className="tool-strike-legend-chip"
                      style={{
                        background: getStepColor(idx),
                        border: `1px solid ${getStepTextColor(idx)}`,
                        color: getStepTextColor(idx),
                      }}
                    >
                      {symbol}
                    </span>
                    <span className="tool-strike-legend-label">{symbolNames[idx]}</span>
                  </div>
                ))}
              </div>

              {/* Handsatz Visualization Row */}
              <div
                className="tool-page-handsatz-row"
                style={{
                  display: 'grid',
                  gap: '4px',
                  marginBottom: '28px',
                  ['--step-cols' as string]: String(cellsPerRow),
                }}
              >
                {handsatzRow.map((hand, idx) => {
                  const isActive = pattern[idx] > 0 && hand !== '—';
                  const isRight = hand === 'R';
                  const isLeft = hand === 'L';
                  const accentColor = isRight ? 'var(--warm)' : isLeft ? 'var(--amber)' : 'var(--muted)';
                  const accentBg = isRight
                    ? 'rgba(255,107,53,0.7)'
                    : isLeft
                    ? 'rgba(245,166,35,0.7)'
                    : 'transparent';
                  return (
                    <div
                      key={idx}
                      style={{
                        height: '40px',
                        background: isActive ? accentBg : 'transparent',
                        border: isActive
                          ? `2px solid ${accentColor}`
                          : '1px solid var(--border)',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: isActive ? accentColor : 'var(--muted)',
                        fontFamily: "'Courier New', monospace",
                      }}
                    >
                      {hand}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Handsatz-Auswahl — minimalistisch, Kurz-Labels, Mobile 3-spaltig */}
            <div style={{ marginBottom: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '10px',
                  fontFamily: "var(--font-ui)",
                  fontSize: '11px',
                  color: 'var(--muted)',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}
              >
                <Hand size={12} aria-hidden /> Handsatz
                <span style={{ color: 'var(--cream)' }}>· {handsatzPatterns[selectedHandsatz].name}</span>
              </div>
              <div className="tool-page-handsatz-chips">
                {(Object.entries(handsatzPatterns) as [HandsatzKey, { name: string; short: string }][]).map(
                  ([key, value]) => {
                    const isSelected = selectedHandsatz === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedHandsatz(key)}
                        aria-pressed={isSelected}
                        aria-label={value.name}
                        style={{
                          background: isSelected ? 'var(--amber-dim)' : 'transparent',
                          border: `1px solid ${isSelected ? 'var(--amber)' : 'var(--border)'}`,
                          color: isSelected ? 'var(--amber)' : 'var(--muted)',
                          padding: '8px 6px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontFamily: "var(--font-ui)",
                          fontWeight: 700,
                          fontSize: '12px',
                          letterSpacing: '1px',
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {value.short}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Presets — empty for now; pointer to /training */}
            <div>
              <h3
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: '13px',
                  color: 'var(--muted)',
                  marginBottom: '12px',
                  fontWeight: 700,
                  letterSpacing: '3px',
                  textTransform: 'uppercase',
                }}
              >
                Schnell-Presets
              </h3>
              {presetPatterns.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {presetPatterns.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => loadPreset(preset.pattern)}
                      style={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontFamily: "var(--font-ui)",
                        fontWeight: 600,
                        fontSize: '13px',
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    background: 'var(--black)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '20px',
                    flexWrap: 'wrap',
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: '14px',
                      color: 'var(--muted)',
                      lineHeight: 1.6,
                      fontWeight: 300,
                      maxWidth: '600px',
                    }}
                  >
                    Course-Presets findest du in der Training-Übersicht — wähle einen Tag, dann erscheint hier dein Pattern.
                  </p>
                  <Link
                    href="/training"
                    style={{
                      background: 'var(--amber)',
                      color: 'var(--black)',
                      padding: '12px 24px',
                      borderRadius: '2px',
                      fontFamily: "var(--font-ui)",
                      fontWeight: 700,
                      fontSize: '13px',
                      letterSpacing: '2px',
                      textTransform: 'uppercase',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    Zur Training-Übersicht →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* ───────── Info Box ───────── */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(245,166,35,0.06), rgba(255,107,53,0.03))',
              border: '1px solid rgba(245,166,35,0.2)',
              borderRadius: '8px',
              padding: '24px',
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: '13px',
                color: 'var(--amber)',
                marginBottom: '16px',
                fontWeight: 700,
                letterSpacing: '3px',
                textTransform: 'uppercase',
              }}
            >
              Handpan-Übungs-Begleitung
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--text)',
                    margin: '0 0 8px 0',
                    fontFamily: "var(--font-ui)",
                    fontWeight: 700,
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                  }}
                >
                  Strikes
                </p>
                <ul
                  style={{
                    fontSize: '13px',
                    color: 'var(--muted)',
                    lineHeight: 1.8,
                    margin: 0,
                    paddingLeft: '18px',
                    fontWeight: 300,
                  }}
                >
                  <li>
                    <strong style={{ color: 'rgba(213,204,184,0.95)' }}>g</strong> = Ghostnote (leiser Slap)
                  </li>
                  <li>
                    <strong style={{ color: 'rgba(156,169,138,1)' }}>T</strong> = Tonfeld (klingende Note)
                  </li>
                  <li>
                    <strong style={{ color: 'var(--amber)' }}>S</strong> = Slap (perkussiver Akzent)
                  </li>
                  <li>
                    <strong style={{ color: 'var(--cream)' }}>D</strong> = Ding (tiefer Bass-Akzent)
                  </li>
                </ul>
              </div>
              <div>
                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--text)',
                    margin: '0 0 8px 0',
                    fontFamily: "var(--font-ui)",
                    fontWeight: 700,
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                  }}
                >
                  Orientierung
                </p>
                <ul
                  style={{
                    fontSize: '13px',
                    color: 'var(--muted)',
                    lineHeight: 1.8,
                    margin: 0,
                    paddingLeft: '18px',
                    fontWeight: 300,
                  }}
                >
                  <li>
                    <strong style={{ color: 'var(--amber)' }}>Metronom</strong> = Woodblock auf 1, 2, 3, 4
                  </li>
                  <li>
                    <strong style={{ color: 'var(--cream)' }}>Sub-Klick</strong> = sehr leiser Pulse auf jedem 16tel
                  </li>
                </ul>
              </div>
            </div>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--muted)',
                margin: '20px 0 0 0',
                textAlign: 'center',
                fontStyle: 'italic',
                fontWeight: 300,
              }}
            >
              Klicke auf jeden Step, um zwischen Pause → Ghostnote → Tonfeld → Slap → Ding zu wechseln.
            </p>
          </div>
        </div>
        {/* Save Modal — replaces window.prompt() with proper multi-field UI.
            Renders at the end of <main> so it overlays everything else.
            z-index 200+ keeps it above the toast (100) and sticky bars. */}
        {showSaveModal && (
          <div
            className="tool-save-modal-overlay"
            role="presentation"
            onClick={(e) => {
              // Click on the backdrop (not children) dismisses the modal.
              if (e.target === e.currentTarget && !saving) setShowSaveModal(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="tool-save-modal-title"
              className="tool-save-modal-card"
            >
              <h2
                id="tool-save-modal-title"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '22px',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  color: 'var(--cream)',
                  margin: '0 0 18px 0',
                }}
              >
                Pattern speichern
              </h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!saving) void performSave();
                }}
              >
                <label className="tool-save-modal-field">
                  <span>Name</span>
                  <input
                    ref={saveNameInputRef}
                    type="text"
                    required
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    disabled={saving}
                    maxLength={120}
                  />
                </label>
                <label className="tool-save-modal-field">
                  <span>Tags (komma-getrennt, optional)</span>
                  <input
                    type="text"
                    value={saveTags}
                    onChange={(e) => setSaveTags(e.target.value)}
                    placeholder="groove, einfach"
                    disabled={saving}
                    maxLength={200}
                  />
                </label>
                <label className="tool-save-modal-field">
                  <span>Notizen (optional)</span>
                  <textarea
                    rows={3}
                    value={saveNotes}
                    onChange={(e) => setSaveNotes(e.target.value)}
                    disabled={saving}
                    maxLength={500}
                  />
                </label>
                <div className="tool-save-modal-actions">
                  <button
                    type="button"
                    onClick={() => { if (!saving) setShowSaveModal(false); }}
                    disabled={saving}
                    className="tool-save-modal-btn tool-save-modal-btn-cancel"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={saving || saveName.trim().length === 0}
                    className="tool-save-modal-btn tool-save-modal-btn-save"
                  >
                    {saving ? '… Speichern' : '💾 Speichern'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {showMixer && (
          <div
            className="tool-mixer-overlay"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowMixer(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="tool-mixer-title"
              className="tool-mixer-card"
            >
              <div className="tool-mixer-head">
                <div>
                  <h2 id="tool-mixer-title" className="tool-mixer-title">Lautstärke</h2>
                  <p className="tool-mixer-sub">Pegel je Sound anpassen</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMixer(false)}
                  aria-label="Schließen"
                  className="tool-mixer-close"
                >
                  <X size={18} />
                </button>
              </div>

              <div>
                {MIXER_ROWS.map(({ key, label, hint }) => {
                  const percent = volumes[key];
                  return (
                    <div key={key} className="tool-mixer-row">
                      <div className="tool-mixer-row-top">
                        <span className="tool-mixer-label">
                          {label}
                          <span className="tool-mixer-hint">{hint}</span>
                        </span>
                        <span className="tool-mixer-value">
                          {percent === 0 ? 'Aus' : `${percent}%`}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={percent}
                        onChange={(e) =>
                          setVolumes((prev) => ({ ...prev, [key]: parseInt(e.target.value, 10) }))
                        }
                        aria-label={`Lautstärke ${label}`}
                        className="tool-mixer-slider"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="tool-mixer-actions">
                <button
                  type="button"
                  onClick={() => setVolumes({ ...DEFAULT_VOLUMES })}
                  className="tool-mixer-btn tool-mixer-btn-reset"
                >
                  Zurücksetzen
                </button>
                <button
                  type="button"
                  onClick={() => setShowMixer(false)}
                  className="tool-mixer-btn tool-mixer-btn-done"
                >
                  Fertig
                </button>
              </div>
            </div>
          </div>
        )}
        {saveToast !== null && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: 'fixed',
              left: '50%',
              bottom: 24,
              transform: 'translateX(-50%)',
              zIndex: 100,
              background: 'rgba(28,26,20,0.96)',
              border: '1px solid var(--amber)',
              color: 'var(--cream)',
              padding: '12px 22px',
              borderRadius: '6px',
              fontFamily: "var(--font-ui)",
              fontWeight: 600,
              fontSize: '14px',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            {saveToast}
          </div>
        )}
      </main>
    </>
  );
}

export default function HandpanMaschinePage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--muted)',
            fontFamily: "var(--font-ui)",
            letterSpacing: 2,
            textTransform: 'uppercase',
            fontSize: 13,
          }}
        >
          Lade Handpan-Maschine …
        </main>
      }
    >
      <HandpanMaschineInner />
    </Suspense>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page-scoped CSS — slider thumb + responsive grid switch (desktop 16-col,
// mobile 2 rows of 8). Component-internal styles stay inline (matches the
// source's pattern).
// ─────────────────────────────────────────────────────────────────────────────
const TOOL_CSS = `
@keyframes tool-page-spin {
  to { transform: rotate(360deg); }
}
.tool-page-save-btn:hover:not(:disabled) {
  background: var(--amber) !important;
  color: var(--black) !important;
}

/* Save Modal — fullscreen overlay + centered card. z-index 200 keeps it above
   the sticky playbar (sticky:60) and the save toast (z:100). */
.tool-save-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0,0,0,0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  animation: tool-save-modal-fade 0.15s ease-out;
}
@keyframes tool-save-modal-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
.tool-save-modal-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 28px;
  max-width: 480px;
  width: calc(100% - 32px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.6);
  max-height: calc(100vh - 32px);
  overflow-y: auto;
}
.tool-save-modal-field {
  display: block;
  margin-bottom: 14px;
  font-family: var(--font-ui);
  font-size: 12px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 600;
}
.tool-save-modal-field span {
  display: block;
  margin-bottom: 6px;
}
.tool-save-modal-field input,
.tool-save-modal-field textarea {
  display: block;
  width: 100%;
  background: rgba(0,0,0,0.35);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 10px 12px;
  color: var(--cream);
  font-family: 'Barlow', var(--font-ui);
  font-size: 15px;
  letter-spacing: 0.5px;
  text-transform: none;
  font-weight: 400;
  box-sizing: border-box;
  transition: border-color 0.15s, background 0.15s;
}
.tool-save-modal-field textarea {
  resize: vertical;
  min-height: 70px;
  font-family: var(--font-body);
}
.tool-save-modal-field input:focus,
.tool-save-modal-field textarea:focus {
  outline: none;
  border-color: var(--amber);
  background: rgba(0,0,0,0.5);
}
.tool-save-modal-field input:disabled,
.tool-save-modal-field textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.tool-save-modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
  flex-wrap: wrap;
}
.tool-save-modal-btn {
  padding: 10px 20px;
  border-radius: 4px;
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 2px;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, opacity 0.15s;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted);
}
.tool-save-modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.tool-save-modal-btn-cancel:hover:not(:disabled) {
  background: rgba(255,255,255,0.06);
  color: var(--cream);
}
.tool-save-modal-btn-save {
  background: var(--amber);
  color: var(--black);
  border-color: var(--amber);
}
.tool-save-modal-btn-save:hover:not(:disabled) {
  background: var(--cream);
  border-color: var(--cream);
}
@media (max-width: 480px) {
  .tool-save-modal-card {
    padding: 20px;
  }
  .tool-save-modal-actions .tool-save-modal-btn {
    flex: 1;
    min-width: 0;
  }
}
.tool-page input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--amber);
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(245,166,35,0.5);
  border: 2px solid var(--black);
}
.tool-page input[type="range"]::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--amber);
  cursor: pointer;
  border: 2px solid var(--black);
  box-shadow: 0 4px 12px rgba(245,166,35,0.5);
}

/* Sound mixer popup — mirrors the save-modal shell, adds per-sound sliders.
   z-index 200 keeps it above the sticky playbar (60) and save toast (100). */
.tool-mixer-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0,0,0,0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  animation: tool-save-modal-fade 0.15s ease-out;
}
.tool-mixer-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 24px;
  max-width: 440px;
  width: calc(100% - 32px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.6);
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
}
.tool-mixer-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
}
.tool-mixer-title {
  font-family: var(--font-display);
  font-size: 22px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--cream);
  margin: 0;
}
.tool-mixer-sub {
  font-family: var(--font-ui);
  font-size: 12px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--muted);
  margin: 4px 0 0;
}
.tool-mixer-close {
  background: transparent;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: inline-flex;
  flex-shrink: 0;
  transition: color 0.15s, background 0.15s;
}
.tool-mixer-close:hover {
  color: var(--cream);
  background: rgba(255,255,255,0.06);
}
.tool-mixer-row {
  margin-bottom: 16px;
}
.tool-mixer-row-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 7px;
}
.tool-mixer-label {
  font-family: var(--font-ui);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--cream);
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.tool-mixer-hint {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 1px;
  color: var(--muted);
  text-transform: none;
}
.tool-mixer-value {
  font-family: var(--font-ui);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--amber);
  min-width: 42px;
  text-align: right;
  flex-shrink: 0;
}
.tool-mixer-slider {
  display: block;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--amber-dim) 0%, var(--amber) 100%);
  outline: none;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
}
.tool-mixer-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 22px;
  flex-wrap: wrap;
}
.tool-mixer-btn {
  padding: 10px 20px;
  border-radius: 4px;
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 2px;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted);
}
.tool-mixer-btn-reset:hover {
  background: rgba(255,255,255,0.06);
  color: var(--cream);
}
.tool-mixer-btn-done {
  background: var(--amber);
  color: var(--black);
  border-color: var(--amber);
}
.tool-mixer-btn-done:hover {
  background: var(--cream);
  border-color: var(--cream);
}
@media (max-width: 480px) {
  .tool-mixer-card {
    padding: 20px;
  }
  .tool-mixer-actions .tool-mixer-btn {
    flex: 1;
    min-width: 0;
  }
}

/* Sticky Playback-Bar — Play/Stop, Tempo, BPM-Presets in einer Zeile.
   Sticky am oberen Rand (top:60px = direkt unter der globalen Nav).        */
.tool-page-playbar-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 18px;
  align-items: center;
}

/* Mobile horizontal-overflow guard. Grid/flex items in the builder default to
   min-width:auto, so below ~500px the cards, the action-button row, and the
   tempo slider refuse to shrink below their content's min-content and push the
   page into ~90px of sideways scroll. These rules let them shrink to their
   track (and let the action buttons wrap). They are no-ops when there is room,
   so desktop layout is unaffected. */
.tool-page-cards > * {
  min-width: 0;
}
.tool-page-builder-header > div {
  flex-wrap: wrap;
  min-width: 0;
}
.tool-page-playbar-row > div,
.tool-page-playbar-row input[type='range'] {
  min-width: 0;
}

/* Handsatz-Chips — kompakte Kurzlabels. Desktop 6 Spalten, Mobile 3. */
.tool-page-handsatz-chips {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
}

/* Step-Count-Chips — Desktop alle 7 in einer Zeile, Mobile umbruch */
.tool-page-stepcount-chips {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}

/* Beats × Unterteilung axes — two labelled chip rows replacing the raw step count. */
.tool-page-axis-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.tool-page-axis-label {
  font-family: var(--font-ui);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--muted);
  min-width: 92px;
}
.tool-page-axis-chip {
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 5px 9px;
  cursor: pointer;
  font-family: var(--font-ui);
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 1px;
  min-width: 30px;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.tool-page-axis-chip-wide {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  min-width: 0;
}
.tool-page-axis-chip-sub {
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.5px;
  opacity: 0.7;
  text-transform: none;
}
.tool-page-grid-hint {
  align-self: center;
  font-family: var(--font-ui);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--muted2);
  margin-left: 6px;
}
@media (max-width: 480px) {
  .tool-page-axis-label {
    min-width: 100%;
    margin-bottom: 2px;
  }
}

/* Strike Legend (klein, unter dem Pattern) — fünf Chips mit Symbol + Name */
.tool-strike-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin: 12px 0 16px;
  padding: 8px 0;
  font-family: var(--font-ui);
  font-size: 11px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--muted);
  opacity: 0.85;
}
.tool-strike-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.tool-strike-legend-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  font-weight: bold;
  flex-shrink: 0;
}
.tool-strike-legend-label {
  font-weight: 600;
}

@media (max-width: 700px) {
  .tool-strike-legend {
    gap: 8px 10px;
    font-size: 10px;
    letter-spacing: 1px;
  }
  .tool-strike-legend-chip {
    width: 18px;
    height: 18px;
    font-size: 11px;
  }
}

.tool-page-counting,
.tool-page-pattern,
.tool-page-handsatz-row {
  /* --step-cols set inline on each row from React; default 16 keeps legacy look. */
  grid-template-columns: repeat(var(--step-cols, 16), 1fr);
}

@media (max-width: 700px) {
  .tool-page-playbar-row {
    grid-template-columns: auto 1fr;
    gap: 12px;
  }
  .tool-page-bpm-presets {
    grid-column: 1 / -1;
    justify-content: center;
  }
  .tool-page-handsatz-chips {
    grid-template-columns: repeat(3, 1fr);
  }
  .tool-page-counting,
  .tool-page-pattern,
  .tool-page-handsatz-row {
    /* On mobile, cap at 8 columns so 16-step patterns wrap into 2 rows.
       For variable patterns smaller than 8 (Bausteine 2/3/4/5/6/7), still
       honor their actual width via min(). CSS min() inside repeat() needs
       an integer — we fall back to plain 8 because the canonical 16-step
       case is the one that NEEDS wrapping; variable patterns just stay
       tighter. */
    grid-template-columns: repeat(min(var(--step-cols, 16), 8), 1fr);
  }
  .tool-page-pattern > div {
    height: 56px !important;
    font-size: 24px !important;
  }
  .tool-page-handsatz-row > div {
    height: 32px !important;
    font-size: 14px !important;
  }
}

@media (max-width: 480px) {
  /* Stack the playbar at phone widths so the tempo slider keeps a usable,
     full-width line instead of being crushed to a few px beside Play/Stop
     and the BPM readout. Must come after the max-width:700px block so it wins
     the cascade (same specificity → source order decides). */
  .tool-page-playbar-row {
    grid-template-columns: 1fr;
    gap: 14px;
  }
}
`;
