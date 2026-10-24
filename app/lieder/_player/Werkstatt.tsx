'use client'

import { useRef, useState } from 'react'
import { DIFFICULTIES, LIMITS, checkTab } from '../../lib/lieder'
import { parseSong, songToSource, type Song, type SongSource } from '../../lib/lieder/model'
import { importPan } from '../../lib/lieder/pan-import'
import { HANDPANS } from '../../lib/lieder/scales'
import { submitSongAction } from '../_actions'
import { LiedPlayer } from './LiedPlayer'

// ─────────────────────────────────────────────────────────────────────────────
// Werkstatt: ein Lied neu schreiben, eine Datei hochladen oder ein eigenes
// Lied ändern. Das Ergebnis geht als Schreibform (SongSource) an submitSongAction.
// ─────────────────────────────────────────────────────────────────────────────

const GRIDS = [
  { label: '4/4 · Achtel', beats: 4, sub: 2 },
  { label: '4/4 · Sechzehntel', beats: 4, sub: 4 },
  { label: '3/4 · Achtel', beats: 3, sub: 2 },
  { label: '6/8 · Triolen', beats: 2, sub: 3 },
]

function blankSong(handpan: string, beats: number, sub: number): Song {
  const n = beats * sub
  const line = Array.from({ length: n }, () => '.').join(' ')
  return parseSong({
    id: 'neu',
    title: '',
    artist: '',
    difficulty: 'Leicht',
    handpan,
    bpm: 80,
    beats,
    sub,
    sections: [{ name: 'Teil 1', measures: Array.from({ length: 4 }, () => ({ R: line, L: line })) }],
  })
}

function serialize(song: Song): string {
  const src = songToSource(song)
  delete src.custom
  delete src.privat
  return JSON.stringify(src)
}

export function Werkstatt({ initial, id }: { initial?: SongSource; id?: string }) {
  const [song, setSong] = useState<Song | null>(() => (initial ? parseSong({ ...initial, id: id ?? 'lied' }) : null))
  const [key, setKey] = useState(0)
  const [handpan, setHandpan] = useState(HANDPANS[0].id)
  const [grid, setGrid] = useState(0)
  const [fileError, setFileError] = useState<string | null>(null)
  const [over, setOver] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const start = (s: Song) => {
    setSong(s)
    setKey((k) => k + 1)
    setFileError(null)
  }

  const readFile = async (f: File) => {
    try {
      let s: Song
      if (f.name.toLowerCase().endsWith('.pan')) {
        // Eigenes Lied aus Notepan: wird nur nach Bestätigung und Freigabe geteilt.
        s = importPan(await f.arrayBuffer())
        delete s.privat
      } else {
        const checked = checkTab(JSON.parse(await f.text()))
        if (!checked.ok) throw new Error(checked.error)
        s = checked.song
      }
      start(s)
    } catch {
      setFileError('Diese Datei kann ich nicht lesen. Erlaubt sind Tabs als .json (Handpan Tabs) oder .pan (Notepan).')
    }
  }

  // Bei jedem Rendern frisch: Bearbeiten ändert das Lied an Ort und Stelle.
  const tabJson = song ? serialize(song) : ''

  if (!song) {
    return (
      <div className="ld-choice">
        <section className="ld-empty">
          <p className="ld-h2">Neu schreiben</p>
          <p className="ld-hint">Wähle deine Handpan und das Raster. Dann tippst du die Felder Zelle für Zelle ein.</p>
          <label className="ld-field" style={{ width: '100%' }}>
            Handpan
            <select value={handpan} onChange={(e) => setHandpan(e.target.value)}>
              {HANDPANS.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </label>
          <label className="ld-field" style={{ width: '100%' }}>
            Takt und Raster
            <select value={grid} onChange={(e) => setGrid(Number(e.target.value))}>
              {GRIDS.map((g, i) => (
                <option key={g.label} value={i}>{g.label}</option>
              ))}
            </select>
          </label>
          <button type="button" className="cr-btn" onClick={() => start(blankSong(handpan, GRIDS[grid].beats, GRIDS[grid].sub))}>
            Leeres Blatt öffnen
          </button>
        </section>
        <section
          className={`ld-drop${over ? ' is-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setOver(false)
            const f = e.dataTransfer.files?.[0]
            if (f) void readFile(f)
          }}
        >
          <p className="ld-h2">Datei hochladen</p>
          <p className="ld-hint">Einen Tab aus Handpan Tabs (.json) oder dein eigenes Lied aus Notepan (.pan) hierher ziehen.</p>
          <button type="button" className="cr-btn cr-btn--ghost" onClick={() => fileInput.current?.click()}>Datei wählen</button>
          <input ref={fileInput} type="file" accept=".json,.pan,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void readFile(f); e.target.value = '' }} />
          {fileError && <p className="cr-notice" role="alert">{fileError}</p>}
        </section>
      </div>
    )
  }

  return (
    <form className="ld-form" action={submitSongAction}>
      {id && <input type="hidden" name="id" value={id} />}
      <input type="hidden" name="tab" value={tabJson} />
      <div className="ld-form-grid">
        <label className="ld-field">
          Titel
          <input name="title" required maxLength={LIMITS.title} defaultValue={song.title} placeholder="Wie heißt dein Lied?" />
        </label>
        <label className="ld-field">
          Untertitel oder Herkunft (frei)
          <input name="artist" maxLength={LIMITS.artist} defaultValue={song.artist} placeholder="z. B. eigene Komposition, Volkslied" />
        </label>
        <label className="ld-field">
          Stufe
          <select name="difficulty" defaultValue={song.difficulty}>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
      </div>

      <LiedPlayer key={key} song={song} editable onChange={setSong} />

      <label className="ld-check">
        <input type="checkbox" name="own_work" required />
        <span>
          Das ist mein eigenes Lied oder mein eigenes Arrangement eines freien Stücks. Ich teile hier keine Tabs von
          anderen Künstlerinnen und Künstlern.
        </span>
      </label>
      <p className="ld-hint">Nach dem Einreichen schaut Nils kurz drauf. Danach sehen es alle Mitglieder. Jede Änderung geht wieder in die Prüfung.</p>
      <div className="ld-actions">
        <button className="cr-btn" type="submit">{id ? 'Änderung einreichen' : 'Lied einreichen'}</button>
        {!id && (
          <button type="button" className="cr-btn cr-btn--ghost" onClick={() => setSong(null)}>Neu anfangen</button>
        )}
      </div>
    </form>
  )
}
