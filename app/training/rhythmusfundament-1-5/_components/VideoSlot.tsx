import { PracticeVideo } from '../../rhythmusfundament/_components/PracticeVideo'

// ─────────────────────────────────────────────────────────────────────────────
// VideoSlot — Video, wenn eine Bunny-GUID gesetzt ist, sonst ein ehrlicher
// Platzhalter. Kein Link, kein leerer Player: „Video folgt".
// Styles: RF15_CSS (.r15-video-*).
// ─────────────────────────────────────────────────────────────────────────────

export function VideoSlot({ videoId, title }: { videoId?: string; title: string }) {
  if (videoId) {
    return (
      <div className="r15-video">
        <PracticeVideo videoId={videoId} title={title} />
      </div>
    )
  }
  return (
    <div className="r15-video-placeholder" role="note" aria-label={`${title}: Video folgt`}>
      <span className="r15-video-icon" aria-hidden="true">▶</span>
      <span className="r15-video-label">Video folgt</span>
      <span className="r15-video-title">{title}</span>
    </div>
  )
}
