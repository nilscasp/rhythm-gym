import type { Metadata } from 'next'
import { currentLocale, getMessages } from '../../messages/server'
import { localizeHref, type Locale } from '../lib/locale'
import { createClient } from '../lib/supabase/server'
import {
  berlinDate,
  eventTimeLabel,
  hasEventAccess,
  isEventKind,
  localized,
} from '../lib/event-access'
import { monthKeyOf, monthTitle, weekdayLabels } from '../lib/calendar-month'
import {
  EVENT_COLUMNS,
  LIST_LOAD_ERROR,
  LIST_META,
  currentViewer,
  hintFor,
  type Termin,
  type TerminView as TerminViewModel,
} from './_viewer'
import { TermineView } from './_components/TermineView'

// ─────────────────────────────────────────────────────────────────────────────
// /termine — der Kalender als Schaufenster (Phasenplan v2 §4).
//
// Ohne Anmeldung erreichbar (PUBLIC_PATHS in app/lib/supabase/middleware.ts):
// wer noch kein Konto hat, soll sehen, was stattfindet. Titel, Zeit und Ort
// stehen für alle da; die Zoom-Tür steht hier grundsätzlich NIE — nicht einmal
// für Eingeloggte mit Zugang. Sie gibt es ausschließlich auf der Detailseite,
// und auch dort nur aus `event_zoom_url()`.
//
// Diese Datei holt und übersetzt; gezeigt wird in `TermineView` (Monatsraster
// und Liste). Der Client bekommt ein fertiges View-Model — jedes Feld einzeln
// aufgezählt, damit nie versehentlich eine Datenbankzeile im Browser landet.
//
// Das Zeitfenster reicht bewusst in die VERGANGENHEIT: ein Monatskalender mit
// Löchern dort, wo der Monat schon gelaufen ist, wäre kein Kalender. Die
// Listenansicht schneidet weiterhin bei heute ab — das macht der Client.
// ─────────────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

/**
 * Monate zurück / voraus, die geladen werden. Ein Zug, kein Nachladen — bei
 * zweistelligen Terminzahlen ist das billiger als eine Abfrage pro Monatsklick.
 *
 * Die Grenzen werden an die Ansicht durchgereicht: über das Fenster hinaus
 * lässt sie sich nicht blättern. Sonst zeigte ein Monat „nichts geplant",
 * obwohl nur nichts geladen ist — die eine Aussage, die ein Kalender nie
 * machen darf.
 *
 * Serien sind auf 12 Wochen gedeckelt (MAX_REPEAT_WEEKS), also rund 12 Zeilen
 * je Serie: bis zum Limit passen gut 30 Serien. Wird es doch erreicht, steht
 * es im Log, statt still die fernsten Termine zu verschlucken.
 */
const WINDOW_MONTHS_BACK = 6
const WINDOW_MONTHS_AHEAD = 18
const WINDOW_LIMIT = 400

export async function generateMetadata(): Promise<Metadata> {
  return LIST_META[await currentLocale()]
}

/** Verschiebt einen Zeitpunkt um ganze Monate — nur für die Fenstergrenzen. */
function shiftMonths(from: Date, months: number): Date {
  const out = new Date(from)
  out.setUTCMonth(out.getUTCMonth() + months)
  return out
}

export default async function TerminePage() {
  const { locale, t } = await getMessages()
  const supabase = await createClient()
  const viewer = await currentViewer(supabase)

  const now = new Date()
  const windowStart = shiftMonths(now, -WINDOW_MONTHS_BACK)
  const windowEnd = shiftMonths(now, WINDOW_MONTHS_AHEAD)

  const { data, error } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .gte('starts_at', windowStart.toISOString())
    .lte('starts_at', windowEnd.toISOString())
    .order('starts_at', { ascending: true })
    .limit(WINDOW_LIMIT)

  if (error) {
    console.error('[termine] events read failed', {
      code: error.code,
      message: error.message,
    })
  }

  const today = berlinDate(now.toISOString())
  const rows = (data ?? []) as Termin[]

  // Das Limit ist erreicht — die fernsten Termine fehlen jetzt lautlos in der
  // Anzeige. Lieber im Log stehen haben, bevor jemand einen Termin vermisst.
  if (rows.length >= WINDOW_LIMIT) {
    console.warn('[termine] Fensterlimit erreicht — Termine fehlen in der Anzeige', {
      limit: WINDOW_LIMIT,
      from: windowStart.toISOString(),
      to: windowEnd.toISOString(),
    })
  }
  const events: TerminViewModel[] = rows.map((event) => {
    const startDate = berlinDate(event.starts_at)
    return {
      id: event.id,
      href: localizeHref(`/termine/${event.id}`, locale),
      startDate,
      // Ein Termin ohne Ende dauert einen Tag. Endet er vor seinem Beginn
      // (kaputte Zeile), bleibt er ebenfalls eintägig — groupByDay kappt.
      endDate: event.ends_at ? inclusiveEndDate(event.ends_at, startDate) : startDate,
      startsAt: event.starts_at,
      timeLabel: eventTimeLabel(event, { locale, allDayLabel: t.events.allDay }),
      title: localized(event.title, locale),
      kindLabel: isEventKind(event.kind) ? t.events.kinds[event.kind] : null,
      location: event.location,
      hint: hintFor(hasEventAccess(viewer, event), t),
      ...dateBadge(startDate, locale),
    }
  })

  return (
    <TermineView
      events={events}
      today={today}
      initialMonth={monthKeyOf(today)}
      firstMonth={monthKeyOf(berlinDate(windowStart.toISOString()))}
      lastMonth={monthKeyOf(berlinDate(windowEnd.toISOString()))}
      weekdays={weekdayLabels(locale)}
      locale={locale}
      labels={{
        eyebrow: t.events.eyebrow,
        title: t.events.title,
        intro: t.events.intro,
        empty: t.events.empty,
        viewMonth: t.events.viewMonth,
        viewList: t.events.viewList,
        calendarLabel: t.events.calendarLabel,
        today: t.events.today,
        prevMonth: t.events.prevMonth,
        nextMonth: t.events.nextMonth,
        monthEmpty: t.events.monthEmpty,
        dayEmpty: t.events.dayEmpty,
        eventOne: t.events.eventOne,
        eventMany: t.events.eventMany,
      }}
      loadError={error ? LIST_LOAD_ERROR[locale] : null}
    />
  )
}

/**
 * Der letzte Kalendertag, an dem ein Termin noch läuft.
 *
 * Ein Termin von 23:00 bis 00:00 endet rechnerisch am Folgetag — im Kalender
 * stünde er dann an zwei Tagen, obwohl er in der neuen Nacht keine Minute mehr
 * dauert. Endet er exakt um Mitternacht, zählt der Vortag. Geprüft wird das,
 * indem eine Millisekunde vorher noch einmal gefragt wird: fällt sie auf einen
 * anderen Kalendertag, lag das Ende genau auf der Grenze.
 */
function inclusiveEndDate(endsAt: string, startDate: string): string {
  const end = berlinDate(endsAt)
  const justBefore = berlinDate(new Date(new Date(endsAt).getTime() - 1).toISOString())
  const resolved = justBefore === end ? end : justBefore
  // Nie vor den Beginn rutschen — eine kaputte Zeile bleibt eintägig.
  return resolved < startDate ? startDate : resolved
}

/**
 * Tageszahl und Monatskürzel für das Datumsschild der Karte. Die Tageszahl
 * kommt aus dem Berliner Datum (sprachunabhängig), das Kürzel aus dem
 * Monatsnamen der jeweiligen Sprache — „Sep" hier, „Sep" dort, „Mai"/„May" da.
 */
function dateBadge(
  startDate: string,
  locale: Locale,
): { badgeDay: string; badgeMonth: string } {
  return {
    badgeDay: String(Number(startDate.slice(8, 10))),
    badgeMonth: monthTitle(monthKeyOf(startDate), locale).split(' ')[0].slice(0, 3),
  }
}
