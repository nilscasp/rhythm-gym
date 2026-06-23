'use client'

import { useState } from 'react'
import type { HandpanNote } from '../../../data/handpan-templates'

// ─────────────────────────────────────────────────────────────────────────────
// HandpanBuilder — freier Top-Down-Pan-Editor (kontrolliert).
//
// notes[0] = Ding (Zentrum, warm). Übrige = Tonfelder (sage). Der User kann
// Töne hinzufügen, umbenennen, umsortieren und entfernen — die REIHENFOLGE ist
// das, was das Playback-Mapping konsumiert (notes[0]=Ding, danach Tonfelder in
// Reihenfolge). Drag-Positionierung ist v1 bewusst weggelassen: das Canvas ist
// eine Live-Vorschau, die Liste die Bearbeitungsfläche (mobil robust).
//
// Palette gespiegelt von components/HandpanVisualizer.tsx (Ding warm, Tonfeld sage).
// ─────────────────────────────────────────────────────────────────────────────

const DING_FILL = 'rgba(232, 183, 110, 0.9)'
const DING_STROKE = 'rgba(232, 183, 110, 1)'
const TONFIELD_FILL = 'rgba(156, 169, 138, 0.82)'
const TONFIELD_STROKE = 'rgba(156, 169, 138, 1)'

/** Ringposition für neu hinzugefügte Töne (Ding im Zentrum, Rest gespreizt). */
function ringPosition(index: number): { x: number; y: number } {
  if (index === 0) return { x: 500, y: 500 }
  const angleDeg = -90 + ((index - 1) * 360) / 9
  const a = (angleDeg * Math.PI) / 180
  const radius = 300
  return {
    x: Math.round(500 + radius * Math.cos(a)),
    y: Math.round(500 + radius * Math.sin(a)),
  }
}

interface Props {
  notes: HandpanNote[]
  onNotesChange: (notes: HandpanNote[]) => void
}

export function HandpanBuilder({ notes, onNotesChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(notes[0]?.id ?? null)

  function relabel(id: string, label: string) {
    onNotesChange(notes.map((n) => (n.id === id ? { ...n, label } : n)))
  }
  function remove(id: string) {
    if (notes.length <= 1) return
    onNotesChange(notes.filter((n) => n.id !== id))
  }
  function move(id: string, dir: -1 | 1) {
    const i = notes.findIndex((n) => n.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= notes.length) return
    const next = notes.slice()
    ;[next[i], next[j]] = [next[j], next[i]]
    onNotesChange(next)
  }
  function add() {
    const pos = ringPosition(notes.length)
    const note: HandpanNote = {
      id: crypto.randomUUID(),
      label: 'C4',
      x: pos.x,
      y: pos.y,
      r: 48,
    }
    onNotesChange([...notes, note])
    setSelectedId(note.id)
  }

  return (
    <div className="inst-b">
      <style>{BUILDER_CSS}</style>

      <svg className="inst-b-canvas" viewBox="0 0 1000 1000" role="img" aria-label="Vorschau deines Handpans">
        <defs>
          <radialGradient id="inst-b-bowl" cx="50%" cy="42%" r="62%">
            <stop offset="0%" stopColor="#3a3a38" />
            <stop offset="70%" stopColor="#222220" />
            <stop offset="100%" stopColor="#161614" />
          </radialGradient>
        </defs>
        <circle cx="500" cy="500" r="488" fill="url(#inst-b-bowl)" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        {notes.map((n, i) => {
          const isDing = i === 0
          const isSel = n.id === selectedId
          return (
            <g
              key={n.id}
              className="inst-b-note"
              onClick={() => setSelectedId(n.id)}
            >
              <circle
                cx={n.x}
                cy={n.y}
                r={n.r}
                fill={isDing ? DING_FILL : TONFIELD_FILL}
                stroke={isSel ? '#ffffff' : isDing ? DING_STROKE : TONFIELD_STROKE}
                strokeWidth={isSel ? 8 : 3}
              />
              <text
                x={n.x}
                y={n.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="40"
                fontWeight="700"
                fill="#161614"
              >
                {n.label || '?'}
              </text>
            </g>
          )
        })}
      </svg>

      <ul className="inst-b-list">
        {notes.map((n, i) => (
          <li
            key={n.id}
            className={`inst-b-row${n.id === selectedId ? ' inst-b-row--sel' : ''}`}
            onClick={() => setSelectedId(n.id)}
          >
            <span className="inst-b-role">{i === 0 ? 'Ding' : `Feld ${i}`}</span>
            <input
              type="text"
              className="inst-b-pitch"
              value={n.label}
              maxLength={4}
              aria-label={i === 0 ? 'Ding-Ton' : `Tonfeld ${i}`}
              onChange={(e) => relabel(n.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault()
              }}
            />
            <span className="inst-b-ctrls">
              <button
                type="button"
                className="inst-b-icon"
                aria-label="nach oben"
                disabled={i === 0}
                onClick={() => move(n.id, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="inst-b-icon"
                aria-label="nach unten"
                disabled={i === notes.length - 1}
                onClick={() => move(n.id, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                className="inst-b-icon inst-b-icon--del"
                aria-label="entfernen"
                disabled={notes.length <= 1}
                onClick={() => remove(n.id)}
              >
                ✕
              </button>
            </span>
          </li>
        ))}
      </ul>

      <button type="button" className="inst-b-add" onClick={add}>
        + Ton hinzufügen
      </button>
      <p className="inst-b-hint">
        Reihenfolge zählt: oben das <strong>Ding</strong>, darunter die Tonfelder
        so, wie du sie spielst. Genau diese Töne erklingen später in den Rhythmen.
      </p>
    </div>
  )
}

const BUILDER_CSS = `
  .inst-b { display: flex; flex-direction: column; gap: 16px; }
  .inst-b-canvas {
    width: 100%;
    max-width: 300px;
    aspect-ratio: 1;
    margin: 0 auto;
    display: block;
    border-radius: 50%;
  }
  .inst-b-note { cursor: pointer; }
  .inst-b-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .inst-b-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--black);
    cursor: pointer;
  }
  .inst-b-row--sel { border-color: var(--amber); }
  .inst-b-role {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 11px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--muted);
    width: 56px;
    flex-shrink: 0;
  }
  .inst-b-pitch {
    flex: 1;
    min-width: 0;
    background: var(--card);
    border: 1px solid var(--border);
    color: var(--cream);
    font-size: 16px;
    font-family: 'Barlow', sans-serif;
    padding: 8px 10px;
    border-radius: 3px;
    outline: none;
  }
  .inst-b-pitch:focus { border-color: var(--amber); }
  .inst-b-ctrls { display: flex; gap: 4px; flex-shrink: 0; }
  .inst-b-icon {
    width: 34px;
    height: 34px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--cream);
    border-radius: 3px;
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
  }
  .inst-b-icon:disabled { opacity: 0.3; cursor: not-allowed; }
  .inst-b-icon--del:hover:not(:disabled) { color: var(--warm); border-color: var(--warm); }
  .inst-b-add {
    align-self: flex-start;
    background: transparent;
    border: 1px dashed var(--border);
    color: var(--amber);
    padding: 10px 16px;
    border-radius: 3px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 13px;
    letter-spacing: 1px;
    text-transform: uppercase;
    cursor: pointer;
  }
  .inst-b-add:hover { border-color: var(--amber); }
  .inst-b-hint { font-size: 12px; color: var(--muted); line-height: 1.5; margin: 0; }
  .inst-b-hint strong { color: var(--cream); }
`
