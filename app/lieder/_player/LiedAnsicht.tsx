'use client'

import { useMemo } from 'react'
import { parseSong, type Song, type SongSource } from '../../lib/lieder/model'
import { LiedPlayer } from './LiedPlayer'

// Liest den gespeicherten Tab im Browser ein und zeigt ihn im Player.
// Ein Tab außerhalb der Grenzen (TAB_LIMITS) wird nicht gezeichnet.
export function LiedAnsicht({ source, id }: { source: SongSource; id: string }) {
  const song = useMemo<Song | null>(() => {
    try {
      return parseSong({ ...source, id })
    } catch {
      return null
    }
  }, [source, id])
  if (!song) return <p className="cr-notice" role="alert">Dieser Tab lässt sich nicht anzeigen.</p>
  return <LiedPlayer song={song} />
}
