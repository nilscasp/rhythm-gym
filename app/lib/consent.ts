// ─────────────────────────────────────────────────────────────────────────────
// Einwilligungstext für die „Briefe aus der Schule" — eine Quelle für alle Orte.
//
// Der Wortlaut steht an drei Stellen gleichzeitig: Lead-Magnet-Formular,
// Signup-Checkbox und (als Version) im Protokoll in `profiles`. Damit die
// Protokollierung juristisch etwas wert ist, muss der Text hier zentral liegen
// und die Version bei JEDER Wortänderung mitwandern.
//
// Regel: Text ändern → CONSENT_TEXT_VERSION erhöhen. Alte Einwilligungen
// behalten ihre alte Version, damit rekonstruierbar bleibt, wozu jemand Ja
// gesagt hat.
// ─────────────────────────────────────────────────────────────────────────────

export const CONSENT_TEXT_VERSION = '2026-09-v1'

export const CONSENT_TEXT =
  'Ja, schick mir Briefe aus der Schule: Impulse zu Handpan und Bewusstsein, Termine und Einladungen zu Kursen. Abmelden geht in jeder Mail. Mehr in der Datenschutzerklärung.'
