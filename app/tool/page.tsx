'use client';

import { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { Hand, Volume2, Play, Pause, Square, RotateCcw, Copy } from 'lucide-react';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────────────────────────
// Handpan-Maschine — 5-state click cycle (Pause / gn / tonfeld / slap / ding)
// Strikes synthesized via Tone.js; samples may replace these later.
// ─────────────────────────────────────────────────────────────────────────────

type StrikeIndex = 0 | 1 | 2 | 3 | 4;
type HandsatzKey = 'R-L' | 'L-R' | 'frei';

type SynthMap = {
  gn: Tone.NoiseSynth | null;
  tonfeld: Tone.PluckSynth | null;
  slap: Tone.NoiseSynth | null;
  ding: Tone.MembraneSynth | null;
  subPulse: Tone.NoiseSynth | null;
  metronome: Tone.Synth | null;
};

export default function HandpanMaschinePage() {
  // Pattern state: 0 = Pause, 1 = gn (Ghostnote), 2 = tonfeld, 3 = slap, 4 = ding
  const [pattern, setPattern] = useState<number[]>(Array(16).fill(0));
  const [selectedHandsatz, setSelectedHandsatz] = useState<HandsatzKey>('R-L');
  // Dynamics: 0 = p, 1 = mf, 2 = f. Currently fixed to mf for every step (room for future expressivity).
  const [dynamics] = useState<number[]>(Array(16).fill(1));

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(90);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);
  const [metronomeEnabled, setMetronomeEnabled] = useState(true);
  const [subdivisionsEnabled, setSubdivisionsEnabled] = useState(false);

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

  // ───────── Strike vocabulary (5 states; index = pattern value 0..4) ─────────
  const symbols = ['.', 'g', 'T', 'S', 'D'] as const;
  const symbolNames = ['Pause', 'Ghostnote (g)', 'Tonfeld (T)', 'Slap (S)', 'Ding (D)'] as const;
  // Deutsche Sechzehntel-Zählung — 1 e und de · 2 e und de · 3 e und de · 4 e und de
  const counting = [
    '1', 'e', 'und', 'de',
    '2', 'e', 'und', 'de',
    '3', 'e', 'und', 'de',
    '4', 'e', 'und', 'de',
  ];

  // ───────── Handsatz patterns — only the three from the course schema ─────────
  const handsatzPatterns: Record<HandsatzKey, { name: string; pattern: ('R' | 'L')[] | null }> = {
    'R-L': {
      name: 'Wechselschlag R-L',
      pattern: ['R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L'],
    },
    'L-R': {
      name: 'Wechselschlag L-R',
      pattern: ['L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R'],
    },
    'frei': {
      name: 'Freier Handsatz',
      pattern: null, // when null, render the row as 16 muted dashes "—"
    },
  };

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
      gn.volume.value = -22;
      synthsRef.current.gn = gn;

      // 2 = tonfeld: gezupfte, klingende Note — 'A4' als Basisfrequenz.
      // Falls 'A4' im Mix zu hoch klingt, auf 'D5' runterstimmen — beides musikalisch valide für ein klingendes Tonfeld.
      const tonfeld = new Tone.PluckSynth({
        attackNoise: 0.4,
        dampening: 4500,
        resonance: 0.7,
      }).toDestination();
      tonfeld.volume.value = -10;
      synthsRef.current.tonfeld = tonfeld;

      // 3 = slap: lauter Slap — Pink-Noise burst mit längerem Decay.
      const slap = new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.05 },
      }).toDestination();
      slap.volume.value = -10;
      synthsRef.current.slap = slap;

      // 4 = ding: tiefer Bass-Akzent — MembraneSynth als Kick-Substitut.
      const ding = new Tone.MembraneSynth({
        pitchDecay: 0.12,
        octaves: 4,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.45, sustain: 0, release: 0.4 },
      }).toDestination();
      ding.volume.value = -6;
      synthsRef.current.ding = ding;

      // Optionaler Sub-Klick — sehr leise, auf jedem 16tel.
      const subPulse = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.012, sustain: 0, release: 0.012 },
      }).toDestination();
      subPulse.volume.value = -28;
      synthsRef.current.subPulse = subPulse;

      // Woodblock-artiges Metronom auf Vierteln.
      const metronome = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
      }).toDestination();
      metronome.volume.value = -15;
      synthsRef.current.metronome = metronome;

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

        if (currentMetronomeEnabled && step % 4 === 0 && synths.metronome) {
          synths.metronome.triggerAttackRelease('C6', '32n', time, 0.3);
        }
      },
      [...Array(16).keys()],
      '16n'
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

  const resetPattern = () => setPattern(Array(16).fill(0));
  const loadPreset = (preset: number[]) => setPattern(preset);

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

  // Derived view — handsatz row, with `frei` rendered as 16 muted dashes.
  const handsatzRow: (string)[] =
    handsatzPatterns[selectedHandsatz].pattern ??
    Array(16).fill('—');

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
          fontFamily: "'Barlow', 'Inter', sans-serif",
          padding: '40px 20px',
          color: 'var(--text)',
        }}
      >
        {/* Header */}
        <div style={{ maxWidth: '1400px', margin: '0 auto 40px', textAlign: 'center' }}>
          <h1
            style={{
              fontFamily: "'Anton', sans-serif",
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

        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gap: '30px' }}>
          {/* ───────── Playback Controls ───────── */}
          <div
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '30px',
            }}
          >
            <div className="tool-page-controls-row">
              {/* Play/Stop */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={togglePlayback}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: isPlaying
                      ? 'linear-gradient(135deg, var(--warm) 0%, #E55A2B 100%)'
                      : 'linear-gradient(135deg, var(--amber) 0%, var(--amber2) 100%)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    color: 'var(--black)',
                  }}
                >
                  {isPlaying ? <Pause size={36} color="var(--black)" /> : <Play size={36} color="var(--black)" />}
                </button>
                <button
                  onClick={stopPlayback}
                  aria-label="Stop"
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--muted)',
                  }}
                >
                  <Square size={28} />
                </button>
              </div>

              {/* BPM Slider */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                  }}
                >
                  <label
                    style={{
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: '13px',
                      fontWeight: 700,
                      letterSpacing: '3px',
                      textTransform: 'uppercase',
                      color: 'var(--amber)',
                    }}
                  >
                    Tempo
                  </label>
                  <div
                    style={{
                      fontFamily: "'Anton', sans-serif",
                      fontSize: '32px',
                      color: 'var(--cream)',
                      letterSpacing: '1px',
                    }}
                  >
                    {bpm} BPM
                  </div>
                </div>
                <input
                  type="range"
                  min={20}
                  max={160}
                  value={bpm}
                  onChange={(e) => updateBPM(parseInt(e.target.value, 10))}
                  aria-label="Tempo in BPM"
                  style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '4px',
                    background: 'linear-gradient(90deg, var(--amber-dim) 0%, var(--amber) 100%)',
                    outline: 'none',
                    cursor: 'pointer',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '8px',
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: '11px',
                    letterSpacing: '1px',
                    color: 'var(--muted)',
                  }}
                >
                  <span>20</span>
                  <span>90</span>
                  <span>160</span>
                </div>
              </div>

              {/* Preset BPM */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[40, 60, 90, 120].map((presetBpm) => {
                  const isActive = bpm === presetBpm;
                  return (
                    <button
                      key={presetBpm}
                      onClick={() => updateBPM(presetBpm)}
                      style={{
                        background: isActive ? 'var(--amber-dim)' : 'transparent',
                        border: `1px solid ${isActive ? 'var(--amber)' : 'var(--border)'}`,
                        borderRadius: '4px',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        color: isActive ? 'var(--amber)' : 'var(--muted)',
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 700,
                        fontSize: '13px',
                        letterSpacing: '2px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {presetBpm}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Audio Options */}
            <div
              style={{
                marginTop: '24px',
                display: 'flex',
                gap: '16px',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={() => setMetronomeEnabled(!metronomeEnabled)}
                aria-pressed={metronomeEnabled}
                style={{
                  background: metronomeEnabled ? 'var(--amber-dim)' : 'transparent',
                  border: `1px solid ${metronomeEnabled ? 'var(--amber)' : 'var(--border)'}`,
                  borderRadius: '4px',
                  padding: '12px 24px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <Volume2
                  size={16}
                  color={metronomeEnabled ? 'var(--amber)' : 'var(--muted)'}
                />
                <span
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: '13px',
                    fontWeight: 700,
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    color: metronomeEnabled ? 'var(--amber)' : 'var(--muted)',
                  }}
                >
                  Metronom (Viertel)
                </span>
              </button>
              <button
                onClick={() => setSubdivisionsEnabled(!subdivisionsEnabled)}
                aria-pressed={subdivisionsEnabled}
                style={{
                  background: subdivisionsEnabled ? 'rgba(245,237,216,0.08)' : 'transparent',
                  border: `1px solid ${subdivisionsEnabled ? 'var(--cream)' : 'var(--border)'}`,
                  borderRadius: '4px',
                  padding: '12px 24px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <Volume2
                  size={16}
                  color={subdivisionsEnabled ? 'var(--cream)' : 'var(--muted)'}
                />
                <span
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: '13px',
                    fontWeight: 700,
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    color: subdivisionsEnabled ? 'var(--cream)' : 'var(--muted)',
                  }}
                >
                  Sub-Klick
                </span>
              </button>
            </div>
          </div>

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
                  fontFamily: "'Anton', sans-serif",
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
                    fontFamily: "'Barlow Condensed', sans-serif",
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
                    fontFamily: "'Barlow Condensed', sans-serif",
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
              </div>
            </div>

            {/* Legend — 5 chips */}
            <div
              style={{
                display: 'flex',
                gap: '20px',
                marginBottom: '28px',
                padding: '16px',
                background: 'var(--black)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                flexWrap: 'wrap',
              }}
            >
              {symbols.map((symbol, idx) => (
                <div
                  key={idx}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      background: getStepColor(idx),
                      border: `2px solid ${getStepTextColor(idx)}`,
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                      fontWeight: 'bold',
                      color: getStepTextColor(idx),
                      fontFamily: "'Courier New', monospace",
                    }}
                  >
                    {symbol}
                  </div>
                  <span
                    style={{
                      color: 'var(--text)',
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: '13px',
                      fontWeight: 600,
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {symbolNames[idx]}
                  </span>
                </div>
              ))}
            </div>

            {/* Counting + Grid wrapper — switches to 2 rows of 8 on mobile */}
            <div className="tool-page-grid-wrapper">
              {/* Counting */}
              <div
                className="tool-page-counting"
                style={{
                  display: 'grid',
                  gap: '4px',
                  marginBottom: '12px',
                }}
              >
                {counting.map((count, idx) => {
                  const isMain = idx % 4 === 0;
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
                }}
              >
                {pattern.map((value, idx) => {
                  const isCurrentStep = idx === currentStep;
                  const isDownbeat = idx % 4 === 0;
                  const symbol = symbols[value as StrikeIndex] ?? '.';
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
                        border: isCurrentStep
                          ? '4px solid var(--amber)'
                          : `3px solid ${getStepTextColor(value)}`,
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '30px',
                        fontWeight: 'bold',
                        color: getStepTextColor(value),
                        cursor: 'pointer',
                        fontFamily: "'Courier New', monospace",
                        borderLeft: isDownbeat ? '4px solid var(--amber)' : undefined,
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

              {/* Handsatz Visualization Row */}
              <div
                className="tool-page-handsatz-row"
                style={{
                  display: 'grid',
                  gap: '4px',
                  marginBottom: '28px',
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

            {/* Handsatz-Auswahl */}
            <div
              style={{
                background: 'var(--black)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '20px',
              }}
            >
              <h3
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: '13px',
                  color: 'var(--amber)',
                  margin: '0 0 12px 0',
                  fontWeight: 700,
                  letterSpacing: '3px',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Hand size={16} /> Handsatz: {handsatzPatterns[selectedHandsatz].name}
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '8px',
                }}
              >
                {(Object.entries(handsatzPatterns) as [HandsatzKey, { name: string }][]).map(
                  ([key, value]) => {
                    const isSelected = selectedHandsatz === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedHandsatz(key)}
                        style={{
                          background: isSelected ? 'var(--amber-dim)' : 'transparent',
                          border: `1px solid ${isSelected ? 'var(--amber)' : 'var(--border)'}`,
                          color: isSelected ? 'var(--amber)' : 'var(--muted)',
                          padding: '10px 14px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontWeight: 700,
                          fontSize: '13px',
                          letterSpacing: '2px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {value.name}
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
                  fontFamily: "'Barlow Condensed', sans-serif",
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
                        fontFamily: "'Barlow Condensed', sans-serif",
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
                      fontFamily: "'Barlow Condensed', sans-serif",
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
                fontFamily: "'Barlow Condensed', sans-serif",
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
                    fontFamily: "'Barlow Condensed', sans-serif",
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
                    fontFamily: "'Barlow Condensed', sans-serif",
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
      </main>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page-scoped CSS — slider thumb + responsive grid switch (desktop 16-col,
// mobile 2 rows of 8). Component-internal styles stay inline (matches the
// source's pattern).
// ─────────────────────────────────────────────────────────────────────────────
const TOOL_CSS = `
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

.tool-page-controls-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 30px;
  align-items: center;
}

.tool-page-counting,
.tool-page-pattern,
.tool-page-handsatz-row {
  grid-template-columns: repeat(16, 1fr);
}

@media (max-width: 700px) {
  .tool-page-controls-row {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  .tool-page-counting,
  .tool-page-pattern,
  .tool-page-handsatz-row {
    grid-template-columns: repeat(8, 1fr);
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
`;
