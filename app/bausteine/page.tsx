'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Rhythmus-Bausteine
//
// Zweites Werkzeug neben der Handpan-Maschine (/tool). Dort wird Rhythmus auf
// der Mikrobene zusammengesetzt (Schlag für Schlag auf 16 Steps), hier auf der
// Makrobene (Bausteine zusammenstecken wie Legosteine: 2+3, 4+3+3+2, …).
// Klingt synthetisch (Klick), reine Web-Audio-Implementierung, kein Tone.js,
// damit die Seite leicht bleibt und sich vom Drum-Sound der Maschine absetzt.
// ─────────────────────────────────────────────────────────────────────────────

const PALETTE_SIZES = [2, 3, 4, 6] as const;
type BlockSize = (typeof PALETTE_SIZES)[number];

const LABELS: Record<BlockSize, string> = {
  2: 'Zweier',
  3: 'Dreier',
  4: 'Vierer',
  6: 'Sechser',
};

type Example = { name: string; parts: BlockSize[]; note: string };

const EXAMPLES: Example[] = [
  { name: 'Vier',   parts: [2, 2],          note: '2 + 2' },
  { name: 'Fünf',   parts: [2, 3],          note: '2 + 3' },
  { name: 'Fünf',   parts: [3, 2],          note: '3 + 2' },
  { name: 'Sechs',  parts: [3, 3],          note: '3 + 3' },
  { name: 'Sechs',  parts: [4, 2],          note: '4 + 2' },
  { name: 'Sieben', parts: [4, 3],          note: '4 + 3' },
  { name: 'Zwölf',  parts: [4, 4, 4],       note: '4 + 4 + 4' },
  { name: 'Zwölf',  parts: [3, 3, 3, 3],    note: '3 + 3 + 3 + 3' },
  { name: 'Zwölf',  parts: [6, 6],          note: '6 + 6' },
  { name: 'Zwölf',  parts: [4, 3, 3, 2],    note: '4 + 3 + 3 + 2' },
];

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_SEC = 0.12;

function playClick(ctx: AudioContext, time: number, isAccent: boolean) {
  // Pitched body (sine) — accent louder + higher
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(isAccent ? 880 : 440, time);
  const peak = isAccent ? 0.32 : 0.14;
  oscGain.gain.setValueAtTime(0.0001, time);
  oscGain.gain.exponentialRampToValueAtTime(peak, time + 0.002);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.09);
  osc.connect(oscGain).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.12);

  // Noise burst (bandpass) — gives the "click" attack
  const noiseDur = 0.04;
  const sampleRate = ctx.sampleRate;
  const noiseBuf = ctx.createBuffer(1, Math.max(1, Math.floor(sampleRate * noiseDur)), sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(isAccent ? 2400 : 1600, time);
  filter.Q.setValueAtTime(1.0, time);
  const noiseGain = ctx.createGain();
  const npeak = isAccent ? 0.45 : 0.22;
  noiseGain.gain.setValueAtTime(0.0001, time);
  noiseGain.gain.exponentialRampToValueAtTime(npeak, time + 0.001);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + noiseDur);
  noise.connect(filter).connect(noiseGain).connect(ctx.destination);
  noise.start(time);
  noise.stop(time + noiseDur + 0.01);
}

export default function BausteinePage() {
  const [sequence, setSequence] = useState<BlockSize[]>([]);
  const [bpm, setBpm] = useState<number>(100);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeBeat, setActiveBeat] = useState<number | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const schedulerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number | null>(null);
  const visualLoopRef = useRef<(() => void) | null>(null);
  const nextBeatTimeRef = useRef<number>(0);
  const currentBeatIdxRef = useRef<number>(0);
  const visualQueueRef = useRef<{ beatIdx: number; time: number }[]>([]);
  const sequenceRef = useRef<BlockSize[]>([]);
  const bpmRef = useRef<number>(100);
  const accentSetRef = useRef<Set<number>>(new Set());
  const totalBeatsRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);

  const totalBeats = useMemo(
    () => sequence.reduce((sum, n) => sum + n, 0),
    [sequence],
  );

  const { accentSet, blockStarts } = useMemo(() => {
    const set = new Set<number>();
    const starts: number[] = [];
    let cursor = 0;
    for (const size of sequence) {
      set.add(cursor);
      starts.push(cursor);
      cursor += size;
    }
    return { accentSet: set, blockStarts: starts };
  }, [sequence]);

  useEffect(() => {
    sequenceRef.current = sequence;
    accentSetRef.current = accentSet;
    totalBeatsRef.current = totalBeats;
  }, [sequence, accentSet, totalBeats]);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const ensureAudioCtx = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      return audioCtxRef.current;
    }
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    const ctx = new Ctor();
    audioCtxRef.current = ctx;
    return ctx;
  }, []);

  const stopScheduler = useCallback(() => {
    if (schedulerTimerRef.current !== null) {
      clearInterval(schedulerTimerRef.current);
      schedulerTimerRef.current = null;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    visualQueueRef.current = [];
    setActiveBeat(null);
  }, []);

  const scheduleTick = useCallback(() => {
    const ctx = audioCtxRef.current;
    const total = totalBeatsRef.current;
    if (!ctx || total <= 0) return;
    const secPerBeat = 60 / Math.max(1, bpmRef.current);
    while (nextBeatTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD_SEC) {
      const beatIdx = currentBeatIdxRef.current % total;
      const isAccent = accentSetRef.current.has(beatIdx);
      playClick(ctx, nextBeatTimeRef.current, isAccent);
      visualQueueRef.current.push({ beatIdx, time: nextBeatTimeRef.current });
      nextBeatTimeRef.current += secPerBeat;
      currentBeatIdxRef.current = (currentBeatIdxRef.current + 1) % total;
    }
  }, []);

  const visualLoop = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) {
      rafRef.current = null;
      return;
    }
    const now = ctx.currentTime;
    const q = visualQueueRef.current;
    let surfaced: number | null = null;
    while (q.length > 0 && q[0].time <= now) {
      surfaced = q[0].beatIdx;
      q.shift();
    }
    if (surfaced !== null) {
      setActiveBeat(surfaced);
    }
    const next = visualLoopRef.current;
    if (next) {
      rafRef.current = requestAnimationFrame(next);
    }
  }, []);

  useEffect(() => { visualLoopRef.current = visualLoop; }, [visualLoop]);

  const startScheduler = useCallback(() => {
    const ctx = ensureAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => { /* autoplay-blocked — caller already triggered */ });
    }
    currentBeatIdxRef.current = 0;
    visualQueueRef.current = [];
    nextBeatTimeRef.current = ctx.currentTime + 0.05;
    if (schedulerTimerRef.current === null) {
      schedulerTimerRef.current = setInterval(scheduleTick, LOOKAHEAD_MS);
    }
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(visualLoop);
    }
  }, [ensureAudioCtx, scheduleTick, visualLoop]);

  const syncSequenceRefs = useCallback((next: BlockSize[]): number => {
    const set = new Set<number>();
    let cursor = 0;
    let total = 0;
    for (const size of next) {
      set.add(cursor);
      cursor += size;
      total += size;
    }
    sequenceRef.current = next;
    accentSetRef.current = set;
    totalBeatsRef.current = total;
    return total;
  }, []);

  const applySequence = useCallback((next: BlockSize[]) => {
    setSequence(next);
    if (!isPlayingRef.current) return;
    const total = syncSequenceRefs(next);
    stopScheduler();
    if (total <= 0) {
      setIsPlaying(false);
      return;
    }
    startScheduler();
  }, [startScheduler, stopScheduler, syncSequenceRefs]);

  const handleAdd = useCallback((size: BlockSize) => {
    applySequence([...sequenceRef.current, size]);
  }, [applySequence]);

  const handleRemove = useCallback((index: number) => {
    applySequence(sequenceRef.current.filter((_, i) => i !== index));
  }, [applySequence]);

  const handleClear = useCallback(() => {
    applySequence([]);
  }, [applySequence]);

  const handleLoadExample = useCallback((parts: BlockSize[]) => {
    applySequence([...parts]);
  }, [applySequence]);

  const handleTogglePlay = useCallback(() => {
    if (totalBeatsRef.current <= 0) return;
    if (isPlayingRef.current) {
      stopScheduler();
      setIsPlaying(false);
    } else {
      startScheduler();
      setIsPlaying(true);
    }
  }, [startScheduler, stopScheduler]);

  const handleBpmChange = useCallback((nextBpm: number) => {
    const clamped = Math.max(40, Math.min(180, Math.round(nextBpm)));
    setBpm(clamped);
    if (!isPlayingRef.current) return;
    if (totalBeatsRef.current <= 0) return;
    bpmRef.current = clamped;
    stopScheduler();
    startScheduler();
  }, [startScheduler, stopScheduler]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
      if (e.code === 'Space') {
        if (sequenceRef.current.length === 0) return;
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'Backspace') {
        if (sequenceRef.current.length === 0) return;
        e.preventDefault();
        applySequence(sequenceRef.current.slice(0, -1));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleTogglePlay, applySequence]);

  useEffect(() => {
    return () => {
      if (schedulerTimerRef.current !== null) {
        clearInterval(schedulerTimerRef.current);
        schedulerTimerRef.current = null;
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state !== 'closed') {
        ctx.close().catch(() => { /* already closed */ });
      }
      audioCtxRef.current = null;
    };
  }, []);

  const isActive = (globalIdx: number) => activeBeat === globalIdx;

  return (
    <>
      <style>{`
        @keyframes rb-fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes rb-stud-blink { 0% { transform: scale(1); filter: brightness(1); } 35% { transform: scale(1.22); filter: brightness(1.6); } 100% { transform: scale(1); filter: brightness(1); } }
        @keyframes rb-drop { 0% { transform: translateY(-14px) scale(0.96); opacity: 0; } 60% { transform: translateY(2px) scale(1.02); opacity: 1; } 100% { transform: translateY(0) scale(1); opacity: 1; } }

        .rb-fade-1 { animation: rb-fade-up 0.7s ease both; }
        .rb-fade-2 { animation: rb-fade-up 0.7s 0.12s ease both; }
        .rb-fade-3 { animation: rb-fade-up 0.7s 0.24s ease both; }

        /* Scoped buttons */
        .rb-btn-primary { background: var(--amber); color: var(--black); padding: 14px 30px; border: none; border-radius: 2px; font-family: 'Barlow Condensed', sans-serif; font-size: 14px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; cursor: pointer; display: inline-flex; align-items: center; gap: 10px; transition: all 0.2s; }
        .rb-btn-primary:hover:not(:disabled) { background: var(--cream); transform: translateY(-2px); box-shadow: 0 8px 30px rgba(245,166,35,0.3); }
        .rb-btn-primary:disabled { opacity: 0.35; cursor: not-allowed; background: var(--border); color: var(--muted); }
        .rb-btn-outline { background: transparent; color: var(--muted); padding: 14px 30px; border: 1px solid var(--border); border-radius: 2px; font-family: 'Barlow Condensed', sans-serif; font-size: 14px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; cursor: pointer; transition: all 0.2s; }
        .rb-btn-outline:hover:not(:disabled) { border-color: var(--amber); color: var(--amber); }
        .rb-btn-outline:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Palette */
        .rb-palette { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-top: 28px; }
        .rb-pcard { background: var(--card); border: 1px solid var(--border); border-radius: 4px; padding: 24px 18px 20px; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center; font-family: inherit; color: inherit; }
        .rb-pcard:hover { border-color: var(--amber); background: var(--card2); transform: translateY(-2px); }
        .rb-pcard:active { transform: translateY(0); }
        .rb-pcard-label { font-family: 'Barlow Condensed', sans-serif; font-size: 13px; letter-spacing: 3px; text-transform: uppercase; color: var(--muted); }
        .rb-pcard:hover .rb-pcard-label { color: var(--amber); }
        .rb-pcard-num { font-family: 'Anton', sans-serif; font-size: 42px; line-height: 0.9; color: var(--cream); }
        .rb-pcard-brick { margin-top: 4px; }

        /* ─── Bricks — Design-Ausnahme: kindliches Bauklotz-Gefühl ─────────────
           Rechteckiger Backstein mit "Noppen" oben, leichter Tiefe + Schlagschatten.
           Bewusst etwas wärmer/spielerischer als der Rest der App, bleibt aber in
           der Rhythm-Gym-Palette (kein Plastik-Bunt, nur Amber + Holzbraun). */
        .rb-brick { position: relative; display: inline-flex; flex-direction: column; align-items: stretch; padding: 12px 14px 14px; border-radius: 7px; background: linear-gradient(180deg, #3a2b18 0%, #2c2012 55%, #1f1709 100%); border: 1px solid rgba(245,166,35,0.18); cursor: pointer; transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease; box-shadow: inset 0 1px 0 rgba(245,237,216,0.07), inset 0 -2px 3px rgba(0,0,0,0.45), 0 3px 0 rgba(0,0,0,0.5), 0 8px 16px rgba(0,0,0,0.45); font-family: inherit; color: inherit; }
        .rb-brick::before { content: ''; position: absolute; left: 6%; right: 6%; top: 0; height: 2px; border-radius: 2px; background: linear-gradient(90deg, transparent, rgba(245,237,216,0.12), transparent); pointer-events: none; }
        .rb-brick.interactive:hover { transform: translateY(-3px); box-shadow: inset 0 1px 0 rgba(245,237,216,0.12), inset 0 -2px 3px rgba(0,0,0,0.45), 0 6px 0 rgba(0,0,0,0.5), 0 14px 24px rgba(0,0,0,0.55); border-color: rgba(245,166,35,0.45); }
        .rb-brick.removable:hover { border-color: rgba(255,107,53,0.7); background: linear-gradient(180deg, #4a2818 0%, #3a2012 55%, #2a1409 100%); }
        .rb-brick.removable:hover .rb-x { opacity: 1; transform: translate(50%,-50%) scale(1); }
        .rb-brick-studs { display: flex; align-items: center; gap: 10px; }
        .rb-brick.mini { padding: 8px 10px 10px; border-radius: 6px; box-shadow: inset 0 1px 0 rgba(245,237,216,0.07), inset 0 -1px 2px rgba(0,0,0,0.4), 0 2px 0 rgba(0,0,0,0.5), 0 4px 10px rgba(0,0,0,0.4); }
        .rb-brick.mini .rb-brick-studs { gap: 7px; }
        .rb-brick.tiny { padding: 6px 8px 8px; border-radius: 5px; box-shadow: inset 0 1px 0 rgba(245,237,216,0.06), 0 2px 0 rgba(0,0,0,0.45), 0 3px 6px rgba(0,0,0,0.35); }
        .rb-brick.tiny .rb-brick-studs { gap: 5px; }
        .rb-brick.dropped { animation: rb-drop 0.32s ease-out both; }

        /* Noppen */
        .rb-stud { display: inline-block; width: 13px; height: 13px; border-radius: 50%; background: radial-gradient(circle at 35% 28%, rgba(168,150,118,1) 0%, rgba(96,82,60,1) 70%, rgba(60,50,34,1) 100%); box-shadow: inset 0 1px 1px rgba(255,235,200,0.18), inset 0 -1px 1px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.5); transition: transform 0.1s ease, box-shadow 0.15s ease, background 0.2s; }
        .rb-stud.accent { width: 18px; height: 18px; background: radial-gradient(circle at 35% 28%, #FFE5A8 0%, var(--amber) 55%, var(--amber2) 100%); box-shadow: inset 0 1px 1px rgba(255,255,255,0.4), inset 0 -1px 2px rgba(160,90,8,0.55), 0 0 12px rgba(245,166,35,0.45), 0 2px 3px rgba(0,0,0,0.45); }
        .rb-stud.active { animation: rb-stud-blink 0.32s ease-out; background: radial-gradient(circle at 35% 28%, #FFF6DC 0%, #FFC85C 55%, var(--amber) 100%); box-shadow: inset 0 1px 2px rgba(255,255,255,0.55), 0 0 22px rgba(255,200,92,0.95), 0 0 40px rgba(245,166,35,0.45); }
        .rb-brick.mini .rb-stud { width: 10px; height: 10px; }
        .rb-brick.mini .rb-stud.accent { width: 14px; height: 14px; }
        .rb-brick.tiny .rb-stud { width: 7px; height: 7px; }
        .rb-brick.tiny .rb-stud.accent { width: 11px; height: 11px; }

        /* Sequence frame */
        .rb-frame { margin-top: 18px; background: var(--dark); border: 1px dashed var(--border); border-radius: 4px; min-height: 148px; padding: 28px 24px 32px; display: flex; align-items: flex-end; justify-content: flex-start; flex-wrap: wrap; gap: 10px; transition: border-color 0.2s; }
        .rb-frame.has-content { border-style: solid; border-color: var(--border2); }
        .rb-frame.empty { justify-content: center; align-items: center; color: var(--muted); font-family: 'Barlow Condensed', sans-serif; font-size: 13px; letter-spacing: 3px; text-transform: uppercase; }
        .rb-x { position: absolute; top: 0; right: 0; transform: translate(50%,-50%) scale(0.7); width: 20px; height: 20px; border-radius: 50%; background: var(--warm); color: var(--cream); font-family: 'Barlow Condensed', sans-serif; font-size: 13px; line-height: 20px; text-align: center; opacity: 0; transition: opacity 0.15s, transform 0.15s; pointer-events: none; box-shadow: 0 0 10px rgba(255,107,53,0.5); }

        .rb-info { margin-top: 14px; font-family: 'Barlow Condensed', sans-serif; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: var(--muted); display: flex; gap: 24px; flex-wrap: wrap; }
        .rb-info strong { color: var(--cream); font-weight: 600; }

        /* Controls */
        .rb-controls { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; margin-top: 28px; }
        .rb-tempo { display: flex; align-items: center; gap: 14px; background: var(--card); border: 1px solid var(--border); border-radius: 4px; padding: 10px 18px; min-width: 280px; flex: 1; }
        .rb-tempo-label { font-family: 'Barlow Condensed', sans-serif; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: var(--muted); }
        .rb-tempo-value { font-family: 'Anton', sans-serif; font-size: 22px; color: var(--cream); min-width: 56px; text-align: right; }
        .rb-tempo-value span { font-family: 'Barlow Condensed', sans-serif; font-size: 11px; letter-spacing: 2px; color: var(--muted); margin-left: 4px; }
        .rb-slider { flex: 1; -webkit-appearance: none; appearance: none; height: 2px; background: var(--border); border-radius: 1px; outline: none; cursor: pointer; }
        .rb-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%; background: var(--amber); box-shadow: 0 0 12px rgba(245,166,35,0.4); cursor: pointer; transition: transform 0.15s; }
        .rb-slider::-webkit-slider-thumb:hover { transform: scale(1.15); }
        .rb-slider::-moz-range-thumb { width: 16px; height: 16px; border: none; border-radius: 50%; background: var(--amber); box-shadow: 0 0 12px rgba(245,166,35,0.4); cursor: pointer; }

        /* Examples */
        .rb-ex-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; margin-top: 24px; }
        .rb-ex { background: var(--card); border: 1px solid var(--border); border-radius: 4px; padding: 18px 18px 16px; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; gap: 10px; font-family: inherit; color: inherit; text-align: left; }
        .rb-ex:hover { border-color: var(--amber); background: var(--card2); transform: translateY(-2px); }
        .rb-ex-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
        .rb-ex-name { font-family: 'Anton', sans-serif; font-size: 22px; letter-spacing: 1px; color: var(--cream); }
        .rb-ex-note { font-family: 'Barlow Condensed', sans-serif; font-size: 12px; letter-spacing: 2px; color: var(--amber); text-transform: uppercase; }
        .rb-ex-bricks { display: flex; align-items: flex-end; gap: 6px; flex-wrap: wrap; min-height: 32px; padding: 4px 0 2px; }

        /* Cross-link callout to Handpan-Maschine */
        .rb-tool-callout { display: flex; align-items: center; gap: 16px; margin-top: 48px; padding: 22px 26px; background: linear-gradient(135deg, rgba(245,166,35,0.06), rgba(255,107,53,0.025)); border: 1px solid rgba(245,166,35,0.18); border-radius: 6px; transition: all 0.2s; text-decoration: none; }
        .rb-tool-callout:hover { border-color: var(--amber); transform: translateY(-2px); background: linear-gradient(135deg, rgba(245,166,35,0.1), rgba(255,107,53,0.04)); }
        .rb-tool-callout-arrow { color: var(--amber); font-family: 'Anton', sans-serif; font-size: 28px; }

        @media (max-width: 880px) { .rb-palette { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px) { .rb-controls { flex-direction: column; align-items: stretch; } .rb-tempo { min-width: 0; } .rb-btn-primary, .rb-btn-outline { width: 100%; justify-content: center; } }
      `}</style>

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '60px 24px 40px' }}>

        {/* HERO */}
        <section style={{ position: 'relative', overflow: 'hidden', padding: '20px 0 40px' }}>
          <div style={{ position: 'absolute', top: -160, right: -120, width: 520, height: 520, background: 'radial-gradient(circle, rgba(245,166,35,0.08) 0%, transparent 70%)', pointerEvents: 'none' }}/>

          <div className="rb-fade-1" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
            <span style={{ display: 'block', width: 32, height: 1, background: 'var(--amber)' }}/>
            Werkzeug · Rhythmus auf der Makrobene
          </div>
          <h1 className="rb-fade-2" style={{ fontFamily: "'Anton', sans-serif", fontSize: 'clamp(48px, 8vw, 96px)', lineHeight: 0.92, letterSpacing: -1, color: 'var(--cream)', maxWidth: 1000, position: 'relative', zIndex: 1 }}>
            RHYTHMUS-<br/><em style={{ fontStyle: 'normal', color: 'var(--amber)', display: 'block' }}>BAUSTEINE.</em>
          </h1>
          <p className="rb-fade-3" style={{ marginTop: 28, fontStyle: 'italic', fontWeight: 300, fontSize: 17, lineHeight: 1.65, color: 'var(--muted)', maxWidth: 620, position: 'relative', zIndex: 1 }}>
            Aus vier Bausteinen lässt sich jeder Rhythmus zusammensetzen. Klick einen Baustein an, bau eine Sequenz, hör sie ab. Eine andere Sichtweise als die Handpan-Maschine — gleiche Pattern, andere Architektur.
          </p>
        </section>

        {/* PALETTE */}
        <section style={{ padding: '24px 0 30px' }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 14 }}>Bausteine</div>
          <h2 style={{ fontFamily: "'Anton', sans-serif", fontSize: 'clamp(28px, 3.4vw, 44px)', lineHeight: 1, color: 'var(--cream)' }}>
            VIER GRÖSSEN. <em style={{ fontStyle: 'normal', color: 'var(--amber)' }}>UNENDLICH KOMBINIERBAR.</em>
          </h2>
          <div className="rb-palette" role="toolbar" aria-label="Bausteine auswählen">
            {PALETTE_SIZES.map(size => (
              <button
                key={size}
                type="button"
                className="rb-pcard"
                onClick={() => handleAdd(size)}
                aria-label={`${LABELS[size]} hinzufügen (${size} Schläge)`}
              >
                <div className="rb-pcard-label">{LABELS[size]}</div>
                <div className="rb-pcard-num">{size}</div>
                <div className="rb-brick mini interactive rb-pcard-brick" aria-hidden>
                  <div className="rb-brick-studs">
                    {Array.from({ length: size }).map((_, i) => (
                      <span key={i} className={`rb-stud ${i === 0 ? 'accent' : ''}`}/>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* SEQUENCE */}
        <section style={{ padding: '20px 0 30px' }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 14 }}>Deine Sequenz</div>
          <div className={`rb-frame ${sequence.length === 0 ? 'empty' : 'has-content'}`}>
            {sequence.length === 0 ? (
              <span>noch leer · klick oben einen Baustein an</span>
            ) : (
              sequence.map((size, blockIdx) => {
                const start = blockStarts[blockIdx];
                return (
                  <button
                    key={`${blockIdx}-${size}-${start}`}
                    type="button"
                    className="rb-brick removable dropped"
                    onClick={() => handleRemove(blockIdx)}
                    aria-label={`${LABELS[size]} entfernen`}
                  >
                    <div className="rb-brick-studs">
                      {Array.from({ length: size }).map((_, i) => {
                        const globalIdx = start + i;
                        const accent = i === 0;
                        const active = isActive(globalIdx);
                        return (
                          <span
                            key={i}
                            className={`rb-stud ${accent ? 'accent' : ''} ${active ? 'active' : ''}`}
                            data-active={active ? 'true' : 'false'}
                          />
                        );
                      })}
                    </div>
                    <span className="rb-x" aria-hidden>×</span>
                  </button>
                );
              })
            )}
          </div>

          <div className="rb-info">
            <span><strong>{sequence.length}</strong> Bausteine</span>
            <span><strong>{totalBeats}</strong> Schläge gesamt</span>
            {sequence.length > 0 && (
              <span>Muster: <strong>{sequence.join(' + ')}</strong></span>
            )}
          </div>

          <div className="rb-controls">
            <button
              type="button"
              className="rb-btn-primary"
              onClick={handleTogglePlay}
              disabled={sequence.length === 0}
            >
              {isPlaying ? 'Stop' : 'Play'} <span aria-hidden>{isPlaying ? '■' : '▶'}</span>
            </button>
            <button
              type="button"
              className="rb-btn-outline"
              onClick={handleClear}
              disabled={sequence.length === 0}
            >
              Leeren
            </button>
            <div className="rb-tempo">
              <span className="rb-tempo-label">Tempo</span>
              <input
                type="range"
                className="rb-slider"
                min={40}
                max={180}
                step={1}
                value={bpm}
                onChange={e => handleBpmChange(Number(e.target.value))}
                aria-label="Tempo in BPM"
              />
              <span className="rb-tempo-value">{bpm}<span>BPM</span></span>
            </div>
          </div>

          <div style={{ marginTop: 18, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)' }}>
            Tastatur: <span style={{ color: 'var(--text)' }}>Leertaste</span> Play/Stop · <span style={{ color: 'var(--text)' }}>Backspace</span> letzten Baustein entfernen
          </div>
        </section>

        {/* EXAMPLES */}
        <section style={{ padding: '40px 0 30px', borderTop: '1px solid var(--border)', marginTop: 40 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, letterSpacing: 4, textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 14 }}>Klassiker zum Ausprobieren</div>
          <h2 style={{ fontFamily: "'Anton', sans-serif", fontSize: 'clamp(28px, 3.4vw, 44px)', lineHeight: 1, color: 'var(--cream)' }}>
            BAUE EINEN <em style={{ fontStyle: 'normal', color: 'var(--amber)' }}>STANDARD-TAKT.</em>
          </h2>
          <div className="rb-ex-grid">
            {EXAMPLES.map((ex, i) => {
              const total = ex.parts.reduce((s, n) => s + n, 0);
              return (
                <button
                  key={`${i}-${ex.name}-${ex.note}`}
                  type="button"
                  className="rb-ex"
                  onClick={() => handleLoadExample(ex.parts)}
                  aria-label={`${ex.name} (${ex.note}) laden`}
                >
                  <div className="rb-ex-head">
                    <span className="rb-ex-name">{ex.name}</span>
                    <span className="rb-ex-note">{ex.note}</span>
                  </div>
                  <div className="rb-ex-bricks" aria-hidden>
                    {ex.parts.map((size, b) => (
                      <div key={b} className="rb-brick tiny">
                        <div className="rb-brick-studs">
                          {Array.from({ length: size }).map((_, j) => (
                            <span key={j} className={`rb-stud ${j === 0 ? 'accent' : ''}`}/>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--muted)' }}>
                    {total} Schläge · {ex.parts.length} Bausteine
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* CALLOUT — Bridge zur Handpan-Maschine */}
        <Link href="/tool" className="rb-tool-callout">
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 6 }}>Auch interessant</div>
            <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 22, letterSpacing: 1, color: 'var(--cream)', marginBottom: 4 }}>Handpan-Maschine — Tool 01</div>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
              Die gleiche Idee, andere Sichtweise: dort baust du Pattern Schlag für Schlag auf 16 Steps. Hier auf der Makrobene, dort auf der Mikrobene.
            </p>
          </div>
          <span className="rb-tool-callout-arrow" aria-hidden>→</span>
        </Link>

      </main>
    </>
  );
}
