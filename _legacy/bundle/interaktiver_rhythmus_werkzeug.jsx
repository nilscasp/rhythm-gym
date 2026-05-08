import React, { useState, useEffect } from 'react';
import { Hand, Target, Volume2, Zap, Palette, RotateCcw, Copy, Download } from 'lucide-react';

export default function InteractiveRhythmusWerkzeug() {
  // Pattern state: 0 = Pause, 1 = Normal, 2 = Akzent, 3 = Stark
  const [pattern, setPattern] = useState(Array(16).fill(0));
  const [activeTool, setActiveTool] = useState('handsatz');
  const [selectedHandsatz, setSelectedHandsatz] = useState('rlrl');
  const [accentShift, setAccentShift] = useState(0);
  const [dynamics, setDynamics] = useState(Array(16).fill(1)); // 0=p, 1=mf, 2=f

  const symbols = ['.', 'x', 'X', '!'];
  const symbolNames = ['Pause', 'Normal', 'Akzent', 'Stark'];
  const counting = [
    '1', 'e', '+', 'a',
    '2', 'e', '+', 'a',
    '3', 'e', '+', 'a',
    '4', 'e', '+', 'a'
  ];

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
    { name: 'Backbeat', pattern: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0] },
    { name: 'Tresillo', pattern: [1,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0] }
  ];

  // Click step to cycle through values
  const handleStepClick = (index) => {
    const newPattern = [...pattern];
    newPattern[index] = (newPattern[index] + 1) % 4;
    setPattern(newPattern);
  };

  // Reset pattern
  const resetPattern = () => {
    setPattern(Array(16).fill(0));
  };

  // Load preset
  const loadPreset = (preset) => {
    setPattern(preset);
  };

  // Apply accent shift
  const applyAccentShift = (shift) => {
    setAccentShift(shift);
  };

  // Get color for step
  const getStepColor = (value) => {
    const colors = [
      'rgba(150, 150, 150, 0.2)', // Pause
      'rgba(78, 205, 196, 0.6)',  // Normal
      'rgba(255, 107, 107, 0.8)',  // Akzent
      'rgba(255, 215, 0, 1)'       // Stark
    ];
    return colors[value];
  };

  // Get text color for step
  const getStepTextColor = (value) => {
    const colors = [
      '#888',     // Pause
      '#4ECDC4',  // Normal
      '#FF6B6B',  // Akzent
      '#FFD700'   // Stark
    ];
    return colors[value];
  };

  // Copy pattern to clipboard
  const copyPattern = () => {
    const patternString = pattern.map(v => symbols[v]).join('');
    navigator.clipboard.writeText(patternString);
    alert('Pattern kopiert: ' + patternString);
  };

  // Get active hits (non-pause positions)
  const activeHits = pattern.map((v, i) => v > 0 ? i : -1).filter(i => i >= 0);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      fontFamily: "'Inter', sans-serif",
      padding: '40px 20px',
      color: '#fff'
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto 60px',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: '800',
          background: 'linear-gradient(135deg, #8B4513 0%, #D2691E 50%, #CD853F 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '16px',
          letterSpacing: '-1px'
        }}>
          Interaktiver Rhythmus-Baukasten
        </h1>
        <p style={{
          fontSize: '20px',
          color: 'rgba(255,255,255,0.7)',
          maxWidth: '700px',
          margin: '0 auto'
        }}>
          Baue deinen Rhythmus und wende die Werkzeuge direkt an
        </p>
      </div>

      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'grid',
        gap: '30px'
      }}>
        {/* Pattern Builder */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '2px solid rgba(139, 69, 19, 0.3)',
          borderRadius: '20px',
          padding: '40px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '30px'
          }}>
            <h2 style={{
              fontSize: '28px',
              color: '#D2691E',
              margin: '0',
              fontWeight: '700'
            }}>
              1. Rhythmus aufbauen
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease'
                }}
              >
                <RotateCcw size={18} />
                Reset
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease'
                }}
              >
                <Copy size={18} />
                Kopieren
              </button>
            </div>
          </div>

          {/* Legend */}
          <div style={{
            display: 'flex',
            gap: '20px',
            marginBottom: '30px',
            padding: '16px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '12px'
          }}>
            {symbols.map((symbol, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: getStepColor(idx),
                  border: `2px solid ${getStepTextColor(idx)}`,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: getStepTextColor(idx),
                  fontFamily: "'Courier New', monospace"
                }}>
                  {symbol}
                </div>
                <span style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  {symbolNames[idx]}
                </span>
              </div>
            ))}
          </div>

          {/* Counting row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(16, 1fr)',
            gap: '4px',
            marginBottom: '12px'
          }}>
            {counting.map((count, idx) => (
              <div key={idx} style={{
                textAlign: 'center',
                fontSize: idx % 4 === 0 ? '16px' : '13px',
                color: idx % 4 === 0 ? '#D2691E' : 'rgba(255,255,255,0.5)',
                fontWeight: idx % 4 === 0 ? '700' : '400',
                fontFamily: "'Courier New', monospace"
              }}>
                {count}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(16, 1fr)',
            gap: '4px',
            marginBottom: '30px'
          }}>
            {pattern.map((value, idx) => (
              <div
                key={idx}
                onClick={() => handleStepClick(idx)}
                style={{
                  height: '80px',
                  background: getStepColor(value),
                  border: `3px solid ${getStepTextColor(value)}`,
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '36px',
                  fontWeight: 'bold',
                  color: getStepTextColor(value),
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: "'Courier New', monospace",
                  position: 'relative',
                  borderLeft: idx % 4 === 0 ? '4px solid rgba(210, 105, 30, 0.6)' : undefined
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = `0 8px 24px ${getStepTextColor(value)}40`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {symbols[value]}
              </div>
            ))}
          </div>

          {/* Presets */}
          <div>
            <h3 style={{
              fontSize: '16px',
              color: 'rgba(255,255,255,0.7)',
              marginBottom: '12px',
              fontWeight: '600'
            }}>
              Schnell-Presets:
            </h3>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
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
                    fontSize: '14px',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(139, 69, 19, 0.4)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(139, 69, 19, 0.2)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tool Selection */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '16px',
          marginBottom: '20px'
        }}>
          {[
            { id: 'handsatz', icon: Hand, label: 'Handsätze', color: '#4ECDC4' },
            { id: 'akzent', icon: Target, label: 'Akzente', color: '#FF6B6B' },
            { id: 'dynamik', icon: Volume2, label: 'Dynamik', color: '#A0522D' }
          ].map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                style={{
                  background: isActive 
                    ? `linear-gradient(135deg, ${tool.color}40 0%, ${tool.color}20 100%)`
                    : 'rgba(255, 255, 255, 0.05)',
                  border: `2px solid ${isActive ? tool.color : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '16px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <Icon size={32} color={isActive ? tool.color : '#888'} />
                <span style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: isActive ? tool.color : '#888'
                }}>
                  {tool.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tool Application */}
        {activeTool === 'handsatz' && (
          <div style={{
            background: 'rgba(78, 205, 196, 0.1)',
            border: '2px solid rgba(78, 205, 196, 0.3)',
            borderRadius: '20px',
            padding: '40px'
          }}>
            <h2 style={{
              fontSize: '28px',
              color: '#4ECDC4',
              marginBottom: '30px',
              fontWeight: '700'
            }}>
              2. Handsatz anwenden
            </h2>

            {/* Handsatz Selection */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              marginBottom: '30px'
            }}>
              {Object.entries(handsatzPatterns).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => setSelectedHandsatz(key)}
                  style={{
                    background: selectedHandsatz === key 
                      ? 'rgba(78, 205, 196, 0.3)' 
                      : 'rgba(255, 255, 255, 0.05)',
                    border: `2px solid ${selectedHandsatz === key ? '#4ECDC4' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{
                    fontSize: '14px',
                    color: '#4ECDC4',
                    fontWeight: '700',
                    marginBottom: '8px'
                  }}>
                    {value.name}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.5)',
                    fontFamily: "'Courier New', monospace",
                    letterSpacing: '1px'
                  }}>
                    {value.pattern.slice(0, 8).join(' ')}
                  </div>
                </button>
              ))}
            </div>

            {/* Handsatz Visualization */}
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '16px',
              padding: '30px'
            }}>
              <h3 style={{
                fontSize: '18px',
                color: '#4ECDC4',
                marginBottom: '20px',
                fontWeight: '600'
              }}>
                Dein Pattern mit {handsatzPatterns[selectedHandsatz].name}:
              </h3>

              {/* Counting */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(16, 1fr)',
                gap: '4px',
                marginBottom: '12px'
              }}>
                {counting.map((count, idx) => (
                  <div key={idx} style={{
                    textAlign: 'center',
                    fontSize: idx % 4 === 0 ? '14px' : '11px',
                    color: idx % 4 === 0 ? '#4ECDC4' : 'rgba(255,255,255,0.4)',
                    fontWeight: idx % 4 === 0 ? '700' : '400',
                    fontFamily: "'Courier New', monospace"
                  }}>
                    {count}
                  </div>
                ))}
              </div>

              {/* Pattern row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(16, 1fr)',
                gap: '4px',
                marginBottom: '16px'
              }}>
                {pattern.map((value, idx) => (
                  <div
                    key={idx}
                    style={{
                      height: '60px',
                      background: getStepColor(value),
                      border: `2px solid ${getStepTextColor(value)}`,
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '28px',
                      fontWeight: 'bold',
                      color: getStepTextColor(value),
                      fontFamily: "'Courier New', monospace",
                      borderLeft: idx % 4 === 0 ? '4px solid rgba(78, 205, 196, 0.6)' : undefined
                    }}
                  >
                    {symbols[value]}
                  </div>
                ))}
              </div>

              {/* Handsatz row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(16, 1fr)',
                gap: '4px'
              }}>
                {handsatzPatterns[selectedHandsatz].pattern.map((hand, idx) => {
                  const isActive = pattern[idx] > 0;
                  return (
                    <div
                      key={idx}
                      style={{
                        height: '60px',
                        background: isActive 
                          ? (hand === 'r' ? 'rgba(255, 107, 107, 0.3)' : 'rgba(78, 205, 196, 0.3)')
                          : 'rgba(150, 150, 150, 0.1)',
                        border: isActive 
                          ? `3px solid ${hand === 'r' ? '#FF6B6B' : '#4ECDC4'}`
                          : '2px solid rgba(150, 150, 150, 0.3)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: isActive 
                          ? (hand === 'r' ? '#FF6B6B' : '#4ECDC4')
                          : '#555',
                        fontFamily: "'Courier New', monospace",
                        opacity: isActive ? 1 : 0.3,
                        borderLeft: idx % 4 === 0 ? '4px solid rgba(78, 205, 196, 0.6)' : undefined
                      }}
                    >
                      {hand.toUpperCase()}
                    </div>
                  );
                })}
              </div>

              {/* Hand Legend */}
              <div style={{
                display: 'flex',
                gap: '24px',
                marginTop: '24px',
                justifyContent: 'center'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'rgba(255, 107, 107, 0.3)',
                    border: '3px solid #FF6B6B',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#FF6B6B'
                  }}>
                    R
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>Rechts</span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'rgba(78, 205, 196, 0.3)',
                    border: '3px solid #4ECDC4',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#4ECDC4'
                  }}>
                    L
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>Links</span>
                </div>
              </div>

              {/* Active hits info */}
              <div style={{
                marginTop: '24px',
                padding: '16px',
                background: 'rgba(78, 205, 196, 0.1)',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <span style={{
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.7)'
                }}>
                  {activeHits.length} aktive Schläge • 
                  {' '}{activeHits.filter((_, i) => handsatzPatterns[selectedHandsatz].pattern[activeHits[i]] === 'r').length} rechts • 
                  {' '}{activeHits.filter((_, i) => handsatzPatterns[selectedHandsatz].pattern[activeHits[i]] === 'l').length} links
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTool === 'akzent' && (
          <div style={{
            background: 'rgba(255, 107, 107, 0.1)',
            border: '2px solid rgba(255, 107, 107, 0.3)',
            borderRadius: '20px',
            padding: '40px'
          }}>
            <h2 style={{
              fontSize: '28px',
              color: '#FF6B6B',
              marginBottom: '20px',
              fontWeight: '700'
            }}>
              2. Akzente verschieben
            </h2>
            <p style={{
              color: 'rgba(255,255,255,0.7)',
              marginBottom: '30px'
            }}>
              Verschiebe die Akzente um verschiedene rhythmische Schwerpunkte zu schaffen.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '12px',
              marginBottom: '30px'
            }}>
              {[0, 1, 2, 3, 4].map((shift) => (
                <button
                  key={shift}
                  onClick={() => applyAccentShift(shift)}
                  style={{
                    background: accentShift === shift 
                      ? 'rgba(255, 107, 107, 0.3)' 
                      : 'rgba(255, 255, 255, 0.05)',
                    border: `2px solid ${accentShift === shift ? '#FF6B6B' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    color: accentShift === shift ? '#FF6B6B' : '#888',
                    fontWeight: '700',
                    transition: 'all 0.3s ease'
                  }}
                >
                  +{shift} Steps
                </button>
              ))}
            </div>

            {/* Shifted pattern visualization */}
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '16px',
              padding: '30px'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(16, 1fr)',
                gap: '4px'
              }}>
                {pattern.map((value, idx) => {
                  const shiftedIdx = (idx + accentShift) % 16;
                  const shiftedValue = pattern[shiftedIdx];
                  return (
                    <div
                      key={idx}
                      style={{
                        height: '80px',
                        background: getStepColor(shiftedValue),
                        border: `3px solid ${getStepTextColor(shiftedValue)}`,
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '36px',
                        fontWeight: 'bold',
                        color: getStepTextColor(shiftedValue),
                        fontFamily: "'Courier New', monospace",
                        borderLeft: idx % 4 === 0 ? '4px solid rgba(255, 107, 107, 0.6)' : undefined
                      }}
                    >
                      {symbols[shiftedValue]}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTool === 'dynamik' && (
          <div style={{
            background: 'rgba(160, 82, 45, 0.1)',
            border: '2px solid rgba(160, 82, 45, 0.3)',
            borderRadius: '20px',
            padding: '40px'
          }}>
            <h2 style={{
              fontSize: '28px',
              color: '#A0522D',
              marginBottom: '20px',
              fontWeight: '700'
            }}>
              2. Dynamik gestalten
            </h2>
            <p style={{
              color: 'rgba(255,255,255,0.7)',
              marginBottom: '30px'
            }}>
              Klicke auf aktive Schläge, um die Lautstärke zu variieren: p (leise) → mf (mittel) → f (laut)
            </p>

            <div style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '16px',
              padding: '30px'
            }}>
              {/* Counting */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(16, 1fr)',
                gap: '4px',
                marginBottom: '12px'
              }}>
                {counting.map((count, idx) => (
                  <div key={idx} style={{
                    textAlign: 'center',
                    fontSize: idx % 4 === 0 ? '14px' : '11px',
                    color: idx % 4 === 0 ? '#A0522D' : 'rgba(255,255,255,0.4)',
                    fontWeight: idx % 4 === 0 ? '700' : '400',
                    fontFamily: "'Courier New', monospace"
                  }}>
                    {count}
                  </div>
                ))}
              </div>

              {/* Pattern with dynamics */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(16, 1fr)',
                gap: '4px',
                marginBottom: '16px'
              }}>
                {pattern.map((value, idx) => {
                  const dynamicLevel = dynamics[idx]; // 0=p, 1=mf, 2=f
                  const dynamicLabels = ['p', 'mf', 'f'];
                  const dynamicSizes = [0.6, 1, 1.4];
                  
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (value > 0) {
                          const newDynamics = [...dynamics];
                          newDynamics[idx] = (newDynamics[idx] + 1) % 3;
                          setDynamics(newDynamics);
                        }
                      }}
                      style={{
                        height: '80px',
                        background: getStepColor(value),
                        border: `3px solid ${getStepTextColor(value)}`,
                        borderRadius: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: `${36 * dynamicSizes[dynamicLevel]}px`,
                        fontWeight: 'bold',
                        color: getStepTextColor(value),
                        fontFamily: "'Courier New', monospace",
                        cursor: value > 0 ? 'pointer' : 'default',
                        borderLeft: idx % 4 === 0 ? '4px solid rgba(160, 82, 45, 0.6)' : undefined,
                        position: 'relative'
                      }}
                    >
                      <div>{symbols[value]}</div>
                      {value > 0 && (
                        <div style={{
                          fontSize: '11px',
                          color: '#A0522D',
                          fontWeight: '700',
                          marginTop: '4px'
                        }}>
                          {dynamicLabels[dynamicLevel]}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Dynamic legend */}
              <div style={{
                display: 'flex',
                gap: '24px',
                justifyContent: 'center',
                padding: '16px',
                background: 'rgba(160, 82, 45, 0.1)',
                borderRadius: '12px'
              }}>
                {['p (piano)', 'mf (mezzo forte)', 'f (forte)'].map((label, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '14px'
                  }}>
                    <div style={{
                      width: '30px',
                      height: '30px',
                      border: '2px solid #A0522D',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: `${12 + idx * 4}px`,
                      fontWeight: '700',
                      color: '#A0522D'
                    }}>
                      x
                    </div>
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        * {
          box-sizing: border-box;
        }
        
        button {
          font-family: 'Inter', sans-serif;
        }
      `}</style>
    </div>
  );
}
