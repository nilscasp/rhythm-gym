import { berlinLocalToUtcISO, utcISOToBerlinLocal } from './event-time'

// ─────────────────────────────────────────────────────────────────────────────
// Miteinander (Plans/umzug-von-skool.md, Abschnitt G; Migration 0013):
// Challenges, Treffen, Menschen. Kein Chat, kein Feed — gesprochen wird auf
// WhatsApp, gefunden wird hier.
//
// Rein und getestet (tests/miteinander.test.ts): Eingaben prüfen und
// normalisieren, Fehlercodes übersetzen, Daten beschriften. Die Datenbank prüft
// dieselben Grenzen noch einmal (CHECKs in 0013) — das hier ist der
// freundlichere Weg, nicht die Sicherung.
// ─────────────────────────────────────────────────────────────────────────────

export const AREAS = ['rhythmik', 'harmonik', 'komposition', 'soulset', 'frei'] as const
export type Area = (typeof AREAS)[number]
export const AREA_LABELS: Record<Area, string> = {
  rhythmik: 'Rhythmik',
  harmonik: 'Harmonik',
  komposition: 'Komposition',
  soulset: 'Soulset',
  frei: 'Frei',
}
export function isArea(value: unknown): value is Area {
  return typeof value === 'string' && (AREAS as readonly string[]).includes(value)
}

export const OPEN_FOR = ['partner', 'meetup', 'challenge'] as const
export type OpenFor = (typeof OPEN_FOR)[number]
export const OPEN_FOR_LABELS: Record<OpenFor, string> = {
  partner: 'Übe-Partner',
  meetup: 'Treffen',
  challenge: 'Challenges',
}

/** Wie in 0013 (CHECKs). Beide Stellen ändern sich nur zusammen. */
export const LIMITS = {
  displayName: 60,
  region: 80,
  about: 500,
  message: 300,
  title: 120,
  description: 1000,
  placeHint: 120,
  exactPlace: 300,
  maxMembers: 100,
  maxPeople: 200,
  rangeDays: 366,
  meetupAheadDays: 366,
} as const

/** Dauer-Auswahl im Formular „Challenge vorschlagen“ (in Tagen, Starttag zählt mit). */
export const DURATIONS = [
  { days: 7, label: '1 Woche' },
  { days: 14, label: '2 Wochen' },
  { days: 21, label: '3 Wochen' },
  { days: 30, label: '30 Tage' },
  { days: 60, label: '60 Tage' },
  { days: 90, label: '90 Tage' },
] as const

export type Result<T> = { ok: true; value: T } | { ok: false; error: MiteinanderError }

// ── Fehler ───────────────────────────────────────────────────────────────────
// Codes aus 0013 (raise exception '<code>') und aus den Prüfungen hier.

export const MITEINANDER_ERRORS = {
  // Datenbank
  not_member: 'Dieser Bereich ist für Mitglieder der Schule.',
  not_allowed: 'Das geht so leider nicht.',
  message_length: 'Schreib ein kurzes Hallo, höchstens 300 Zeichen.',
  not_visible: 'Diese Person ist gerade nicht unter „Menschen“ zu finden.',
  already_connected: 'Ihr seid schon verbunden.',
  already_pending: 'Zwischen euch ist schon eine Anfrage offen.',
  declined_recently: 'Gerade passt es nicht. Vielleicht ein anderes Mal.',
  cooldown: 'Du hast dieser Person vor kurzem schon geschrieben. Lass ihr etwas Zeit.',
  daily_limit: 'Für heute hast du genug Anfragen geschickt. Morgen geht es weiter.',
  blocked: 'Dein Zugang zu Miteinander ist gerade pausiert. Schreib Nils, wenn du Fragen hast.',
  closed_by_admin: 'Das wurde von der Schule geschlossen und lässt sich nicht wieder öffnen.',
  too_many_open: 'Du hast gerade zehn offene Anfragen. Warte, bis ein paar beantwortet sind.',
  too_many_challenges: 'Du hast schon fünf offene Challenges. Schließ eine, bevor du eine neue vorschlägst.',
  too_many_meetups: 'Du hast schon fünf kommende Treffen eingetragen. Schließ eins, bevor du ein neues einträgst.',
  not_found: 'Das gibt es nicht mehr.',
  closed: 'Hier kann man sich nicht mehr eintragen.',
  full: 'Alle Plätze sind vergeben.',
  creator_cannot_leave: 'Du hast das eingetragen. Wenn es nicht stattfindet, schließ es.',
  // Formulare
  phone_format: 'Die Nummer darf nur Ziffern, ein + am Anfang und Leerzeichen enthalten.',
  phone_country: 'Bitte die Nummer mit Ländervorwahl, zum Beispiel +49 176 …',
  name_long: 'Der Name ist zu lang (höchstens 60 Zeichen).',
  region_long: 'Die Region ist zu lang (höchstens 80 Zeichen).',
  about_long: '„Über mich“ ist zu lang (höchstens 500 Zeichen).',
  title_missing: 'Gib dem Ganzen einen Titel.',
  title_long: 'Der Titel ist zu lang (höchstens 120 Zeichen).',
  description_long: 'Die Beschreibung ist zu lang (höchstens 1000 Zeichen).',
  area_invalid: 'Wähl einen Bereich.',
  date_invalid: 'Das Datum stimmt nicht.',
  date_past: 'Das Datum liegt schon in der Vergangenheit.',
  date_far: 'Das ist zu weit weg. Trag es höchstens ein Jahr im Voraus ein.',
  time_invalid: 'Die Uhrzeit stimmt nicht.',
  duration_invalid: 'Wähl eine Dauer.',
  end_before_start: 'Das Ende liegt vor dem Start.',
  range_long: 'Eine Challenge dauert höchstens ein Jahr.',
  max_invalid: 'Die Platzzahl stimmt nicht (mindestens 2).',
  whatsapp_invalid: 'Das ist kein Einladungslink einer WhatsApp-Gruppe (https://chat.whatsapp.com/…).',
  place_long: 'Der Ort ist zu lang.',
  unknown: 'Das hat gerade nicht geklappt. Versuch es bitte noch einmal.',
} as const

export type MiteinanderError = keyof typeof MITEINANDER_ERRORS

function isErrorCode(value: unknown): value is MiteinanderError {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(MITEINANDER_ERRORS, value)
}

/** Fehlercode aus einer PostgREST-Antwort (raise exception '<code>'). */
export function errorCodeFrom(error: { message?: string | null } | null | undefined): MiteinanderError {
  const message = error?.message?.trim()
  return isErrorCode(message) ? message : 'unknown'
}

/** Text zu einem Code aus der Adresse (?fehler=…). null = nichts anzeigen. */
export function messageFor(code: string | null | undefined): string | null {
  if (!code) return null
  return isErrorCode(code) ? MITEINANDER_ERRORS[code] : MITEINANDER_ERRORS.unknown
}

// ── Telefon ──────────────────────────────────────────────────────────────────

/**
 * Handynummer → E.164 („+4917612345678“). Erlaubt sind nur Ziffern, ein + am
 * Anfang und Leerzeichen. „00“ am Anfang wird zu „+“. Ohne Ländervorwahl wird
 * NICHT geraten (0176 … könnte Deutschland oder Österreich sein) — dann kommt
 * ein Hinweis. Leer = keine Nummer.
 */
export function normalizePhone(raw: string): Result<string | null> {
  const input = (raw ?? '').trim()
  if (input === '') return { ok: true, value: null }
  if (!/^\+?[0-9 ]+$/.test(input)) return { ok: false, error: 'phone_format' }

  let compact = input.replace(/ +/g, '')
  if (compact.startsWith('00')) compact = '+' + compact.slice(2)
  if (!compact.startsWith('+')) return { ok: false, error: 'phone_country' }
  if (!/^\+[1-9][0-9]{6,14}$/.test(compact)) return { ok: false, error: 'phone_format' }
  return { ok: true, value: compact }
}

/** Link „Auf WhatsApp schreiben“. */
export function waMeUrl(e164: string): string {
  return `https://wa.me/${e164.replace(/^\+/, '')}`
}

// ── WhatsApp-Gruppe ──────────────────────────────────────────────────────────

const WA_GROUP = /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]{8,64}$/

/** Gleiche Form wie der CHECK auf challenges.whatsapp_url. */
export function isWhatsappGroupUrl(url: string): boolean {
  return WA_GROUP.test(url)
}

/** Zusätze (?mode=…, #, Schrägstrich am Ende) ab; null, wenn es kein Gruppenlink ist. */
export function normalizeWhatsappGroupUrl(raw: string): string | null {
  const cleaned = (raw ?? '').trim().replace(/[?#].*$/, '').replace(/\/+$/, '')
  return isWhatsappGroupUrl(cleaned) ? cleaned : null
}

// ── Beschriftungen ───────────────────────────────────────────────────────────

export function openForLabel(list: readonly string[]): string | null {
  const labels = OPEN_FOR.filter((k) => list.includes(k)).map((k) => OPEN_FOR_LABELS[k])
  if (labels.length === 0) return null
  const joined =
    labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(', ')} und ${labels[labels.length - 1]}`
  return `Offen für ${joined}`
}

export function initialOf(name: string | null | undefined): string {
  const first = Array.from((name ?? '').trim())[0]
  return first ? first.toLocaleUpperCase('de-DE') : '·'
}

export function peopleCountLabel(n: number, kind: 'challenge' | 'meetup'): string {
  if (kind === 'challenge') return `${n} dabei`
  return n === 1 ? '1 kommt' : `${n} kommen`
}

/** „noch 4 Plätze“, „noch 1 Platz“, „ausgebucht“; null ohne Grenze. */
export function spotsLabel(count: number, max: number | null): string | null {
  if (max === null) return null
  const left = max - count
  if (left <= 0) return 'ausgebucht'
  return left === 1 ? 'noch 1 Platz' : `noch ${left} Plätze`
}

// ── Datum (Kalendertage als „JJJJ-MM-TT“) ────────────────────────────────────

const DAY_MS = 86_400_000
const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const
const MONTHS_SHORT = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.'] as const
const MONTHS_BOX = ['Jan', 'Feb', 'März', 'Apr', 'Mai', 'Juni', 'Juli', 'Aug', 'Sept', 'Okt', 'Nov', 'Dez'] as const
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

function dayNumber(date: string): number | null {
  const m = DATE_PATTERN.exec(date ?? '')
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const ms = Date.UTC(y, mo - 1, d)
  const back = new Date(ms)
  // 30. Februar o. ä. springt in den nächsten Monat — das ist kein Datum.
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null
  return Math.floor(ms / DAY_MS)
}

function fromDayNumber(n: number): string {
  return new Date(n * DAY_MS).toISOString().slice(0, 10)
}

export function isValidDate(date: string): boolean {
  return dayNumber(date) !== null
}

export function addDays(date: string, days: number): string {
  const n = dayNumber(date)
  if (n === null) throw new Error('Ungültiges Datum.')
  return fromDayNumber(n + days)
}

/** Heute in Berlin als „JJJJ-MM-TT“. */
export function berlinToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** „Mo, 2. Nov.“ */
export function shortDateLabel(date: string): string {
  const n = dayNumber(date)
  if (n === null) return date
  const d = new Date(n * DAY_MS)
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()}. ${MONTHS_SHORT[d.getUTCMonth()]}`
}

export function dateRangeLabel(startsOn: string, endsOn: string): string {
  return `${shortDateLabel(startsOn)} bis ${shortDateLabel(endsOn)}`
}

export function durationLabel(startsOn: string, endsOn: string): string {
  const a = dayNumber(startsOn)
  const b = dayNumber(endsOn)
  if (a === null || b === null) return ''
  const days = b - a + 1
  if (days === 1) return '1 Tag'
  if (days % 7 === 0) return days === 7 ? '1 Woche' : `${days / 7} Wochen`
  return `${days} Tage`
}

/** Was auf der Karte rechts oben steht. */
export function challengeTiming(startsOn: string, endsOn: string, today: string): string {
  if (today < startsOn) return `startet ${shortDateLabel(startsOn)}`
  if (today <= endsOn) return `läuft bis ${shortDateLabel(endsOn)}`
  return 'vorbei'
}

/** Datum-Kasten eines Treffens, Berliner Zeit. */
export function meetupDateBox(startsAt: string): {
  day: string
  month: string
  weekday: string
  time: string
  long: string
} {
  const local = utcISOToBerlinLocal(startsAt) // „2026-10-31T14:00“
  const date = local.slice(0, 10)
  const time = local.slice(11, 16)
  const n = dayNumber(date) ?? 0
  const d = new Date(n * DAY_MS)
  const weekday = WEEKDAYS[d.getUTCDay()]
  return {
    day: String(d.getUTCDate()),
    month: MONTHS_BOX[d.getUTCMonth()],
    weekday,
    time,
    long: `${shortDateLabel(date)} · ${time}`,
  }
}

// ── Eingaben ─────────────────────────────────────────────────────────────────

function clean(value: string | null | undefined): string {
  return (value ?? '').trim()
}

function optional(value: string | null | undefined): string | null {
  const v = clean(value)
  return v === '' ? null : v
}

/** Leer → null; sonst ganze Zahl in [min, max] oder Fehler. */
function optionalInt(value: string, min: number, max: number): Result<number | null> {
  const v = clean(value)
  if (v === '') return { ok: true, value: null }
  if (!/^\d+$/.test(v)) return { ok: false, error: 'max_invalid' }
  const n = Number(v)
  if (n < min || n > max) return { ok: false, error: 'max_invalid' }
  return { ok: true, value: n }
}

export function validateConnectionMessage(raw: string): Result<string> {
  const v = clean(raw)
  if (v.length < 1 || Array.from(v).length > LIMITS.message) return { ok: false, error: 'message_length' }
  return { ok: true, value: v }
}

export type ContactInput = {
  display_name: string
  phone: string
  region: string
  about: string
  visible: boolean
  open_for: readonly string[]
}

export type ContactValue = {
  display_name: string | null
  phone: string | null
  region: string | null
  about: string | null
  visible: boolean
  open_for: OpenFor[]
}

export function parseContactForm(input: ContactInput): Result<ContactValue> {
  const display_name = optional(input.display_name)
  if (display_name && display_name.length > LIMITS.displayName) return { ok: false, error: 'name_long' }
  const region = optional(input.region)
  if (region && region.length > LIMITS.region) return { ok: false, error: 'region_long' }
  const about = optional(input.about)
  if (about && about.length > LIMITS.about) return { ok: false, error: 'about_long' }
  const phone = normalizePhone(input.phone)
  if (!phone.ok) return phone
  return {
    ok: true,
    value: {
      display_name,
      phone: phone.value,
      region,
      about,
      visible: input.visible,
      open_for: OPEN_FOR.filter((k) => input.open_for.includes(k)),
    },
  }
}

export type ChallengeInput = {
  title: string
  description: string
  area: string
  starts_on: string
  duration_days: string
  ends_on: string
  max_members: string
  whatsapp_url: string
}

export type ChallengeValue = {
  title: string
  description: string | null
  area: Area
  starts_on: string
  ends_on: string
  max_members: number | null
  whatsapp_url: string | null
}

export function parseChallengeForm(
  input: ChallengeInput,
  today: string,
  options: { allowPastStart?: boolean } = {},
): Result<ChallengeValue> {
  const title = clean(input.title)
  if (!title) return { ok: false, error: 'title_missing' }
  if (title.length > LIMITS.title) return { ok: false, error: 'title_long' }
  const description = optional(input.description)
  if (description && description.length > LIMITS.description) return { ok: false, error: 'description_long' }
  const area = clean(input.area)
  if (!isArea(area)) return { ok: false, error: 'area_invalid' }

  const starts_on = clean(input.starts_on)
  const start = dayNumber(starts_on)
  if (start === null) return { ok: false, error: 'date_invalid' }
  if (!options.allowPastStart && starts_on < today) return { ok: false, error: 'date_past' }

  let ends_on = clean(input.ends_on)
  if (ends_on) {
    if (dayNumber(ends_on) === null) return { ok: false, error: 'date_invalid' }
  } else {
    const days = Number(clean(input.duration_days))
    if (!DURATIONS.some((d) => d.days === days)) return { ok: false, error: 'duration_invalid' }
    ends_on = fromDayNumber(start + days - 1)
  }
  const end = dayNumber(ends_on) as number
  if (end < start) return { ok: false, error: 'end_before_start' }
  if (end > start + LIMITS.rangeDays) return { ok: false, error: 'range_long' }

  const max = optionalInt(input.max_members, 2, LIMITS.maxMembers)
  if (!max.ok) return max

  let whatsapp_url: string | null = null
  if (clean(input.whatsapp_url)) {
    whatsapp_url = normalizeWhatsappGroupUrl(input.whatsapp_url)
    if (!whatsapp_url) return { ok: false, error: 'whatsapp_invalid' }
  }

  return {
    ok: true,
    value: { title, description, area, starts_on, ends_on, max_members: max.value, whatsapp_url },
  }
}

export type MeetupInput = {
  title: string
  description: string
  region: string
  place_hint: string
  exact_place: string
  date: string
  time: string
  max_people: string
  online: boolean
}

export type MeetupValue = {
  title: string
  description: string | null
  region: string | null
  place_hint: string | null
  exact_place: string | null
  starts_at: string
  max_people: number | null
  online: boolean
}

export function parseMeetupForm(input: MeetupInput, now: Date): Result<MeetupValue> {
  const title = clean(input.title)
  if (!title) return { ok: false, error: 'title_missing' }
  if (title.length > LIMITS.title) return { ok: false, error: 'title_long' }
  const description = optional(input.description)
  if (description && description.length > LIMITS.description) return { ok: false, error: 'description_long' }
  const region = optional(input.region)
  if (region && region.length > LIMITS.region) return { ok: false, error: 'region_long' }
  const place_hint = optional(input.place_hint)
  if (place_hint && place_hint.length > LIMITS.placeHint) return { ok: false, error: 'place_long' }
  const exact_place = optional(input.exact_place)
  if (exact_place && exact_place.length > LIMITS.exactPlace) return { ok: false, error: 'place_long' }

  const date = clean(input.date)
  if (dayNumber(date) === null) return { ok: false, error: 'date_invalid' }
  const time = clean(input.time)
  if (!TIME_PATTERN.test(time)) return { ok: false, error: 'time_invalid' }
  let starts_at: string
  try {
    starts_at = berlinLocalToUtcISO(`${date}T${time}`)
  } catch {
    return { ok: false, error: 'date_invalid' }
  }
  const t = new Date(starts_at).getTime()
  if (t <= now.getTime()) return { ok: false, error: 'date_past' }
  if (t > now.getTime() + LIMITS.meetupAheadDays * DAY_MS) return { ok: false, error: 'date_far' }

  const max = optionalInt(input.max_people, 2, LIMITS.maxPeople)
  if (!max.ok) return max

  return {
    ok: true,
    value: {
      title,
      description,
      region,
      place_hint,
      exact_place,
      starts_at,
      max_people: max.value,
      online: input.online,
    },
  }
}
