'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PracticeVideo — Tagesvideo als Übe-Station.
//
// Unter dem Bunny-Video eine Kapitelliste (eine Marke je Aufgabe): Klick
// springt hin und spielt ab, „Abschnitt wiederholen" hält das Video in der
// aktuellen Aufgabe, „Selbst üben" pausiert und lädt das passende Preset im
// DayPlayer. Ohne Kapitel ist das ein schlichtes Video wie vorher.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { Repeat } from 'lucide-react';
import { connectBunnyPlayer, type BunnyPlayer } from '../../../lib/bunny-player';
import type { VideoChapter } from '../../../../data/rhythmusfundament-days';
import { BunnyVideoEmbed } from './BunnyVideoEmbed';
import { requestPreset } from './practice-bridge';
import { chapterIndexAt, loopStep } from './practice-loop';

interface PracticeVideoProps {
  videoId: string;
  title: string;
  chapters?: readonly VideoChapter[];
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function PracticeVideo({ videoId, title, chapters = [] }: PracticeVideoProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerRef = useRef<BunnyPlayer | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loop, setLoop] = useState(false);

  // Die Schleife liest im timeupdate-Handler — Refs statt State-Closure.
  const loopRef = useRef({ on: false, index: -1 });

  const hasChapters = chapters.length > 0;

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !hasChapters) return;

    const player = connectBunnyPlayer(iframe, {
      onTimeUpdate: (seconds, duration) => {
        const loopState = loopRef.current;
        if (loopState.on && loopState.index >= 0) {
          const step = loopStep(chapters, loopState.index, seconds, duration);
          loopState.index = step.loopIndex;
          if (step.seekTo !== undefined) {
            player.seek(step.seekTo);
            // Am Videoende pausiert der Player — weiterspielen lassen.
            player.play();
            return;
          }
        }
        setActiveIndex(chapterIndexAt(chapters, seconds));
      },
    });
    playerRef.current = player;
    return () => {
      player.destroy();
      playerRef.current = null;
    };
  }, [chapters, hasChapters]);

  const jumpTo = (i: number) => {
    const player = playerRef.current;
    if (!player) return;
    loopRef.current.index = i;
    setActiveIndex(i);
    player.seek(chapters[i].start);
    player.play();
  };

  const toggleLoop = () => {
    const next = !loop;
    setLoop(next);
    loopRef.current = { on: next, index: activeIndex >= 0 ? activeIndex : 0 };
  };

  const practiceSelf = (presetId: string) => {
    playerRef.current?.pause();
    requestPreset(presetId);
  };

  return (
    <div className="pv-wrap">
      <BunnyVideoEmbed videoId={videoId} title={title} iframeRef={iframeRef} />

      {hasChapters ? (
        <div className="pv-station">
          <div className="pv-head">
            <span className="pv-kicker">Aufgaben im Video</span>
            <button
              type="button"
              className={loop ? 'pv-loop pv-loop--on' : 'pv-loop'}
              aria-pressed={loop}
              onClick={toggleLoop}
            >
              <Repeat size={14} aria-hidden />
              Abschnitt wiederholen
            </button>
          </div>

          <ol className="pv-list">
            {chapters.map((c, i) => {
              const active = i === activeIndex;
              return (
                <li
                  key={`${c.start}-${c.label}`}
                  className={['pv-item', c.sub && 'pv-item--sub', active && 'pv-item--active'].filter(Boolean).join(' ')}
                >
                  <button
                    type="button"
                    className="pv-jump"
                    aria-current={active ? 'true' : undefined}
                    onClick={() => jumpTo(i)}
                  >
                    <span className="pv-time">{formatTime(c.start)}</span>
                    <span className="pv-label">{c.label}</span>
                  </button>
                  {c.presetId ? (
                    <button
                      type="button"
                      className="pv-self"
                      onClick={() => practiceSelf(c.presetId as string)}
                    >
                      Selbst üben →
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}

      <style>{`
        .pv-wrap {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .pv-station {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-family: var(--font-body);
        }
        .pv-head {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .pv-kicker {
          font-family: var(--font-ui);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--muted);
        }
        .pv-loop {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 40px;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--cream);
          font-family: var(--font-ui);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 1px;
          cursor: pointer;
        }
        .pv-loop--on {
          border-color: var(--amber);
          color: var(--amber);
          background: var(--amber-dim, rgba(245, 166, 35, 0.12));
        }
        .pv-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .pv-item {
          display: flex;
          align-items: stretch;
          gap: 6px;
          border: 1px solid transparent;
          border-radius: 6px;
        }
        .pv-item--sub {
          margin-left: 22px;
        }
        .pv-item--sub .pv-jump {
          min-height: 40px;
          font-size: 14px;
          color: var(--muted);
        }
        .pv-item--sub.pv-item--active .pv-jump {
          color: var(--cream);
        }
        .pv-item--active {
          border-color: var(--amber);
          background: var(--amber-dim, rgba(245, 166, 35, 0.12));
        }
        .pv-jump {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: baseline;
          gap: 12px;
          min-height: 44px;
          padding: 10px 12px;
          background: transparent;
          border: none;
          color: var(--cream);
          text-align: left;
          cursor: pointer;
          font-size: 15px;
          line-height: 1.35;
        }
        .pv-time {
          font-family: var(--font-ui);
          font-variant-numeric: tabular-nums;
          font-weight: 700;
          color: var(--amber);
          flex-shrink: 0;
        }
        .pv-label {
          min-width: 0;
        }
        .pv-self {
          flex-shrink: 0;
          margin: 6px;
          padding: 8px 12px;
          border-radius: 6px;
          border: none;
          background: var(--amber);
          color: var(--black);
          font-family: var(--font-ui);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 1px;
          cursor: pointer;
          white-space: nowrap;
        }
        @media (max-width: 480px) {
          .pv-jump {
            gap: 10px;
            padding: 10px;
          }
          .pv-self {
            align-self: center;
            margin: 4px;
            padding: 8px 10px;
          }
        }
      `}</style>
    </div>
  );
}
