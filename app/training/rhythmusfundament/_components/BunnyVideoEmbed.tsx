// ─────────────────────────────────────────────────────────────────────────────
// BunnyVideoEmbed — embed eines Bunny-Stream-Videos.
//
// Bunny liefert pro Library einen iframe-Embed unter:
//   https://iframe.mediadelivery.net/embed/{libraryId}/{videoGuid}
//
// Optional-Params (?autoplay=false&loop=false&muted=false&preload=true&responsive=true)
// werden über die Query gehängt. Library-ID kommt aus
// `NEXT_PUBLIC_BUNNY_LIBRARY_ID` — gesetzt in .env.local sobald Nils die
// Library angelegt hat.
//
// Token-Authentication (Signed URLs) — werden in einer späteren Iteration
// dazugeschraubt. Für Closed Beta reicht Domain-Restriction im
// Bunny-Dashboard (Allowed Referrers: rhythmgym.io, www.rhythmgym.io,
// localhost:3000).
// ─────────────────────────────────────────────────────────────────────────────

interface BunnyVideoEmbedProps {
  /** Bunny Video GUID — UUID Format. */
  videoId: string;
  /** Bunny Library ID — fällt zurück auf env var falls nicht übergeben. */
  libraryId?: string;
  /** Title für a11y. */
  title?: string;
}

export function BunnyVideoEmbed({
  videoId,
  libraryId,
  title = 'Rhythmus-Fundament Video',
}: BunnyVideoEmbedProps) {
  const lib = libraryId ?? process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID

  if (!lib) {
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
              font-family: 'Barlow', sans-serif;
            }
          `}</style>
        </div>
      )
    }
    return null
  }

  const src = `https://iframe.mediadelivery.net/embed/${lib}/${videoId}?autoplay=false&loop=false&muted=false&preload=true&responsive=true`

  return (
    <div className="bunny-wrap">
      <iframe
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
