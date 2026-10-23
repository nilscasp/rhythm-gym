import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  AREAS,
  AREA_LABELS,
  DURATIONS,
  LIMITS,
  initialOf,
  messageFor,
} from '../lib/miteinander'
import { SCHULE_PAGE_CSS } from '../_schule/pages-css'
import { COURSE_CSS } from '../training/_course/views'

// ─────────────────────────────────────────────────────────────────────────────
// Bausteine der Miteinander-Seiten (Mockup „Miteinander“, „Eine Challenge“,
// „Profil und Kontaktanfrage“). Schule-Tokens, Gold als einziger Akzent,
// Fraunces 300 für Überschriften, Spectral für Text, Radius 2px, Touch ≥ 44px.
// Ergänzt COURSE_CSS (cr-…) und SCHULE_PAGE_CSS (sp-…).
// ─────────────────────────────────────────────────────────────────────────────

export const MITEINANDER_CSS = `
  .mt-wrap { max-width: 1080px; gap: 56px; }
  .mt-page button.cr-btn { cursor: pointer; font-family: var(--font-ui); }
  .mt-sub { margin: 0; font-family: var(--font-display); font-style: italic; font-weight: 300; font-size: 16px; letter-spacing: 0.04em; color: var(--amber); }
  .mt-h2 { margin: 0; font-family: var(--font-display); font-weight: 300; font-size: clamp(28px, 6vw, 36px); line-height: 1.15; color: var(--cream); }
  .mt-h3 { margin: 0; font-family: var(--font-display); font-weight: 300; font-size: 22px; line-height: 1.25; color: var(--cream); overflow-wrap: anywhere; }
  .mt-text { margin: 0; font-family: var(--font-body); font-size: 17px; line-height: 1.6; color: var(--text); white-space: pre-line; overflow-wrap: anywhere; }
  .mt-meta { margin: 0; font-family: var(--font-ui); font-size: 14px; line-height: 1.5; color: var(--muted2); overflow-wrap: anywhere; }
  .mt-hint { margin: 0; font-family: var(--font-body); font-style: italic; font-size: 15px; line-height: 1.5; color: var(--muted); }
  .mt-counter { display: flex; justify-content: space-between; gap: 12px; }
  .mt-counter span:last-child { font-style: normal; font-family: var(--font-ui); font-size: 13px; white-space: nowrap; }

  /* Kopf */
  .mt-hero { display: flex; flex-wrap: wrap; gap: 28px; align-items: flex-end; }
  .mt-hero-main { flex: 999 1 420px; min-width: 0; display: flex; flex-direction: column; gap: 12px; }
  .mt-hero-box { flex: 1 1 300px; }
  .mt-jump { display: flex; flex-wrap: wrap; gap: 4px 28px; margin-top: 4px; }
  .mt-jump a {
    display: inline-flex; align-items: center; min-height: 44px;
    font-family: var(--font-ui); font-size: 15px; letter-spacing: 0.5px;
    color: var(--muted2); text-decoration: none; border-bottom: 1px solid transparent;
  }
  .mt-jump a:hover { color: var(--cream); border-bottom-color: var(--amber); }

  /* Abschnitte */
  .mt-section { display: flex; flex-direction: column; gap: 20px; scroll-margin-top: 80px; }
  .mt-section-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 16px; }
  .mt-section-head > div { display: flex; flex-direction: column; gap: 6px; }
  @media (max-width: 520px) { .mt-section-head .cr-btn { flex: 1 1 100%; } }

  /* Karten */
  .mt-grid { list-style: none; margin: 0; padding: 0; display: grid; gap: 16px; grid-template-columns: minmax(0, 1fr); }
  @media (min-width: 720px) { .mt-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (min-width: 1000px) { .mt-grid--3 { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  .mt-card {
    height: 100%; box-sizing: border-box;
    display: flex; flex-direction: column; gap: 12px; padding: 20px;
    border: 1px solid var(--border2); border-radius: 2px;
    background: rgba(255, 255, 255, 0.02);
    color: inherit; text-decoration: none;
  }
  a.mt-card:hover { border-color: var(--amber); }
  a.mt-card:focus-visible { outline: 2px solid var(--amber); outline-offset: 3px; }
  .mt-card-top { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px 12px; }
  .mt-card-foot { margin-top: auto; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
  .mt-card--row { flex-direction: row; gap: 16px; align-items: flex-start; }
  .mt-card-body { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
  .mt-chip {
    display: inline-flex; align-items: center; min-height: 28px; padding: 0 10px;
    border: 1px solid var(--border2); border-radius: 2px;
    font-family: var(--font-ui); font-size: 12px; letter-spacing: 1px; color: var(--muted2);
  }
  .mt-chip--gold { color: var(--amber); border-color: var(--border2); }
  .mt-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .mt-open { margin: 0; font-family: var(--font-body); font-size: 15px; color: var(--amber); }
  .mt-date {
    flex: 0 0 auto; min-width: 64px; box-sizing: border-box; padding: 8px 6px;
    border: 1px solid var(--border2); border-radius: 2px; text-align: center;
  }
  .mt-date-day { display: block; font-family: var(--font-display); font-weight: 300; font-size: 28px; line-height: 1.1; color: var(--amber); }
  .mt-date-mon { display: block; font-family: var(--font-ui); font-size: 12px; letter-spacing: 0.5px; color: var(--muted2); }
  .mt-empty { padding: 20px; border: 1px dashed var(--border2); border-radius: 2px; }

  /* Personen */
  .mt-av {
    flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center;
    width: 40px; height: 40px; border-radius: 50%;
    border: 1px solid var(--border2); background: var(--black);
    color: var(--amber); font-family: var(--font-display); font-weight: 300; font-size: 18px; line-height: 1;
  }
  .mt-av--lg { width: 56px; height: 56px; font-size: 24px; }
  .mt-av--xl { width: 88px; height: 88px; font-size: 36px; }
  .mt-av--me { background: var(--amber); color: var(--black); border-color: var(--amber); }
  .mt-people { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--border); }
  .mt-person { display: flex; align-items: center; gap: 14px; min-height: 60px; padding: 8px 0; border-bottom: 1px solid var(--border); }
  .mt-person-name { flex: 1 1 auto; min-width: 0; font-family: var(--font-body); font-size: 17px; color: var(--text); overflow-wrap: anywhere; }
  a.mt-person-name { text-decoration: none; display: inline-flex; align-items: center; min-height: 44px; }
  a.mt-person-name:hover { color: var(--amber); }
  .mt-person-note { font-family: var(--font-ui); font-size: 13px; color: var(--muted2); white-space: nowrap; }

  /* Zwei Spalten: Inhalt + Seitenleiste */
  .mt-layout { display: grid; grid-template-columns: minmax(0, 1fr); gap: 32px; align-items: start; }
  @media (min-width: 960px) { .mt-layout { grid-template-columns: minmax(0, 1fr) 360px; gap: 48px; } }
  .mt-main { display: flex; flex-direction: column; gap: 28px; min-width: 0; }
  .mt-aside { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
  .mt-box {
    display: flex; flex-direction: column; gap: 14px; padding: 20px;
    border: 1px solid var(--border2); border-radius: 2px; background: rgba(255, 255, 255, 0.02);
  }
  .mt-box--gold { border-color: var(--amber); }
  .mt-box .cr-btn { align-self: flex-start; }
  @media (max-width: 520px) { .mt-box .cr-btn { align-self: stretch; } }
  .mt-phone { font-family: var(--font-ui); font-size: 20px; letter-spacing: 0.5px; color: var(--cream); }

  /* Formulare */
  .mt-form { display: flex; flex-direction: column; gap: 18px; }
  .mt-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .mt-field > label, .mt-label { font-family: var(--font-ui); font-size: 14px; letter-spacing: 0.3px; color: var(--muted2); }
  .mt-input {
    width: 100%; box-sizing: border-box; min-height: 48px; padding: 10px 12px;
    border: 1px solid var(--border2); border-radius: 2px;
    background: var(--black); color: var(--text);
    font-family: var(--font-body); font-size: 16px; line-height: 1.4;
  }
  .mt-input:focus { outline: 2px solid var(--amber); outline-offset: 1px; border-color: var(--amber); }
  .mt-textarea { min-height: 112px; resize: vertical; }
  .mt-pair { display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px; }
  @media (min-width: 560px) { .mt-pair { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .mt-check { display: flex; align-items: center; gap: 12px; min-height: 44px; font-family: var(--font-body); font-size: 17px; color: var(--text); cursor: pointer; }
  .mt-check input { flex: 0 0 auto; width: 20px; height: 20px; margin: 0; accent-color: var(--amber); }
  .mt-fieldset { margin: 0; padding: 0; border: 0; display: flex; flex-direction: column; gap: 2px; }
  .mt-fieldset legend { padding: 0 0 6px; }
  .mt-rule { height: 1px; background: var(--border); border: 0; margin: 4px 0; }
  .mt-inline { display: inline; }
  .mt-actions { display: flex; flex-wrap: wrap; gap: 12px; }
  @media (max-width: 520px) { .mt-actions > *, .mt-actions form, .mt-actions .cr-btn { flex: 1 1 100%; width: 100%; } }
  .mt-request { display: flex; flex-direction: column; gap: 12px; padding: 16px 0; border-bottom: 1px solid var(--border); }
  .mt-request-head { display: flex; align-items: center; gap: 12px; }
  .mt-quote { margin: 0; font-family: var(--font-body); font-style: italic; font-size: 16px; line-height: 1.55; color: var(--muted2); white-space: pre-line; overflow-wrap: anywhere; }
`

/** Seitenrahmen mit allen Stilen. */
export function MiteinanderPage({ children, wide = true }: { children: ReactNode; wide?: boolean }) {
  return (
    <>
      <style>{COURSE_CSS}</style>
      <style>{SCHULE_PAGE_CSS}</style>
      <style>{MITEINANDER_CSS}</style>
      <main className="cr-page sp-page mt-page">
        <div className={`cr-wrap sp-wrap${wide ? ' mt-wrap' : ''}`}>{children}</div>
      </main>
    </>
  )
}

const OK_TEXTS: Record<string, string> = {
  gesendet: 'Anfrage gesendet.',
  verbunden: 'Ihr seid jetzt verbunden.',
  abgelehnt: 'Erledigt. Die Person erfährt nur, dass es gerade nicht passt.',
  zurueckgezogen: 'Anfrage zurückgezogen.',
  geloest: 'Die Verbindung ist gelöst.',
  gespeichert: 'Gespeichert.',
  geschlossen: 'Geschlossen. Niemand kann sich mehr eintragen.',
  dabei: 'Schön, du bist dabei.',
}

/** Rückmeldung aus der Adresse: ?fehler=<code> oder ?ok=<wort>. */
export function Notice({ fehler, ok }: { fehler?: string; ok?: string }) {
  const error = messageFor(fehler)
  if (error) {
    return (
      <p className="cr-notice" role="alert">
        {error}
      </p>
    )
  }
  const done = ok ? OK_TEXTS[ok] : undefined
  if (!done) return null
  return (
    <p className="cr-notice" role="status">
      {done}
    </p>
  )
}

export function Avatar({ name, size, me }: { name: string; size?: 'lg' | 'xl'; me?: boolean }) {
  const cls = ['mt-av', size ? `mt-av--${size}` : '', me ? 'mt-av--me' : ''].filter(Boolean).join(' ')
  return (
    <span className={cls} aria-hidden="true">
      {initialOf(name)}
    </span>
  )
}

export type Person = {
  user_id: string
  display_name: string
  is_creator: boolean
  profile_visible: boolean
}

/** „Dabei sind …“ / „Es kommen …“ mit Initialen. */
export function PeopleList({ people, me, creatorNote }: { people: Person[]; me: string; creatorNote: string }) {
  return (
    <ul className="mt-people">
      {people.map((p) => {
        const isMe = p.user_id === me
        const name = isMe ? 'Du' : p.display_name
        return (
          <li key={p.user_id} className="mt-person">
            <Avatar name={p.display_name} me={isMe} />
            {!isMe && p.profile_visible ? (
              <Link href={`/miteinander/mensch/${p.user_id}`} className="mt-person-name">
                {name}
              </Link>
            ) : (
              <span className="mt-person-name">{name}</span>
            )}
            {p.is_creator ? <span className="mt-person-note">{creatorNote}</span> : null}
          </li>
        )
      })}
    </ul>
  )
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="cr-back">
      ← {children}
    </Link>
  )
}

// ── Formulare ────────────────────────────────────────────────────────────────

export type ChallengeDefaults = {
  title: string
  description: string
  area: string
  starts_on: string
  ends_on: string
  max_members: string
  whatsapp_url: string
}

export function ChallengeFields({
  defaults,
  mode,
  today,
}: {
  defaults: ChallengeDefaults
  mode: 'new' | 'edit'
  today: string
}) {
  return (
    <>
      <div className="mt-field">
        <label htmlFor="c-title">Was willst du dir vornehmen?</label>
        <input
          id="c-title"
          name="title"
          className="mt-input"
          type="text"
          required
          maxLength={LIMITS.title}
          defaultValue={defaults.title}
          placeholder="z. B. Jeden Morgen 10 Minuten Soulset"
        />
      </div>
      <div className="mt-field">
        <label htmlFor="c-desc">Was wir vorhaben</label>
        <textarea
          id="c-desc"
          name="description"
          className="mt-input mt-textarea"
          maxLength={LIMITS.description}
          defaultValue={defaults.description}
          aria-describedby="c-desc-hint"
        />
        <p id="c-desc-hint" className="mt-hint">
          Ein paar Sätze: worum es geht und wie ihr euch gegenseitig tragt.
        </p>
      </div>
      <div className="mt-field">
        <label htmlFor="c-area">Bereich</label>
        <select id="c-area" name="area" className="mt-input" defaultValue={defaults.area || 'frei'}>
          {AREAS.map((a) => (
            <option key={a} value={a}>
              {AREA_LABELS[a]}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-pair">
        <div className="mt-field">
          <label htmlFor="c-start">Start</label>
          <input
            id="c-start"
            name="starts_on"
            className="mt-input"
            type="date"
            required
            min={mode === 'new' ? today : undefined}
            defaultValue={defaults.starts_on}
          />
        </div>
        {mode === 'new' ? (
          <div className="mt-field">
            <label htmlFor="c-dur">Dauer</label>
            <select id="c-dur" name="duration_days" className="mt-input" defaultValue="30">
              {DURATIONS.map((d) => (
                <option key={d.days} value={d.days}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="mt-field">
            <label htmlFor="c-end">Ende</label>
            <input id="c-end" name="ends_on" className="mt-input" type="date" required defaultValue={defaults.ends_on} />
          </div>
        )}
      </div>
      <div className="mt-field">
        <label htmlFor="c-max">Höchstens wie viele? (leer = offen)</label>
        <input
          id="c-max"
          name="max_members"
          className="mt-input"
          type="number"
          inputMode="numeric"
          min={2}
          max={LIMITS.maxMembers}
          defaultValue={defaults.max_members}
        />
      </div>
      <div className="mt-field">
        <label htmlFor="c-wa">Link zu deiner WhatsApp-Gruppe</label>
        <input
          id="c-wa"
          name="whatsapp_url"
          className="mt-input"
          type="url"
          inputMode="url"
          placeholder="https://chat.whatsapp.com/…"
          defaultValue={defaults.whatsapp_url}
          aria-describedby="c-wa-hint"
        />
        <p id="c-wa-hint" className="mt-hint">
          Leg die Gruppe in WhatsApp an und kopier den Einladungslink hierher. Nur wer mitmacht, sieht ihn.
        </p>
      </div>
    </>
  )
}

export type MeetupDefaults = {
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

export function MeetupFields({ defaults, today }: { defaults: MeetupDefaults; today: string }) {
  return (
    <>
      <div className="mt-field">
        <label htmlFor="m-title">Titel</label>
        <input
          id="m-title"
          name="title"
          className="mt-input"
          type="text"
          required
          maxLength={LIMITS.title}
          defaultValue={defaults.title}
          placeholder="z. B. Spielen im Park"
        />
      </div>
      <div className="mt-field">
        <label htmlFor="m-desc">Beschreibung</label>
        <textarea
          id="m-desc"
          name="description"
          className="mt-input mt-textarea"
          maxLength={LIMITS.description}
          defaultValue={defaults.description}
        />
      </div>
      <div className="mt-pair">
        <div className="mt-field">
          <label htmlFor="m-date">Datum</label>
          <input id="m-date" name="date" className="mt-input" type="date" required min={today} defaultValue={defaults.date} />
        </div>
        <div className="mt-field">
          <label htmlFor="m-time">Uhrzeit</label>
          <input id="m-time" name="time" className="mt-input" type="time" required defaultValue={defaults.time} />
        </div>
      </div>
      <div className="mt-field">
        <label htmlFor="m-region">Region</label>
        <input
          id="m-region"
          name="region"
          className="mt-input"
          type="text"
          maxLength={LIMITS.region}
          defaultValue={defaults.region}
          placeholder="z. B. Raum Freiburg"
          aria-describedby="m-region-hint"
        />
        <p id="m-region-hint" className="mt-hint">
          Nur die Region, nie die Adresse.
        </p>
      </div>
      <div className="mt-field">
        <label htmlFor="m-hint">Grober Ort (für alle sichtbar)</label>
        <input
          id="m-hint"
          name="place_hint"
          className="mt-input"
          type="text"
          maxLength={LIMITS.placeHint}
          defaultValue={defaults.place_hint}
          placeholder="z. B. am See, bei Regen fällt es aus"
        />
      </div>
      <div className="mt-field">
        <label htmlFor="m-exact">Genaue Adresse oder Online-Link</label>
        <input
          id="m-exact"
          name="exact_place"
          className="mt-input"
          type="text"
          maxLength={LIMITS.exactPlace}
          defaultValue={defaults.exact_place}
          aria-describedby="m-exact-hint"
        />
        <p id="m-exact-hint" className="mt-hint">
          Nur wer zusagt, sieht die genaue Adresse.
        </p>
      </div>
      <div className="mt-field">
        <label htmlFor="m-max">Höchstens wie viele? (leer = offen)</label>
        <input
          id="m-max"
          name="max_people"
          className="mt-input"
          type="number"
          inputMode="numeric"
          min={2}
          max={LIMITS.maxPeople}
          defaultValue={defaults.max_people}
        />
      </div>
      <label className="mt-check">
        <input type="checkbox" name="online" defaultChecked={defaults.online} />
        Findet online statt
      </label>
    </>
  )
}
