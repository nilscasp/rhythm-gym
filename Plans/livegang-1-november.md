# Livegang 01.11.2026: Abo startet auf der Plattform

Entscheidung (Nils, 24.10.2026): Ab 01.11. wird nur noch über lernen.handpan.schule gezahlt, nicht mehr über Skool. Jede Buchung schaltet die Stufe automatisch frei (Stripe-Checkout in der App → Webhook). Fehlgeschlagene Zahlung sperrt sofort.

Stand Code: alles auf `feat/schule-kurse`, 42 Commits vor `main`, nicht gepusht. DB-Migrationen 0010–0014 sind live.

## Nils (nur du kannst das)

| # | Was | Bis |
|---|---|---|
| 1 | **Stripe Live:** Live-Schlüssel (`STRIPE_SECRET_KEY`) und Webhook-Geheimnis in Vercel eintragen. Webhook-Endpunkt `https://lernen.handpan.schule/api/stripe/webhook` mit `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created/updated/deleted`, `charge.refunded`. Kundenportal im Live-Modus einrichten (Kündigen, Zahlungsmittel ändern). | 28.10. |
| 2 | **Testkauf vorher:** neuen Testschlüssel in `.env.local`, damit ich den ganzen Weg in der Sandbox durchspielen kann (Kauf, Stufe da, Zahlung fehlgeschlagen → gesperrt, Kündigung). | 27.10. |
| 3 | ~~Rechtstexte freigeben~~ erledigt 24.10. (AGB und Datenschutz). Offen für die Fachperson: Widerrufsbelehrung und -formular, Zugangsdauer Kurse, Sperre bei laufendem Abo, Haftung Treffen. | 29.10. |
| 4 | **Push auf `main` freigeben** (= Deploy auf Vercel). Ich prüfe vorher Build, Tests und Handybreite. | 30.10. |
| 5 | **Bunny-Schlüssel** `BUNNY_TOKEN_KEY` in Vercel; nach dem Deploy in Bunny die Token-Pflicht einschalten (`docs/bunny-schutz.md`). | nach 4 |
| 6 | **WhatsApp-Community-Link** und Kursgruppen-Links. | 30.10. |
| 7 | **Skool:** keine neuen Bezahlstufen mehr einrichten bzw. wieder entfernen; Ankündigungs-Posts zeigen auf die Plattform statt auf Skool (Abo-Plan im Gedächtnis, Teil 1). | sofort |
| 8 | **Bisherige Vollmitglieder mit bezahlter Laufzeit:** wer schon bezahlt hat, bekommt die Restlaufzeit von Hand (Coach → Mitglieder). Jahresabo/Raten per Überweisung ebenso von Hand. | 01.11. |

## Mintaka (baue ich, sobald du nickst)

- Seite `/agb` aus den freigegebenen Bausteinen, Datenschutzseite ergänzen, Link „AGB“ im Kaufhinweis einschalten.
- Kurse veröffentlichen (`published_at` in der Vergangenheit, damit nicht alles als „neu“ erscheint).
- Sandbox-Durchlauf des Kaufwegs, sobald der Testschlüssel da ist.
- Vor dem Push: `bun run build`, Tests, Handyprobe 390×844 auf Mitgliedschaft, Kurs, Termine, Miteinander; nach dem Deploy rhythmgym.io und lernen.handpan.schule live nachprüfen.
- Texte für Ankündigung und Willkommen auf „Plattform statt Skool“ umschreiben (nur Entwurf, du postest).
