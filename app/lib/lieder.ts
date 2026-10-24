import { parseSong, songToSource, type Song, type SongSource } from './lieder/model'
import { handpanName } from './lieder/scales'

// ─────────────────────────────────────────────────────────────────────────────
// Lieder (Migration 0015): gemeinsame Bibliothek der Mitglieder, nur Marke schule.
// Rein und getestet (tests/lieder.test.ts): Fehlertexte, Prüfung eines
// hochgeladenen Tabs, Kennzahlen für die Bibliothek.
// ─────────────────────────────────────────────────────────────────────────────

export const LIEDER_ERRORS = {
  not_member: 'Die Lieder-Bibliothek gehört zur Mitgliedschaft.',
  not_admin: 'Das dürfen nur Nils und Lisa.',
  not_found: 'Dieses Lied gibt es nicht (mehr).',
  not_own_work: 'Bitte bestätige, dass es dein eigenes Lied oder Arrangement ist.',
  invalid_title: 'Gib dem Lied einen Titel (höchstens 120 Zeichen).',
  invalid_data: 'Die Datei ist kein lesbarer Handpan-Tab.',
  invalid_note: 'Die Notiz ist zu lang (höchstens 500 Zeichen).',
  changed: 'Das Lied wurde inzwischen geändert. Hör dir die neue Fassung an und entscheide dann.',
  privat_song: 'Dieser Tab ist nur zum Ausprobieren gedacht und kann nicht geteilt werden.',
  too_many_pending: 'Du hast schon zehn Lieder in der Prüfung. Warte, bis Nils sie angeschaut hat.',
  unknown: 'Das hat nicht geklappt. Versuch es bitte noch einmal.',
} as const

export type LiederError = keyof typeof LIEDER_ERRORS

export function messageFor(code: string | undefined | null): string | null {
  if (!code) return null
  return (LIEDER_ERRORS as Record<string, string>)[code] ?? LIEDER_ERRORS.unknown
}

/** Fehlercode aus einer Supabase-Fehlermeldung (die Funktionen werfen den Code als Text). */
export function errorCodeFrom(error: { message?: string } | null | undefined): LiederError {
  const msg = error?.message ?? ''
  const hit = (Object.keys(LIEDER_ERRORS) as LiederError[]).find((k) => msg.includes(k))
  return hit ?? 'unknown'
}

export const DIFFICULTIES = ['Leicht', 'Mittel', 'Schwer'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

export const STATUS_LABELS: Record<string, string> = {
  eingereicht: 'In Prüfung',
  freigegeben: 'Freigegeben',
  abgelehnt: 'Nicht freigegeben',
}

export const LIMITS = { title: 120, artist: 120, note: 500, bytes: 600_000 }

export interface SongMeta {
  title: string
  artist: string
  difficulty: Difficulty
  handpan: string
  bpm: number
  measures: number
}

/** Kennzahlen eines Lieds für die Bibliothek. */
export function metaOf(song: Song): SongMeta {
  return {
    title: song.title.trim().slice(0, LIMITS.title),
    artist: (song.artist ?? '').trim().slice(0, LIMITS.artist),
    difficulty: (DIFFICULTIES as readonly string[]).includes(song.difficulty) ? (song.difficulty as Difficulty) : 'Mittel',
    handpan: handpanName(song).slice(0, 80),
    bpm: Math.max(20, Math.min(300, Math.round(song.bpm || 80))),
    measures: song.measures.length,
  }
}

export type CheckedTab = { ok: true; source: SongSource; song: Song } | { ok: false; error: LiederError }

/**
 * Prüft einen Tab aus dem Browser, bevor er in die Datenbank geht.
 * Liest ihn einmal ein und schreibt ihn neu aus — so landet nur, was das
 * Modell versteht, in `songs.data`.
 */
export function checkTab(raw: unknown): CheckedTab {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'invalid_data' }
  const src = raw as Partial<SongSource>
  if (src.privat) return { ok: false, error: 'privat_song' }
  if (!Array.isArray(src.sections) || typeof src.beats !== 'number' || typeof src.sub !== 'number') {
    return { ok: false, error: 'invalid_data' }
  }
  try {
    const song = parseSong({ ...(src as SongSource), id: src.id || 'lied' })
    if (!song.measures.length) return { ok: false, error: 'invalid_data' }
    const source = songToSource(song)
    delete source.custom
    if (JSON.stringify(source).length > LIMITS.bytes) return { ok: false, error: 'invalid_data' }
    return { ok: true, source, song }
  } catch {
    return { ok: false, error: 'invalid_data' }
  }
}

export function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}
