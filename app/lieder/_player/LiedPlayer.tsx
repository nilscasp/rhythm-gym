'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Player, type PlayConfig } from '../../lib/lieder/engine'
import { renderHandpan, type PanView } from '../../lib/lieder/handpan'
import {
  cellAt,
  emptyMeasure,
  locate,
  nextHitStep,
  stepOfMeasure,
  totalSteps,
  type Cell,
  type Hand,
  type Hit,
  type NoteRef,
  type Song,
} from '../../lib/lieder/model'
import { padsFor, type Pad } from '../../lib/lieder/scales'
import { renderTab, type TabRender } from '../../lib/lieder/tab'
import { PLAYER_CSS } from './player-css'

// ─────────────────────────────────────────────────────────────────────────────
// Der Lieder-Player: Tab und Handpan, Wiedergabe zum Mitspielen.
//
//   · Tab: oben rechte Hand (Gold), unten linke Hand (Creme). Der Cursor läuft
//     durch die Zellmitte, die klingende Zahl leuchtet.
//   · Handpan: das klingende Feld ist gefüllt, das nächste trägt einen Ring.
//   · Üben: Einzählen, Metronom, Abschnitt wiederholen, Tempo, eine Hand stumm
//     schalten und selbst spielen.
//   · editable: Zelle anklicken, Zahl tippen, Handpan antippen (Werkstatt).
//
// Gezeichnet wird mit den DOM-Bausteinen aus app/lib/lieder (tab.ts,
// handpan.ts) — einmal je Lied und Breite. Bewegung (Cursor, Leuchten) läuft
// im requestAnimationFrame direkt am DOM, ohne React neu zu rendern.
// Bearbeiten ersetzt das Lied durch eine geänderte Kopie (State bleibt unveränderlich).
// ─────────────────────────────────────────────────────────────────────────────

const isTone = (h: Hit) => typeof h.n === 'number' || h.n === 'D'
const SPEEDS = [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.25]
const SYMBOLS = ['D', 'S', 'T', 'P', 'F', 'K', '*']

// Takt einfügen (nach m oder am Ende) und Abschnitte mitschieben.
function insertMeasure(s: Song, m: number, after: boolean) {
  s.measures.splice(after ? m + 1 : s.measures.length, 0, emptyMeasure(s))
  if (after) {
    for (const sec of s.sections) {
      if (sec.start > m) sec.start++
      if (sec.end > m) sec.end++
    }
  } else if (s.sections.length) s.sections[s.sections.length - 1].end = s.measures.length
  if (!s.sections.length) s.sections.push({ name: 'Teil 1', start: 0, end: s.measures.length })
}

function removeMeasure(s: Song, m: number) {
  s.measures.splice(m, 1)
  for (const sec of s.sections) {
    if (sec.start > m) sec.start--
    if (sec.end > m) sec.end--
  }
  s.sections = s.sections.filter((x) => x.end > x.start)
}

function writeCell(s: Song, step: number, hand: Hand, cell: Cell) {
  const { m, i } = locate(s, step)
  if (s.measures[m]) s.measures[m][hand][i] = cell
}

type Props = {
  song: Song
  editable?: boolean
  onChange?: (song: Song) => void
}

export function LiedPlayer({ song: initial, editable = false, onChange }: Props) {
  const [song, setSong] = useState<Song>(initial)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [bpm, setBpm] = useState(initial.bpm)
  const [liveBpm, setLiveBpm] = useState<number | null>(null)
  const [countIn, setCountIn] = useState(true)
  const [metronome, setMetronome] = useState(false)
  const [loopSection, setLoopSection] = useState<number | null>(null)
  const [muteR, setMuteR] = useState(false)
  const [muteL, setMuteL] = useState(false)
  const [count, setCount] = useState<number | null>(null)
  const [cursorStep, setCursorStep] = useState(0)
  const [selHand, setSelHand] = useState<Hand>('R')
  const [undoStack, setUndoStack] = useState<Song[]>([])

  const tabHost = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const cursorEl = useRef<HTMLDivElement>(null)
  const panSvg = useRef<SVGSVGElement>(null)
  const tabR = useRef<TabRender | null>(null)
  const pan = useRef<PanView | null>(null)
  const hot = useRef(-1)
  const lastRow = useRef<Element | null>(null)
  const digitBuf = useRef('')
  const digitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const playerRef = useRef<Player | null>(null)
  const padsRef = useRef<Pad[]>([])

  const sections = song.sections
  const pads = useMemo(() => padsFor(song, song.handpan), [song])
  const loopRange = loopSection !== null && sections[loopSection] ? { from: sections[loopSection].start, to: sections[loopSection].end } : null
  const currentSection = useMemo(() => {
    const m = locate(song, cursorStep).m
    return Math.max(0, sections.findIndex((x) => m >= x.start && m < x.end))
  }, [song, sections, cursorStep])

  const cfg: PlayConfig = {
    song,
    bpm,
    speed,
    loop: loopRange !== null,
    loopRange,
    countIn: countIn ? song.beats : 0,
    countInEachLoop: false,
    metronome,
    volume: 0.85,
    muteR,
    muteL,
  }
  const cfgRef = useRef<PlayConfig>(cfg)
  useEffect(() => {
    cfgRef.current = cfg
    padsRef.current = pads
  })

  // Player einmal je Komponente
  useEffect(() => {
    const p = new Player(
      () => cfgRef.current,
      (n) => padsRef.current.find((x) => String(x.num) === String(n))?.freq ?? null,
      (restartAt) => {
        setPlaying(false)
        setCursorStep(restartAt)
        setLiveBpm(null)
      },
    )
    playerRef.current = p
    return () => p.dispose()
  }, [])

  // ── Zeichnen ───────────────────────────────────────────────────────────────
  const loopKey = loopRange ? `${loopRange.from}-${loopRange.to}` : ''
  useEffect(() => {
    const host = tabHost.current
    const svg = panSvg.current
    if (!host || !svg) return
    const draw = () => {
      pan.current = renderHandpan(svg, pads, (n) => svg.dispatchEvent(new CustomEvent('pad', { detail: n })))
      const [from, to] = loopKey ? loopKey.split('-').map(Number) : [0, 0]
      tabR.current = renderTab(host, song, { perRow: 0, showNames: false, pads, loop: loopKey ? { from, to } : null })
      hot.current = -1
      host.dispatchEvent(new Event('drawn'))
    }
    draw()
    let t: ReturnType<typeof setTimeout>
    let lastW = host.clientWidth
    const ro = new ResizeObserver(() => {
      if (host.clientWidth === lastW) return
      lastW = host.clientWidth
      clearTimeout(t)
      t = setTimeout(draw, 120)
    })
    ro.observe(host)
    return () => {
      ro.disconnect()
      clearTimeout(t)
    }
  }, [song, pads, loopKey])

  // ── Anzeige-Helfer (lesen Refs nur in Effekten und Handlern) ───────────────
  const showPanAt = (step: number) => {
    const s = cfgRef.current.song
    const now = new Map<string, Hand>()
    const next = new Map<string, Hand>()
    const range = playerRef.current?.activeRange() ?? { from: 0, to: totalSteps(s) }
    for (const hand of ['L', 'R'] as Hand[]) {
      for (const h of cellAt(s, step, hand)) if (isTone(h)) now.set(String(h.n), hand)
      let ns = nextHitStep(s, step + 1, hand, range.to)
      if (ns === null && cfgRef.current.loop) ns = nextHitStep(s, range.from, hand, range.to)
      if (ns !== null) for (const h of cellAt(s, ns, hand)) if (isTone(h) && !next.has(String(h.n))) next.set(String(h.n), hand)
    }
    pan.current?.set(now, next)
  }

  const stepRect = (step: number, frac = 0) => {
    const g = tabR.current?.steps[step]
    const sc = scroller.current
    if (!g || !sc) return null
    const band = tabR.current!.rowBand.get(g.row)!
    const rr = g.row.getBoundingClientRect()
    const sr = sc.getBoundingClientRect()
    const top = rr.top - sr.top + sc.scrollTop
    return { row: g.row, left: rr.left - sr.left + sc.scrollLeft + g.x + frac * g.w, top, bandTop: top + band.top, bandH: band.bottom - band.top, rowH: band.height }
  }

  const setHot = (step: number) => {
    if (step === hot.current || !tabR.current) return
    tabR.current.textsByStep.get(hot.current)?.forEach((t) => t.classList.remove('hot'))
    tabR.current.textsByStep.get(step)?.forEach((t) => t.classList.add('hot'))
    hot.current = step
  }

  const placeCursor = (step: number, frac: number) => {
    const r = stepRect(step, frac + 0.5)
    const c = cursorEl.current
    if (!r || !c) return
    c.hidden = false
    c.style.transform = `translate(${r.left}px, ${r.bandTop}px)`
    c.style.height = `${r.bandH}px`
    if (r.row !== lastRow.current) {
      lastRow.current = r.row
      const sc = scroller.current!
      if (r.top < sc.scrollTop + 16 || r.top + r.rowH > sc.scrollTop + sc.clientHeight - 16) {
        sc.scrollTo({ top: r.top - sc.clientHeight * 0.2, behavior: 'smooth' })
      }
    }
  }

  // Die Handfunktionen ändern sich je Rendern; Effekte holen sie über diesen Ref.
  const fx = useRef({ showPanAt, placeCursor, setHot })
  useEffect(() => {
    fx.current = { showPanAt, placeCursor, setHot }
  })

  // Auswahl sichtbar machen, wenn nicht gespielt wird (auch nach jedem Neuzeichnen)
  useEffect(() => {
    if (playing) return
    const host = tabHost.current
    if (!host) return
    const mark = () => {
      host.querySelectorAll('.cell-hit.sel').forEach((e) => e.classList.remove('sel'))
      host.querySelector(`.cell-hit[data-step="${cursorStep}"][data-hand="${selHand}"]`)?.classList.add('sel')
      fx.current.showPanAt(cursorStep)
    }
    mark()
    host.addEventListener('drawn', mark)
    return () => host.removeEventListener('drawn', mark)
  }, [cursorStep, selHand, playing, song, loopKey])

  // Bewegung beim Abspielen
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let lastBpm = 0
    const cursor = cursorEl.current
    const frame = () => {
      const pl = playerRef.current
      if (!pl) return
      const p = pl.position()
      if (p.kind === 'count') {
        setCount(p.beatsLeft)
        // Beim Einzählen schon das Tempo der Stelle zeigen, an der es losgeht
        const b = pl.bpmAt(p.step)
        if (b !== lastBpm) {
          lastBpm = b
          setLiveBpm(b)
        }
      } else if (p.kind === 'play') {
        setCount(null)
        const step = Math.floor(p.pos)
        fx.current.placeCursor(step, p.pos - step)
        fx.current.setHot(step)
        fx.current.showPanAt(step)
        const b = pl.bpmAt(step)
        if (b !== lastBpm) {
          lastBpm = b
          setLiveBpm(b)
        }
      }
      raf = requestAnimationFrame(frame)
    }
    tabHost.current?.querySelectorAll('.cell-hit.sel').forEach((e) => e.classList.remove('sel'))
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      setCount(null)
      fx.current.setHot(-1)
      if (cursor) cursor.hidden = true
    }
  }, [playing])

  useEffect(() => {
    playerRef.current?.retime()
  }, [speed, bpm])

  // ── Steuerung ──────────────────────────────────────────────────────────────
  const togglePlay = async () => {
    const pl = playerRef.current
    if (!pl) return
    if (pl.playing) {
      const at = pl.stop()
      if (at !== null) setCursorStep(at)
      setPlaying(false)
      setLiveBpm(null)
    } else {
      lastRow.current = null
      await pl.play(cursorStep)
      setPlaying(true)
      // Schmale Bildschirme: Handpan und Tab ins Bild holen (unter der Kopfleiste)
      const stage = scroller.current?.parentElement
      if (stage && window.innerWidth < 1000) {
        window.scrollTo({ top: stage.getBoundingClientRect().top + window.scrollY - 72, behavior: 'smooth' })
      }
    }
  }

  const goTo = (step: number) => {
    const pl = playerRef.current
    setCursorStep(step)
    if (pl?.playing) {
      pl.stop()
      lastRow.current = null
      void pl.play(step)
    }
  }

  const jumpToSection = (i: number) => {
    const sec = sections[i]
    if (!sec) return
    const step = stepOfMeasure(song, sec.start)
    goTo(step)
    requestAnimationFrame(() => {
      const r = stepRect(step)
      if (r && scroller.current) scroller.current.scrollTo({ top: r.top - 24, behavior: 'smooth' })
    })
  }

  const toggleLoop = () => {
    if (loopSection !== null) setLoopSection(null)
    else {
      setLoopSection(currentSection)
      const sec = sections[currentSection]
      if (sec && !playing) setCursorStep(stepOfMeasure(song, sec.start))
    }
  }

  // ── Bearbeiten: immer eine geänderte Kopie ─────────────────────────────────
  const update = (change: (s: Song) => void, withUndo = true) => {
    if (withUndo) setUndoStack((u) => [...u.slice(-99), song])
    setSong((prev) => {
      const next = structuredClone(prev)
      change(next)
      return next
    })
  }

  // Geändertes Lied nach außen melden (nicht beim ersten Rendern)
  const firstSong = useRef(song)
  useEffect(() => {
    if (song !== firstSong.current) onChange?.(song)
  }, [song, onChange])

  const setCell = (cell: Cell, withUndo = true) => update((s) => writeCell(s, cursorStep, selHand, cell), withUndo)

  const onPad = (n: NoteRef) => {
    void playerRef.current?.preview(n)
    if (!editable || playerRef.current?.playing) return
    const cur = cellAt(song, cursorStep, selHand)
    setCell(cur.some((h) => h.n === n) ? cur.filter((h) => h.n !== n) : [...cur, { n }])
  }

  // Die Handpan meldet Antippen als DOM-Ereignis; der aktuelle Handler hängt sich je Rendern an.
  useEffect(() => {
    const svg = panSvg.current
    if (!svg) return
    const handler = (e: Event) => onPad((e as CustomEvent<NoteRef>).detail)
    svg.addEventListener('pad', handler)
    return () => svg.removeEventListener('pad', handler)
  })

  const undo = () => {
    const prev = undoStack[undoStack.length - 1]
    if (!prev) return
    setUndoStack((u) => u.slice(0, -1))
    setSong(prev)
  }

  const deleteMeasure = () => {
    if (song.measures.length <= 1) return
    const m = locate(song, cursorStep).m
    update((s) => removeMeasure(s, m))
    // Takte vor m bleiben, wo sie sind
    setCursorStep(stepOfMeasure(song, Math.max(0, m - 1)))
  }

  // Tasten (Handler je Rendern neu, damit er den aktuellen Stand sieht)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' || el.isContentEditable) return
      const k = e.key
      const total = totalSteps(song)
      if (k === ' ') {
        e.preventDefault()
        void togglePlay()
        return
      }
      if (k === 'ArrowRight') { e.preventDefault(); goTo(Math.min(total - 1, cursorStep + 1)); return }
      if (k === 'ArrowLeft') { e.preventDefault(); goTo(Math.max(0, cursorStep - 1)); return }
      if (!editable || playerRef.current?.playing) return
      if (k === 'ArrowUp') { e.preventDefault(); setSelHand('R'); return }
      if (k === 'ArrowDown') { e.preventDefault(); setSelHand('L'); return }
      if ((e.metaKey || e.ctrlKey) && k.toLowerCase() === 'z') { e.preventDefault(); undo(); return }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (/^[0-9]$/.test(k)) {
        e.preventDefault()
        clearTimeout(digitTimer.current)
        digitBuf.current += k
        const n = Number(digitBuf.current)
        if (digitBuf.current.length === 1) {
          if (n === 0) { digitBuf.current = ''; return }
          setCell([{ n }])
          void playerRef.current?.preview(n)
          // Zweistellige Feldnummern (10–12): kurz auf eine zweite Ziffer warten
          if (n * 10 <= pads.length - 1) digitTimer.current = setTimeout(() => (digitBuf.current = ''), 450)
          else digitBuf.current = ''
        } else {
          digitBuf.current = ''
          setCell([{ n }], false)
          void playerRef.current?.preview(n)
        }
        return
      }
      const sym = k === '*' ? '*' : k.toUpperCase()
      if (SYMBOLS.includes(sym)) {
        setCell([{ n: sym as NoteRef }])
        void playerRef.current?.preview(sym as NoteRef)
        return
      }
      if (k === 'Backspace' || k === 'Delete') { e.preventDefault(); setCell([]); return }
      if (k === '>' || k === '<') {
        const c = cellAt(song, cursorStep, selHand)
        const d = k === '>' ? 1 : -1
        if (c.length) setCell(c.map((h) => ({ ...h, dyn: Math.max(0, Math.min(4, (h.dyn ?? 2) + d)) })))
        return
      }
      if (k === 'Enter' || k === 'Tab') { e.preventDefault(); setCursorStep(Math.max(0, Math.min(total - 1, cursorStep + (e.shiftKey ? -1 : 1)))) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Klick in den Tab
  const onTabClick = (e: React.MouseEvent) => {
    const t = e.target as Element
    if (t.classList.contains('cell-hit')) {
      const step = Number(t.getAttribute('data-step'))
      const hand = t.getAttribute('data-hand') as Hand
      setSelHand(hand)
      goTo(step)
      if (!editable && !playerRef.current?.playing) cellAt(song, step, hand).forEach((h) => void playerRef.current?.preview(h.n))
    } else {
      const m = t.closest('[data-measure]')?.getAttribute('data-measure')
      if (m != null) goTo(stepOfMeasure(song, Number(m)))
    }
  }

  const tempoShown = liveBpm ?? Math.round(bpm * speed)
  const speedIdx = SPEEDS.indexOf(speed)

  return (
    <div className={`ld-player${editable ? ' is-editing' : ''}`}>
      <style>{PLAYER_CSS}</style>

      {sections.length > 1 && (
        <nav className="ld-sections" aria-label="Abschnitte">
          {sections.map((s, i) => (
            <button
              key={`${s.name}-${s.start}`}
              type="button"
              className={`ld-sec${i === currentSection ? ' is-current' : ''}${i === loopSection ? ' is-loop' : ''}`}
              onClick={() => jumpToSection(i)}
            >
              {s.name}
            </button>
          ))}
        </nav>
      )}

      <div className="ld-stage">
        <div className="ld-tab-scroll" ref={scroller}>
          <div className="ld-tab" ref={tabHost} onClick={onTabClick} />
          <div className="ld-cursor" ref={cursorEl} hidden />
        </div>
        <aside className="ld-pan">
          <svg ref={panSvg} className="ld-pan-svg" role="img" aria-label="Handpan von oben" />
          {count !== null && <div className="ld-count" aria-live="assertive">{count}</div>}
          <p className="ld-legend">
            <span><i className="ld-dot ld-dot--r" />rechte Hand</span>
            <span><i className="ld-dot ld-dot--l" />linke Hand</span>
            <span><i className="ld-ring" />als Nächstes</span>
          </p>
        </aside>
      </div>

      {editable && (
        <div className="ld-editbar" role="toolbar" aria-label="Bearbeiten">
          <span className="ld-edit-hint">
            Zelle wählen, Zahl tippen oder die Handpan antippen. D Ding · S Slap · P Palm · F Faust · Entf löschen · ↑↓ Hand · &gt; &lt; lauter/leiser
          </span>
          <div className="ld-edit-actions">
            <button type="button" className="ld-chip" onClick={() => update((s) => insertMeasure(s, locate(s, cursorStep).m, true))}>+ Takt danach</button>
            <button type="button" className="ld-chip" onClick={() => update((s) => insertMeasure(s, 0, false))}>+ Takt am Ende</button>
            <button type="button" className="ld-chip" onClick={deleteMeasure}>Takt löschen</button>
            <button type="button" className="ld-chip" onClick={undo} disabled={!undoStack.length}>Rückgängig</button>
          </div>
        </div>
      )}

      <div className="ld-transport" role="toolbar" aria-label="Wiedergabe">
        <button type="button" className={`ld-play${playing ? ' is-playing' : ''}`} onClick={togglePlay} aria-label={playing ? 'Pause' : 'Abspielen'}>
          {playing ? (
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" /><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
          )}
        </button>

        <div className="ld-tempo">
          <span className="ld-tempo-num">♩ {tempoShown}</span>
          <div className="ld-speed">
            <button type="button" aria-label="Langsamer" disabled={speedIdx <= 0} onClick={() => setSpeed(SPEEDS[Math.max(0, speedIdx - 1)])}>−</button>
            <span>{Math.round(speed * 100)} %</span>
            <button type="button" aria-label="Schneller" disabled={speedIdx >= SPEEDS.length - 1} onClick={() => setSpeed(SPEEDS[Math.min(SPEEDS.length - 1, speedIdx + 1)])}>+</button>
          </div>
        </div>

        <div className="ld-toggles">
          <button type="button" className={`ld-chip${loopSection !== null ? ' is-on' : ''}`} onClick={toggleLoop} aria-pressed={loopSection !== null}>
            {loopSection !== null ? `Wiederholen: ${sections[loopSection]?.name ?? ''}` : 'Abschnitt wiederholen'}
          </button>
          <button type="button" className={`ld-chip${countIn ? ' is-on' : ''}`} onClick={() => setCountIn((v) => !v)} aria-pressed={countIn}>Einzählen</button>
          <button type="button" className={`ld-chip${metronome ? ' is-on' : ''}`} onClick={() => setMetronome((v) => !v)} aria-pressed={metronome}>Metronom</button>
          <button type="button" className={`ld-chip ld-chip--r${muteR ? ' is-on' : ''}`} onClick={() => setMuteR((v) => !v)} aria-pressed={muteR} title="Die rechte Hand schweigt, du spielst sie selbst">Rechts selbst</button>
          <button type="button" className={`ld-chip ld-chip--l${muteL ? ' is-on' : ''}`} onClick={() => setMuteL((v) => !v)} aria-pressed={muteL} title="Die linke Hand schweigt, du spielst sie selbst">Links selbst</button>
          {editable && (
            <label className="ld-bpm">
              Grundtempo
              <input
                type="number"
                min={20}
                max={300}
                value={bpm}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  if (v >= 20 && v <= 300) {
                    setBpm(v)
                    update((s) => { s.bpm = v }, false)
                  }
                }}
              />
            </label>
          )}
        </div>
      </div>
    </div>
  )
}
