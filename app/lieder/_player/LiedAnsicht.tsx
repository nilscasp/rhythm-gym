'use client'

import { useMemo } from 'react'
import { parseSong, type SongSource } from '../../lib/lieder/model'
import { LiedPlayer } from './LiedPlayer'

// Liest den gespeicherten Tab im Browser ein und zeigt ihn im Player.
export function LiedAnsicht({ source, id }: { source: SongSource; id: string }) {
  const song = useMemo(() => parseSong({ ...source, id }), [source, id])
  return <LiedPlayer song={song} />
}
