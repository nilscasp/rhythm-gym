import Stripe from 'stripe'

// ─────────────────────────────────────────────────────────────────────────────
// Der Stripe-Client — bewusst faul.
//
// Kein `new Stripe(...)` auf Modulebene: Next zieht Module beim Bauen an, und
// ein fehlender Schlüssel würde dann nicht den Kaufweg brechen, sondern den
// Build von allem anderen gleich mit. Der Schlüssel wird erst gebraucht, wenn
// wirklich ein Webhook eintrifft — also wird der Client auch erst dann gebaut.
//
// NUR SERVERSEITIG. `STRIPE_SECRET_KEY` trägt kein NEXT_PUBLIC_-Präfix und darf
// keins bekommen. Der öffentliche Schlüssel für das Checkout-Frontend heißt
// NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY und hat mit dieser Datei nichts zu tun.
// ─────────────────────────────────────────────────────────────────────────────

let cached: Stripe | null = null

/**
 * Stripe-Client, beim ersten Aufruf gebaut und danach wiederverwendet.
 *
 * Wirft, wenn `STRIPE_SECRET_KEY` fehlt. Aufrufer prüfen vorher mit
 * `isStripeConfigured()` und antworten dann mit 503 — die Ausnahme hier ist
 * das Netz darunter, nicht der eingeplante Weg.
 *
 * Ohne `apiVersion`: dann gilt die Version, auf die das installierte SDK
 * festgelegt ist (22.6.1 → 2026-08-26.dahlia). Ein hier eingetragener Literal
 * müsste bei jedem SDK-Update mitgepflegt werden, sonst bricht der Typcheck —
 * und ein Kaufweg, der an einer Versionszeichenkette scheitert, ist genau die
 * Art von Fußangel, die man erst am Launch-Tag findet.
 */
export function getStripe(): Stripe {
  if (cached) return cached

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error(
      'getStripe: STRIPE_SECRET_KEY fehlt. Stripe → Developers → API keys (secret key). Nur serverseitig setzen.'
    )
  }

  cached = new Stripe(secretKey)
  return cached
}

/**
 * Steht der Kaufweg? Beide Hälften zählen: ohne Secret-Key kann der Webhook
 * nichts bei Stripe nachfragen, ohne Webhook-Secret kann er die Signatur nicht
 * prüfen — und eine ungeprüfte Signatur ist ein offener Endpunkt, über den
 * jeder Fremde sich ein Enrollment schicken könnte.
 */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET)
}
