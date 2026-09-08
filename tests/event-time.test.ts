import { describe, expect, test } from 'bun:test'
import {
  addWeeksToBerlinLocal,
  berlinLocalToUtcISO,
  utcISOToBerlinLocal,
  weeklySeriesUtcISO,
} from '../app/lib/event-time'

// ─────────────────────────────────────────────────────────────────────────────
// Die Zeitzonen-Tests für das Termin-Formular.
//
// `datetime-local` liefert eine Wanduhr ohne Zone. Der Server steht auf Vercel
// in UTC, Nils sitzt in Berlin. Ohne explizite Umrechnung landet ein Termin im
// Sommer eine Stunde zu spät in der Datenbank — der klassische Fehler, der erst
// auffällt, wenn niemand im Zoom-Raum ist.
//
// Sommer (MESZ, UTC+2) und Winter (MEZ, UTC+1) müssen beide stimmen, und eine
// Serie muss über den Zeitumstellungs-Sonntag hinweg die Wanduhr behalten:
// „immer samstags um 19 Uhr" heißt 19 Uhr, nicht 18 Uhr ab Ende Oktober.
// DST-Wechsel 2026: 29.03. (vor) und 25.10. (zurück).
// ─────────────────────────────────────────────────────────────────────────────

describe('berlinLocalToUtcISO', () => {
  test('Sommerzeit (MESZ, UTC+2): 19:00 Berlin ist 17:00 UTC', () => {
    expect(berlinLocalToUtcISO('2026-09-26T19:00')).toBe('2026-09-26T17:00:00.000Z')
  })

  test('Winterzeit (MEZ, UTC+1): 19:00 Berlin ist 18:00 UTC', () => {
    expect(berlinLocalToUtcISO('2026-12-21T19:00')).toBe('2026-12-21T18:00:00.000Z')
  })

  test('Sekunden im Eingabewert werden übernommen', () => {
    expect(berlinLocalToUtcISO('2026-12-21T19:00:30')).toBe('2026-12-21T18:00:30.000Z')
  })

  test('Mitternacht kippt nicht auf den Vortag', () => {
    expect(berlinLocalToUtcISO('2026-01-01T00:00')).toBe('2025-12-31T23:00:00.000Z')
    expect(berlinLocalToUtcISO('2026-07-01T00:00')).toBe('2026-06-30T22:00:00.000Z')
  })

  test('kurz vor und kurz nach dem Frühjahrs-Wechsel (29.03.2026)', () => {
    // 01:30 gibt es noch in MEZ, 03:30 schon in MESZ.
    expect(berlinLocalToUtcISO('2026-03-29T01:30')).toBe('2026-03-29T00:30:00.000Z')
    expect(berlinLocalToUtcISO('2026-03-29T03:30')).toBe('2026-03-29T01:30:00.000Z')
  })

  test('kurz vor und kurz nach dem Herbst-Wechsel (25.10.2026)', () => {
    expect(berlinLocalToUtcISO('2026-10-25T01:30')).toBe('2026-10-24T23:30:00.000Z')
    expect(berlinLocalToUtcISO('2026-10-25T03:30')).toBe('2026-10-25T02:30:00.000Z')
  })

  test('die verschluckte Stunde (02:30 am 29.03.) rutscht nach vorn statt zu kippen', () => {
    // Diese Wanduhrzeit existiert nicht. Wir landen auf 03:30 MESZ — vorwärts,
    // nie rückwärts, damit ein Termin nie vor der eingegebenen Zeit stattfindet.
    expect(berlinLocalToUtcISO('2026-03-29T02:30')).toBe('2026-03-29T01:30:00.000Z')
  })

  test('die doppelte Stunde (02:30 am 25.10.) nimmt den ersten Durchlauf (MESZ)', () => {
    expect(berlinLocalToUtcISO('2026-10-25T02:30')).toBe('2026-10-25T00:30:00.000Z')
  })

  test('unbrauchbare Eingaben werfen statt still ein falsches Datum zu liefern', () => {
    expect(() => berlinLocalToUtcISO('')).toThrow()
    expect(() => berlinLocalToUtcISO('26.09.2026 19:00')).toThrow()
    expect(() => berlinLocalToUtcISO('2026-09-26')).toThrow()
    expect(() => berlinLocalToUtcISO('2026-13-45T19:00')).toThrow()
    expect(() => berlinLocalToUtcISO('2026-02-30T19:00')).toThrow()
    expect(() => berlinLocalToUtcISO('2026-09-26T25:00')).toThrow()
  })
})

describe('utcISOToBerlinLocal', () => {
  test('ist die Umkehrung — Sommer wie Winter', () => {
    expect(utcISOToBerlinLocal('2026-09-26T17:00:00.000Z')).toBe('2026-09-26T19:00')
    expect(utcISOToBerlinLocal('2026-12-21T18:00:00.000Z')).toBe('2026-12-21T19:00')
  })

  test('Hin und zurück verändert die Wanduhr nicht', () => {
    for (const local of [
      '2026-01-15T08:05',
      '2026-06-30T23:59',
      '2026-09-26T19:00',
      '2026-12-21T19:00',
    ]) {
      expect(utcISOToBerlinLocal(berlinLocalToUtcISO(local))).toBe(local)
    }
  })

  test('Mitternacht wird als 00:00 und nicht als 24:00 geschrieben', () => {
    expect(utcISOToBerlinLocal('2025-12-31T23:00:00.000Z')).toBe('2026-01-01T00:00')
  })
})

describe('addWeeksToBerlinLocal', () => {
  test('rechnet im Kalender, nicht in Stunden', () => {
    expect(addWeeksToBerlinLocal('2026-09-26T19:00', 0)).toBe('2026-09-26T19:00')
    expect(addWeeksToBerlinLocal('2026-09-26T19:00', 1)).toBe('2026-10-03T19:00')
    expect(addWeeksToBerlinLocal('2026-09-26T19:00', 5)).toBe('2026-10-31T19:00')
  })

  test('über Monats- und Jahresgrenze', () => {
    expect(addWeeksToBerlinLocal('2026-12-26T19:00', 1)).toBe('2027-01-02T19:00')
  })
})

describe('weeklySeriesUtcISO', () => {
  test('eine Woche ergibt genau einen Termin', () => {
    expect(weeklySeriesUtcISO('2026-09-26T19:00', 1)).toEqual(['2026-09-26T17:00:00.000Z'])
  })

  test('behält die Wanduhr über den Zeitumstellungs-Sonntag (25.10.2026)', () => {
    // 24.10. ist noch MESZ (UTC+2), 31.10. schon MEZ (UTC+1). Beide Termine
    // finden um 19:00 Berliner Zeit statt — der UTC-Abstand ist 8 Tage minus
    // 23 Stunden, NICHT glatte 7 × 24 h.
    expect(weeklySeriesUtcISO('2026-10-24T19:00', 2)).toEqual([
      '2026-10-24T17:00:00.000Z',
      '2026-10-31T18:00:00.000Z',
    ])
  })

  test('behält die Wanduhr auch über den Frühjahrs-Wechsel (29.03.2026)', () => {
    expect(weeklySeriesUtcISO('2026-03-27T19:00', 2)).toEqual([
      '2026-03-27T18:00:00.000Z',
      '2026-04-03T17:00:00.000Z',
    ])
  })

  test('naives Addieren von 7 × 24 h wäre eine Stunde daneben', () => {
    const [first, second] = weeklySeriesUtcISO('2026-10-24T19:00', 2)
    const naive = new Date(new Date(first).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    expect(second).not.toBe(naive)
    expect(new Date(second).getTime() - new Date(naive).getTime()).toBe(60 * 60 * 1000)
  })

  test('zwölf Wochen am Stück, alle um dieselbe Uhrzeit', () => {
    const series = weeklySeriesUtcISO('2026-09-26T19:00', 12)
    expect(series).toHaveLength(12)
    for (const iso of series) {
      expect(utcISOToBerlinLocal(iso).slice(11)).toBe('19:00')
    }
    expect(new Set(series).size).toBe(12)
  })

  test('unsinnige Wiederholungszahlen ergeben trotzdem einen Termin', () => {
    expect(weeklySeriesUtcISO('2026-09-26T19:00', 0)).toHaveLength(1)
    expect(weeklySeriesUtcISO('2026-09-26T19:00', -3)).toHaveLength(1)
    expect(weeklySeriesUtcISO('2026-09-26T19:00', 99)).toHaveLength(12)
  })
})
