'use client';

// ─────────────────────────────────────────────────────────────────────────────
// GrafikGalerie — alle Übersichtsgrafiken eines Tages.
//
// Vorher zeigte die Tagesseite nur die erste overview_*-Grafik; Tage mit
// mehreren Übungen (Tag 21: Übung A/B/C) verloren den Rest. Jetzt: eine große
// Grafik, darunter Vorschaubilder zum Umschalten, jede mit Beschriftung aus dem
// Dateinamen. Eine einzelne Grafik bleibt ohne Vorschauleiste.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { grafikCaption } from './grafik-caption';

interface GrafikGalerieProps {
  images: readonly string[];
  dayNumber: number;
}

export function GrafikGalerie({ images, dayNumber }: GrafikGalerieProps) {
  const [index, setIndex] = useState(0);
  if (images.length === 0) return null;
  const current = images[Math.min(index, images.length - 1)];
  const caption = grafikCaption(current);

  return (
    <figure className="gg-wrap">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current}
        alt={`Tag ${dayNumber} · ${caption}`}
        className="gg-main"
      />
      <figcaption className="gg-caption">
        {images.length > 1 ? `${index + 1} / ${images.length} · ` : ''}
        {caption}
      </figcaption>

      {images.length > 1 ? (
        <div className="gg-thumbs" role="tablist" aria-label="Grafiken dieses Tages">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              role="tab"
              aria-selected={i === index}
              className={i === index ? 'gg-thumb gg-thumb--active' : 'gg-thumb'}
              onClick={() => setIndex(i)}
              title={grafikCaption(src)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" />
              <span className="gg-thumb-label">{grafikCaption(src)}</span>
            </button>
          ))}
        </div>
      ) : null}

      <style>{`
        .gg-wrap {
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
        }
        .gg-main {
          width: 100%;
          height: auto;
          display: block;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 6px;
        }
        .gg-caption {
          font-family: var(--font-ui);
          font-size: 12px;
          letter-spacing: 1px;
          color: var(--muted);
        }
        .gg-thumbs {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
          scroll-snap-type: x proximity;
        }
        .gg-thumb {
          flex: 0 0 132px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 4px;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 6px;
          cursor: pointer;
          scroll-snap-align: start;
          text-align: left;
        }
        .gg-thumb--active {
          border-color: var(--amber);
        }
        .gg-thumb img {
          width: 100%;
          height: auto;
          display: block;
          border-radius: 3px;
        }
        .gg-thumb-label {
          font-family: var(--font-ui);
          font-size: 11px;
          line-height: 1.25;
          color: var(--cream);
        }
        .gg-thumb--active .gg-thumb-label {
          color: var(--amber);
        }
      `}</style>
    </figure>
  );
}
