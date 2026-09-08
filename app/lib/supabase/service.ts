import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ DER SCHLÜSSEL, DER JEDE RLS-REGEL AUSHEBELT.
//
// `SUPABASE_SERVICE_ROLE_KEY` ist kein „stärkerer Login" — er ist die
// Umgehung sämtlicher Row-Level-Security. Ein Client aus dieser Datei sieht
// und schreibt jede Zeile jedes Nutzers, ohne dass eine Policy dazwischensteht.
//
// Deshalb gilt hier eine Regel ohne Ausnahme:
//
//   Diese Datei darf NUR aus serverseitigem Code importiert werden, der seinen
//   Aufrufer vorher selbst verifiziert hat.
//
// Heute ist das genau eine Stelle: app/api/stripe/webhook/route.ts — und die
// verifiziert vor jedem Aufruf die Stripe-Signatur über den rohen Body. Kein
// weiterer Aufrufer ohne dieselbe Art von Nachweis.
//
// NIEMALS in eine Komponente importieren — auch nicht in eine Server
// Component. Server Components rendern für einen eingeloggten Nutzer; dort ist
// der normale Client aus ./server.ts richtig, weil dessen RLS die Fragen
// „darf dieser Mensch das sehen?" überhaupt erst stellt. Ein Import aus einer
// 'use client'-Datei würde den Schlüssel zwar nicht ins Bundle geben (kein
// NEXT_PUBLIC_-Präfix), aber den Modulbaum verunreinigen und die Regel
// aufweichen. Das Paket `server-only` liegt nicht im Projekt, sonst stünde
// hier der harte Riegel statt dieses Kommentars.
// ─────────────────────────────────────────────────────────────────────────────

export type ServiceClient = SupabaseClient<Database>

/**
 * Supabase-Client mit service_role-Rechten.
 *
 * Schlägt bewusst fehl, statt sich zu behelfen: fehlt eine der beiden
 * Variablen, fliegt eine Exception. Ein stillschweigender Rückfall auf den
 * öffentlichen Schlüssel wäre die schlimmere Variante — der Webhook würde
 * scheinbar laufen, aber jeder `grant_enrollment_by_email`-Aufruf liefe gegen
 * eine Rolle ohne EXECUTE-Recht ins Leere, und niemand bekäme seinen Kurs.
 *
 * Keine Session, kein Token-Refresh: dieser Client lebt für die Dauer einer
 * Webhook-Anfrage und hat nichts zu erneuern.
 */
export function createServiceClient(): ServiceClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error(
      'createServiceClient: NEXT_PUBLIC_SUPABASE_URL fehlt. In Vercel unter Settings → Environment Variables setzen.'
    )
  }
  if (!serviceRoleKey) {
    throw new Error(
      'createServiceClient: SUPABASE_SERVICE_ROLE_KEY fehlt. Supabase → Project Settings → API → service_role. Nur serverseitig setzen, nie mit NEXT_PUBLIC_-Präfix.'
    )
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
