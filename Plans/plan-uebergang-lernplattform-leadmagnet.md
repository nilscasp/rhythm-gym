# Plan: Übergang Website → Lernplattform, Landingpage, Lead-Magnet

**Stand:** So, 6. September 2026 · **Zielablage:** `rhythm-gym/Plans/plan-uebergang-lernplattform-leadmagnet.md` (erste Aktion nach Freigabe: Datei dorthin kopieren) · **Baustein von:** `Plans/phasenplan-schule-des-lebens-v2.md` (KW38 i18n + Termine, KW39–40 Kalender, KW41–42 Kaufweg bleiben unangetastet)

## Kontext

Die Plattform läuft seit heute unter lernen.handpan.schule im Schul-Look, aber niemand findet sie: handpan.schule verlinkt nirgends dorthin, `/community/` verspricht ein „Community-Abo ab August 2026" und schickt zu Skool, und die Plattform-Landingpage endet nach drei Karten. Gleichzeitig sammelt der Brevo-Newsletter Adressen ohne Geschenk und ohne Willkommensstrecke. Ziel dieses Plans: Jeder Besucher der Website oder der Plattform bekommt einen klaren, ehrlichen Weg hinein (Brief → Tag 1 → kostenloses Konto → Kurs oder Kreis), und jede Adresse landet rechtssauber in einer Mail-Liste, aus der Nils ab Herbst Impulse, Kurs-Einladungen und die Eröffnung am 21.12. verschicken kann.

**Befunde aus der Inventur (heute, beide Repos):**
- Website hat **kein Build-System**: Nav, Footer, Newsletter-Formular sind in ~35 Dateien handkopiert und driften bereits (Blog-Nav ≠ Startseiten-Nav). Jede Massenänderung ist ein Haiku-Durchlauf mit Diff-Prüfung, kein Template-Edit.
- `/community/` gibt es **nur auf Deutsch**; die 6 anderen Sprachen sind Ein-Datei-Monolithe mit einer Community-Sektion, die direkt auf Skool zeigt. `skool.com` steht in 12 Dateien (24 Stellen).
- Brevo-Footer-Formular: Double-Opt-in ja, aber **kein Datenschutz-Hinweis am Formular**, und die Datenschutzerklärung **nennt Brevo nicht**. Auf `/handpan-path/` gibt es bereits ein Brevo-Wartelisten-Formular als Vorlage.
- Plattform: öffentlich sind nur `/` und `/auth/*` (Middleware). **Kein Impressum, keine Datenschutzerklärung, keine Einwilligungs-Spalte in `profiles`, keine Brevo-Anbindung, kein i18n** (kommt KW38). Signup ist E-Mail + Passwort mit Supabase-Bestätigungsmail.
- Layout-Referenz `_redesign/05-community.html` hat eine klare Anatomie: Frage als Header → drei Türen (Lesen / Sprechen / Üben) → Terminliste → ehrlicher Newsletter → FAQ. Ausdrücklich: keine Tier-Vergleichstabelle, kein Kaufdruck.

---

## 1 · Übergang Website → Lernplattform

**Grundsatz:** `/community/` wird zur **Brücke**, keine Weiterleitung. Gründe: ~20 Nav-Kopien zeigen auf `/community/`, die Seite hat SEO-Gewicht, der Skool-Übergang braucht einen Ort zum Erklären, und ein externer Sprung direkt aus dem Dropdown verliert den Kontext. Die Weiterleitung auf die Plattform wird erst in KW51 gesetzt, wenn die Community wirklich umgezogen ist.

| Stelle | Heute | Neu (Formulierung) | Wann |
|---|---|---|---|
| Nav-Dropdown „Lernplattform Community" (~20 Dateien) | → `/community/` | Label und Ziel bleiben (Brücke) | unverändert bis KW51, dann href → `https://lernen.handpan.schule` |
| `/community/` Seite (de) | Skool + „Abo ab August 2026" | Umbau nach Mockup-Anatomie, siehe unten | KW38 |
| Startseiten-Hero „Kostenlos starten" | → `/dabei-sein/` | → `https://lernen.handpan.schule/?von=website` „Kostenloses Konto" | KW41 (nach Checkpoint 1: Kalender + Kohorte laufen) |
| Kursseiten RF + Von Anfang an spielen | kein Hinweis | Ein Satz unter dem Ablauf: „Der Kurs findet in der Lernplattform der Schule statt: lernen.handpan.schule. Dein Zugang kommt per Mail." | KW39 (Kohorte startet 26.9.) |
| `/rhythmus-fundament/danke/`, `/links/` | Skool-Link | → Plattform-Konto | KW39 |
| Programm-Übersicht Karte „Lernplattform (Community)" | Skool-Text | Text: „Kurse, Werkzeug und Termine der Schule. Konto ist kostenlos, Eröffnung der Community am 21.12." | KW38 |
| Footer Spalte Angebote (~35 Dateien) | kein Link | Zeile „Lernplattform" → Plattform | KW51, im selben Haiku-Durchlauf wie die Nav |
| Termine-Sidebar | Links auf Kursseiten | bleibt; ab KW40 liefert `/api/events.json` die Daten, Community-Termine verlinken dann auf den Plattform-Termin | KW40 (Kalender-Baustein, nicht dieser Plan) |
| Datenschutz (de) | Brevo fehlt, Skool genannt | Brevo-Absatz ergänzen, Skool-Absatz auf „bis 31.1.2027" | KW41 |

**Neuer Aufbau `/community/` (de), Copy-Vorschlag:**
- Hero: H1 bleibt „Die Community", Sub: „Ab der Wintersonnenwende, dem 21. Dezember 2026, hat sie ein eigenes Zuhause: lernen.handpan.schule. Bis dahin bauen wir es gemeinsam."
- H2 „Drei Wege hinein" (Mockup-Türen): **Lesen** – „Briefe aus der Schule" + Tag 1 geschenkt (Lead-Magnet) · **Üben** – „Ein kostenloses Konto auf lernen.handpan.schule. Kurse, Werkzeug, Termine. Kein Abo nötig." → Plattform · **Treffen** – „Bis zur Eröffnung treffen wir uns weiter auf Skool, kostenlos." → Skool
- H2 „Dein Monat im Inneren Kreis" (heutige Abschnitt „Dein Monat im Community-Abo", nur Wörter tauschen, Datum 21.12., Satz „wird auf Skool abgerechnet" streichen)
- Der August-Satz wird zu: „Wer einfach dabei sein und schnuppern möchte, ist jederzeit kostenlos willkommen. Wer tiefer einsteigen will, in die Live-Sessions und den strukturierten Weg, findet ab dem 21. Dezember 2026 den Inneren Kreis. Trag dich ein, dann erfährst du es als Erste." + Wartelisten-Formular (Brevo, Vorlage `/handpan-path/`, Liste „Eröffnung")
- Bestehende Abschnitte „Warum Online", „Zuhause aller Programme", „Gemeinsam gestalten", Nils-Zitat bleiben; „Wohin diese Reise führt" bekommt die Terminliste (Mockup-Sektion „Was als Nächstes geschieht") + FAQ mit dem Skool-Absatz.

**Skool-Fahrplan:** bleibt bis 21.12. der Treffpunkt; ab KW39 angepinnter Post „Die Schule bekommt ein Zuhause" (Kohorte übt schon in der App); KW49 Post „Umzug am 21.12., was sich für dich ändert"; KW51 letzter Post mit Link. Danach Skool **lesbar bis 31.1.2027**, dann geschlossen. Das Datum steht auf `/community/`, in der Datenschutzerklärung und in Mail M11.

**Sprachen:** **Nur Deutsch jetzt, Englisch in KW47** (wenn RF Zyklus 1 auf Englisch spielbar ist). Begründung: Die Plattform ist bis KW43 komplett deutsch; ein englischer Link auf eine deutsche App verbrennt genau die Besucher, die er gewinnen soll. Für es/fr/ja/pt/zh: Haiku-Durchlauf, der die Community-Sektion auf einen neutralen Satz mit Skool-Link kürzt und ein etwaiges „August 2026" entfernt; kein Plattform-Link vor 2027.

---

## 2 · Landingpage lernen.handpan.schule

**Verortung:** Schul-Zweig in `app/page.tsx` (Zeile ~103, `brand === 'schule'`) wird in eine eigene Komponente `app/_schule/LandingSchule.tsx` ausgelagert (page.tsx hat 684 Zeilen), Styles bleiben Token-basiert (`--amber`, `--font-display` …, `SCHULE_CSS` wandert mit). Copy zunächst hartkodiert deutsch; die String-Extraktion in KW43 nimmt sie mit. Neue öffentliche Routen müssen in `app/lib/supabase/middleware.ts` in `isPublic` (heute nur `/` und `/auth/*`).

| # | Abschnitt | Zweck | Copy-Vorschlag (du-Form, Handy-Länge) | Baubar |
|---|---|---|---|---|
| 1 | Hero | Ankommen, ein Klick | Eyebrow „Handpan Schule des Lebens" · H1 **„Dein Ort zum Üben."** · Sub bleibt („Kurse, Termine und Werkzeuge der Schule an einem Ort. Du übst in deinem Tempo, ich gehe den Weg mit dir.") · CTA „Kostenloses Konto" / „Einloggen" · Kleinzeile „Kein Abo, keine Karte. Ein Konto, und du bist drin." | jetzt |
| 2 | Was dich hier erwartet | Die drei Karten erklären, was frei ist | **Kurse** „Rhythmus Fundament und Von Anfang an spielen: Tag für Tag, Video für Video, in deinem Konto. Kurse kaufst du einzeln." · **Werkzeug** „Die Rhythmus-Werkstatt: Patterns hören, bauen, verlangsamen, auf deine eigene Pan stimmen." · **Termine** „Live-Trainings und Fragerunden. Die Zoom-Tür hängt direkt am Termin." · Zeile „Bald: Nachrichten mit mir und deinen Mitspielern." | Karten jetzt; Termine-Text mit echten Terminen KW40; Nachrichten-Zeile KW46 |
| 3 | Für wen | Selbstauswahl, ehrlich | „Für dich, wenn du seit Wochen oder Jahren spielst und spürst: Es geht nicht um mehr Patterns, sondern um Boden unter dem Spiel. Wenn du bereit bist, regelmäßig zu üben, auch zehn Minuten am Tag. Und wenn die Handpan für dich kein Trick ist, sondern ein Weg." · „Nicht für dich, wenn du in vier Wochen ein Konzert spielen willst." | jetzt |
| 4 | Wer hier schreibt | Nils als Absender | Foto + „Ich bin Nils, Musiker und Künstler aus München. Seit Jahren unterrichte ich Handpan: Workshops, Einzelstunden, live. Dabei habe ich gesehen, dass fast niemand mehr weiß, wie man wirklich lernt. Nicht aus Mangel an Information, sondern aus Überfluss. Diese Schule ist meine Antwort." Signatur „Nils Caspar · Musiker & Künstler" | jetzt |
| 5 | Stimmen aus der Schule | Echter Beleg | 2–3 wörtliche RF-Zitate mit Vornamen (OCR aus `/images/testimonials/`, von Nils am 9.7. freigegeben). Ab Oktober ein Satz der Kohorte, nur wenn er wirklich gesagt wurde. Keine Zahlen, die nicht stimmen. | jetzt (RF), Kohorte KW41+ |
| 6 | Was es kostet | Klarheit statt Tabelle | v1: „Dein Konto ist kostenlos. Kurse sind eigene Wege mit eigenem Preis. Der Innere Kreis öffnet am 21.12." · v3 (nach Kaufweg): zwei Karten **Offener Raum – kostenlos** / **Innerer Kreis – 29 € im Monat, 290 € im Jahr**, je 4 Zeilen, kein Vergleichsraster | v1 jetzt, v3 KW43 |
| 7 | Fragen | Einwände | Eigene Pan nötig? (für Kurse ja, zum Reinhören nein; → Kaufberatung) · Keine Vorerfahrung? (→ Von Anfang an spielen) · Wie viel Zeit? (10–15 Minuten am Tag tragen weiter als zwei Stunden am Wochenende) · Was kostet das Konto? (nichts) · Was wird aus Skool? (bis 21.12. dort, dann hier) · Konto löschen? (jederzeit, eine Mail genügt) | jetzt |
| 8 | Einstieg | Adresse gewinnen | H2 **„Dein erster Tag, geschenkt."** „Ein Tag aus dem Rhythmus-Fundament: ein Video, eine Übung, eine Frage für den Weg. Trag deine E-Mail ein, bestätige den Link, und Tag 1 ist offen." Formular + Einwilligungszeile (siehe 3) · darunter „Oder gleich ein Konto anlegen." | KW39–40 mit Lead-Magnet |
| 9 | Footer | Pflicht | Links Impressum · Datenschutz · handpan.schule | jetzt |

Mobile-Regel: jede Sektion ≤ 4 Zeilen Fließtext bei 390 px, ein CTA pro Sektion, Karten untereinander, Buttons volle Breite. Interceptor-Probe 390×844 vor jedem Push (Follow-up aus der ISA: Chrome mit Extension einmal einrichten, sonst In-App-Browser als Ersatz, aber gekennzeichnet).

---

## 3 · Lead-Magnet und E-Mail-Einstieg

### Drei Ideen

| Idee | Was | Aufwand | Passung | Urteil |
|---|---|---|---|---|
| **A · „Dein erster Tag"** | Tag 1 des Rhythmus-Fundaments (vorhandenes Video + Markdown „Essenz · Worum es geht · Reflexion · Für den Weg") als öffentliche, unverlinkte Plattform-Seite `/tag-1` nach Bestätigung | 4–5 h Bau, 0 h Content | alle drei Typen; zeigt das Produkt selbst, führt direkt zum Konto, Tonfall ist der der Schule | **Empfehlung, jetzt** |
| B · „Erste Schritte"-Reihe | 5 kurze Mails über 7 Tage, je eine Übung (in `newsletter-willkommensstrecke.md` bereits vorgemerkt) | 12–16 h, davon ~10 h Nils vor der Kamera | Typ 1 und 3 (Einsteiger) | zweite Stufe, Januar 2027 |
| C · Wegweiser-PDF „Wo stehst du auf dem Pfad" | 5 Stufen (Dreyfus/Heldenreise) mit Selbsteinschätzung und Übungsrhythmus | 6–8 h | Typ 2; teilbar in WhatsApp/Facebook-Gruppen (Kanal B1) | Kandidat für Empfehlungs-Mechanik 2027; Name nicht „Kompass", der ist ein Kurs |

A gewinnt, weil er nichts Neues verlangt, das Versprechen der Landingpage („so fühlt sich ein Tag hier an") einlöst und der Weg zum Konto ein Klick ist. B und C bleiben Ausbaustufen.

### Wo und wie der Weg läuft

Angeboten auf **beiden** Seiten: Website `/community/` (Tür „Lesen") und Plattform-Sektion 8. Das Footer-Formular der Website bleibt vorerst wie es ist (35 Kopien), bekommt in KW41 nur die Datenschutz-Zeile.

Weg: Brief-Adresse (Brevo, DOI) → Bestätigungslink → `/tag-1` → CTA „Konto anlegen" → Free-Konto → Kurs kaufen (KW42) oder Innerer Kreis (21.12.). Wer direkt ein Konto anlegt, bekommt die Briefe nur mit eigener Checkbox.

### Technik: Brevo bleibt das Mail-System, Supabase das Konto-System

- **Brevo = einzige Wahrheit für Mail-Einwilligungen.** Willkommensstrecke, DOI, Abmeldung, Segmente laufen dort. Keine eigene Mail-Logik in der App.
- **Lead-Magnet-Formular auf der Plattform:** Route-Handler `app/api/briefe/route.ts` ruft die Brevo-API (`contacts/doubleOptinConfirmation`, Liste „Briefe", Attribut `QUELLE=tag1`) mit Server-Key `BREVO_API_KEY` (Vercel-Env); die DOI-Bestätigungsseite ist `https://lernen.handpan.schule/tag-1`. Website-Formular auf `/community/` nutzt das vorhandene sibforms-Muster mit derselben Liste.
- **Konto-Signup:** Checkbox **nicht vorangekreuzt**, getrennt von der Pflicht-Kenntnisnahme der Datenschutzerklärung. Migration `0005_marketing_consent.sql`: `profiles.marketing_consent_at timestamptz`, `marketing_consent_text_version text`, `brevo_synced_at timestamptz`. Der Sync passiert **erst in `app/auth/callback/route.ts`, nachdem Supabase die Adresse bestätigt hat**: Kontakt in Brevo anlegen (Liste „Briefe", `QUELLE=konto`, `CONSENT_AT`), idempotent über `brevo_synced_at`. So gibt es **eine** Bestätigungsmail statt zwei, und die Einwilligung ist protokolliert (Zeitpunkt, Textversion, bestätigte Adresse). Wer die Checkbox nicht setzt, bekommt nur Konto-Mails (Bestätigung, Passwort).
- **Kohorte 26.9.:** eigene Brevo-Liste „Schüler"; sie wird bei M8/M9 ausgeschlossen (wie die RF-Regel im Newsletter-Plan) und bekommt **keine** Willkommensstrecke, sondern Kurs-Post.

Einwilligungstext (Checkbox, beide Orte): „Ja, schick mir Briefe aus der Schule: Impulse zu Handpan und Bewusstsein, Termine und Einladungen zu Kursen. Abmelden geht in jeder Mail. Mehr in der Datenschutzerklärung."

### Willkommensstrecke (aus `newsletter-willkommensstrecke.md`, nichts neu geschrieben)

Die 12 Mails bleiben. Drei Stellen ändern sich durch diesen Plan:
- **M1 (Tag 0):** Geschenk ist jetzt **Tag 1** (`/tag-1`) statt „Skool kostenlos"; zweiter Satz „Wenn du magst, leg dir ein Konto an, dann wartet Tag 1 dort auf dich."
- **M11 (Tag 28):** CTA „Skool beitreten" → ab KW39 „Konto auf lernen.handpan.schule", Roadmap-Satz auf 21.12.
- **M9 (Tag 22):** bleibt direkter RF-Link (Nils' Entscheidung vom 9.7.); ab KW42 zeigt die RF-Seite auf den Plattform-Kaufweg.
Reihenfolge: M1–M3 zuerst (KW40–41, Fable), damit Tag-1-Abonnenten sofort eine Antwort bekommen; M4–M12 in KW42–44 (Sonnet nach Styleguide, Fable-Review).

### Rechtliches (Checkliste)

- [ ] **Impressum auf der Plattform** `/impressum` (Inhalt 1:1 von handpan.schule/impressum), Footer-Link, öffentliche Route
- [ ] **Datenschutzerklärung Plattform** `/datenschutz`: Supabase (Auth, DB, Region + AVV prüfen), Vercel (Hosting, Logs), Bunny (Video), Brevo (Newsletter, DOI, Protokoll), Stripe (ab KW42), Cookies (nur technisch: Session, `brand`), Betroffenenrechte, Konto-Löschung per Mail bis Self-Service
- [ ] **Datenschutzerklärung Website (de):** Brevo-Absatz nachtragen, Skool-Absatz mit Enddatum; 6 Sprachkopien später
- [ ] **Einwilligung:** Checkbox unangekreuzt, Text wie oben, Version im Profil protokolliert, DOI bzw. bestätigte Adresse, Abmeldelink in jeder Mail (Brevo)
- [ ] **Formular-Hinweis** unter jedem Newsletter-Feld: „Double-Opt-in, jederzeit abmelden, Datenschutzerklärung" (Plattform sofort, Website-Footer KW41 per Haiku-Durchlauf)
- [ ] `/tag-1` mit `noindex`, Video-Embed nur dort; keine Weitergabe an Dritte außer Bunny
- [ ] AGB und Widerruf bleiben beim Kaufweg (KW41, Phasenplan §5), nicht Teil dieses Plans

---

## 4 · Reihenfolge, Aufwand, Modell-Routing

Regel aus `rhythm-gym/CLAUDE.md`: Fable Konzept/Copy-Review und Consent-Design, Opus Bau, Sonnet Recherche, Haiku Mechanik. Vor jedem Push: Interceptor 390×844.

| # | Paket | KW | Std | Modell | Hängt ab von |
|---|---|---|---|---|---|
| 0 | Plan kopieren, Memory aktualisieren | 38 | 0,5 | – | Freigabe |
| 1 | Plattform: `/impressum`, `/datenschutz`, Footer-Links, `isPublic` erweitern | 38 | 3 | Sonnet (AVV/Region-Recherche) → Opus; Text Nils | – |
| 2 | Website `/community/` Umbau (de) + Datum-Fix an 4 Stellen + Wartelisten-Formular + Programm-Karte | 38 | 4 | Fable Copy → Opus Bau → Haiku Diff-Prüfung | – |
| 3 | Landing v1: Komponente auslagern, Sektionen 1–4, 6 (v1), 7, 9; Testimonial-OCR | 39 | 5 | Fable Copy-Review, Opus Bau, Haiku OCR | 1 |
| 4 | Kursseiten-Satz RF + VAAS, `danke`/`links` auf Plattform, Skool-Post 1 | 39 | 1,5 | Haiku; Post Nils | Kohorte 26.9. |
| 5 | Lead-Magnet: `/tag-1`, `api/briefe`, Brevo-Liste „Briefe", DOI-Redirect, Sektion 8 | 39–40 | 5 | Sonnet (Brevo-API) → Opus | 3 |
| 6 | Signup-Checkbox, Migration 0005, Sync im Callback | 40 | 4 | Fable (Consent-Log-Design) → Opus | 5 |
| 7 | Willkommensstrecke M1–M3 in Brevo (Automation, Template) | 40–41 | 4 | Fable Text, Sonnet Setup | 5 |
| 8 | Startseiten-Hero → Plattform; Website-Datenschutz Brevo/Skool; Footer-Hinweiszeile (35 Dateien) | 41 | 2,5 | Haiku, Diff-Prüfung Sonnet | Checkpoint 1 |
| 9 | Landing v2: echte Termine, Kohorten-Stimme, Nachrichten-Zeile später | 41 | 2 | Opus | Kalender KW40 |
| 10 | Willkommensstrecke M4–M12 | 42–44 | 8 | Sonnet Text, Fable Review | 7 |
| 11 | Landing v3: Preise Offener Raum / Innerer Kreis | 43 | 2 | Fable Copy, Opus | Kaufweg KW42 |
| 12 | Fremdsprachen-Sektionen neutralisieren (5 Monolithe) | 43 | 1,5 | Haiku | – |
| 13 | Skool-Post 2 (KW49), Nav/Footer/Weiterleitung `/community/` → Plattform, Skool-Post 3 | 49 / 51 | 2 | Haiku; Posts Nils | Launch |

**Summe ≈ 45 h** über KW38–KW44, also rund 6 h pro Woche neben den ~2 Bautagen des Phasenplans. Das ist der Preis der „kleinen Schritte parallel". Wenn es zu eng wird, in dieser Reihenfolge schieben: 10 (M4–M12 nach KW47), 12, 9. Nicht schieben: 1, 2, 5, 6 – sie sind die Rechts- und Einstiegsgrundlage.

**Verifikation je Paket:** Website: Interceptor-Screenshot 390×844 der geänderten Seite, Grep „August 2026" = 0 in `/community/`, Diff auf Nav-Block gegen `index.html`. Plattform: `bunx tsc --noEmit`, `bun test`, `bun run build`, curl `/impressum` und `/tag-1` ohne Cookie = 200, Signup-Probe mit und ohne Checkbox (Profil-Spalte, Brevo-Kontakt nur mit Checkbox), Konsole ohne Fehler, Interceptor 390×844 auf `/`, `/tag-1`, `/auth/login?mode=signup`. Brevo: Test-DOI von einer eigenen Adresse bis `/tag-1`, M1 kommt nach Bestätigung.

---

## 5 · Deine Entscheidungen (mit Empfehlung)

1. **`/community/` als Brücke statt Weiterleitung, Weiterleitung erst KW51?** – *Empfehlung: ja.*
2. **Skool lesbar bis 31.1.2027, dann geschlossen; drei Posts (KW39, 49, 51)?** – *Empfehlung: ja; ein Datum, das überall gleich steht.*
3. **Abo-Datum „21.12.2026" mit Warteliste (Brevo-Liste „Eröffnung")?** – *Empfehlung: ja, dein Default.*
4. **Sprachen: nur de jetzt, en in KW47, Rest nur neutralisiert?** – *Empfehlung: ja; kein Link auf eine App, die die Sprache nicht spricht.*
5. **Tier-Namen ohne Tabu-Wort „Premium":** „Offener Raum" (kostenlos) und „Innerer Kreis" (29 €/290 €)? – *Empfehlung: ja; entscheidet auch die Copy auf Website, Plattform und in Stripe.*
6. **Was steckt im kostenlosen Konto?** Discovery C3 legt die Werkstatt in den Kreis. – *Empfehlung: Termine sehen, monatliche Fragerunde, Werkstatt-Bibliothek nur hören; Bauen/Speichern, Live-Sessions, Nachrichten im Kreis. Muss vor Landing v1 (Karte „Werkzeug") feststehen.*
7. **Lead-Magnet A „Dein erster Tag" (RF Tag 1) jetzt, B/C 2027?** – *Empfehlung: ja.*
8. **Eine Bestätigungsmail:** Brevo-Sync erst nach Supabase-Bestätigung statt zweitem DOI? – *Empfehlung: ja; protokollierte Einwilligung + bestätigte Adresse reicht, weniger Reibung.*
9. **Kohorte 26.9. ohne Willkommensstrecke, eigene Liste „Schüler"?** – *Empfehlung: ja.*
10. **Startseiten-Hero „Kostenlos starten" ab KW41 auf die Plattform statt `/dabei-sein/`?** – *Empfehlung: ja, erst wenn Kalender und Kohorte laufen.*
11. **Budget ~6 h/Woche zusätzlich tragbar?** – *Wenn nein: Paket 10 nach KW47, 12 und 9 streichen.*
