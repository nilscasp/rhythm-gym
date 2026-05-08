'use client';

import { useEffect, useRef, useState } from 'react';

const heights = [30, 55, 70, 40, 80, 45, 65, 30, 75, 50, 35, 80, 60, 45, 70, 25];
const accents = new Set([0, 4, 8, 12]); // Beat 1, 2, 3, 4

export function Waveform() {
  const [active, setActive] = useState<boolean[]>(() => heights.map(() => true));
  const [playhead, setPlayhead] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setPlayhead((p) => (p + 1) % heights.length);
    }, 200);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="lp-waveform-section">
      <div className="lp-waveform-label">16-Step Training Grid — interaktiv</div>
      <div className="lp-waveform-container">
        {heights.map((h, i) => {
          const isAccent = accents.has(i);
          const isActive = active[i];
          const isPlay = playhead === i;
          const bg = !isActive
            ? 'var(--border)'
            : isAccent
              ? 'var(--warm)'
              : 'var(--amber)';
          return (
            <div
              key={i}
              role="button"
              aria-label={`Beat ${i + 1}`}
              onClick={() => setActive((prev) => prev.map((v, idx) => (idx === i ? !v : v)))}
              style={{
                flex: 1,
                borderRadius: '2px 2px 0 0',
                background: bg,
                height: h,
                cursor: 'pointer',
                transition: 'background 0.3s, height 0.3s',
                boxShadow: isPlay
                  ? '0 0 20px rgba(245,166,35,0.8)'
                  : isActive
                    ? isAccent
                      ? '0 0 12px rgba(255,107,53,0.4)'
                      : '0 0 12px rgba(245,166,35,0.4)'
                    : 'none',
              }}
            />
          );
        })}
      </div>
      <div className="lp-beat-labels">
        {heights.map((_, i) => (
          <span key={i} className={accents.has(i) ? 'show' : ''}>
            {i + 1}
          </span>
        ))}
      </div>
    </div>
  );
}
