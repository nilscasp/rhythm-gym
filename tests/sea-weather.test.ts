import { describe, expect, test } from 'bun:test'
import { MOODS, SeaWeather } from '../app/lib/sea-weather'

// fester Zufall, damit die Abfolge wiederholbar ist
function seeded(seed = 1) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const AREA = { xMax: 20, zMin: 18, zMax: 60 }

describe('Wellenwetter', () => {
  test('Gewichte ergeben zu jeder Zeit 1', () => {
    const w = new SeaWeather(seeded())
    for (let t = 0; t < 600; t += 1.7) {
      const sum = w.weights(t).reduce((a, b) => a + b, 0)
      expect(sum).toBeCloseTo(1, 6)
    }
  })

  test('mehrere Stimmungen in zehn Minuten, nie dieselbe direkt hintereinander', () => {
    const w = new SeaWeather(seeded(7))
    const seen: number[] = []
    for (let t = 0; t < 600; t += 0.5) {
      const ws = w.weights(t)
      const top = ws.indexOf(Math.max(...ws))
      if (seen[seen.length - 1] !== top) seen.push(top)
    }
    expect(new Set(seen).size).toBeGreaterThanOrEqual(3)
    for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1])
  })

  test('Überblendung ist weich: zwischen zwei Bildern ändert sich kein Gewicht sprunghaft', () => {
    const w = new SeaWeather(seeded(3))
    let prev = w.weights(0)
    for (let t = 1 / 30; t < 300; t += 1 / 30) {
      const cur = w.weights(t)
      for (let i = 0; i < cur.length; i++) expect(Math.abs(cur[i] - prev[i])).toBeLessThan(0.02)
      prev = cur
    }
  })

  test('Höhe bleibt im Rahmen und ändert sich mit der Zeit', () => {
    const w = new SeaWeather(seeded(5))
    const a = w.frame(10, AREA)
    const h1 = a.height(3, 25)
    const b = w.frame(11, AREA)
    const h2 = b.height(3, 25)
    expect(Math.abs(h1)).toBeLessThan(1)
    expect(h1).not.toBe(h2)
  })

  test('in der Stille fallen Tropfen und machen Ringe', () => {
    const still = MOODS.findIndex((m) => m.name === 'stille')
    const w = new SeaWeather(seeded(9), still)
    // ohne Tropfen ist die Stille fast glatt; mit Tropfen gibt es Ausschläge
    let maxH = 0
    for (let t = 0; t < 18; t += 1 / 10) {
      const f = w.frame(t, AREA)
      for (let x = -15; x <= 15; x += 1.5) for (let z = 18; z <= 60; z += 2) maxH = Math.max(maxH, Math.abs(f.height(x, z)))
    }
    expect(maxH).toBeGreaterThan(0.08)
  })
})
