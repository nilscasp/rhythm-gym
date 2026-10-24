import { Synth } from './audio'
import { cellAt, index, stepOfMeasure, totalSteps, type NoteRef, type Song } from './model'

// ─────────────────────────────────────────────────────────────────────────────
// Wiedergabe eines Lieds (nur im Browser). Alle 25 ms werden die Zellen der
// nächsten 150 ms auf der Audio-Uhr eingeplant. Die Zeitachse (inkl.
// Tempowechseln) kommt aus index(song).sec; Tempo und Geschwindigkeit wirken als
// Faktor darauf. Die Oberfläche liest position() in jedem Frame.
// ─────────────────────────────────────────────────────────────────────────────

export interface PlayConfig {
  song: Song
  /** Grundtempo, das der Nutzer eingestellt hat (song.bpm = unverändert) */
  bpm: number
  speed: number
  loop: boolean
  /** Takte [von, bis) – null = ganzer Song */
  loopRange: { from: number; to: number } | null
  countIn: number
  countInEachLoop: boolean
  metronome: boolean
  volume: number
  muteR: boolean
  muteL: boolean
}

interface Anchor {
  time: number
  step: number
  factor: number
  countFrom?: number
  beatDur?: number
}

export type PlayPos =
  | { kind: 'count'; beatsLeft: number }
  | { kind: 'play'; pos: number }
  | { kind: 'idle' }

const VEL = [0.16, 0.32, 0.62, 0.85, 1]

export class Player {
  readonly synth = new Synth()
  playing = false
  private anchors: Anchor[] = []
  private nextStep = 0
  private endTime: number | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private bus: GainNode | null = null
  private range = { from: 0, to: 0 }

  constructor(
    private cfg: () => PlayConfig,
    private padFreq: (n: NoteRef) => number | null,
    private onEnd: (restartAt: number) => void,
  ) {}

  private get c() {
    return this.cfg()
  }

  factor() {
    return (this.c.bpm / this.c.song.bpm) * this.c.speed
  }

  private secAt(step: number) {
    return index(this.c.song).sec[step]
  }

  private beatDurAt(step: number) {
    const ix = index(this.c.song)
    const s = Math.min(step, ix.total - 1)
    return (ix.sec[s + 1] - ix.sec[s]) / ix.dur[s] / this.factor()
  }

  activeRange() {
    const { song, loop, loopRange } = this.c
    if (loop && loopRange) return { from: stepOfMeasure(song, loopRange.from), to: stepOfMeasure(song, loopRange.to) }
    return { from: 0, to: totalSteps(song) }
  }

  async play(fromStep: number) {
    await this.synth.resume()
    this.range = this.activeRange()
    let start = Math.floor(fromStep)
    if (start < this.range.from || start >= this.range.to) start = this.range.from
    this.bus = this.synth.bus()
    this.bus.gain.value = this.c.volume
    const t = this.synth.now + 0.12
    const bd = this.beatDurAt(start)
    const counted = this.scheduleCount(t, bd)
    this.anchors = [{ time: counted, step: start, factor: this.factor(), countFrom: this.c.countIn ? t : undefined, beatDur: bd }]
    this.nextStep = start
    this.endTime = null
    this.playing = true
    this.tick()
    this.timer = setInterval(() => this.tick(), 25)
  }

  private scheduleCount(t: number, bd: number): number {
    for (let i = 0; i < this.c.countIn; i++) {
      this.synth.click(t + i * bd, i % this.c.song.beats === 0, 0.5, this.bus!)
    }
    return t + this.c.countIn * bd
  }

  /** Hält an; liefert die Zelle, an der die Wiedergabe stand (oder null). */
  stop(): number | null {
    if (!this.playing) return null
    const p = this.position()
    this.halt()
    return p.kind === 'play' ? Math.floor(p.pos) : null
  }

  /** Anhalten ohne Positionsabfrage (auch vom Liedende aus). */
  private halt() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.playing = false
    if (this.bus) this.synth.fadeOut(this.bus, 0.25)
    this.bus = null
  }

  setVolume() {
    if (this.bus) this.bus.gain.setTargetAtTime(this.c.volume, this.synth.now, 0.03)
  }

  private timeOf(a: Anchor, step: number) {
    return a.time + (this.secAt(step) - this.secAt(a.step)) / a.factor
  }

  /** Tempo oder Geschwindigkeit geändert: ab dem nächsten Schritt neu verankern. */
  retime() {
    if (!this.playing) return
    const a = this.anchors[this.anchors.length - 1]
    this.anchors.push({ time: this.timeOf(a, this.nextStep), step: this.nextStep, factor: this.factor() })
  }

  private tick() {
    const horizon = this.synth.now + 0.15
    for (let guard = 0; guard < 1024; guard++) {
      const a = this.anchors[this.anchors.length - 1]
      const t = this.timeOf(a, this.nextStep)
      if (t > horizon) break
      if (this.nextStep >= this.range.to) {
        if (this.c.loop) {
          this.range = this.activeRange()
          let tt = t
          let countFrom: number | undefined
          let bd: number | undefined
          if (this.c.countInEachLoop && this.c.countIn) {
            countFrom = t
            bd = this.beatDurAt(this.range.from)
            tt = this.scheduleCount(t, bd)
          }
          this.anchors.push({ time: tt, step: this.range.from, factor: this.factor(), countFrom, beatDur: bd })
          if (this.anchors.length > 32) this.anchors.splice(0, this.anchors.length - 32)
          this.nextStep = this.range.from
          continue
        }
        if (this.endTime === null) this.endTime = t
        break
      }
      this.scheduleStep(this.nextStep, t)
      this.nextStep++
    }
  }

  private scheduleStep(step: number, t: number) {
    const { song, muteR, muteL, metronome } = this.c
    const out = this.bus!
    for (const hand of ['R', 'L'] as const) {
      if ((hand === 'R' && muteR) || (hand === 'L' && muteL)) continue
      const pan = hand === 'R' ? 0.22 : -0.22
      for (const hit of cellAt(song, step, hand)) {
        const vel = VEL[hit.dyn ?? 2]
        if (hit.fx === 'G') this.sound(hit.n, t - 0.035, vel * 0.5, out, pan)
        this.sound(hit.n, t, vel, out, pan, hit.fx === 'M')
      }
    }
    const beat = index(song).onBeat[step]
    if (metronome && beat >= 0) this.synth.click(t, beat === 0, 0.45, out)
  }

  private sound(n: NoteRef, t: number, vel: number, out: AudioNode, pan: number, muted = false) {
    if (typeof n === 'string' && n !== 'D') {
      this.synth.perc(n, t, vel, out, pan)
      return
    }
    const f = this.padFreq(n)
    if (f) this.synth.note(f, t, vel, out, { ding: n === 'D', pan, muted })
  }

  position(): PlayPos {
    if (!this.playing) return { kind: 'idle' }
    const now = this.synth.now
    if (this.endTime !== null && now >= this.endTime + 0.05) {
      this.halt()
      this.onEnd(this.range.from)
      return { kind: 'idle' }
    }
    let a = this.anchors[0]
    for (const x of this.anchors) if ((x.countFrom ?? x.time) <= now) a = x
    if (now < a.time) return { kind: 'count', beatsLeft: Math.ceil((a.time - now) / (a.beatDur ?? 0.5)) }
    const sec = index(this.c.song).sec
    const target = this.secAt(a.step) + (now - a.time) * a.factor
    let lo = a.step
    let hi = Math.min(this.nextStep, sec.length - 2)
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (sec[mid] <= target) lo = mid
      else hi = mid - 1
    }
    const span = sec[lo + 1] - sec[lo] || 1
    return { kind: 'play', pos: lo + Math.min(0.999, (target - sec[lo]) / span) }
  }

  /** Tempo an einer Stelle (für die Anzeige) */
  bpmAt(step: number) {
    const ix = index(this.c.song)
    const s = Math.max(0, Math.min(step, ix.total - 1))
    return Math.round(((ix.dur[s] * 60) / (ix.sec[s + 1] - ix.sec[s])) * (this.c.bpm / this.c.song.bpm))
  }

  async preview(n: NoteRef) {
    await this.synth.resume()
    const out = this.synth.bus()
    out.gain.value = this.c.volume
    this.sound(n, this.synth.now, 0.8, out, 0)
    setTimeout(() => out.disconnect(), 5000)
  }

  dispose() {
    this.stop()
  }
}
