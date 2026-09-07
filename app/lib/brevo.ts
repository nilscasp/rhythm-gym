import { CONSENT_TEXT_VERSION } from './consent'

// ─────────────────────────────────────────────────────────────────────────────
// Brevo — die einzige Wahrheit für Mail-Einwilligungen (Plan §3).
//
// Zwei Wege hinein:
//   1. Lead-Magnet-Formular → startDoubleOptIn(): Brevo verschickt die
//      Bestätigungsmail, legt den Kontakt aber erst nach dem Klick an. Die
//      Einwilligung ist damit bei Brevo protokolliert, nicht bei uns.
//   2. Konto-Signup → upsertConfirmedContact(): die Adresse hat Supabase schon
//      bestätigt, die Einwilligung liegt in `profiles` mit Zeitpunkt und
//      Textversion. Ein zweites Double-Opt-in wäre Reibung ohne Zugewinn
//      (Plan §5, Entscheidung 8), deshalb direkter Upsert.
//
// Kein SDK: zwei POSTs, ein Header, `fetch`. Und nirgends die Adresse ins Log —
// weder im Erfolgs- noch im Fehlerfall.
//
// NUR SERVERSEITIG importieren (Route Handler, Server Components). BREVO_API_KEY
// ist bewusst ohne NEXT_PUBLIC_-Präfix; ein Import aus einer 'use client'-Datei
// würde den Key nicht ausliefern, aber den Modulbaum verunreinigen. Das Paket
// `server-only` liegt nicht im Projekt, sonst stünde hier der harte Riegel.
// ─────────────────────────────────────────────────────────────────────────────

const BREVO_BASE = 'https://api.brevo.com/v3'
const REQUEST_TIMEOUT_MS = 8000

export interface BrevoOk {
  ok: true
}

export interface BrevoFail {
  ok: false
  /** HTTP-Status, 0 bei Timeout/Netzwerkfehler. */
  status: number
  /** Kurze, adressfreie Beschreibung — sicher fürs Log. */
  message: string
}

export type BrevoResult = BrevoOk | BrevoFail

function apiKey(): string | undefined {
  const key = process.env.BREVO_API_KEY?.trim()
  return key && key.length > 0 ? key : undefined
}

function numericEnv(name: string): number | undefined {
  const raw = process.env[name]?.trim()
  if (!raw) return undefined
  const value = Number(raw)
  return Number.isInteger(value) && value > 0 ? value : undefined
}

function listId(): number | undefined {
  return numericEnv('BREVO_LIST_BRIEFE_ID')
}

function templateId(): number | undefined {
  return numericEnv('BREVO_DOI_TEMPLATE_ID')
}

/**
 * Sind alle drei Env-Werte gesetzt? Die Route antwortet sonst mit 503 und einer
 * ehrlichen Zeile, statt eine Adresse ins Nichts zu schicken.
 */
export function isBrevoConfigured(): boolean {
  return (
    apiKey() !== undefined && listId() !== undefined && templateId() !== undefined
  )
}

async function postJson(path: string, body: unknown): Promise<BrevoResult> {
  const key = apiKey()
  if (!key) {
    return { ok: false, status: 0, message: 'BREVO_API_KEY fehlt' }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${BREVO_BASE}${path}`, {
      method: 'POST',
      headers: {
        'api-key': key,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    })

    // 201 = angelegt, 204 = aktualisiert/akzeptiert. Beides ist ein Ja.
    if (response.status === 201 || response.status === 204 || response.ok) {
      return { ok: true }
    }

    // Fehlerkörper von Brevo trägt { code, message } — die Adresse steht nicht
    // drin, aber wir kürzen trotzdem hart, damit kein Echo ins Log gerät.
    let message = `Brevo antwortete mit ${response.status}`
    try {
      const payload = (await response.json()) as { code?: string; message?: string }
      if (payload?.code) message = `${message} (${payload.code})`
    } catch {
      // Kein JSON — Status genügt.
    }
    return { ok: false, status: response.status, message }
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError'
    return {
      ok: false,
      status: 0,
      message: aborted
        ? `Brevo antwortete nicht innerhalb von ${REQUEST_TIMEOUT_MS} ms`
        : 'Brevo nicht erreichbar',
    }
  } finally {
    clearTimeout(timer)
  }
}

export interface StartDoubleOptInInput {
  email: string
  /** Kurzer Slug, landet als Attribut QUELLE (siehe normalizeSource). */
  source: string
  /** Ziel nach dem Klick in der Bestätigungsmail — hier /tag-1?bestaetigt=1. */
  redirectionUrl: string
}

/**
 * Startet das Double-Opt-in. Brevo schickt die Bestätigungsmail; der Kontakt
 * entsteht erst nach dem Klick und landet dann in der Liste „Briefe".
 */
export async function startDoubleOptIn({
  email,
  source,
  redirectionUrl,
}: StartDoubleOptInInput): Promise<BrevoResult> {
  const list = listId()
  const template = templateId()
  if (list === undefined || template === undefined) {
    return { ok: false, status: 0, message: 'Brevo-Liste oder -Template fehlt' }
  }

  return postJson('/contacts/doubleOptinConfirmation', {
    email,
    includeListIds: [list],
    templateId: template,
    redirectionUrl,
    attributes: {
      QUELLE: source,
      EINWILLIGUNG_TEXT_VERSION: CONSENT_TEXT_VERSION,
    },
  })
}

export interface UpsertConfirmedContactInput {
  email: string
  /** ISO-Zeitpunkt der Einwilligung aus `profiles.marketing_consent_at`. */
  consentAt: string
  source: string
}

/**
 * Legt einen bereits bestätigten Kontakt an bzw. aktualisiert ihn. Genutzt nach
 * der Supabase-Mailbestätigung: Adresse verifiziert, Einwilligung protokolliert.
 */
export async function upsertConfirmedContact({
  email,
  consentAt,
  source,
}: UpsertConfirmedContactInput): Promise<BrevoResult> {
  const list = listId()
  if (list === undefined) {
    return { ok: false, status: 0, message: 'Brevo-Liste fehlt' }
  }

  return postJson('/contacts', {
    email,
    listIds: [list],
    updateEnabled: true,
    attributes: {
      QUELLE: source,
      EINWILLIGUNG_AM: consentAt,
      EINWILLIGUNG_TEXT_VERSION: CONSENT_TEXT_VERSION,
    },
  })
}
