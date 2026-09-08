// ─────────────────────────────────────────────────────────────────────────────
// Termine — Wanduhr ⇄ UTC (Phasenplan v2 §4)
//
// Das Admin-Formular liefert `datetime-local`: „2026-09-26T19:00", eine Wanduhr
// ohne Zone. Die Datenbank will einen echten Zeitpunkt (timestamptz). Zwischen
// beiden liegt Europe/Berlin — und der Server steht auf Vercel in UTC. Wer hier
// `new Date(local)` schreibt, legt im Sommer jeden Termin eine Stunde zu spät
// an; auffallen würde es erst, wenn niemand im Zoom-Raum sitzt.
//
// Darum ist diese Datei bewusst frei von React, Supabase und Typen aus der
// Datenbank: reine Funktionen, in tests/event-time.test.ts direkt prüfbar.
// Die Zone steht auch in event-access.ts (EVENT_TIMEZONE); hier noch einmal,
// damit dieses Modul für sich allein steht. Ändert sich die Zone je, müssen
// beide Stellen zusammen wandern.
//
// Anzeige-Formate (Datum, Uhrzeit) gehören NICHT hierher — die stehen in
// event-access.ts. Hier steht nur die Umrechnung.
// ─────────────────────────────────────────────────────────────────────────────

const BERLIN = 'Europe/Berlin'

/** Obergrenze für Serien — bewusst klein, siehe Phasenplan §4 (kein RRULE-Motor). */
export const MAX_REPEAT_WEEKS = 12

/** „2026-09-26T19:00" oder „2026-09-26T19:00:30" — das Format von `datetime-local`. */
const LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/

const DAY_MS = 24 * 60 * 60 * 1000

// Weiter als jeder Zeitzonen-Sprung, damit die Sonde sicher auf der anderen
// Seite eines Wechsels landet.
const PROBE_MS = 26 * 60 * 60 * 1000

const BERLIN_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: BERLIN,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

type WallClock = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0')
}

/**
 * Die Berliner Wanduhr zu einem Zeitpunkt, ausgedrückt als Zahl — als hätte man
 * die abgelesene Uhrzeit für UTC gehalten. Nur zum Vergleichen und Verrechnen
 * gedacht, nie als echter Zeitpunkt.
 */
function berlinWallClockValue(instant: number): number {
  const parts = BERLIN_PARTS.formatToParts(new Date(instant))
  const field = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((p) => p.type === type)
    return part ? Number(part.value) : NaN
  }
  // Manche Umgebungen schreiben Mitternacht als 24 statt 00.
  const hour = field('hour') % 24
  return Date.UTC(field('year'), field('month') - 1, field('day'), hour, field('minute'), field('second'))
}

/** Berliner Abstand zu UTC in Millisekunden zu diesem Zeitpunkt (+1 h bzw. +2 h). */
function berlinOffsetMs(instant: number): number {
  return berlinWallClockValue(instant) - instant
}

function parseLocal(local: string): WallClock {
  const match = typeof local === 'string' ? LOCAL_PATTERN.exec(local.trim()) : null
  if (!match) {
    throw new Error('Ungültige Uhrzeit (erwartet JJJJ-MM-TTTHH:MM).')
  }

  const wall: WallClock = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: match[6] ? Number(match[6]) : 0,
  }

  if (
    wall.month < 1 ||
    wall.month > 12 ||
    wall.day < 1 ||
    wall.day > 31 ||
    wall.hour > 23 ||
    wall.minute > 59 ||
    wall.second > 59
  ) {
    throw new Error('Ungültige Uhrzeit (Wert außerhalb des Kalenders).')
  }

  // Fängt den 30. Februar: Date.UTC rollt ihn stillschweigend weiter.
  const rolled = new Date(wallClockValue(wall))
  if (
    rolled.getUTCFullYear() !== wall.year ||
    rolled.getUTCMonth() !== wall.month - 1 ||
    rolled.getUTCDate() !== wall.day
  ) {
    throw new Error('Dieses Datum gibt es nicht.')
  }

  return wall
}

function wallClockValue(wall: WallClock): number {
  return Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second)
}

/**
 * Rechnet eine Berliner Wanduhrzeit („2026-09-26T19:00") in den echten
 * Zeitpunkt um und gibt ihn als ISO-String in UTC zurück.
 *
 *   Sommer: 2026-09-26T19:00 → 2026-09-26T17:00:00.000Z (MESZ, UTC+2)
 *   Winter: 2026-12-21T19:00 → 2026-12-21T18:00:00.000Z (MEZ,  UTC+1)
 *
 * Zwei Sonderfälle, beide bewusst entschieden:
 * · Die Nacht der Vorstellung im Frühjahr verschluckt eine Stunde — 02:30 am
 *   29.03.2026 gibt es nicht. Solche Eingaben rutschen nach VORN (03:30 MESZ),
 *   nie zurück: ein Termin soll nie früher stattfinden als eingetragen.
 * · Im Herbst gibt es 02:30 zweimal. Wir nehmen den ersten Durchlauf (MESZ).
 *
 * @throws wenn der String kein `datetime-local` ist oder das Datum nicht existiert.
 */
export function berlinLocalToUtcISO(local: string): string {
  const wall = wallClockValue(parseLocal(local))

  // Alle Zeitzonen-Abstände, die rund um diesen Tag gelten können.
  const offsets = new Set([
    berlinOffsetMs(wall - PROBE_MS),
    berlinOffsetMs(wall),
    berlinOffsetMs(wall + PROBE_MS),
  ])

  // Nur Zeitpunkte behalten, die tatsächlich auf die gewünschte Wanduhr zeigen.
  const candidates = [...offsets]
    .map((offset) => wall - offset)
    .filter((instant) => berlinWallClockValue(instant) === wall)
    .sort((a, b) => a - b)

  if (candidates.length > 0) {
    // Bei doppelter Stunde der frühere Durchlauf.
    return new Date(candidates[0]).toISOString()
  }

  // Verschluckte Stunde: es gibt keinen passenden Zeitpunkt. Zwei Schritte
  // konvergieren auf die Zeit direkt nach dem Sprung.
  const first = wall - berlinOffsetMs(wall)
  return new Date(wall - berlinOffsetMs(first)).toISOString()
}

/**
 * Die Gegenrichtung: echter Zeitpunkt → Berliner Wanduhr im Format von
 * `datetime-local`. Füllt das Formular beim Bearbeiten.
 */
export function utcISOToBerlinLocal(iso: string): string {
  const instant = new Date(iso).getTime()
  if (!Number.isFinite(instant)) {
    throw new Error('Ungültiger Zeitpunkt.')
  }
  const wall = new Date(berlinWallClockValue(instant))
  return (
    `${wall.getUTCFullYear()}-${pad(wall.getUTCMonth() + 1)}-${pad(wall.getUTCDate())}` +
    `T${pad(wall.getUTCHours())}:${pad(wall.getUTCMinutes())}`
  )
}

/**
 * Verschiebt eine Wanduhrzeit um ganze Wochen — im Kalender, nicht in Stunden.
 * Genau darum geht es bei Serien: „immer samstags um 19 Uhr" heißt 19 Uhr,
 * auch nach der Zeitumstellung. 7 × 24 h auf den UTC-Zeitpunkt zu addieren
 * würde die Uhrzeit ab Ende Oktober um eine Stunde verschieben.
 */
export function addWeeksToBerlinLocal(local: string, weeks: number): string {
  const wall = parseLocal(local)
  // Datumsteil ohne Uhrzeit: reine Kalender-Arithmetik, kein DST im Spiel.
  const shifted = new Date(Date.UTC(wall.year, wall.month - 1, wall.day) + weeks * 7 * DAY_MS)
  return (
    `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}` +
    `T${pad(wall.hour)}:${pad(wall.minute)}`
  )
}

/**
 * Die Zeitpunkte einer wöchentlichen Serie, beginnend bei `local`.
 * `weeks` wird auf 1 … MAX_REPEAT_WEEKS begrenzt — eine kaputte Zahl aus dem
 * Formular soll einen einzelnen Termin ergeben, nie null und nie hundert.
 */
export function weeklySeriesUtcISO(local: string, weeks: number): string[] {
  const count = Math.min(Math.max(Math.trunc(weeks) || 1, 1), MAX_REPEAT_WEEKS)
  return Array.from({ length: count }, (_, index) =>
    berlinLocalToUtcISO(addWeeksToBerlinLocal(local, index)),
  )
}
