import { communityUrl } from '../lib/community'

// Gemeinsame Bausteine der Beitrags-Seiten (Mockup „Beitrag von Nils“).

export const POST_LIST_COLUMNS = 'id, slug, title, published_at, audience'

/** „23. Oktober 2026“ in Berliner Zeit. */
export function postDateLabel(iso: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso))
}

export function NilsByline({ date }: { date: string | null }) {
  return (
    <p className="sp-byline">
      <span className="sp-avatar sp-avatar--sm" aria-hidden="true">
        N
      </span>
      <span>
        <strong>Nils</strong>
        {date ? ` · ${postDateLabel(date)}` : ''}
      </span>
    </p>
  )
}

export function WhatsappBox() {
  const url = communityUrl()
  return (
    <aside className="sp-box" aria-label="Austausch">
      <p className="sp-box-text">Möchtest du etwas dazu sagen? Schreib es in die WhatsApp-Community.</p>
      {url ? (
        <a href={url} className="cr-btn cr-btn--ghost" target="_blank" rel="noopener noreferrer">
          WhatsApp-Community öffnen
        </a>
      ) : (
        <p className="sp-note">Der Link folgt.</p>
      )}
    </aside>
  )
}
