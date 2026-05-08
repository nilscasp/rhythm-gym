import React, { useState, useEffect, useRef } from 'react';
import { Hand, Volume2, Play, Pause, Square, RotateCcw, Copy } from 'lucide-react';
import * as Tone from 'tone';

export default function RhythmusDrummaschine() {
  // Pattern state: 0 = Pause, 1 = Fingersnap, 2 = Hand Clap, 3 = Bass Drum
  const [pattern, setPattern] = useState(Array(16).fill(0));
  const [selectedHandsatz, setSelectedHandsatz] = useState('rlrl');
  const [dynamics] = useState(Array(16).fill(1)); // 0=p, 1=mf, 2=f

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(90);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);
  const [metronomeEnabled, setMetronomeEnabled] = useState(true);
  const [subdivisionsEnabled, setSubdivisionsEnabled] = useState(false);

  // Refs for Tone.js
  const sequenceRef = useRef(null);
  const synthsRef = useRef({
    fingersnap: null,
    clap: null,
    kick: null,
    shaker: null,
    metronome: null
  });

  // Refs to always get current state values in sequence callback
  const patternRef = useRef(pattern);
  const dynamicsRef = useRef(dynamics);
  const metronomeEnabledRef = useRef(metronomeEnabled);
  const subdivisionsEnabledRef = useRef(subdivisionsEnabled);

  useEffect(() => { patternRef.current = pattern; }, [pattern]);
  useEffect(() => { dynamicsRef.current = dynamics; }, [dynamics]);
  useEffect(() => { metronomeEnabledRef.current = metronomeEnabled; }, [metronomeEnabled]);
  useEffect(() => { subdivisionsEnabledRef.current = subdivisionsEnabled; }, [subdivisionsEnabled]);

  const symbols = ['.', 'x', 'X', '!'];
  const symbolNames = ['Pause', 'Fingersnap', 'Hand Clap', 'Bass Drum'];
  const counting = ['1', 'e', '+', 'a', '2', 'e', '+', 'a', '3', 'e', '+', 'a', '4', 'e', '+', 'a'];

  const handsatzPatterns = {
    'rlrl': { name: 'Alternierend', pattern: ['r','l','r','l','r','l','r','l','r','l','r','l','r','l','r','l'] },
    'lrlr': { name: 'Links Start', pattern: ['l','r','l','r','l','r','l','r','l','r','l','r','l','r','l','r'] },
    'rrll': { name: 'Doppel RRLL', pattern: ['r','r','l','l','r','r','l','l','r','r','l','l','r','r','l','l'] },
    'llrr': { name: 'Doppel LLRR', pattern: ['l','l','r','r','l','l','r','r','l','l','r','r','l','l','r','r'] },
    'paradiddle': { name: 'Paradiddle', pattern: ['r','l','r','r','l','r','l','l','r','l','r','r','l','r','l','l'] },
    'paradiddleL': { name: 'Paradiddle L', pattern: ['l','r','l','l','r','l','r','r','l','r','l','l','r','l','r','r'] },
    'rlrr': { name: 'Single RLRR', pattern: ['r','l','r','r','l','r','l','l','r','l','r','r','l','r','l','l'] },
    'rllr': { name: 'RLLR Pattern', pattern: ['r','l','l','r','r','l','l','r','r','l','l','r','r','l','l','r'] }
  };

  const presetPatterns = [
    { name: 'Viertel', pattern: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0] },
    { name: 'Achtel', pattern: [1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0] },
    { name: 'Sechzehntel', pattern: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] },
    { name: 'Clave 3-2', pattern: [1,0,0,1,0,0,1,0,0,0,1,0,1,0,0,0] },
    { name: 'Backbeat', pattern: [2,0,0,0,1,0,0,0,2,0,0,0,1,0,0,0] },
    { name: 'Tresillo', pattern: [2,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0] }
  ];

  // Initialize audio
  const initializeAudio = async () => {
    if (isAudioInitialized) return;
    try {
      await Tone.start();

      synthsRef.current.fingersnap = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
      }).toDestination();
      synthsRef.current.fingersnap.volume.value = -10;

      synthsRef.current.clap = new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
      }).toDestination();
      synthsRef.current.clap.volume.value = -8;

      synthsRef.current.kick = new Tone.MembraneSynth({
        pitchDecay: 0.08,
        octaves: 4,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.3 }
      }).toDestination();
      synthsRef.current.kick.volume.value = -6;

      synthsRef.current.shaker = new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.02 }
      }).toDestination();
      synthsRef.current.shaker.volume.value = -24;

      synthsRef.current.metronome = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
      }).toDestination();
      synthsRef.current.metronome.volume.value = -15;

      setIsAudioInitialized(true);
    } catch (error) {
      console.error('Audio initialization error:', error);
    }
  };

  const togglePlayback = async () => {
    if (!isAudioInitialized) await initializeAudio();
    if (isPlaying) stopPlayback();
    else startPlayback();
  };

  const startPlayback = () => {
    Tone.Transport.bpm.value = bpm;

    sequenceRef.current = new Tone.Sequence((time, step) => {
      setCurrentStep(step);
      const currentPattern = patternRef.current;
      const currentDynamics = dynamicsRef.current;
      const currentMetronomeEnabled = metronomeEnabledRef.current;
      const currentSubdivisionsEnabled = subdivisionsEnabledRef.current;

      const patternValue = currentPattern[step];
      const dynamicLevel = currentDynamics[step];

      if (patternValue > 0) {
        const baseVelocities = [0.3, 0.6, 0.9];
        const velocity = baseVelocities[dynamicLevel];

        if (patternValue === 1) {
          synthsRef.current.fingersnap.triggerAttackRelease('16n', time, velocity);
        } else if (patternValue === 2) {
          synthsRef.current.clap.triggerAttackRelease('16n', time, velocity);
        } else if (patternValue === 3) {
          synthsRef.current.kick.triggerAttackRelease('C1', '16n', time, velocity);
        }
      }

      if (currentSubdivisionsEnabled) {
        synthsRef.current.shaker.triggerAttackRelease('32n', time, 0.2);
      }

      if (currentMetronomeEnabled && step % 4 === 0) {
        synthsRef.current.metronome.triggerAttackRelease('C6', '32n', time, 0.3);
      }
    }, [...Array(16).keys()], '16n');

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

  const updateBPM = (newBpm) => {
    setBpm(newBpm);
    if (isPlaying) Tone.Transport.bpm.value = newBpm;
  };

  useEffect(() => {
    return () => {
      if (sequenceRef.current) {
        sequenceRef.current.stop();
        sequenceRef.current.dispose();
      }
      Tone.Transport.stop();
      Object.values(synthsRef.current).forEach(s => s && s.dispose());
    };
  }, []);

  const handleStepClick = (index) => {
    const newPattern = [...pattern];
    newPattern[index] = (newPattern[index] + 1) % 4;
    setPattern(newPattern);
  };

  const resetPattern = () => setPattern(Array(16).fill(0));
  const loadPreset = (preset) => setPattern(preset);

  const copyPattern = () => {
    const patternString = pattern.map(v => symbols[v]).join('');
    navigator.clipboard.writeText(patternString);
    alert('Pattern kopiert: ' + patternString);
  };

  const getStepColor = (value) => {
    const colors = [
      'rgba(150, 150, 150, 0.2)',
      'rgba(78, 205, 196, 0.6)',
      'rgba(255, 107, 107, 0.8)',
      'rgba(255, 215, 0, 1)'
    ];
    return colors[value];
  };

  const getStepTextColor = (value) => {
    const colors = ['#888', '#4ECDC4', '#FF6B6B', '#FFD700'];
    return colors[value];
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      fontFamily: "'Inter', sans-serif",
      padding: '40px 20px',
      color: '#fff'
    }}>
      {/* Header */}
      <div style={{ maxWidth: '1400px', margin: '0 auto 40px', textAlign: 'center' }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: '800',
          background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 50%, #CD853F 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '16px',
          letterSpacing: '-1px'
        }}>
          Rhythmus Drummaschine
        </h1>
        <p style={{ fontSize: '20px', color: 'rgba(255,255,255,0.7)', maxWidth: '700px', margin: '0 auto' }}>
          Baue, bearbeite und spiele deinen Rhythmus ab
        </p>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'grid', gap: '30px' }}>

        {/* Playback Controls */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(139, 69, 19, 0.2) 0%, rgba(210, 105, 30, 0.2) 100%)',
          border: '2px solid rgba(139, 69, 19, 0.5)',
          borderRadius: '20px',
          padding: '30px'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '30px', alignItems: 'center' }}>
            {/* Play/Stop */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={togglePlayback}
                style={{
                  width: '80px', height: '80px', borderRadius: '50%',
                  background: isPlaying
                    ? 'linear-gradient(135deg, #FF6B6B 0%, #FF5252 100%)'
                    : 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                }}
              >
                {isPlaying ? <Pause size={36} color="#fff" /> : <Play size={36} color="#fff" />}
              </button>
              <button
                onClick={stopPlayback}
                style={{
                  width: '80px', height: '80px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                  border: '2px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <Square size={28} color="#fff" />
              </button>
            </div>

            {/* BPM Slider */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ fontSize: '16px', fontWeight: '600', color: '#D2691E' }}>Tempo</label>
                <div style={{ fontSize: '32px', fontWeight: '800', color: '#CD853F', fontFamily: "'Courier New', monospace" }}>
                  {bpm} BPM
                </div>
              </div>
              <input
                type="range"
                min="20"
                max="160"
                value={bpm}
                onChange={(e) => updateBPM(parseInt(e.target.value))}
                style={{
                  width: '100%', height: '12px', borderRadius: '6px',
                  background: 'linear-gradient(90deg, #8B4513 0%, #D2691E 50%, #CD853F 100%)',
                  outline: 'none', cursor: 'pointer'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                <span>20</span><span>90</span><span>160</span>
              </div>
            </div>

            {/* Preset BPM */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[40, 60, 90, 120].map(presetBpm => (
                <button
                  key={presetBpm}
                  onClick={() => updateBPM(presetBpm)}
                  style={{
                    background: bpm === presetBpm ? 'rgba(210, 105, 30, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                    border: `2px solid ${bpm === presetBpm ? '#D2691E' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '8px',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    color: bpm === presetBpm ? '#D2691E' : '#888',
                    fontWeight: '600',
                    fontSize: '13px'
                  }}
                >
                  {presetBpm}
                </button>
              ))}
            </div>
          </div>

          {/* Audio Options */}
          <div style={{ marginTop: '20px', display: 'flex', gap: '20px', justifyContent: 'center' }}>
            <button
              onClick={() => setMetronomeEnabled(!metronomeEnabled)}
              style={{
                background: metronomeEnabled ? 'rgba(78, 205, 196, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: `2px solid ${metronomeEnabled ? '#4ECDC4' : 'rgba(255,255,255,0.2)'}`,
                borderRadius: '12px',
                padding: '12px 24px',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px'
              }}
            >
              <div style={{
                width: '20px', height: '20px', borderRadius: '4px',
                background: metronomeEnabled ? '#4ECDC4' : 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {metronomeEnabled && <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#fff' }} />}
              </div>
              <span style={{ fontSize: '15px', fontWeight: '600', color: metronomeEnabled ? '#4ECDC4' : 'rgba(255,255,255,0.5)' }}>
                🥁 Metronom (Viertel)
              </span>
            </button>
            <button
              onClick={() => setSubdivisionsEnabled(!subdivisionsEnabled)}
              style={{
                background: subdivisionsEnabled ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: `2px solid ${subdivisionsEnabled ? '#FFD700' : 'rgba(255,255,255,0.2)'}`,
                borderRadius: '12px',
                padding: '12px 24px',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px'
              }}
            >
              <div style={{
                width: '20px', height: '20px', borderRadius: '4px',
                background: subdivisionsEnabled ? '#FFD700' : 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {subdivisionsEnabled && <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#fff' }} />}
              </div>
              <span style={{ fontSize: '15px', fontWeight: '600', color: subdivisionsEnabled ? '#FFD700' : 'rgba(255,255,255,0.5)' }}>
                🎵 Subdivisions (Shaker)
              </span>
            </button>
          </div>
        </div>

        {/* Pattern Builder */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '2px solid rgba(139, 69, 19, 0.3)',
          borderRadius: '20px',
          padding: '40px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h2 style={{ fontSize: '28px', color: '#D2691E', margin: 0, fontWeight: '700' }}>
              Rhythmus & Handsatz
            </h2>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={resetPattern}
                style={{
                  background: 'rgba(255, 107, 107, 0.2)',
                  border: '1px solid rgba(255, 107, 107, 0.5)',
                  color: '#FF6B6B',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <RotateCcw size={18} />Reset
              </button>
              <button
                onClick={copyPattern}
                style={{
                  background: 'rgba(78, 205, 196, 0.2)',
                  border: '1px solid rgba(78, 205, 196, 0.5)',
                  color: '#4ECDC4',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <Copy size={18} />Kopieren
              </button>
            </div>
          </div>

          {/* Legend */}
          <div style={{
            display: 'flex', gap: '20px', marginBottom: '30px', padding: '16px',
            background: 'rgba(0,0,0,0.3)', borderRadius: '12px', flexWrap: 'wrap'
          }}>
            {symbols.map((symbol, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '40px', height: '40px',
                  background: getStepColor(idx),
                  border: `2px solid ${getStepTextColor(idx)}`,
                  borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '24px', fontWeight: 'bold',
                  color: getStepTextColor(idx),
                  fontFamily: "'Courier New', monospace"
                }}>
                  {symbol}
                </div>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '500' }}>
                  {symbolNames[idx]}
                </span>
              </div>
            ))}
          </div>

          {/* Counting */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)', gap: '4px', marginBottom: '12px' }}>
            {counting.map((count, idx) => (
              <div key={idx} style={{
                textAlign: 'center',
                fontSize: idx % 4 === 0 ? '18px' : '14px',
                color: idx % 4 === 0 ? '#D2691E' : 'rgba(255,255,255,0.5)',
                fontWeight: idx % 4 === 0 ? '700' : '400',
                fontFamily: "'Courier New', monospace"
              }}>
                {count}
              </div>
            ))}
          </div>

          {/* Pattern Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)', gap: '4px', marginBottom: '8px' }}>
            {pattern.map((value, idx) => {
              const isCurrentStep = idx === currentStep;
              return (
                <div
                  key={idx}
                  onClick={() => handleStepClick(idx)}
                  style={{
                    height: '70px',
                    background: isCurrentStep
                      ? 'linear-gradient(135deg, rgba(255,215,0,0.5) 0%, rgba(255,165,0,0.5) 100%)'
                      : getStepColor(value),
                    border: isCurrentStep ? '4px solid #FFD700' : `3px solid ${getStepTextColor(value)}`,
                    borderRadius: '10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '32px', fontWeight: 'bold',
                    color: getStepTextColor(value),
                    cursor: 'pointer',
                    fontFamily: "'Courier New', monospace",
                    borderLeft: idx % 4 === 0 ? '4px solid rgba(210, 105, 30, 0.6)' : undefined,
                    transform: isCurrentStep ? 'scale(1.05)' : 'scale(1)',
                    boxShadow: isCurrentStep ? '0 8px 24px rgba(255,215,0,0.5)' : 'none',
                    transition: 'all 0.1s ease'
                  }}
                >
                  {symbols[value]}
                </div>
              );
            })}
          </div>

          {/* Handsatz Visualisation */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)', gap: '4px', marginBottom: '30px' }}>
            {handsatzPatterns[selectedHandsatz].pattern.map((hand, idx) => {
              const isActive = pattern[idx] > 0;
              return (
                <div
                  key={idx}
                  style={{
                    height: '40px',
                    background: isActive
                      ? (hand === 'r' ? 'rgba(255, 107, 107, 0.7)' : 'rgba(78, 205, 196, 0.7)')
                      : 'rgba(150, 150, 150, 0.15)',
                    border: isActive
                      ? `3px solid ${hand === 'r' ? '#FF6B6B' : '#4ECDC4'}`
                      : '2px solid rgba(150, 150, 150, 0.3)',
                    borderRadius: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px', fontWeight: 'bold',
                    color: isActive ? (hand === 'r' ? '#FF6B6B' : '#4ECDC4') : '#666',
                    fontFamily: "'Courier New', monospace"
                  }}
                >
                  {hand.toUpperCase()}
                </div>
              );
            })}
          </div>

          {/* Handsatz-Auswahl */}
          <div style={{
            background: 'rgba(78, 205, 196, 0.08)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h3 style={{
              fontSize: '16px', color: '#4ECDC4', margin: '0 0 12px 0', fontWeight: '700',
              display: 'flex', alignItems: 'center', gap: '10px'
            }}>
              <Hand size={20} /> Handsatz: {handsatzPatterns[selectedHandsatz].name}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
              {Object.entries(handsatzPatterns).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => setSelectedHandsatz(key)}
                  style={{
                    background: selectedHandsatz === key ? 'rgba(78, 205, 196, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                    border: `2px solid ${selectedHandsatz === key ? '#4ECDC4' : 'rgba(255,255,255,0.1)'}`,
                    color: selectedHandsatz === key ? '#4ECDC4' : 'rgba(255,255,255,0.6)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '13px'
                  }}
                >
                  {value.name}
                </button>
              ))}
            </div>
          </div>

          {/* Presets */}
          <div>
            <h3 style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)', marginBottom: '12px', fontWeight: '600' }}>
              Schnell-Presets:
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {presetPatterns.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => loadPreset(preset.pattern)}
                  style={{
                    background: 'rgba(139, 69, 19, 0.2)',
                    border: '1px solid rgba(139, 69, 19, 0.5)',
                    color: '#CD853F',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '14px'
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(78, 205, 196, 0.1) 0%, rgba(139, 69, 19, 0.1) 100%)',
          border: '2px solid rgba(78, 205, 196, 0.3)',
          borderRadius: '16px',
          padding: '24px'
        }}>
          <h3 style={{ fontSize: '18px', color: '#4ECDC4', marginBottom: '16px', fontWeight: '700' }}>
            🎵 Handpan Übungs-Begleitung
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', margin: '0 0 8px 0' }}>
                <strong style={{ color: '#4ECDC4' }}>Percussion Sounds:</strong>
              </p>
              <ul style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.8', margin: 0, paddingLeft: '20px' }}>
                <li><strong>x</strong> = Fingersnap (leicht, neutral)</li>
                <li><strong>X</strong> = Hand Clap (Akzent)</li>
                <li><strong>!</strong> = Bass Drum (starker Akzent)</li>
              </ul>
            </div>
            <div>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', margin: '0 0 8px 0' }}>
                <strong style={{ color: '#FFD700' }}>Orientierungshilfen:</strong>
              </p>
              <ul style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.8', margin: 0, paddingLeft: '20px' }}>
                <li><strong>Metronom</strong> = Woodblock auf Vierteln (1,2,3,4)</li>
                <li><strong>Subdivisions</strong> = Shaker auf allen 16teln (sehr leise)</li>
              </ul>
            </div>
          </div>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: '16px 0 0 0', textAlign: 'center', fontStyle: 'italic' }}>
            💡 Klicke auf jeden Step, um zwischen Pause → Fingersnap → Hand Clap → Bass Drum zu wechseln
          </p>
        </div>
      </div>

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #FFD700;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(255, 215, 0, 0.5);
        }
        input[type="range"]::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #FFD700;
          cursor: pointer;
          border: none;
          box-shadow: 0 4px 12px rgba(255, 215, 0, 0.5);
        }
      `}</style>
    </div>
  );
}
