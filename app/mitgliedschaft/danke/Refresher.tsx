'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// Lädt den Stand neu, bis der Webhook freigeschaltet hat. Stripe meldet sich
// meist innerhalb weniger Sekunden; nach etwa einer Minute hören wir auf und
// sagen ehrlich, dass es länger dauert.

const EVERY_MS = 3000
const MAX_TRIES = 20

export function Refresher({ contactHref }: { contactHref: string }) {
  const router = useRouter()
  const [tries, setTries] = useState(0)

  useEffect(() => {
    if (tries >= MAX_TRIES) return
    const t = window.setTimeout(() => {
      router.refresh()
      setTries((n) => n + 1)
    }, EVERY_MS)
    return () => window.clearTimeout(t)
  }, [tries, router])

  if (tries < MAX_TRIES) {
    return (
      <p className="cr-locked-text" role="status" aria-live="polite">
        Die Seite schaut alle paar Sekunden selbst nach.
      </p>
    )
  }

  return (
    <p className="cr-locked-text" role="status" aria-live="polite">
      Das dauert länger als gewöhnlich. Die Freischaltung kommt, sobald Stripe die Zahlung
      bestätigt hat; bei einer Lastschrift kann das ein paar Tage dauern. Du kannst die Seite später
      neu laden oder{' '}
      <a href={contactHref}>Nils eine Nachricht schreiben</a>.
    </p>
  )
}
