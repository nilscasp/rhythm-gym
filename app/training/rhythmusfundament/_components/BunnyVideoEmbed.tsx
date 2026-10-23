// ─────────────────────────────────────────────────────────────────────────────
// BunnyVideoEmbed — embed eines Bunny-Stream-Videos.
//
// Die fertige iframe-URL kommt vom Server: `bunnyEmbedSrc(videoId)` aus
// app/lib/bunny-embed.ts — signiert (Token, 6 h gültig), sobald
// BUNNY_TOKEN_KEY gesetzt ist, sonst unsigniert wie bisher. Player-Optionen
// (u. a. showSpeed=true für die Tempo-Wahl im Zahnrad) hängt
// app/lib/bunny-token.ts an. Die Komponente bleibt rein darstellend und läuft
// deshalb auch in Client-Komponenten (PracticeVideo); der Schlüssel verlässt
// nie den Server. `src === null` heißt: NEXT_PUBLIC_BUNNY_LIBRARY_ID fehlt.
// Schutz und Einrichtung: docs/bunny-schutz.md.
// ─────────────────────────────────────────────────────────────────────────────

import type { Ref } from 'react'

interface BunnyVideoEmbedProps {
  /** Fertige Embed-URL vom Server (bunnyEmbedSrc); null ohne Library-ID. */
  src: string | null;
  /** Title für a11y. */
  title?: string;
  /** Zugriff aufs iframe für die player.js-Steuerung (PracticeVideo). */
  iframeRef?: Ref<HTMLIFrameElement>;
}

export function BunnyVideoEmbed({
  src,
  title = 'Rhythmus-Fundament Video',
  iframeRef,
}: BunnyVideoEmbedProps) {
  if (!src) {
    // Fail loud in dev, silent in prod — kein placeholder mit cryptic 404.
    if (process.env.NODE_ENV !== 'production') {
      return (
        <div className="bunny-missing">
          <strong>NEXT_PUBLIC_BUNNY_LIBRARY_ID</strong> nicht gesetzt — Video
          kann nicht gerendert werden. In `.env.local` ergänzen.
          <style>{`
            .bunny-missing {
              background: rgba(220, 50, 50, 0.1);
              border: 1px solid rgba(220, 50, 50, 0.35);
              border-radius: 6px;
              padding: 14px 16px;
              color: #ff8b8b;
              font-size: 13px;
              font-family: var(--font-body);
            }
          `}</style>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bunny-wrap">
      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        loading="lazy"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen
        className="bunny-iframe"
      />
      <style>{`
        .bunny-wrap {
          position: relative;
          width: 100%;
          padding-bottom: 56.25%; /* 16:9 */
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
        }
        .bunny-iframe {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          width: 100%;
          height: 100%;
          border: 0;
        }
      `}</style>
    </div>
  )
}
