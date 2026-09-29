// ─────────────────────────────────────────────────────────────────────────────
// Bunny-Stream-Player fernsteuern — schlanker player.js-Client.
//
// Das Bunny-iframe spricht das player.js-Protokoll (JSON per postMessage,
// context "player.js"). Statt das gehostete Script nachzuladen, sprechen wir
// das Protokoll direkt: drei Methoden und ein Event reichen für die Übe-Station.
//
// Geprüft am 28.09.2026 gegen iframe.mediadelivery.net:
//   - setCurrentTime / play / pause / getPaused funktionieren
//   - timeupdate liefert { seconds, duration }, aber nur, wenn der Listener
//     NACH dem ready-Event angemeldet wird (vorher verwirft der Player ihn)
//   - setPlaybackRate kennt der Player nicht → Tempo über das eingebaute
//     Zahnrad-Menü (Embed-Param showSpeed=true), nicht über diese API
// ─────────────────────────────────────────────────────────────────────────────

const CONTEXT = 'player.js'
const VERSION = '0.0.11'
const ORIGIN = 'https://iframe.mediadelivery.net'

interface PlayerMessage {
  context: string
  event?: string
  value?: unknown
  listener?: string
}

export interface BunnyPlayer {
  play(): void
  pause(): void
  seek(seconds: number): void
  /** Abmelden aller Listener — beim Unmount aufrufen. */
  destroy(): void
}

interface Handlers {
  onReady?: () => void
  onTimeUpdate?: (seconds: number, duration: number) => void
}

export function connectBunnyPlayer(iframe: HTMLIFrameElement, handlers: Handlers): BunnyPlayer {
  let ready = false
  const queue: Record<string, unknown>[] = []

  const post = (msg: Record<string, unknown>) => {
    iframe.contentWindow?.postMessage(
      JSON.stringify({ context: CONTEXT, version: VERSION, ...msg }),
      ORIGIN,
    )
  }
  // Befehle vor ready puffern, damit ein früher Kapitel-Klick nicht verpufft.
  const send = (msg: Record<string, unknown>) => {
    if (ready) post(msg)
    else queue.push(msg)
  }

  const onMessage = (e: MessageEvent) => {
    if (e.origin !== ORIGIN || e.source !== iframe.contentWindow) return
    let data: PlayerMessage
    try {
      data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
    } catch {
      return
    }
    if (!data || data.context !== CONTEXT) return

    switch (data.event) {
      case 'ready':
        if (ready) return
        ready = true
        post({ method: 'addEventListener', value: 'timeupdate', listener: 'rg-time' })
        queue.splice(0).forEach(post)
        handlers.onReady?.()
        break
      case 'timeupdate': {
        const v = data.value as { seconds?: number; duration?: number } | undefined
        if (typeof v?.seconds === 'number') handlers.onTimeUpdate?.(v.seconds, v.duration ?? 0)
        break
      }
    }
  }

  window.addEventListener('message', onMessage)
  // Hat der Player sein ready schon gesendet, bevor wir zuhörten, holt ein
  // ready-Listener es nach (der Receiver antwortet sofort, wenn er bereit ist).
  const askReady = () => post({ method: 'addEventListener', value: 'ready', listener: 'rg-ready' })
  iframe.addEventListener('load', askReady)
  askReady()

  return {
    play: () => send({ method: 'play' }),
    pause: () => send({ method: 'pause' }),
    seek: (seconds) => send({ method: 'setCurrentTime', value: seconds }),
    destroy: () => {
      window.removeEventListener('message', onMessage)
      iframe.removeEventListener('load', askReady)
    },
  }
}
