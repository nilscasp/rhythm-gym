'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Tone from 'tone';
import { Play, Square, Volume2 } from 'lucide-react';
import type {
  RhythmusPreset,
  RhythmusHandsatzKey,
  RhythmusSubdivisionKey,
} from '../../../../data/rhythmusfundament-days';
import { resolveTonfieldIndex } from '../../../lib/handpan-mapping';
import type { PitchMap } from '../../../lib/handpan';

// ─────────────────────────────────────────────────────────────────────────────
// DayPlayer — Pro-Tag-Player für Rhythmus-Fundament.
//
// Nimmt eine Liste von `presets`, rendert pro Preset einen Klick-Button. Beim
// Klick wird der Player auf dieses Preset umkonfiguriert: pattern · bpm ·
// handsatz · subdivision. Tone.js-Audio-Engine läuft in derselben Komponente,
// damit Preset-Wechsel ohne Page-Reload, ohne URL-Hop, ohne State-Verlust geht.
//
// Strike-Encoding (gleich wie /tool):
//   . = Pause   g = Ghostnote   T = Tonfeld   S = Slap   D = Ding
// ─────────────────────────────────────────────────────────────────────────────

type StrikeChar = '.' | 'g' | 'T' | 'S' | 'D';

interface SynthMap {
  gn: Tone.NoiseSynth | null;
  tonfeld: Tone.PluckSynth | null;
  slap: Tone.NoiseSynth | null;
  ding: Tone.MembraneSynth | null;
  metronome: Tone.Synth | null;
}

const BPM_MIN = 30;
const BPM_MAX = 160;

const STRIKE_VISUAL: Record<
  StrikeChar,
  { bg: string; color: string; label: string }
> = {
  '.': { bg: 'transparent', color: 'var(--muted)', label: '' },
  g: {
    bg: 'rgba(213, 204, 184, 0.18)',
    color: 'var(--muted)',
    label: 'g',
  },
  T: {
    bg: 'rgba(156, 169, 138, 0.7)',
    color: 'var(--cream)',
    label: 'T',
  },
  S: {
    bg: 'rgba(245, 166, 35, 0.85)',
    color: 'var(--black)',
    label: 'S',
  },
  D: {
    bg: 'rgba(139, 69, 19, 0.78)',
    color: 'var(--cream)',
    label: 'D',
  },
};

const HANDSATZ_LABEL: Record<RhythmusHandsatzKey, string> = {
  'R-L': 'R – L (Wechselschlag rechts)',
  'L-R': 'L – R (Wechselschlag links)',
  'RR-LL': 'R – R – L – L',
  'LL-RR': 'L – L – R – R',
  paradiddle: 'Paradiddle',
  frei: 'freier Handsatz',
};

const PARADIDDLE_UNIT: readonly ('R' | 'L')[] = [
  'R',
  'L',
  'R',
  'R',
  'L',
  'R',
  'L',
  'L',
];

function tileHandsatz(
  unit: readonly ('R' | 'L')[],
  length: number
): ('R' | 'L')[] {
  return Array.from({ length }, (_, i) => unit[i % unit.length]);
}

function handsatzForLength(
  key: RhythmusHandsatzKey,
  length: number
): readonly ('R' | 'L' | null)[] {
  switch (key) {
    case 'R-L':
      return tileHandsatz(['R', 'L'], length);
    case 'L-R':
      return tileHandsatz(['L', 'R'], length);
    case 'RR-LL':
      return tileHandsatz(['R', 'R', 'L', 'L'], length);
    case 'LL-RR':
      return tileHandsatz(['L', 'L', 'R', 'R'], length);
    case 'paradiddle':
      return tileHandsatz(PARADIDDLE_UNIT, length);
    case 'frei':
    default:
      return Array.from({ length }, () => null);
  }
}

function beatStrideFor(sub: RhythmusSubdivisionKey): number {
  switch (sub) {
    case '32n':
      return 8;
    case '16n':
      return 4;
    case '8n':
      return 2;
    case '4n':
      return 1;
  }
}

function decodePattern(raw: string): StrikeChar[] {
  return raw.split('').map((c) => {
    if (c === '.' || c === 'g' || c === 'T' || c === 'S' || c === 'D') {
      return c;
    }
    return '.';
  });
}

interface DayPlayerProps {
  presets: readonly RhythmusPreset[];
  /**
   * Tag-Number — currently used only for future analytics / shortcut labelling.
   * Kept in props so the page can pass it without prop drilling later.
   */
  dayNumber?: number;
  /**
   * Pitch-Map des aktiven User-Instruments. Wenn gesetzt, klingen Tonfeld/Ding
   * in den echten Tönen des Pans statt im A4/C2-Default. null → Default.
   */
  pitchMap?: PitchMap | null;
}

export function DayPlayer({ presets, pitchMap }: DayPlayerProps) {
  // ───────── Active-Preset State ─────────
  // Default: first preset.
  const [activePresetId, setActivePresetId] = useState<string>(
    presets[0]?.id ?? ''
  );

  const activePreset: RhythmusPreset | undefined = useMemo(
    () => presets.find((p) => p.id === activePresetId) ?? presets[0],
    [presets, activePresetId]
  );

  // BPM is user-controllable. Each preset has a recommended BPM. When the user
  // clicks a different preset (`switchPreset`) we adopt that preset's BPM in
  // the same React update — no effect-driven setState (that triggers cascading
  // renders per React 19 strict rules).
  const [bpm, setBpm] = useState<number>(activePreset?.bpm ?? 60);

  // Subdivision: derives from active preset, falls back to 16n.
  const subdivision: RhythmusSubdivisionKey =
    activePreset?.subdivision ?? '16n';

  const pattern: StrikeChar[] = useMemo(
    () => (activePreset ? decodePattern(activePreset.pattern) : []),
    [activePreset]
  );

  const handsatzKey: RhythmusHandsatzKey = activePreset?.handsatz ?? 'frei';
  const hands = useMemo(
    () => handsatzForLength(handsatzKey, pattern.length),
    [handsatzKey, pattern.length]
  );

  const stepCount = pattern.length;
  const beatStride = beatStrideFor(subdivision);

  // ───────── Playback State ─────────
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [metronomeEnabled, setMetronomeEnabled] = useState<boolean>(false);
  const [audioReady, setAudioReady] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // ───────── Refs (audio thread reads from these) ─────────
  const synthsRef = useRef<SynthMap>({
    gn: null,
    tonfeld: null,
    slap: null,
    ding: null,
    metronome: null,
  });
  const sequenceRef = useRef<Tone.Sequence | null>(null);
  const patternRef = useRef<StrikeChar[]>(pattern);
  const beatStrideRef = useRef<number>(beatStride);
  const metronomeOnRef = useRef<boolean>(false);
  const handsRef = useRef<readonly ('R' | 'L' | null)[]>(hands);
  const pitchMapRef = useRef<PitchMap | null>(pitchMap ?? null);

  useEffect(() => {
    patternRef.current = pattern;
  }, [pattern]);
  useEffect(() => {
    beatStrideRef.current = beatStride;
  }, [beatStride]);
  useEffect(() => {
    metronomeOnRef.current = metronomeEnabled;
  }, [metronomeEnabled]);
  useEffect(() => {
    handsRef.current = hands;
  }, [hands]);
  useEffect(() => {
    pitchMapRef.current = pitchMap ?? null;
  }, [pitchMap]);

  // ───────── Audio Init (gated on first user gesture) ─────────
  const initAudio = useCallback(async () => {
    if (audioReady) return true;
    try {
      await Tone.start();

      const gn = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.025, sustain: 0, release: 0.02 },
      }).toDestination();
      gn.volume.value = -22;
      synthsRef.current.gn = gn;

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

      const metronome = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
      }).toDestination();
      metronome.volume.value = -15;
      synthsRef.current.metronome = metronome;

      setAudioReady(true);
      setAudioError(null);
      return true;
    } catch (e) {
      console.error('Audio init failed:', e);
      setAudioError(
        'Audio konnte nicht gestartet werden. Klick irgendwo auf die Seite und versuche es erneut.'
      );
      return false;
    }
  }, [audioReady]);

  // ───────── Playback ─────────
  const stopPlayback = useCallback(() => {
    if (sequenceRef.current) {
      sequenceRef.current.stop();
      sequenceRef.current.dispose();
      sequenceRef.current = null;
    }
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    setIsPlaying(false);
    setCurrentStep(-1);
  }, []);

  const startPlayback = useCallback(() => {
    Tone.Transport.bpm.value = bpm;

    const steps = patternRef.current.length || 16;
    sequenceRef.current = new Tone.Sequence(
      (time, step) => {
        const pat = patternRef.current;
        const c = pat[step] ?? '.';
        const synths = synthsRef.current;
        const stride = beatStrideRef.current;
        const metOn = metronomeOnRef.current;

        switch (c) {
          case 'g':
            if (synths.gn) synths.gn.triggerAttackRelease('32n', time, 0.7);
            break;
          case 'T':
            if (synths.tonfeld) {
              const pm = pitchMapRef.current;
              const note = pm
                ? pm.tonfields[
                    resolveTonfieldIndex(step, handsRef.current[step]) %
                      pm.tonfields.length
                  ]
                : 'A4';
              synths.tonfeld.triggerAttackRelease(note, '16n', time, 0.85);
            }
            break;
          case 'S':
            if (synths.slap)
              synths.slap.triggerAttackRelease('16n', time, 0.85);
            break;
          case 'D':
            if (synths.ding)
              synths.ding.triggerAttackRelease(
                pitchMapRef.current?.ding ?? 'C2',
                '8n',
                time,
                0.95,
              );
            break;
          case '.':
          default:
            // silence
            break;
        }

        if (metOn && step % stride === 0 && synths.metronome) {
          synths.metronome.triggerAttackRelease('C6', '32n', time, 0.3);
        }

        // Schedule visual highlight on the next animation frame.
        Tone.Draw.schedule(() => {
          setCurrentStep(step);
        }, time);
      },
      Array.from({ length: steps }, (_, i) => i),
      subdivision
    );

    sequenceRef.current.start(0);
    Tone.Transport.start();
    setIsPlaying(true);
  }, [bpm, subdivision]);

  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }
    const ok = await initAudio();
    if (!ok) return;
    startPlayback();
  }, [isPlaying, initAudio, startPlayback, stopPlayback]);

  // When user clicks a different preset:
  //  - Adopt that preset's BPM (single React update, no effect).
  //  - If audio is playing: stop, switch preset, immediately restart.
  //  - If audio is not playing: just switch preset.
  const switchPreset = useCallback(
    (presetId: string) => {
      const next = presets.find((p) => p.id === presetId);
      if (!next) return;
      const wasPlaying = isPlaying;
      if (wasPlaying) {
        stopPlayback();
      }
      setActivePresetId(presetId);
      setBpm(next.bpm);
      if (wasPlaying) {
        // Restart on next tick — pattern + subdivision are refreshed via the
        // pattern/beatStride refs, then we re-arm Sequence with the new shape.
        setTimeout(() => {
          startPlayback();
        }, 30);
      }
    },
    [presets, isPlaying, stopPlayback, startPlayback]
  );

  // BPM updates while playing — adjust Transport without restarting.
  const updateBpm = useCallback((next: number) => {
    const clamped = Math.min(BPM_MAX, Math.max(BPM_MIN, next));
    setBpm(clamped);
    if (sequenceRef.current) {
      Tone.Transport.bpm.value = clamped;
    }
  }, []);

  // Spacebar shortcut — play/pause.
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
      void togglePlay();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [togglePlay]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (sequenceRef.current) {
        sequenceRef.current.stop();
        sequenceRef.current.dispose();
        sequenceRef.current = null;
      }
      Tone.Transport.stop();
      const s = synthsRef.current;
      if (s.gn) s.gn.dispose();
      if (s.tonfeld) s.tonfeld.dispose();
      if (s.slap) s.slap.dispose();
      if (s.ding) s.ding.dispose();
      if (s.metronome) s.metronome.dispose();
    };
  }, []);

  // ───────── Render ─────────
  // Counting strip: derive from subdivision.
  //   16n → 1 e und de 2 e und de ...
  //   8n  → 1 + 2 + 3 + 4 +
  //   4n  → 1 2 3 4 (each step is a full beat)
  //   32n → twice as dense as 16n
  const countingSyllables: string[] = useMemo(() => {
    const beats = ['1', '2', '3', '4'];
    if (subdivision === '4n') return beats;
    if (subdivision === '8n') {
      const out: string[] = [];
      for (const b of beats) {
        out.push(b, '+');
      }
      return out.slice(0, stepCount);
    }
    if (subdivision === '16n') {
      const out: string[] = [];
      for (const b of beats) {
        out.push(b, 'e', 'und', 'de');
      }
      return out.slice(0, stepCount);
    }
    // 32n
    const out: string[] = [];
    for (const b of beats) {
      out.push(b, 'e', '&', 'a', 'tu', 'ka', 'ti', 'ka');
    }
    return out.slice(0, stepCount);
  }, [subdivision, stepCount]);

  return (
    <div className="dp-wrap">
      {/* Preset switcher */}
      <div className="dp-presets" role="radiogroup" aria-label="Pattern wählen">
        {presets.map((p) => {
          const active = p.id === activePresetId;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={active}
              className={active ? 'dp-preset dp-preset--active' : 'dp-preset'}
              onClick={() => switchPreset(p.id)}
            >
              <span className="dp-preset-label">{p.label}</span>
              {p.hint ? <span className="dp-preset-hint">{p.hint}</span> : null}
            </button>
          );
        })}
      </div>

      {/* Player */}
      <div className="dp-player">
        {/* Header row: handsatz + BPM */}
        <div className="dp-header">
          <span className="dp-handsatz">
            Handsatz · {HANDSATZ_LABEL[handsatzKey]}
          </span>
          <span className="dp-subdivision">
            Subdivision · {subdivision}
          </span>
        </div>

        {/* Grid */}
        <div
          className="dp-grid"
          style={{ gridTemplateColumns: `repeat(${stepCount}, 1fr)` }}
          aria-label="Rhythmus-Grid"
        >
          {pattern.map((c, i) => {
            const v = STRIKE_VISUAL[c];
            const isDownbeat = i % beatStride === 0;
            const isCursor = currentStep === i;
            return (
              <div
                key={i}
                className={
                  'dp-cell' +
                  (isDownbeat ? ' dp-cell--downbeat' : '') +
                  (isCursor ? ' dp-cell--cursor' : '')
                }
                style={{ background: v.bg, color: v.color }}
              >
                <span className="dp-cell-label">{v.label}</span>
              </div>
            );
          })}
        </div>

        {/* Counting strip */}
        <div
          className="dp-counting"
          style={{ gridTemplateColumns: `repeat(${stepCount}, 1fr)` }}
          aria-hidden="true"
        >
          {countingSyllables.map((syl, i) => {
            const isDownbeat = i % beatStride === 0;
            const hand = hands[i];
            return (
              <div
                key={i}
                className={
                  'dp-counting-cell' +
                  (isDownbeat ? ' dp-counting-cell--downbeat' : '')
                }
              >
                <span className="dp-counting-syl">{syl}</span>
                {hand ? <span className="dp-counting-hand">{hand}</span> : null}
              </div>
            );
          })}
        </div>

        {/* Controls */}
        <div className="dp-controls">
          <button
            type="button"
            onClick={() => void togglePlay()}
            className={
              isPlaying ? 'dp-play dp-play--stop' : 'dp-play dp-play--play'
            }
            aria-label={isPlaying ? 'Stop' : 'Play'}
          >
            {isPlaying ? <Square size={20} /> : <Play size={20} />}
            <span>{isPlaying ? 'Stop' : 'Play'}</span>
          </button>

          <div className="dp-bpm">
            <span className="dp-bpm-label">Tempo</span>
            <span className="dp-bpm-value">{bpm} BPM</span>
            <input
              type="range"
              min={BPM_MIN}
              max={BPM_MAX}
              value={bpm}
              onChange={(e) => updateBpm(parseInt(e.target.value, 10))}
              className="dp-bpm-slider"
              aria-label="Tempo in BPM"
            />
          </div>

          <button
            type="button"
            onClick={() => setMetronomeEnabled((v) => !v)}
            aria-pressed={metronomeEnabled}
            className={
              metronomeEnabled
                ? 'dp-metronome dp-metronome--on'
                : 'dp-metronome'
            }
          >
            <Volume2 size={16} />
            <span>Metronom {metronomeEnabled ? 'an' : 'aus'}</span>
          </button>
        </div>

        {audioError ? (
          <div className="dp-error" role="alert">
            {audioError}
          </div>
        ) : null}

        <div className="dp-hint">
          Spacebar = Play / Stop · Klick auf einen anderen Preset wechselt live.
        </div>
      </div>

      <style>{`
        .dp-wrap {
          display: flex;
          flex-direction: column;
          gap: 18px;
          font-family: var(--font-body);
        }

        .dp-presets {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 10px;
        }
        .dp-preset {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 12px 14px;
          color: var(--cream);
          text-align: left;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 4px;
          transition: border-color 0.15s, background 0.15s;
          min-height: 56px;
        }
        .dp-preset:hover {
          border-color: var(--amber);
        }
        .dp-preset--active {
          border-color: var(--amber);
          background: var(--amber-dim, rgba(245, 166, 35, 0.12));
        }
        .dp-preset-label {
          font-family: var(--font-ui);
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: var(--cream);
          line-height: 1.2;
        }
        .dp-preset--active .dp-preset-label {
          color: var(--amber);
        }
        .dp-preset-hint {
          font-size: 12px;
          color: var(--muted);
          line-height: 1.3;
        }

        .dp-player {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          position: sticky;
          top: 16px;
        }

        .dp-header {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          font-family: var(--font-ui);
          font-size: 12px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--muted);
        }
        .dp-subdivision {
          color: var(--muted2, var(--muted));
        }

        .dp-grid {
          display: grid;
          gap: 3px;
        }
        .dp-cell {
          min-width: 0;
          height: 36px;
          border: 1px solid var(--border);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-ui);
          font-size: 13px;
          font-weight: 700;
          transition: outline 0.05s;
        }
        .dp-cell--downbeat {
          border-color: var(--amber);
          border-width: 1px;
        }
        .dp-cell--cursor {
          outline: 2px solid var(--amber);
          outline-offset: 1px;
        }
        .dp-cell-label {
          line-height: 1;
        }

        .dp-counting {
          display: grid;
          gap: 3px;
          font-family: var(--font-ui);
          font-size: 10px;
          letter-spacing: 0.5px;
          color: var(--muted);
        }
        .dp-counting-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 2px 0;
        }
        .dp-counting-cell--downbeat .dp-counting-syl {
          color: var(--amber);
          font-weight: 700;
        }
        .dp-counting-hand {
          font-size: 9px;
          color: var(--muted2, var(--muted));
        }

        .dp-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          align-items: center;
          padding-top: 12px;
          border-top: 1px solid var(--border);
        }
        .dp-play {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 22px;
          border-radius: 6px;
          border: none;
          font-family: var(--font-ui);
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.15s;
        }
        .dp-play--play {
          background: var(--amber);
          color: var(--black);
        }
        .dp-play--play:hover {
          background: var(--amber2, var(--amber));
        }
        .dp-play--stop {
          background: var(--card);
          color: var(--cream);
          border: 1px solid var(--border);
        }
        .dp-play--stop:hover {
          border-color: var(--amber);
          color: var(--amber);
        }

        .dp-bpm {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1 1 200px;
          min-width: 160px;
        }
        .dp-bpm-label {
          font-family: var(--font-ui);
          font-size: 11px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--muted);
        }
        .dp-bpm-value {
          font-family: var(--font-display);
          font-size: 18px;
          color: var(--cream);
          min-width: 80px;
        }
        .dp-bpm-slider {
          flex: 1;
          accent-color: var(--amber);
        }

        .dp-metronome {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          border-radius: 4px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--muted);
          font-family: var(--font-ui);
          font-size: 12px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
        }
        .dp-metronome:hover {
          border-color: var(--amber);
          color: var(--amber);
        }
        .dp-metronome--on {
          color: var(--amber);
          border-color: var(--amber);
        }

        .dp-error {
          background: rgba(220, 50, 50, 0.1);
          border: 1px solid rgba(220, 50, 50, 0.35);
          border-radius: 4px;
          padding: 10px 12px;
          color: #ff8b8b;
          font-size: 13px;
        }
        .dp-hint {
          font-size: 11px;
          color: var(--muted);
          font-family: var(--font-ui);
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        /* Mobile-Anpassung — Pflicht laut rhythm-gym CLAUDE.md (390x844 iPhone-Probe) */
        @media (max-width: 480px) {
          .dp-player {
            padding: 14px;
            position: static;
          }
          .dp-grid {
            gap: 2px;
          }
          .dp-counting {
            gap: 2px;
          }
          .dp-cell {
            height: 30px;
            font-size: 11px;
          }
          .dp-counting-syl {
            font-size: 9px;
          }
          .dp-counting-hand {
            font-size: 8px;
          }
          .dp-controls {
            gap: 10px;
          }
          .dp-play {
            flex: 1 1 100%;
            justify-content: center;
            font-size: 13px;
            letter-spacing: 1px;
          }
          .dp-bpm {
            flex: 1 1 100%;
            min-width: 100%;
          }
          .dp-metronome {
            flex: 1 1 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
