'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { resolveTonfieldIndex } from '../app/lib/handpan-mapping';

// ─────────────────────────────────────────────────────────────────────────────
// HandpanVisualizer — top-down handpan view, glows on strike events.
//
// Topology (Standard 8 + 1):
//   • 1× Ding (center, large)
//   • 8× Tonfelder (T1..T8) on a ring around the Ding, T1 at 12 o'clock
//     then clockwise
//   • 2× Slap-Spots (Slap-L / Slap-R) between Ding and tonfeld-ring,
//     hand-specific (R = right of Ding, L = left of Ding)
//   • 2× Ghostnote-Spots (GN-L / GN-R) further outward, hand-specific
//
// Glow colors follow the rhythmen_zyklus2.json palette:
//   ding=warm brown, slap=amber/orange, tonfeld=sage green, gn=very pale cream.
// Intensity hierarchy: Ding > Slap > Tonfeld > GN.
//
// Auto-mapping for tonfeld strikes (Phase 1 — pattern notation is not yet
// extended; we resolve which tonfeld lights up from the hand + step index):
//   R-hand → rotates through T1, T3, T5, T7 (right + cross positions)
//   L-hand → rotates through T2, T4, T6, T8 (left + cross positions)
//   no hand (frei) → rotates through all 8 sequentially
// Phase 2 will allow per-step explicit T1..T8 picking from the pattern editor.
// ─────────────────────────────────────────────────────────────────────────────

type StrikeType = 'pause' | 'gn' | 'tonfeld' | 'slap' | 'ding';

const STRIKE_TYPES: readonly StrikeType[] = [
  'pause',
  'gn',
  'tonfeld',
  'slap',
  'ding',
] as const;

// Strike colors — match the canonical rhythmen_zyklus2.json palette.
const STRIKE_COLORS: Record<StrikeType, string> = {
  pause: 'transparent',
  gn: 'rgba(213, 204, 184, 1)', // very pale cream
  tonfeld: 'rgba(156, 169, 138, 1)', // sage green
  slap: 'rgba(245, 166, 35, 1)', // amber/orange
  ding: 'rgba(232, 183, 110, 1)', // warm brown lifted toward cream for contrast on dark
};

// Visual intensity per strike type (drives opacity peak + glow radius factor).
// Hierarchy: Ding > Slap > Tonfeld > GN
const STRIKE_INTENSITY: Record<StrikeType, number> = {
  pause: 0,
  gn: 0.45,
  tonfeld: 0.75,
  slap: 0.9,
  ding: 1.0,
};

const VIEW_SIZE = 400;
const CENTER = VIEW_SIZE / 2;

const PAN_OUTER_RADIUS = 188;
const PAN_INNER_RADIUS = 178;

const DING_RADIUS = 34;

const TONFELD_RING_RADIUS = 108;
const TONFELD_RADIUS = 28;
// T1 at 12 o'clock, then clockwise: T1=0°, T2=45°, … T8=315°
const TONFELD_ANGLES_DEG: readonly number[] = [0, 45, 90, 135, 180, 225, 270, 315] as const;

const SLAP_RADIUS_FROM_CENTER = 62;
const SLAP_GLYPH_RADIUS = 15;
// Slap-R at 3 o'clock (90°), Slap-L at 9 o'clock (270°)
const SLAP_R_ANGLE_DEG = 90;
const SLAP_L_ANGLE_DEG = 270;

const GN_RADIUS_FROM_CENTER = 158;
const GN_GLYPH_RADIUS = 10;
// GN spots sit between two tonfelder so they don't overlap a tonfeld disc.
// GN-R between T2 (45°) and T3 (90°) → 67.5°
// GN-L between T6 (225°) and T7 (270°) → 247.5°
const GN_R_ANGLE_DEG = 67.5;
const GN_L_ANGLE_DEG = 247.5;

function polarToCartesian(angleDeg: number, radius: number, cx = CENTER, cy = CENTER) {
  // 0° = 12 o'clock (top); positive angles go clockwise in screen space.
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

interface Spot {
  id: string;
  x: number;
  y: number;
  radius: number;
}

const TONFELD_SPOTS: readonly Spot[] = TONFELD_ANGLES_DEG.map((angle, i) => {
  const p = polarToCartesian(angle, TONFELD_RING_RADIUS);
  return { id: `T${i + 1}`, x: p.x, y: p.y, radius: TONFELD_RADIUS };
});

const DING_SPOT: Spot = { id: 'ding', x: CENTER, y: CENTER, radius: DING_RADIUS };

const SLAP_R_SPOT: Spot = {
  id: 'slap-R',
  ...polarToCartesian(SLAP_R_ANGLE_DEG, SLAP_RADIUS_FROM_CENTER),
  radius: SLAP_GLYPH_RADIUS,
};
const SLAP_L_SPOT: Spot = {
  id: 'slap-L',
  ...polarToCartesian(SLAP_L_ANGLE_DEG, SLAP_RADIUS_FROM_CENTER),
  radius: SLAP_GLYPH_RADIUS,
};
const GN_R_SPOT: Spot = {
  id: 'gn-R',
  ...polarToCartesian(GN_R_ANGLE_DEG, GN_RADIUS_FROM_CENTER),
  radius: GN_GLYPH_RADIUS,
};
const GN_L_SPOT: Spot = {
  id: 'gn-L',
  ...polarToCartesian(GN_L_ANGLE_DEG, GN_RADIUS_FROM_CENTER),
  radius: GN_GLYPH_RADIUS,
};

const ALL_SPOTS_BY_ID: Record<string, Spot> = {
  [DING_SPOT.id]: DING_SPOT,
  [SLAP_R_SPOT.id]: SLAP_R_SPOT,
  [SLAP_L_SPOT.id]: SLAP_L_SPOT,
  [GN_R_SPOT.id]: GN_R_SPOT,
  [GN_L_SPOT.id]: GN_L_SPOT,
  ...Object.fromEntries(TONFELD_SPOTS.map((s) => [s.id, s])),
};

// Tonfeld-Auflösung (welches T1..T8 leuchtet) lebt zentral in
// app/lib/handpan-mapping.ts — dieselbe Funktion nutzt der DayPlayer fürs Audio,
// damit Glow und Klang deckungsgleich bleiben.
function resolveTonfeldSpotId(stepIndex: number, hand: string | undefined): string {
  return `T${resolveTonfieldIndex(stepIndex, hand) + 1}`;
}

function resolveHandSpecificSpotId(base: 'slap' | 'gn', hand: string | undefined): string {
  // 'frei' / '—' → default to R-side so something always lights up. Acceptable
  // until pattern notation carries hand info explicitly.
  if (hand === 'L') return base === 'slap' ? 'slap-L' : 'gn-L';
  return base === 'slap' ? 'slap-R' : 'gn-R';
}

interface GlowEvent {
  id: number;
  spotId: string;
  type: StrikeType;
}

export interface HandpanVisualizerProps {
  /** Step pattern (0=pause, 1=gn, 2=tonfeld, 3=slap, 4=ding). */
  pattern: number[];
  /** Current step from the Tone.Sequence; -1 when stopped. */
  currentStep: number;
  /** 'R' | 'L' per step, or '—' when handsatz is 'frei'. */
  handsatzRow: string[];
  /** True while Tone.Transport is running. */
  isPlaying: boolean;
}

export default function HandpanVisualizer({
  pattern,
  currentStep,
  handsatzRow,
  isPlaying,
}: HandpanVisualizerProps) {
  const eventIdRef = useRef(0);
  const lastStepRef = useRef(-2);
  // Pattern / handsatzRow get held in refs so the trigger-effect can read the
  // *current* values without re-running every time the parent re-renders. The
  // earlier version had them in the effect deps + a cleanup that cancelled the
  // glow-remove setTimeout — that combination leaked glow elements when the
  // parent re-rendered (e.g. on every tick), so glows piled up to 500+ in DOM.
  const patternRef = useRef(pattern);
  const handsatzRowRef = useRef(handsatzRow);
  useEffect(() => {
    patternRef.current = pattern;
  }, [pattern]);
  useEffect(() => {
    handsatzRowRef.current = handsatzRow;
  }, [handsatzRow]);

  const [glows, setGlows] = useState<GlowEvent[]>([]);

  // Reset trail when playback stops so the first step of the next run
  // doesn't get suppressed by the equality guard below.
  useEffect(() => {
    if (!isPlaying || currentStep < 0) {
      lastStepRef.current = -2;
    }
  }, [isPlaying, currentStep]);

  // Trigger a glow event whenever currentStep advances. Deps are kept minimal
  // (currentStep + isPlaying); the live pattern / handsatzRow are pulled from
  // refs above so this effect doesn't re-run on every parent render.
  useEffect(() => {
    if (!isPlaying || currentStep < 0) return;
    if (currentStep === lastStepRef.current) return;
    lastStepRef.current = currentStep;

    const value = patternRef.current[currentStep];
    const type = STRIKE_TYPES[value as number];
    if (!type || type === 'pause') return;

    const hand = handsatzRowRef.current[currentStep];
    let spotId: string | null = null;
    if (type === 'ding') spotId = DING_SPOT.id;
    else if (type === 'slap') spotId = resolveHandSpecificSpotId('slap', hand);
    else if (type === 'gn') spotId = resolveHandSpecificSpotId('gn', hand);
    else if (type === 'tonfeld') spotId = resolveTonfeldSpotId(currentStep, hand);
    if (!spotId) return;

    eventIdRef.current += 1;
    const id = eventIdRef.current;
    setGlows((prev) => [...prev, { id, spotId, type }]);
    // No setTimeout here on purpose — each glow element removes itself via
    // onAnimationEnd below. That keeps cleanup deterministic and survives
    // mid-effect re-renders that would have cancelled a setTimeout cleanup.
  }, [currentStep, isPlaying]);

  const removeGlow = (id: number) => {
    setGlows((prev) => prev.filter((g) => g.id !== id));
  };

  // Memoize the static SVG so React doesn't re-create it on every glow update.
  const staticPan = useMemo(() => {
    return (
      <g>
        {/* Pan bowl — radial gradient suggests the brass curvature. */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={PAN_OUTER_RADIUS}
          fill="url(#hp-bowl-gradient)"
          stroke="#3A3428"
          strokeWidth={2}
        />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={PAN_INNER_RADIUS}
          fill="none"
          stroke="rgba(122,112,96,0.18)"
          strokeWidth={1}
        />

        {/* Tonfeld dimples — resting state. */}
        {TONFELD_SPOTS.map((t, i) => (
          <g key={t.id}>
            <circle
              cx={t.x}
              cy={t.y}
              r={TONFELD_RADIUS}
              fill="rgba(156,169,138,0.05)"
              stroke="rgba(156,169,138,0.28)"
              strokeWidth={1.2}
            />
            <text
              x={t.x}
              y={t.y + 4}
              textAnchor="middle"
              fontSize={11}
              fill="rgba(122,112,96,0.7)"
              fontFamily="'Barlow Condensed', sans-serif"
              fontWeight={600}
              letterSpacing="1px"
            >
              T{i + 1}
            </text>
          </g>
        ))}

        {/* Ding — resting state. */}
        <circle
          cx={DING_SPOT.x}
          cy={DING_SPOT.y}
          r={DING_RADIUS}
          fill="rgba(139,90,40,0.14)"
          stroke="rgba(232,183,110,0.45)"
          strokeWidth={1.8}
        />
        <text
          x={DING_SPOT.x}
          y={DING_SPOT.y + 4}
          textAnchor="middle"
          fontSize={12}
          fill="rgba(232,183,110,0.6)"
          fontFamily="'Barlow Condensed', sans-serif"
          fontWeight={700}
          letterSpacing="1.5px"
        >
          DING
        </text>

        {/* Slap spots — dashed marker so they read as "zone" not "tonfeld". */}
        {[SLAP_R_SPOT, SLAP_L_SPOT].map((s) => (
          <g key={s.id}>
            <circle
              cx={s.x}
              cy={s.y}
              r={s.radius}
              fill="rgba(245,166,35,0.04)"
              stroke="rgba(245,166,35,0.28)"
              strokeWidth={1}
              strokeDasharray="3 2"
            />
            <text
              x={s.x}
              y={s.y + 3}
              textAnchor="middle"
              fontSize={8}
              fill="rgba(245,166,35,0.55)"
              fontFamily="'Barlow Condensed', sans-serif"
              fontWeight={600}
              letterSpacing="1px"
            >
              S
            </text>
          </g>
        ))}

        {/* GN spots — smaller, even more dashed; barely there at rest. */}
        {[GN_R_SPOT, GN_L_SPOT].map((s) => (
          <g key={s.id}>
            <circle
              cx={s.x}
              cy={s.y}
              r={s.radius}
              fill="rgba(213,204,184,0.04)"
              stroke="rgba(213,204,184,0.25)"
              strokeWidth={0.8}
              strokeDasharray="1.5 1.5"
            />
            <text
              x={s.x}
              y={s.y + 3}
              textAnchor="middle"
              fontSize={7}
              fill="rgba(213,204,184,0.5)"
              fontFamily="'Barlow Condensed', sans-serif"
              fontWeight={600}
              letterSpacing="1px"
            >
              g
            </text>
          </g>
        ))}
      </g>
    );
  }, []);

  return (
    <div className="hp-visualizer">
      <svg
        viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
        role="img"
        aria-label="Handpan-Visualisierung: Schlagpositionen leuchten synchron zur Maschine"
      >
        <defs>
          <radialGradient id="hp-bowl-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2a2316" />
            <stop offset="55%" stopColor="#1a1610" />
            <stop offset="100%" stopColor="#0c0a06" />
          </radialGradient>
          <filter id="hp-glow-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>

        {staticPan}

        {/* Active glow events — each keyed so React mounts a fresh animated element. */}
        {glows.map((g) => {
          const spot = ALL_SPOTS_BY_ID[g.spotId];
          if (!spot) return null;
          const color = STRIKE_COLORS[g.type];
          const intensity = STRIKE_INTENSITY[g.type];
          const glowRadius = spot.radius * (1 + intensity * 0.55);
          return (
            <g key={g.id} className="hp-glow-group" pointerEvents="none">
              {/* Bloom halo — wider, blurred, low opacity peak. */}
              <circle
                cx={spot.x}
                cy={spot.y}
                r={glowRadius * 1.5}
                fill={color}
                filter="url(#hp-glow-blur)"
                className="hp-glow hp-glow--halo"
                style={{ ['--hp-glow-peak' as string]: String(intensity * 0.6) }}
              />
              {/* Core fill — sharper, higher opacity peak. Owns the
                  onAnimationEnd handler that removes this whole glow event
                  from state (its sibling halo runs the same duration). */}
              <circle
                cx={spot.x}
                cy={spot.y}
                r={glowRadius}
                fill={color}
                className="hp-glow hp-glow--core"
                style={{ ['--hp-glow-peak' as string]: String(intensity) }}
                onAnimationEnd={() => removeGlow(g.id)}
              />
            </g>
          );
        })}
      </svg>

      <style>{`
        .hp-visualizer {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .hp-visualizer svg {
          width: 100%;
          max-width: 320px;
          height: auto;
          display: block;
        }
        .hp-glow {
          opacity: 0;
          animation: hp-glow-fade 600ms ease-out forwards;
        }
        /* Halo + core animate for the same duration so the core's
           onAnimationEnd reliably tears down both at once. */
        @keyframes hp-glow-fade {
          0%   { opacity: 0; }
          12%  { opacity: var(--hp-glow-peak, 1); }
          100% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hp-glow {
            animation-duration: 320ms;
          }
        }
      `}</style>
    </div>
  );
}
