# Inbetriebnahme — was noch von Hand eingerichtet werden muss

> Stand: 8. September 2026 · Der Code ist live auf `lernen.handpan.schule`. Was hier steht, sind die Schritte außerhalb des Repos: Schlüssel setzen, Stripe und Brevo einrichten, testen.
>
> Alles ist so gebaut, dass **nichts kaputtgeht, solange die Schlüssel fehlen**. Die betroffenen Endpunkte antworten dann mit einer klaren Meldung, der Rest der Seite läuft normal. Du kannst die Abschnitte also einzeln und in Ruhe abarbeiten.
>
> Reihenfolge-Empfehlung: erst A (Schlüssel), dann B (Stripe) oder C (Brevo) — die beiden hängen nicht voneinander ab.

---

## A · Umgebungsvariablen in Vercel

**Wo:** vercel.com → Projekt `rhythm-gym` → Settings → Environment Variables. Jede Variable für **Production** UND **Preview** anlegen, sonst funktionieren Vorschau-Deployments nicht.

**Wichtig:** Nach dem Hinzufügen einer Variablen muss neu ausgeliefert werden. Vercel übernimmt sie nicht in ein bestehendes Deployment. Also danach: Deployments → das oberste → „Redeploy".

| Variable | Woher | Wofür |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` | Der Webhook schreibt Einschreibungen ohne angemeldeten Nutzer |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → dein Endpunkt → „Signing secret" (`whsec_…`) | Prüft, dass eine Anfrage wirklich von Stripe kommt |
| `BREVO_API_KEY` | Brevo → Konto → SMTP & API → API-Schlüssel | Trägt Adressen in die Briefe-Liste ein |
| `BREVO_LIST_BRIEFE_ID` | Brevo → Kontakte → Listen → Liste „Briefe" → Zahl in der Adresszeile | Sagt, in welche Liste |
| `BREVO_DOI_TEMPLATE_ID` | Brevo → Kampagnen → Vorlagen → deine Bestätigungsvorlage → Zahl in der Adresszeile | Welche Bestätigungsmail verschickt wird |

**Zwei Warnungen zum `service_role`-Schlüssel:**
1. Er hebelt **jede** Zugriffsregel der Datenbank aus. Niemals mit dem Vorsatz `NEXT_PUBLIC_` anlegen, sonst landet er im Browser jedes Besuchers.
2. Er wird im Code an genau einer Stelle benutzt, im Stripe-Webhook. Wenn jemand ihn woanders einbaut, ist das ein Fehler.

**Sofort prüfen, ob es gewirkt hat** (im Terminal):

```bash
curl -s -X POST https://lernen.handpan.schule/api/stripe/webhook -d '{}'
```

- Vor der Einrichtung: `{"error":"stripe_not_configured"}`
- Danach: `{"error":"invalid_signature"}` — **das ist das gute Ergebnis.** Es heißt: der Schlüssel ist da, und die Signaturprüfung arbeitet. Eine Anfrage ohne Stripe-Signatur muss abgewiesen werden.

---

## B · Stripe

### B1 · Webhook anlegen

Stripe → Developers → Webhooks → „Add endpoint".

- **Endpoint-URL:** `https://lernen.handpan.schule/api/stripe/webhook`
- **Ereignisse auswählen** (genau diese vier, mehr braucht es nicht):
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

Danach das **Signing secret** kopieren und als `STRIPE_WEBHOOK_SECRET` in Vercel eintragen (Abschnitt A).

**Test- und Live-Modus haben getrennte Endpunkte und getrennte Geheimnisse.** Lege beide an. Für den Testmodus brauchst du eine zweite Vercel-Umgebung oder du tauschst den Wert vorübergehend — einfacher ist, im Testmodus mit dem Stripe-CLI zu arbeiten (Abschnitt D3).

### B2 · Payment-Links um die Kurs-Angabe ergänzen

Das ist der Schritt, den man leicht übersieht. **Ohne ihn passiert bei einem Kauf nichts**, und zwar geräuschlos: der Webhook sieht einen Kauf, weiß aber nicht, welcher Kurs gemeint ist, und schreibt eine Zeile ins Protokoll statt eine Einschreibung.

Für jeden Payment-Link, der einen Kurs verkauft: Stripe → Payment Links → Link öffnen → „Metadata" → hinzufügen:

| Schlüssel | Wert | Pflicht |
|---|---|---|
| `program_slug` | `rhythmusfundament` **oder** `von-anfang-an-spielen` | **ja** |
| `drip_start` | `2026-09-12` (Format `JJJJ-MM-TT`) | nein |

**Zu `program_slug`:** Der Wert muss exakt dem `slug` in der Tabelle `programs` entsprechen. Es gibt zwei:

| Kurs | `program_slug` | Kursraum in der App |
|---|---|---|
| Rhythmus Fundament | `rhythmusfundament` | 44 Tage, täglich freigeschaltet |
| Von Anfang an spielen | `von-anfang-an-spielen` | Terminliste mit Zoom-Tür (Live-Kurs, kein Tagesmaterial) |

Ein Tippfehler hier ist die häufigste Ursache für „bezahlt, aber nichts passiert". Kopier den Wert, tipp ihn nicht ab.

**Zu `drip_start`:** Leer lassen heißt „alles sofort offen". Ein Datum heißt: Tag 1 an diesem Datum, danach täglich einer. Bei einem Verkauf mit fester Kohorte trägst du hier den Kohortenstart ein, bei einem Verkauf, der jederzeit läuft, lässt du es leer.

Ein ungültiges Datum (etwa `2026-02-31`) wird verworfen und wie „leer" behandelt. Das ist Absicht: sonst würde Stripe ein kaputtes Ereignis tagelang wiederholen.

### B3 · Was der Webhook dann tut

- **Käufer hat schon ein Konto mit dieser Adresse** → Einschreibung wird sofort angelegt.
- **Käufer hat noch kein Konto** → der Kauf wird unter seiner Adresse geparkt. Sobald er sich mit **derselben** Adresse anmeldet und seine Mail bestätigt, wird daraus automatisch die Einschreibung. Du musst nichts tun.
- **Käufer ist schon eingeschrieben** → nichts passiert. Ein zweiter Kauf setzt kein laufendes Startdatum zurück.

Der Webhook schickt **keine** Mail. Der Käufer muss selbst auf `lernen.handpan.schule` ein Konto anlegen. Sag ihm das in deiner Kauf-Bestätigung oder auf der Danke-Seite.

---

## C · Brevo

Die ausführliche Anleitung steht in [`brevo-setup.md`](./brevo-setup.md). Kurzfassung der Reihenfolge:

1. **Liste „Briefe"** anlegen → die ID daraus wird `BREVO_LIST_BRIEFE_ID`.
2. **Kontakt-Attribute** anlegen: `QUELLE`, `EINWILLIGUNG_AM`, `EINWILLIGUNG_TEXT_VERSION` (alle Typ Text).
3. **Bestätigungsvorlage** anlegen, die den Platzhalter `{{ doubleoptin }}` enthält → die ID daraus wird `BREVO_DOI_TEMPLATE_ID`. Ohne diesen Platzhalter kann niemand bestätigen.
4. **API-Schlüssel** erzeugen → `BREVO_API_KEY`.
5. **Automation** „Willkommensstrecke": Auslöser ist „Kontakt kommt in Liste Briefe", danach die Mails M1 bis M3 aus `handpan-website-github/Plans/willkommensstrecke-mails-m1-m3.md`.

**Prüfen:**

```bash
curl -s -X POST https://lernen.handpan.schule/api/briefe \
  -H 'content-type: application/json' \
  -d '{"email":"deine@adresse.de","consent":true,"source":"test"}'
```

- Vorher: `{"error":"Die Briefe sind noch nicht angeschlossen. …"}`
- Danach: `{"ok":true}` und eine Bestätigungsmail in deinem Postfach. Der Bestätigungslink führt auf `/tag-1`.

---

## D · Testen, bevor echtes Geld fließt

### D1 · Kauf mit bestehendem Konto

1. Lege dir ein Testkonto auf `lernen.handpan.schule` an, Mail bestätigen.
2. Stripe im **Testmodus**, Payment-Link mit `program_slug=rhythmusfundament` öffnen, mit der Testkarte `4242 4242 4242 4242` bezahlen, als E-Mail die Adresse des Testkontos.
3. Erwartung: In Supabase steht in `enrollments` eine neue Zeile für diesen Nutzer. Im Kurs ist Tag 1 offen, falls kein `drip_start` gesetzt war.

### D2 · Kauf ohne Konto (der wichtigere Fall)

1. Denselben Link mit einer Adresse bezahlen, die **kein** Konto hat.
2. Erwartung: In `pending_enrollments` liegt eine Zeile mit dieser Adresse, `claimed_at` ist leer.
3. Jetzt mit **genau dieser** Adresse ein Konto anlegen und die Mail bestätigen.
4. Erwartung: `enrollments` hat die Zeile, `pending_enrollments.claimed_at` ist gesetzt. Der Kurs ist offen.

Das ist der Fall, der in der Praxis am häufigsten vorkommt, und der, bei dem Fehler am längsten unbemerkt bleiben. Bitte wirklich durchspielen.

### D3 · Ohne Payment-Link testen

Mit dem Stripe-CLI, wenn du schneller iterieren willst:

```bash
stripe listen --forward-to https://lernen.handpan.schule/api/stripe/webhook
stripe trigger checkout.session.completed
```

`stripe listen` gibt ein eigenes Signing secret aus — das gilt nur für diese Sitzung.

### D4 · Nachsehen, ob etwas ankam

In Supabase → SQL Editor:

```sql
select event_id, type, received_at from stripe_events order by received_at desc limit 10;
select email, claimed_at from pending_enrollments order by created_at desc limit 10;
```

Jedes Ereignis steht dort genau einmal. Kommt ein Kauf nicht an, schau in Stripe → Webhooks → dein Endpunkt → „Events" nach der Antwort.

---

## E · Wenn etwas nicht klappt

| Symptom | Wahrscheinliche Ursache |
|---|---|
| Webhook antwortet `stripe_not_configured` | `STRIPE_SECRET_KEY` oder `STRIPE_WEBHOOK_SECRET` fehlt, oder nach dem Setzen wurde nicht neu ausgeliefert |
| Webhook antwortet `invalid_signature` bei einem echten Stripe-Aufruf | Falsches Signing secret — Test- und Live-Modus verwechselt |
| Kauf durchgelaufen, aber keine Einschreibung | `program_slug` fehlt im Payment-Link, oder der Wert passt zu keinem `slug` in `programs` |
| Kauf zweimal zugestellt, aber nur einmal gewirkt | So gewollt. Das Journal `stripe_events` lässt jedes Ereignis genau einmal durch |
| Brief-Formular antwortet 503 | Einer der drei Brevo-Werte fehlt |
| Bestätigungsmail kommt nicht | Die Vorlage enthält keinen `{{ doubleoptin }}`-Platzhalter |

---

## F · Was danach noch offen ist

Nicht Teil der Inbetriebnahme, aber auf der Liste:

- **Rechtstexte gegenlesen.** Impressum und Datenschutzerklärung sind seit dem 8.9. öffentlich, aber nicht von dir freigegeben. Zu prüfen: der vollständige Name, die Berufsbezeichnung („Musiker, Künstler und Lehrer" statt „Musikpädagoge") und die Du-Form, die von den Sie-Texten der Website abweicht.
- **Die drei Zitate** auf der Landingpage stehen mit Vornamen live. Die Namen stammen aus deiner Freigabe vom 9. Juli, die Bildausschnitte selbst zeigen sie nicht.
- **AGB und Widerrufsbelehrung** fehlen. Für den Verkauf digitaler Leistungen an Verbraucher sind sie Pflicht, und sie sind keine Entwicklerarbeit.
- **Umsatzsteuer:** Du führst das Kleinunternehmer-Verfahren. Beim Verkauf ins EU-Ausland gelten eigene Regeln; das gehört vor den ersten Auslandsverkauf geklärt.
- **Kein englischer Kursinhalt.** Der Laden unter `/en/kurse` sammelt deshalb Adressen, statt zu verkaufen. Ein Kurs wird erst käuflich, wenn er in der Sprache wirklich lieferbar ist und im Katalog eine echte `checkoutUrl` steht.
- **Live-Termine für „Von Anfang an spielen" fehlen.** Der Kurs startet am 26.9. und läuft zehn Wochen. Im Kalender steht bisher nur der Kursstart, ohne Zoom-Adresse. Sobald du die Termine und den Link hast, können sie als Serie eingetragen werden — dann sehen die Teilnehmer sie in ihrem Kursraum mit der Tür zum Raum.
