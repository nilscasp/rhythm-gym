// Wellenwetter für das Logo-Meer der Anmeldung (components/RosetteSea.tsx).
//
// Das Meer wechselt von selbst zwischen Stimmungen (Dünung, Kreuzsee, Wind,
// Stille, Ringe) und blendet weich über. Dazu fallen hin und wieder Tropfen,
// deren Ringe sich ausbreiten. Alle Maße in Netz-Einheiten: x quer, z in die
// Tiefe, 1 = Abstand zweier Logos. Höhe h ohne Einheit, etwa −0,5 … 0,5.
//
// Rein rechnend, ohne DOM — darum testbar (tests/sea-weather.test.ts).

interface Train {
  a: number // Höhe
  kx: number // Wellenzahl quer, rad je Netz-Einheit
  kz: number // Wellenzahl in die Tiefe
  w: number // Kreisfrequenz, rad/s
  p: number // Phase
}

interface Rings {
  a: number
  /** Mittelpunkt relativ zur Bildmitte (x) und zum Horizont-fernen Bereich (z) */
  cx: number
  cz: number
  k: number
  w: number
}

export interface Mood {
  name: string
  trains: Train[]
  rings?: Rings
  /** Tropfen je Sekunde */
  drops: number
  /** wie schnell der Lichtschimmer zieht (1 = 14 s je Durchgang) */
  light: number
}

export const MOODS: Mood[] = [
  {
    name: 'duenung',
    trains: [
      { a: 0.17, kx: 0.12, kz: 0.33, w: 0.5, p: 0 },
      { a: 0.08, kx: -0.2, kz: 0.45, w: 0.7, p: 1.7 },
      { a: 0.04, kx: 0.6, kz: 0.75, w: 1.2, p: 4.1 },
    ],
    drops: 0.04,
    light: 1,
  },
  {
    name: 'kreuzsee',
    trains: [
      { a: 0.13, kx: 0.4, kz: 0.3, w: 0.75, p: 0.4 },
      { a: 0.13, kx: -0.4, kz: 0.3, w: 0.75, p: 2.3 },
      { a: 0.04, kx: 0, kz: 0.9, w: 1.3, p: 5 },
    ],
    drops: 0.02,
    light: 0.8,
  },
  {
    name: 'wind',
    trains: [
      { a: 0.24, kx: 0.2, kz: 0.5, w: 1.0, p: 0.9 },
      { a: 0.13, kx: -0.5, kz: 0.7, w: 1.35, p: 3.1 },
      { a: 0.07, kx: 0.9, kz: 1.1, w: 1.9, p: 0.2 },
    ],
    drops: 0,
    light: 1.6,
  },
  {
    name: 'stille',
    trains: [{ a: 0.05, kx: 0.08, kz: 0.2, w: 0.3, p: 0 }],
    drops: 0.3,
    light: 0.5,
  },
  {
    name: 'ringe',
    trains: [{ a: 0.04, kx: 0.15, kz: 0.25, w: 0.4, p: 1 }],
    rings: { a: 0.16, cx: 0, cz: 34, k: 0.55, w: 0.9 },
    drops: 0.05,
    light: 0.7,
  },
]

const HOLD_MIN = 20 // s, Dauer einer Stimmung
const HOLD_MAX = 40
const BLEND = 9 // s, Überblendung

interface Drop {
  x: number
  z: number
  t0: number
}

const DROP_LIFE = 8 // s
const DROP_SPEED = 2.6 // Netz-Einheiten je Sekunde
const DROP_K = 1.1
const DROP_A = 0.2

const smooth = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u))

/** Zufall, der für Tests festgelegt werden kann. */
export type Rand = () => number

export class SeaWeather {
  private seq: { mood: number; start: number }[] = []
  private drops: Drop[] = []
  private nextDrop = 0

  constructor(
    private rand: Rand = Math.random,
    first = 0
  ) {
    this.seq.push({ mood: first, start: 0 })
  }

  /** Reihenfolge bis `t` fortschreiben; nie dieselbe Stimmung zweimal hintereinander. */
  private extend(t: number) {
    let last = this.seq[this.seq.length - 1]
    while (last.start <= t) {
      const hold = HOLD_MIN + this.rand() * (HOLD_MAX - HOLD_MIN)
      let next = Math.floor(this.rand() * (MOODS.length - 1))
      if (next >= last.mood) next++
      last = { mood: next, start: last.start + hold }
      this.seq.push(last)
    }
    // Altes vergessen
    while (this.seq.length > 3 && this.seq[1].start + BLEND < t) this.seq.shift()
  }

  /** Gewicht je Stimmung zur Zeit `t` (Summe 1). */
  weights(t: number): number[] {
    this.extend(t)
    const w = new Array(MOODS.length).fill(0)
    // aktive Stimmung: die letzte, deren Start ≤ t; die nächste blendet ab (start − BLEND) ein
    let cur = 0
    for (let i = 0; i < this.seq.length; i++) if (this.seq[i].start <= t) cur = i
    const now = this.seq[cur]
    const next = this.seq[cur + 1]
    const u = next ? smooth((t - (next.start - BLEND)) / BLEND) : 0
    w[now.mood] += 1 - u
    if (next) w[next.mood] += u
    return w
  }

  /**
   * Zustand für ein Bild: Höhenfunktion, Stärke zum Normieren und Takt des
   * Lichtschimmers. `area` = sichtbarer Bereich in Netz-Einheiten, in den
   * neue Tropfen fallen.
   */
  frame(t: number, area: { xMax: number; zMin: number; zMax: number }) {
    const w = this.weights(t)
    const active = MOODS.map((m, i) => ({ m, g: w[i] })).filter((e) => e.g > 0.001)

    // Tropfen: Takt aus der gemischten Stimmung
    const rate = active.reduce((s, e) => s + e.g * e.m.drops, 0)
    if (rate > 0 && t >= this.nextDrop) {
      if (this.nextDrop > 0) {
        const z = area.zMin + this.rand() * (area.zMax - area.zMin)
        const x = (this.rand() * 2 - 1) * area.xMax * (z / area.zMax)
        this.drops.push({ x, z, t0: t })
      }
      this.nextDrop = t + (-Math.log(1 - this.rand() * 0.999) / rate)
    }
    this.drops = this.drops.filter((d) => t - d.t0 < DROP_LIFE)
    const drops = this.drops

    // langsames Atmen der Stärke, damit auch eine Stimmung nicht gleich bleibt
    const swell = 1 + 0.22 * Math.sin(t / 23) + 0.1 * Math.sin(t / 7.3 + 1)
    const amp =
      swell *
        active.reduce(
          (s, e) => s + e.g * (e.m.trains.reduce((q, tr) => q + tr.a, 0) + (e.m.rings?.a ?? 0)),
          0
        ) || 0.05
    const light = active.reduce((s, e) => s + e.g * e.m.light, 0)

    const height = (x: number, z: number): number => {
      let h = 0
      for (const { m, g } of active) {
        let hm = 0
        for (const tr of m.trains) hm += tr.a * Math.sin(tr.kx * x + tr.kz * z - tr.w * t + tr.p)
        if (m.rings) {
          const r = m.rings
          const d = Math.hypot(x - r.cx, z - r.cz)
          hm += r.a * Math.sin(r.k * d - r.w * t)
        }
        h += g * hm
      }
      h *= swell
      for (const d of drops) {
        const age = t - d.t0
        const dist = Math.hypot(x - d.x, z - d.z)
        const front = dist - DROP_SPEED * age
        if (front > 3 || front < -9) continue
        const env = Math.exp(-(front * front) / 6) * Math.exp(-age / 3)
        h += DROP_A * env * Math.cos(DROP_K * front)
      }
      return h
    }

    return { height, amp, light, weights: w }
  }
}
