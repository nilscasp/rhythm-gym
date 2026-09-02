'use client';

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useOptimistic,
  useTransition,
} from 'react';
import * as Tone from 'tone';
import { Check, Play, Square } from 'lucide-react';
import Link from 'next/link';
import {
  days,
  constants,
  counting16,
  FIRST_DAY,
  type CourseDay,
  type CoursePattern,
  type PatternEvent,
  type Strike,
  type Hand,
  type Kombi,
  type DayOption,
} from '../../../../data/course-patterns';
import { toggleCompletionAction } from './_actions';

// ─────────────────────────────────────────────────────────────────────────────
// Abhak-UI types
// ExerciseLite is the minimal shape we read from the `exercises` table —
// enough to drive the (day_number, kind, matchKey) → exercise_id lookup.
// ─────────────────────────────────────────────────────────────────────────────
export type ExerciseLite = {
  id: string;
  kind: string;
  day_number: number | null;
  position: number;
  /** jsonb — narrowed at runtime via small helpers below. */
  pattern_data: unknown;
};

export type RhythmusfundamentClientProps = {
  exercises: ExerciseLite[];
  initialCompletedIds: string[];
  /**
   * Drip-Unlock: höchste freigeschaltete Tagesnummer (serverseitig berechnet
   * in app/lib/course-access.ts). Tage darüber erscheinen nicht in der
   * Tages-Navigation. Pflicht — kein Default, damit kein Aufrufer versehentlich
   * alles öffnet.
   */
  maxUnlockedDay: number;
};

// Lookup key shape: `${day_number}::${kind}::${matchKey}`.
// matchKey resolves per `kind`:
//   pattern  → pattern_data.pattern_id  (e.g. 'basis', 'stufe_1_perkussiv')
//   kombi    → pattern_data.name        (Kombi display name)
//   spielweg → pattern_data.option_id   (e.g. 'spielweg_a')
type LookupKey = string;

function lookupKeyFromExercise(ex: ExerciseLite): LookupKey | null {
  if (ex.day_number === null) return null;
  const pd =
    ex.pattern_data && typeof ex.pattern_data === 'object'
      ? (ex.pattern_data as Record<string, unknown>)
      : null;
  if (!pd) return null;

  let matchKey: string | null = null;
  if (ex.kind === 'pattern') {
    const v = pd['pattern_id'];
    matchKey = typeof v === 'string' ? v : null;
  } else if (ex.kind === 'kombi') {
    const v = pd['name'];
    matchKey = typeof v === 'string' ? v : null;
  } else if (ex.kind === 'spielweg') {
    const v = pd['option_id'];
    matchKey = typeof v === 'string' ? v : null;
  }
  if (!matchKey) return null;
  return `${ex.day_number}::${ex.kind}::${matchKey}`;
}

function buildLookupKey(
  dayNumber: number,
  kind: 'pattern' | 'kombi' | 'spielweg',
  matchKey: string
): LookupKey {
  return `${dayNumber}::${kind}::${matchKey}`;
}

// useOptimistic reducer payload — flip the boolean for a given exerciseId.
type OptimisticToggle = { exerciseId: string; nextChecked: boolean };

function optimisticReducer(
  current: ReadonlySet<string>,
  patch: OptimisticToggle
): ReadonlySet<string> {
  const next = new Set(current);
  if (patch.nextChecked) {
    next.add(patch.exerciseId);
  } else {
    next.delete(patch.exerciseId);
  }
  return next;
}

// ─────────────────────────────────────────────────────────────────────────────
// /training — Tag-12-bis-22 Trainings-Übersicht (Closed Beta).
// One page, one Tone.js engine, six synths. Pattern-Events flow through a
// ref so that Sequence-internal step callbacks always see the latest pattern
// without restarting Tone.Transport.
//
// Design tokens: app/globals.css   ·   Pattern data: data/course-patterns.ts
// Audio engine reference: app/tool/page.tsx (Handpan-Maschine).
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Audio types — mirror /tool exactly so the synth shapes are interchangeable.
// ─────────────────────────────────────────────────────────────────────────────
type SynthMap = {
  gn: Tone.NoiseSynth | null;
  tonfeld: Tone.PluckSynth | null;
  slap: Tone.NoiseSynth | null;
  ding: Tone.MembraneSynth | null;
  subPulse: Tone.NoiseSynth | null;
  metronome: Tone.Synth | null;
};

// Strike → cell visual config. Background uses the JSON colors with the
// alpha values dictated by the spec; foreground stays readable in both
// dark-block and bright-amber states.
const STRIKE_VISUAL: Record<
  Strike,
  { bg: string; color: string; label: string }
> = {
  ding: {
    bg: 'rgba(139, 69, 19, 0.7)',
    color: 'var(--cream)',
    label: 'D',
  },
  slap: {
    bg: 'rgba(245, 166, 35, 0.85)',
    color: 'var(--black)',
    label: 'S',
  },
  tonfeld: {
    bg: 'rgba(156, 169, 138, 0.7)',
    color: 'var(--cream)',
    label: 'T',
  },
  gn: {
    bg: 'rgba(213, 204, 184, 0.25)',
    color: 'var(--muted)',
    label: 'g',
  },
};

const BPM_PRESETS = [40, 60, 80, 100] as const;
const BPM_MIN = 40;
const BPM_MAX = 120;
const BPM_DEFAULT = 60;

export function RhythmusfundamentClient({
  exercises,
  initialCompletedIds,
  maxUnlockedDay,
}: RhythmusfundamentClientProps) {
  // ───────── Day selection ─────────
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(FIRST_DAY);
  const visibleDays = useMemo(
    () => days.filter((d) => d.number <= maxUnlockedDay),
    [maxUnlockedDay]
  );

  const day: CourseDay | undefined = useMemo(
    () => days.find((d) => d.number === selectedDayNumber),
    [selectedDayNumber]
  );

  // ───────── Abhak-UI: lookup + optimistic state ─────────
  // Build `${day_number}::${kind}::${matchKey}` → exercise_id once per
  // exercises change. The list is seeded at request time and only flips when
  // revalidatePath() forces a server re-render, so this Map stays stable
  // across the user's interactions.
  const exerciseLookup: ReadonlyMap<LookupKey, string> = useMemo(() => {
    const m = new Map<LookupKey, string>();
    for (const ex of exercises) {
      const key = lookupKeyFromExercise(ex);
      if (key) m.set(key, ex.id);
    }
    return m;
  }, [exercises]);

  // Day-scoped exercise-id sets, so the sidebar + day-header can compute
  // "X von Y abgehakt" without re-walking the whole exercises list each row.
  const exerciseIdsByDay: ReadonlyMap<number, ReadonlySet<string>> = useMemo(() => {
    const m = new Map<number, Set<string>>();
    for (const ex of exercises) {
      if (ex.day_number === null) continue;
      const key = lookupKeyFromExercise(ex);
      if (!key) continue;
      const bucket = m.get(ex.day_number) ?? new Set<string>();
      bucket.add(ex.id);
      m.set(ex.day_number, bucket);
    }
    return m;
  }, [exercises]);

  const initialCompletedSet: ReadonlySet<string> = useMemo(
    () => new Set(initialCompletedIds),
    [initialCompletedIds]
  );

  const [completedSet, addOptimistic] = useOptimistic<
    ReadonlySet<string>,
    OptimisticToggle
  >(initialCompletedSet, optimisticReducer);

  // React's `useOptimistic` requires its dispatch to happen inside a
  // transition. `useTransition` returns a `startTransition` whose pending flag
  // we currently don't surface (the optimistic flip is the visible feedback);
  // we keep the hook for the upgrade path where a spinner or aria-busy might
  // hang off `isPending`.
  const [, startToggleTransition] = useTransition();

  const toggleCompletion = useCallback(
    (exerciseId: string) => {
      const nextChecked = !completedSet.has(exerciseId);
      const fd = new FormData();
      fd.append('exercise_id', exerciseId);

      startToggleTransition(() => {
        addOptimistic({ exerciseId, nextChecked });
        void toggleCompletionAction(fd);
      });
    },
    [completedSet, addOptimistic]
  );

  // ───────── Playback state ─────────
  // null when no pattern is active. We track BOTH id and the day it lives on
  // so a click on Tag 13 -> "basis" doesn't collide with Tag 12 -> "basis".
  const [playingPatternId, setPlayingPatternId] = useState<string | null>(null);
  const [playingDayNumber, setPlayingDayNumber] = useState<number | null>(null);
  const [bpm, setBpm] = useState<number>(BPM_DEFAULT);
  const [metronomeEnabled, setMetronomeEnabled] = useState<boolean>(false);
  const [isAudioInitialized, setIsAudioInitialized] = useState<boolean>(false);

  // Most-recently-played reference, so Spacebar can resume after stop.
  const [lastPlayedKey, setLastPlayedKey] = useState<{
    dayNumber: number;
    patternId: string;
  } | null>(null);

  // ───────── Refs (Sequence-thread state) ─────────
  const sequenceRef = useRef<Tone.Sequence | null>(null);
  const synthsRef = useRef<SynthMap>({
    gn: null,
    tonfeld: null,
    slap: null,
    ding: null,
    subPulse: null,
    metronome: null,
  });

  // Refs read by Sequence callback every tick. Updates here do NOT restart
  // the loop — the only way to keep the audio thread accurate while react
  // state evolves. (Same pattern used in /tool.)
  const playingPatternEventsRef = useRef<PatternEvent[] | null>(null);
  const bpmRef = useRef<number>(BPM_DEFAULT);
  const metronomeEnabledRef = useRef<boolean>(false);

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);
  useEffect(() => {
    metronomeEnabledRef.current = metronomeEnabled;
  }, [metronomeEnabled]);

  // ───────── Audio init (gated on first user gesture) ─────────
  const initializeAudio = useCallback(async () => {
    if (isAudioInitialized) return;
    try {
      await Tone.start();

      const gn = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.025, sustain: 0, release: 0.02 },
      }).toDestination();
      gn.volume.value = -22;
      synthsRef.current.gn = gn;

      // PluckSynth — `triggerAttackRelease` is the 4-arg form that exposes
      // velocity. The 2-arg `triggerAttack` would type-error in TS strict.
      // V1: every tonfeld at A4. Future versions derive pitch from the
      // selected handpan-scale per day.
      const tonfeld = new Tone.PluckSynth({
        attackNoise: 0.4,
        dampening: 4500,
        resonance: 0.7,
      }).toDestination();
      tonfeld.volume.value = -10;
      synthsRef.current.tonfeld = tonfeld;

      const slap = new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.05 },
      }).toDestination();
      slap.volume.value = -10;
      synthsRef.current.slap = slap;

      const ding = new Tone.MembraneSynth({
        pitchDecay: 0.12,
        octaves: 4,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.45, sustain: 0, release: 0.4 },
      }).toDestination();
      ding.volume.value = -6;
      synthsRef.current.ding = ding;

      // subPulse stays available for future per-16th sub-clicks. /training
      // course patterns embed their own gn ghostnotes, so subPulse is wired
      // up but not triggered.
      const subPulse = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.012, sustain: 0, release: 0.012 },
      }).toDestination();
      subPulse.volume.value = -28;
      synthsRef.current.subPulse = subPulse;

      const metronome = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
      }).toDestination();
      metronome.volume.value = -15;
      synthsRef.current.metronome = metronome;

      setIsAudioInitialized(true);
    } catch (error) {
      // AudioContext blocked by browser policy. Surface loudly, leave
      // isAudioInitialized = false so the next user click retries.
      console.error('Audio initialization error:', error);
    }
  }, [isAudioInitialized]);

  // ───────── Stop / start ─────────
  const stopPlayback = useCallback(() => {
    if (sequenceRef.current) {
      sequenceRef.current.stop();
      sequenceRef.current.dispose();
      sequenceRef.current = null;
    }
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    playingPatternEventsRef.current = null;
    setPlayingPatternId(null);
    setPlayingDayNumber(null);
  }, []);

  const startPlayback = useCallback((events: PatternEvent[]) => {
    Tone.Transport.bpm.value = bpmRef.current;
    playingPatternEventsRef.current = events;

    sequenceRef.current = new Tone.Sequence(
      (time, step) => {
        const eventList = playingPatternEventsRef.current;
        const synths = synthsRef.current;
        const metronomeOn = metronomeEnabledRef.current;

        if (eventList) {
          // Match event by position to current step. position is 0..15.
          const ev = eventList.find((e) => e.position === step);
          if (ev) {
            switch (ev.strike) {
              case 'gn':
                if (synths.gn) {
                  synths.gn.triggerAttackRelease('32n', time, 0.7);
                }
                break;
              case 'tonfeld':
                if (synths.tonfeld) {
                  // PluckSynth TS only types triggerAttack(note, time). Use
                  // triggerAttackRelease for the 4-arg form — same workaround
                  // as /tool. Future versions will pick pitch by scale.
                  synths.tonfeld.triggerAttackRelease(
                    'A4',
                    '16n',
                    time,
                    0.85
                  );
                }
                break;
              case 'slap':
                if (synths.slap) {
                  synths.slap.triggerAttackRelease('16n', time, 0.85);
                }
                break;
              case 'ding':
                if (synths.ding) {
                  synths.ding.triggerAttackRelease('C2', '8n', time, 0.95);
                }
                break;
              default:
                // Strike type didn't match — leave silent rather than throw
                // inside the audio thread. New strike kinds in JSON should
                // surface here as a console warning instead of a crash.
                console.warn('Unknown strike type:', ev.strike);
            }
          }
        }

        if (metronomeOn && step % 4 === 0 && synths.metronome) {
          synths.metronome.triggerAttackRelease('C6', '32n', time, 0.3);
        }
      },
      [...Array(16).keys()],
      '16n'
    );

    sequenceRef.current.start(0);
    Tone.Transport.start();
  }, []);

  const playPattern = useCallback(
    async (dayNumber: number, pattern: CoursePattern) => {
      if (!isAudioInitialized) await initializeAudio();

      // If the same pattern is currently playing, treat as a stop.
      if (
        playingPatternId === pattern.id &&
        playingDayNumber === dayNumber
      ) {
        stopPlayback();
        return;
      }

      // Different pattern (same or different day) — stop any running
      // sequence first, then start the new one.
      if (sequenceRef.current) {
        sequenceRef.current.stop();
        sequenceRef.current.dispose();
        sequenceRef.current = null;
        Tone.Transport.stop();
        Tone.Transport.position = 0;
      }

      startPlayback(pattern.events);
      setPlayingPatternId(pattern.id);
      setPlayingDayNumber(dayNumber);
      setLastPlayedKey({ dayNumber, patternId: pattern.id });
    },
    [
      isAudioInitialized,
      initializeAudio,
      playingPatternId,
      playingDayNumber,
      startPlayback,
      stopPlayback,
    ]
  );

  // BPM updates while playing must not restart the sequence.
  const updateBpm = useCallback(
    (next: number) => {
      const clamped = Math.min(BPM_MAX, Math.max(BPM_MIN, next));
      setBpm(clamped);
      if (sequenceRef.current) {
        Tone.Transport.bpm.value = clamped;
      }
    },
    []
  );

  // ───────── Day-switch side effects ─────────
  // Switching days stops any currently playing pattern. Done as an effect
  // so that callers (sidebar + mobile strip) only need to setSelectedDayNumber.
  useEffect(() => {
    if (sequenceRef.current) {
      sequenceRef.current.stop();
      sequenceRef.current.dispose();
      sequenceRef.current = null;
      Tone.Transport.stop();
      Tone.Transport.position = 0;
      playingPatternEventsRef.current = null;
      setPlayingPatternId(null);
      setPlayingDayNumber(null);
    }
    // We intentionally don't depend on stopPlayback here — we only want to
    // run on a true day change, not whenever stopPlayback's identity shifts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDayNumber]);

  // ───────── Cleanup on unmount ─────────
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

  // ───────── Spacebar shortcut ─────────
  // Toggle the currently-playing pattern, or restart the most-recent if
  // nothing is playing. Capture only when no input/textarea/select is
  // focused — otherwise typing into the BPM box would steal the gesture.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      const t = e.target as HTMLElement | null;
      if (t) {
        const tag = t.tagName;
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          t.isContentEditable
        ) {
          return;
        }
      }
      e.preventDefault();

      if (playingPatternId !== null && playingDayNumber !== null) {
        stopPlayback();
        return;
      }
      if (lastPlayedKey) {
        const lastDay = days.find(
          (d) => d.number === lastPlayedKey.dayNumber
        );
        if (!lastDay) return;
        const pat = lastDay.patterns.find(
          (p) => p.id === lastPlayedKey.patternId
        );
        if (!pat) return;
        // Switch day display if needed, then play.
        if (selectedDayNumber !== lastPlayedKey.dayNumber) {
          setSelectedDayNumber(lastPlayedKey.dayNumber);
        }
        // Fire-and-forget — playPattern is async but doesn't need awaiting.
        void playPattern(lastPlayedKey.dayNumber, pat);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    playingPatternId,
    playingDayNumber,
    lastPlayedKey,
    selectedDayNumber,
    stopPlayback,
    playPattern,
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{TRN_CSS}</style>

      <main className="trn-page">
        {/* ───────── Sidebar ───────── */}
        <aside className="trn-sidebar">
          <div className="trn-sidebar-head">
            <div className="trn-eyebrow">Rhythmus-Fundament</div>
            <div className="trn-cycle-title">Zyklus 2 · Fill-Ins und Breaks</div>
          </div>

          <nav className="trn-day-list" aria-label="Tag wählen">
            {visibleDays.map((d) => {
              const isActive = d.number === selectedDayNumber;
              const dayExerciseIds = exerciseIdsByDay.get(d.number);
              const total = dayExerciseIds?.size ?? 0;
              let done = 0;
              if (dayExerciseIds) {
                for (const id of dayExerciseIds) {
                  if (completedSet.has(id)) done++;
                }
              }
              return (
                <button
                  key={d.number}
                  type="button"
                  className={
                    isActive ? 'trn-day-btn trn-day-btn--active' : 'trn-day-btn'
                  }
                  onClick={() => setSelectedDayNumber(d.number)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="trn-day-num">Tag {d.number}</span>
                  <span className="trn-day-title">{d.title}</span>
                  {total > 0 ? (
                    <span className="trn-day-progress">
                      {done} von {total} abgehakt
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="trn-sidebar-foot">
            <div className="trn-foot-line">Closed Beta · Feedback an</div>
            <a
              className="trn-foot-mail"
              href="mailto:kontakt@nilscaspar.de"
            >
              kontakt@nilscaspar.de
            </a>
          </div>
        </aside>

        {/* ───────── Day Detail ───────── */}
        <section className="trn-detail">
          {!day ? (
            <div className="trn-empty">
              <p>Tag {selectedDayNumber} nicht gefunden.</p>
              <Link href="/" className="trn-back-link">
                Zurück zur Startseite
              </Link>
            </div>
          ) : (
            <>
              {/* Header */}
              <header className="trn-day-header">
                <div className="trn-tag-num">TAG {day.number}</div>
                <h1 className="trn-day-title-h1">{day.title}</h1>
                {day.subtitle ? (
                  <p className="trn-day-subtitle">{day.subtitle}</p>
                ) : null}
                {day.summary ? (
                  <p className="trn-day-summary">{day.summary}</p>
                ) : null}

                {/* Metadata chips */}
                <div className="trn-meta-row">
                  <span className="trn-chip trn-chip--meta">
                    Handsatz ·{' '}
                    {constants.hand_pattern_types[day.handsatz]?.label ??
                      day.handsatz}
                  </span>
                  {day.focus_takt !== null ? (
                    <span className="trn-chip trn-chip--meta">
                      Fokus auf Takt {day.focus_takt}
                    </span>
                  ) : null}
                </div>

                {/* Per-day progress (matches sidebar pill) */}
                {(() => {
                  const dayIds = exerciseIdsByDay.get(day.number);
                  if (!dayIds || dayIds.size === 0) return null;
                  let done = 0;
                  for (const id of dayIds) {
                    if (completedSet.has(id)) done++;
                  }
                  return (
                    <p className="trn-day-progress trn-day-progress--header">
                      {done} von {dayIds.size} abgehakt
                    </p>
                  );
                })()}
              </header>

              {/* BPM controls (sticky on desktop) */}
              <div className="trn-bpm-bar">
                <div className="trn-bpm-row">
                  <div className="trn-bpm-display">
                    <span className="trn-bpm-label">Tempo</span>
                    <span className="trn-bpm-value">{bpm} BPM</span>
                  </div>
                  <input
                    type="range"
                    min={BPM_MIN}
                    max={BPM_MAX}
                    value={bpm}
                    onChange={(e) =>
                      updateBpm(parseInt(e.target.value, 10))
                    }
                    aria-label="Tempo in BPM"
                    className="trn-bpm-slider"
                  />
                  <div className="trn-bpm-presets">
                    {BPM_PRESETS.map((p) => {
                      const isActive = bpm === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => updateBpm(p)}
                          className={
                            isActive
                              ? 'trn-bpm-preset trn-bpm-preset--active'
                              : 'trn-bpm-preset'
                          }
                          aria-pressed={isActive}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="trn-bpm-row trn-bpm-row--secondary">
                  <button
                    type="button"
                    onClick={() => setMetronomeEnabled((v) => !v)}
                    aria-pressed={metronomeEnabled}
                    className={
                      metronomeEnabled
                        ? 'trn-toggle trn-toggle--on'
                        : 'trn-toggle'
                    }
                  >
                    Metronom {metronomeEnabled ? 'an' : 'aus'}
                  </button>
                  <span className="trn-shortcut-hint">
                    Stop läuft auf Spacebar
                  </span>
                </div>
              </div>

              {/* Patterns */}
              <div className="trn-section">
                <h2 className="trn-section-title">Patterns</h2>
                <div className="trn-pattern-list">
                  {day.patterns.map((p) => {
                    const isPlaying =
                      playingPatternId === p.id &&
                      playingDayNumber === day.number;
                    const exId = exerciseLookup.get(
                      buildLookupKey(day.number, 'pattern', p.id)
                    );
                    return (
                      <PatternCard
                        key={p.id}
                        pattern={p}
                        isPlaying={isPlaying}
                        onTogglePlay={() => playPattern(day.number, p)}
                        bpm={bpm}
                        handsatz={day.handsatz}
                        dayNumber={day.number}
                        exerciseId={exId ?? null}
                        isCompleted={exId ? completedSet.has(exId) : false}
                        onToggleComplete={
                          exId ? () => toggleCompletion(exId) : null
                        }
                      />
                    );
                  })}
                </div>
              </div>

              {/* Kombi */}
              {(() => {
                const kombi = day.kombi;
                if (!kombi) return null;
                const kombiId = exerciseLookup.get(
                  buildLookupKey(day.number, 'kombi', kombi.name)
                );
                return (
                  <div className="trn-section">
                    <h2 className="trn-section-title">Kombi-Übung</h2>
                    <KombiCard
                      kombi={kombi}
                      day={day}
                      exerciseId={kombiId ?? null}
                      isCompleted={kombiId ? completedSet.has(kombiId) : false}
                      onToggleComplete={
                        kombiId ? () => toggleCompletion(kombiId) : null
                      }
                    />
                  </div>
                );
              })()}

              {/* Options (Tag 22) */}
              {day.options && day.options.length > 0 ? (
                <div className="trn-section">
                  <h2 className="trn-section-title">Spielwege</h2>
                  <div className="trn-option-list">
                    {day.options.map((opt) => {
                      const optId = exerciseLookup.get(
                        buildLookupKey(day.number, 'spielweg', opt.id)
                      );
                      return (
                        <OptionCard
                          key={opt.id}
                          option={opt}
                          exerciseId={optId ?? null}
                          isCompleted={optId ? completedSet.has(optId) : false}
                          onToggleComplete={
                            optId ? () => toggleCompletion(optId) : null
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </section>
      </main>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PatternCard — visualizes a 4-takt × 4-sub grid plus the counting strip,
// type/stage/focus chips, and a play/stop button.
// ─────────────────────────────────────────────────────────────────────────────
// Strike → 1-char Tool URL token (matches /tool's STRIKE_DECODE: . g T S D).
const STRIKE_TO_TOOL_TOKEN: Record<Strike, string> = {
  gn: 'g',
  tonfeld: 'T',
  slap: 'S',
  ding: 'D',
};

function encodeCoursePatternForTool(p: CoursePattern): string {
  const grid = Array(16).fill('.') as string[];
  for (const ev of p.events) {
    const tok = STRIKE_TO_TOOL_TOKEN[ev.strike as Strike];
    if (tok) grid[ev.position] = tok;
  }
  return grid.join('');
}

function PatternCard({
  pattern,
  isPlaying,
  onTogglePlay,
  bpm,
  handsatz,
  dayNumber,
  exerciseId,
  isCompleted,
  onToggleComplete,
}: {
  pattern: CoursePattern;
  isPlaying: boolean;
  onTogglePlay: () => void;
  bpm: number;
  handsatz: 'R-L' | 'L-R' | 'frei';
  dayNumber: number;
  /** null when the (day, kind, pattern_id) tuple doesn't resolve to a row. */
  exerciseId: string | null;
  isCompleted: boolean;
  onToggleComplete: (() => void) | null;
}) {
  const toolHref = useMemo(() => {
    const enc = encodeCoursePatternForTool(pattern);
    const params = new URLSearchParams({
      pattern: enc,
      bpm: String(bpm),
      handsatz,
      from: 'training',
      label: `Tag ${dayNumber} · ${pattern.label}`,
    });
    return `/tool?${params.toString()}`;
  }, [pattern, bpm, handsatz, dayNumber]);

  const chips: { label: string; key: string }[] = [];
  if (pattern.type === 'stufe') {
    if (typeof pattern.stage === 'number') {
      chips.push({ key: 'stage', label: `Stufe ${pattern.stage}` });
    }
    if (pattern.track) {
      chips.push({ key: 'track', label: pattern.track });
    }
  } else if (pattern.type === 'basis') {
    chips.push({ key: 'type', label: 'Basis' });
  } else if (pattern.type === 'uebung') {
    chips.push({ key: 'type', label: 'Übung' });
  }
  if (typeof pattern.focus_takt === 'number') {
    chips.push({
      key: 'focus',
      label: `Fokus-Takt ${pattern.focus_takt}`,
    });
  }

  // Build a flat 16-slot view of the takte grid. Some patterns might encode
  // a subset shape — defend against that with a length check.
  const cells: { strike: Strike; hand: Hand; position: number }[] = [];
  for (let t = 0; t < 4; t++) {
    for (let s = 0; s < 4; s++) {
      const position = t * 4 + s;
      const strike = (pattern.takte[t]?.[s] ?? 'gn') as Strike;
      const ev = pattern.events.find((e) => e.position === position);
      cells.push({ strike, hand: ev?.hand ?? null, position });
    }
  }

  return (
    <article
      className={
        isPlaying
          ? 'trn-pattern-card trn-pattern-card--playing'
          : 'trn-pattern-card'
      }
    >
      <CompletionCheckbox
        exerciseId={exerciseId}
        isCompleted={isCompleted}
        onToggle={onToggleComplete}
        ariaLabel={`${pattern.label} abhaken`}
      />
      <header className="trn-pattern-head">
        <h3 className="trn-pattern-label">{pattern.label}</h3>
        {chips.length > 0 ? (
          <div className="trn-pattern-chips">
            {chips.map((c) => (
              <span key={c.key} className="trn-chip trn-chip--pattern">
                {c.label}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      <div className="trn-takte" role="img" aria-label={`Pattern ${pattern.label}`}>
        {[0, 1, 2, 3].map((t) => (
          <div key={t} className="trn-takt">
            {[0, 1, 2, 3].map((s) => {
              const idx = t * 4 + s;
              const c = cells[idx];
              const visual = STRIKE_VISUAL[c.strike] ?? STRIKE_VISUAL.gn;
              return (
                <div
                  key={s}
                  className={
                    s === 0 ? 'trn-cell trn-cell--downbeat' : 'trn-cell'
                  }
                  style={{
                    background: visual.bg,
                    color: visual.color,
                  }}
                  title={`Takt ${t + 1}, Sub ${s + 1} — ${c.strike}${
                    c.hand ? ` (${c.hand})` : ''
                  }`}
                >
                  <span className="trn-cell-letter">{visual.label}</span>
                  {c.hand ? (
                    <span className="trn-cell-hand">{c.hand}</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="trn-counting" aria-hidden="true">
        {[0, 1, 2, 3].map((t) => (
          <div key={t} className="trn-counting-takt">
            {[0, 1, 2, 3].map((s) => {
              const idx = t * 4 + s;
              const isMain = s === 0;
              return (
                <div
                  key={s}
                  className={
                    isMain
                      ? 'trn-counting-cell trn-counting-cell--main'
                      : 'trn-counting-cell'
                  }
                >
                  {counting16[idx]}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="trn-pattern-foot">
        <button
          type="button"
          onClick={onTogglePlay}
          aria-pressed={isPlaying}
          className={
            isPlaying
              ? 'trn-play-btn trn-play-btn--stop'
              : 'trn-play-btn'
          }
        >
          {isPlaying ? (
            <>
              <Square size={14} />
              <span>Stop</span>
            </>
          ) : (
            <>
              <Play size={14} />
              <span>Play</span>
            </>
          )}
        </button>
        <Link
          href={toolHref}
          className="trn-tool-link"
          aria-label={`${pattern.label} im Tool öffnen`}
        >
          Im Tool öffnen →
        </Link>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KombiCard — shows the chain of patterns. Playback is intentionally
// disabled in V1 (the wiring requires sequencing across multiple events
// arrays, which we'll add in a follow-up).
// ─────────────────────────────────────────────────────────────────────────────
function KombiCard({
  kombi,
  day,
  exerciseId,
  isCompleted,
  onToggleComplete,
}: {
  kombi: Kombi;
  day: CourseDay;
  exerciseId: string | null;
  isCompleted: boolean;
  onToggleComplete: (() => void) | null;
}) {
  return (
    <article className="trn-kombi-card">
      <CompletionCheckbox
        exerciseId={exerciseId}
        isCompleted={isCompleted}
        onToggle={onToggleComplete}
        ariaLabel={`Kombi ${kombi.name} abhaken`}
      />
      <header className="trn-kombi-head">
        <h3 className="trn-kombi-name">{kombi.name}</h3>
        {kombi.rounds > 1 ? (
          <span className="trn-chip trn-chip--meta">
            {kombi.rounds} Runden
          </span>
        ) : null}
      </header>
      <p className="trn-kombi-desc">{kombi.description}</p>

      <ol className="trn-kombi-seq">
        {kombi.sequence.map((entry, idx) => {
          const target = day.patterns.find(
            (p) => p.id === entry.pattern_id
          );
          const label = target ? target.label : entry.pattern_id;
          return (
            <li key={`${entry.bogen}-${entry.runde ?? 0}-${idx}`}>
              <span className="trn-kombi-bogen">Bogen {entry.bogen}</span>
              <span className="trn-kombi-arrow">→</span>
              <span className="trn-kombi-target">{label}</span>
              {typeof entry.runde === 'number' ? (
                <span className="trn-kombi-runde">Runde {entry.runde}</span>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="trn-pattern-foot">
        <button
          type="button"
          disabled
          className="trn-play-btn trn-play-btn--disabled"
          title="Kombi-Playback bald verfügbar"
        >
          <Play size={14} />
          <span>Kombi-Playback bald verfügbar</span>
        </button>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OptionCard — Tag-22 spielwege. No playback; pure structure metadata.
// ─────────────────────────────────────────────────────────────────────────────
function OptionCard({
  option,
  exerciseId,
  isCompleted,
  onToggleComplete,
}: {
  option: DayOption;
  exerciseId: string | null;
  isCompleted: boolean;
  onToggleComplete: (() => void) | null;
}) {
  const meta: { label: string; value: string }[] = [
    { label: 'Bögen', value: String(option.structure.bogen_count) },
    { label: 'Loop', value: option.structure.loop ? 'ja' : 'nein' },
  ];
  if (typeof option.structure.variation_starts_at_bogen === 'number') {
    meta.push({
      label: 'Variation ab',
      value: `Bogen ${option.structure.variation_starts_at_bogen}`,
    });
  }
  if (option.structure.source) {
    meta.push({ label: 'Quelle', value: option.structure.source });
  }

  return (
    <article className="trn-option-card">
      <CompletionCheckbox
        exerciseId={exerciseId}
        isCompleted={isCompleted}
        onToggle={onToggleComplete}
        ariaLabel={`Spielweg ${option.name} abhaken`}
      />
      <header className="trn-option-head">
        <span className="trn-option-id">{option.id}</span>
        <h3 className="trn-option-name">{option.name}</h3>
      </header>
      <p className="trn-option-desc">{option.description}</p>
      <div className="trn-option-meta">
        {meta.map((m) => (
          <div key={m.label} className="trn-option-meta-item">
            <span className="trn-option-meta-label">{m.label}</span>
            <span className="trn-option-meta-value">{m.value}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CompletionCheckbox — Abhak-UI primitive used by all three card types.
// Renders an amber circle (filled + checkmark when done, outlined when not),
// positioned absolute top-right of the parent card. Wrapped in a form whose
// submit is intercepted so the parent's `onToggle` can drive the optimistic
// flip + server-action dispatch via its own useTransition. The hidden
// `name="exercise_id"` input keeps the form payload aligned with what
// `toggleCompletionAction` reads — useful as a no-JS fallback.
// ─────────────────────────────────────────────────────────────────────────────
function CompletionCheckbox({
  exerciseId,
  isCompleted,
  onToggle,
  ariaLabel,
}: {
  exerciseId: string | null;
  isCompleted: boolean;
  onToggle: (() => void) | null;
  ariaLabel: string;
}) {
  // If we couldn't resolve a DB row for this card (seed gap), don't render
  // a checkbox at all — silently degrade rather than ship a no-op control.
  if (!exerciseId || !onToggle) return null;

  return (
    <form
      action={toggleCompletionAction}
      onSubmit={(e) => {
        e.preventDefault();
        onToggle();
      }}
      className="trn-completion-form"
    >
      <input type="hidden" name="exercise_id" value={exerciseId} />
      <button
        type="submit"
        aria-pressed={isCompleted}
        aria-label={ariaLabel}
        className={
          isCompleted
            ? 'trn-completion-checkbox trn-completion-checkbox--checked'
            : 'trn-completion-checkbox'
        }
      >
        {isCompleted ? (
          <Check size={18} strokeWidth={3} aria-hidden="true" />
        ) : null}
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page-scoped CSS — `.trn-` prefix mirrors the LANDING_CSS / TOOL_CSS
// pattern from app/page.tsx and app/tool/page.tsx so we never collide
// with sibling pages or the global Nav/Footer.
// ─────────────────────────────────────────────────────────────────────────────
const TRN_CSS = `
.trn-page {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  min-height: calc(100vh - 80px);
  background: var(--black);
  color: var(--text);
  font-family: 'Barlow', 'Inter', sans-serif;
}

/* ─── Sidebar ─── */
.trn-sidebar {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border);
  background: var(--dark);
  position: sticky;
  top: 0;
  align-self: stretch;
  max-height: 100vh;
  overflow-y: auto;
}
.trn-sidebar-head {
  padding: 28px 24px 20px;
  border-bottom: 1px solid var(--border);
}
.trn-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 12px;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: var(--amber);
  margin-bottom: 10px;
}
.trn-cycle-title {
  font-family: 'Anton', sans-serif;
  font-size: 22px;
  line-height: 1.05;
  color: var(--cream);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.trn-day-list {
  display: flex;
  flex-direction: column;
  padding: 12px 0;
  flex: 1 1 auto;
}
.trn-day-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 14px 24px;
  background: transparent;
  border: none;
  border-left: 3px solid transparent;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  color: var(--text);
}
.trn-day-btn:hover {
  background: var(--amber-dim);
}
.trn-day-btn--active {
  background: var(--amber);
  color: var(--black);
  border-left-color: var(--amber2);
}
.trn-day-btn--active .trn-day-num,
.trn-day-btn--active .trn-day-title {
  color: var(--black);
}
.trn-day-num {
  font-family: 'Anton', sans-serif;
  font-size: 18px;
  letter-spacing: 0.5px;
  color: var(--cream);
  text-transform: uppercase;
}
.trn-day-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 12px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--muted);
  line-height: 1.3;
}

.trn-sidebar-foot {
  padding: 18px 24px 24px;
  border-top: 1px solid var(--border);
  font-family: 'Barlow', sans-serif;
}
.trn-foot-line {
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 1px;
  margin-bottom: 4px;
  text-transform: uppercase;
  font-family: 'Barlow Condensed', sans-serif;
}
.trn-foot-mail {
  display: inline-block;
  font-size: 13px;
  color: var(--amber);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.15s ease;
}
.trn-foot-mail:hover {
  border-bottom-color: var(--amber);
}

/* ─── Detail column ─── */
.trn-detail {
  padding: 40px 48px 80px;
  min-width: 0;
}

.trn-empty {
  padding: 80px 0;
  color: var(--muted);
  text-align: center;
}
.trn-back-link {
  display: inline-block;
  margin-top: 16px;
  color: var(--amber);
  text-decoration: none;
  border-bottom: 1px solid var(--amber);
}

/* Day header */
.trn-day-header {
  margin-bottom: 32px;
}
.trn-tag-num {
  font-family: 'Anton', sans-serif;
  font-size: clamp(40px, 6vw, 64px);
  line-height: 1;
  color: var(--amber);
  letter-spacing: 1px;
  margin-bottom: 4px;
  text-transform: uppercase;
}
.trn-day-title-h1 {
  font-family: 'Anton', sans-serif;
  font-size: clamp(26px, 3.5vw, 36px);
  line-height: 1.05;
  color: var(--cream);
  margin: 8px 0 0;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
.trn-day-subtitle {
  font-family: 'Barlow', serif;
  font-style: italic;
  color: var(--muted2);
  font-size: 16px;
  line-height: 1.5;
  margin: 16px 0 0;
}
.trn-day-summary {
  font-family: 'Barlow', sans-serif;
  color: var(--text);
  font-size: 16px;
  line-height: 1.7;
  margin: 16px 0 0;
  max-width: 760px;
  font-weight: 300;
}

.trn-meta-row {
  margin-top: 20px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.trn-chip {
  display: inline-block;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
  padding: 6px 12px;
  border-radius: 2px;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--text);
}
.trn-chip--pattern {
  background: var(--amber-dim);
  border-color: var(--amber);
  color: var(--amber);
}

/* BPM bar */
.trn-bpm-bar {
  position: sticky;
  top: 0;
  z-index: 5;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 18px 20px;
  margin-bottom: 32px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.trn-bpm-row {
  display: flex;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
}
.trn-bpm-row--secondary {
  border-top: 1px solid var(--border);
  padding-top: 12px;
  justify-content: space-between;
}
.trn-bpm-display {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 110px;
}
.trn-bpm-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--amber);
  font-weight: 700;
}
.trn-bpm-value {
  font-family: 'Anton', sans-serif;
  font-size: 26px;
  letter-spacing: 1px;
  color: var(--cream);
  line-height: 1;
}
.trn-bpm-slider {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--amber-dim) 0%, var(--amber) 100%);
  outline: none;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  min-width: 180px;
}
.trn-bpm-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--amber);
  cursor: pointer;
  border: 2px solid var(--black);
  box-shadow: 0 4px 12px rgba(245, 166, 35, 0.5);
}
.trn-bpm-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--amber);
  cursor: pointer;
  border: 2px solid var(--black);
  box-shadow: 0 4px 12px rgba(245, 166, 35, 0.5);
}
.trn-bpm-presets {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.trn-bpm-preset {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--muted);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 3px;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background-color 0.15s ease;
}
.trn-bpm-preset:hover {
  border-color: var(--amber);
  color: var(--amber);
}
.trn-bpm-preset--active {
  background: var(--amber-dim);
  border-color: var(--amber);
  color: var(--amber);
}
.trn-toggle {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--muted);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 700;
  padding: 8px 14px;
  border-radius: 3px;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background-color 0.15s ease;
}
.trn-toggle:hover {
  border-color: var(--amber);
  color: var(--amber);
}
.trn-toggle--on {
  background: var(--amber-dim);
  border-color: var(--amber);
  color: var(--amber);
}
.trn-shortcut-hint {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--muted);
}

/* Sections */
.trn-section {
  margin-top: 32px;
}
.trn-section-title {
  font-family: 'Anton', sans-serif;
  font-size: 22px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--cream);
  margin: 0 0 16px;
}

.trn-pattern-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Pattern card */
.trn-pattern-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 24px;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}
.trn-pattern-card:hover {
  background: var(--card2);
  border-color: var(--border2);
}
.trn-pattern-card--playing {
  border-color: var(--amber);
  box-shadow: 0 0 0 1px var(--amber) inset;
}
.trn-pattern-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.trn-pattern-label {
  font-family: 'Anton', sans-serif;
  font-size: 22px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--cream);
  margin: 0;
}
.trn-pattern-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

/* Takte grid — 4 takte, each 4 cells, separated by a tiny gap */
.trn-takte {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 8px;
}
.trn-takt {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}
.trn-cell {
  position: relative;
  height: 48px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Anton', sans-serif;
  font-size: 20px;
  font-weight: 400;
  border: 1px solid var(--border);
  transition: transform 0.15s ease;
  user-select: none;
}
.trn-cell--downbeat {
  border-left: 2px solid var(--amber);
}
.trn-cell-letter {
  font-family: 'Courier New', monospace;
  font-weight: 700;
  font-size: 18px;
}
.trn-cell-hand {
  position: absolute;
  top: 2px;
  right: 4px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  opacity: 0.85;
}

.trn-counting {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 18px;
}
.trn-counting-takt {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}
.trn-counting-cell {
  text-align: center;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--muted);
}
.trn-counting-cell--main {
  color: var(--amber);
  font-weight: 700;
  font-size: 16px;
}

.trn-pattern-foot {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
}
.trn-play-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--amber);
  color: var(--black);
  border: none;
  padding: 10px 18px;
  border-radius: 3px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 2px;
  text-transform: uppercase;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.15s ease;
}
.trn-play-btn:hover {
  background: var(--cream);
}
.trn-play-btn--stop {
  background: var(--warm);
  color: var(--cream);
}
.trn-play-btn--stop:hover {
  background: #E55A2B;
  color: var(--cream);
}
.trn-play-btn--disabled {
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--border);
  cursor: not-allowed;
}
.trn-play-btn--disabled:hover {
  background: transparent;
}
.trn-tool-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 10px 16px;
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
}
.trn-tool-link:hover {
  color: var(--amber);
  border-color: var(--amber);
}

/* Kombi card */
.trn-kombi-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 24px;
}
.trn-kombi-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.trn-kombi-name {
  font-family: 'Anton', sans-serif;
  font-size: 22px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--cream);
  margin: 0;
}
.trn-kombi-desc {
  font-family: 'Barlow', sans-serif;
  font-size: 15px;
  line-height: 1.7;
  color: var(--text);
  margin: 0 0 16px;
  font-weight: 300;
}
.trn-kombi-seq {
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.trn-kombi-seq li {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 13px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--text);
  background: var(--black);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 10px 14px;
  flex-wrap: wrap;
}
.trn-kombi-bogen {
  color: var(--amber);
  font-weight: 700;
  min-width: 80px;
}
.trn-kombi-arrow {
  color: var(--muted);
}
.trn-kombi-target {
  color: var(--cream);
}
.trn-kombi-runde {
  margin-left: auto;
  color: var(--muted);
  font-size: 11px;
}

/* Option card (Tag 22) */
.trn-option-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}
.trn-option-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 20px;
}
.trn-option-head {
  margin-bottom: 8px;
}
.trn-option-id {
  display: inline-block;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--amber);
  margin-bottom: 6px;
}
.trn-option-name {
  font-family: 'Anton', sans-serif;
  font-size: 20px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--cream);
  margin: 0;
}
.trn-option-desc {
  font-family: 'Barlow', sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text);
  margin: 0 0 12px;
  font-weight: 300;
}
.trn-option-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.trn-option-meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--black);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 8px 12px;
}
.trn-option-meta-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--muted);
}
.trn-option-meta-value {
  font-family: 'Anton', sans-serif;
  font-size: 16px;
  color: var(--cream);
  letter-spacing: 0.5px;
}

/* ─── Mobile (≤ 900px): sidebar collapses to a top strip ─── */
@media (max-width: 900px) {
  .trn-page {
    grid-template-columns: 1fr;
  }
  .trn-sidebar {
    position: static;
    max-height: none;
    overflow-y: visible;
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
  .trn-sidebar-head {
    padding: 20px 20px 14px;
  }
  .trn-cycle-title {
    font-size: 18px;
  }
  .trn-day-list {
    flex-direction: row;
    overflow-x: auto;
    padding: 12px 16px;
    gap: 8px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
  }
  .trn-day-btn {
    flex: 0 0 auto;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border: 1px solid var(--border);
    border-left-width: 1px;
    border-radius: 999px;
    white-space: nowrap;
  }
  .trn-day-btn--active {
    border-left-color: var(--amber);
    border-color: var(--amber);
  }
  .trn-day-num {
    font-size: 14px;
  }
  .trn-day-title {
    display: none;
  }
  .trn-sidebar-foot {
    padding: 12px 20px 16px;
    border-top: 1px solid var(--border);
  }
  .trn-detail {
    padding: 24px 20px 60px;
  }
  .trn-bpm-bar {
    position: static;
  }
  .trn-bpm-row {
    gap: 12px;
  }
}

/* ─── Phone (≤ 600px) ─── */
@media (max-width: 600px) {
  .trn-detail {
    padding: 20px 16px 48px;
  }
  .trn-takte,
  .trn-counting {
    gap: 8px;
  }
  .trn-cell {
    height: 36px;
    font-size: 16px;
  }
  .trn-cell-letter {
    font-size: 14px;
  }
  .trn-cell-hand {
    font-size: 9px;
  }
  .trn-counting-cell {
    font-size: 10px;
  }
  .trn-counting-cell--main {
    font-size: 12px;
  }
  .trn-pattern-card {
    padding: 16px;
  }
  .trn-meta-row {
    gap: 6px;
  }
  .trn-chip {
    padding: 5px 10px;
    font-size: 11px;
    letter-spacing: 1.5px;
  }
  .trn-bpm-presets {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    width: 100%;
  }
  .trn-bpm-preset {
    width: 100%;
  }
  .trn-bpm-row {
    flex-direction: column;
    align-items: stretch;
  }
  .trn-bpm-display {
    flex-direction: row;
    justify-content: space-between;
    align-items: baseline;
  }
}

/* ─── Abhak-UI: per-day progress + Completion-Checkbox ─── */
.trn-day-progress {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--muted);
  margin-top: 2px;
}
.trn-day-btn--active .trn-day-progress {
  color: var(--black);
  opacity: 0.7;
}
.trn-day-progress--header {
  margin: 16px 0 0;
  font-size: 12px;
  letter-spacing: 2px;
  color: var(--amber);
  font-weight: 700;
}

/* Ensure cards anchor the absolutely-positioned checkbox */
.trn-pattern-card,
.trn-kombi-card,
.trn-option-card {
  position: relative;
}

/* Reserve space so the card title never tucks under the checkbox circle */
.trn-pattern-head,
.trn-kombi-head,
.trn-option-head {
  padding-right: 48px;
}

.trn-completion-form {
  position: absolute;
  top: 16px;
  right: 16px;
  margin: 0;
  padding: 0;
  z-index: 2;
}
.trn-completion-checkbox {
  width: 36px;
  height: 36px;
  min-width: 36px;
  min-height: 36px;
  border-radius: 50%;
  border: 2px solid var(--amber);
  background: transparent;
  color: var(--amber);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
}
.trn-completion-checkbox:hover {
  background: var(--amber-dim);
}
.trn-completion-checkbox:focus-visible {
  outline: 2px solid var(--amber);
  outline-offset: 2px;
}
.trn-completion-checkbox:active {
  transform: scale(0.92);
}
.trn-completion-checkbox--checked {
  background: var(--amber);
  color: var(--black);
}
.trn-completion-checkbox--checked:hover {
  background: var(--cream);
  border-color: var(--cream);
}

@media (max-width: 600px) {
  .trn-completion-form {
    top: 12px;
    right: 12px;
  }
  .trn-completion-checkbox {
    width: 40px;
    height: 40px;
    min-width: 40px;
    min-height: 40px;
  }
}
`;
