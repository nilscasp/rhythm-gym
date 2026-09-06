# Phasenplan v2: rhythm-gym → Handpan Schule des Lebens

**Stand:** So, 6. September 2026 · **Launch bleibt:** Wintersonnenwende, So 21.12.2026 · **Restbudget:** 15 Wochen (KW37–KW51)

> Ersetzt `rhythm-gym/Plans/phasenplan-schule-des-lebens.md` (Juli-Plan, 24 Wochen ab 6.7.). Der Juli-Plan ging von Block A (Entitlements/Stripe, 6 Wochen) als erstem Bauschritt aus — der wurde nicht begonnen, dafür entstand anderes. Dieser Plan baselined den echten September-Stand, entscheidet die drei offenen Fragen aus deiner Nachricht (Layout/zweite Version, Sprachen, Kalender) und belegt die Restwochen. Freigegeben von Nils am 2026-09-06; Kopie liegt in `rhythm-gym/Plans/phasenplan-schule-des-lebens-v2.md`.
>
> Grundlagen, die **nicht** neu verhandelt werden (Juli-Grill-me): Skool wird abgelöst statt erweitert; Phase 1 = Schulraum, der Coach-Agent kommt danach; Rollen nur Admin + Schüler; PWA statt native App.

---

## 1 · Was seit Juli tatsächlich passiert ist

**Gebaut in rhythm-gym (19.000 LOC, Next 16 / Supabase / Tailwind 4, live auf rhythmgym.io):**
- Zugangs-Codes als Entitlement: `enrollments` ist die einzige Wahrheitsquelle, `redeem_access_code()` (SECURITY DEFINER) der einzige Schreibweg, RLS gehärtet (Migrationen 0003/0004).
- Drip-Unlock: 44 Kurstage ab Startdatum, Berechnung in `app/lib/course-access.ts` (Europe/Berlin), getestet in `tests/course-access.test.ts`.
- Eigenes Instrument im Onboarding (`handpans`-Tabelle, Skalen-Templates, instrument-aware Playback).
- Englische Dubbing-Pipeline für die Rhythmus-Fundament-Videos (`scripts/dub/`) — das ist bereits i18n-Vorarbeit.
- Coach-Bereich (Admin): Schülerübersicht, Code-Verwaltung.

**Nicht gebaut (Juli-Blöcke A und B):** keine Stripe-Integration im Code (`profiles.stripe_customer_id` existiert, ungenutzt), kein Kalender/keine Events, kein i18n-Framework (UI komplett hartkodiert Deutsch, `<html lang="de">`), kein Feed, keine DMs, keine Karte, kein Theme-Mechanismus (ein festes dunkles Gym-Design, Fonts Anton/Barlow).

**Auf der Website (handpan-website-github, GitHub Pages, 44 Seiten, 7 Sprachen de/en/es/fr/ja/pt/zh):**
- Verkauf läuft über Stripe-Payment-Links: Rhythmus Fundament 399 € (Anmeldeschluss 10.9.), Von Anfang an spielen 450 € (Start **Fr 26.9.2026**, max. 13 Plätze), Mentoring 150 €.
- `/community/` verlinkt weiter auf Skool und verspricht ein „Community-Abo, das im August 2026 startet" — **offener Widerspruch**, muss sofort auf ein realistisches Datum.
- Termine-Sidebar liest `events.json` (pro Sprache eine eigene Datei, 4 Einträge de).
- `_redesign/`-Mockups (Homepage, Kursseite, Community-Hub) führen den Dark-Look konsequent weiter.
- Kein Link von der Website auf die App; `app.handpan.schule` ist nirgends konfiguriert.

**Discovery-Worksheet (`rhythm-gym/docs/handpan-schule/discovery.md`):** Sektionen A (Brand) und C (Mitgliedschaft: Free + Premium 29 €/290 €, Kurse als eigene Käufe, DMs nur Premium) beantwortet; D–L (Onboarding, Feed-Regeln, Events, Legal, Landing) offen.

---

## 2 · Brand-Modell: umbauen, forken oder Theme-Schicht

Deine Frage war „umbauen **oder** zweite Version". Nach Zerlegung ist die Marke in der App genau drei Dinge: Farb-Tokens (`app/globals.css`), Fonts (`app/layout.tsx`) und Nav/Logo (`components/Nav.tsx`, `components/Logo.tsx`). Alles andere — Datenmodell, Player, Sequencer, Kurszugang — ist markenneutral.

| Option | Was passiert | Warum sie verliert / gewinnt |
|---|---|---|
| **Umbau** — rhythm-gym wird zur Schule | Ein Design, rhythmgym.io wird Schule | Bestandsnutzer und die auf der Website beworbene „Rhythm-Gym Handpan-Maschine" verlieren ihre Identität; das Gym ist ein Werkzeug, die Schule ein Ort — zwei Erzählungen |
| **Fork** — zweite App | Repo kopieren, zweites Supabase | Jede Migration, jeder Bugfix, jede RLS-Policy doppelt; ein Mensch bräuchte zwei Konten |
| **Theme-Schicht** (Empfehlung) | Eine App, eine DB, ein Deployment, zwei Hosts | Marke = Konfiguration; Schüler haben ein Konto; Sequencer/Bibliothek sind in beiden Marken Abo-Inhalt (Discovery C3) |

**Technischer Mechanismus (klein, KW37–38):**
- `proxy.ts` (Next-Middleware) leitet aus dem Host `app.handpan.schule` → `brand=schule`, `rhythmgym.io` → `brand=gym` ab; Override per Cookie für lokales Testen.
- `app/layout.tsx` setzt `<html data-brand="schule|gym">`; `globals.css` definiert beide Token-Sets unter `[data-brand=…]`. Bestehende Gym-Tokens (`--black/--amber/--cream…`) bleiben unverändert, die Schul-Tokens kommen dazu.
- Nav-Array und Logo werden brand-abhängig (Schule: Kurse · Termine · Community · Werkzeuge; Gym: wie heute).
- Fonts pro Brand laden: Gym Anton/Barlow wie bisher, Schule Fraunces + Spectral (self-hosted wie auf der Website, `fonts/fonts.css` übernehmen), Nav-Font Jost.

**Design-Widerspruch auflösen:** discovery.md (Juni) sah einen *neuen* Light-Mode (Tenor Sans/Inter, Weiß/Gold/Sage) als Hauptrichtung; Website und `_redesign/` (September) gehen konsequent Dark. Empfehlung: **Dark = Website-Tokens 1:1**, Light-Mode wird gestrichen oder auf Q1/2027 verschoben. Ein Mode-Toggle zum Launch kostet Zeit und verwässert den Wiedererkennungseffekt.

Schul-Tokens (aus `css/style.css` der Website, verbindlich):

```css
--color-bg: #0A0E14;  --color-bg-lighter: #141922;
--color-text: #E8E6E3;  --color-text-muted: #A0A0A0;
--color-accent: #D4A574;  --color-accent-dark: #B8956C;
--line: rgba(212,165,116,0.12);
```

Layout-Referenz für App-Seiten: `_redesign/02-course-page.html` (Kursseite) und `05-community.html` (Hub). Das Noise-Overlay der Website ist optional — auf Mobile erst mit Performance-Probe. Copy-Regeln aus discovery.md A5 gelten im Schul-Theme (du-Form; Tabu: „Premium", „User", „Plan", „Module"). rhythmgym.io bleibt erreichbar und wird **nicht** umgeleitet.

Empfehlung dazu: rhythm-gym bekommt eine Projekt-`ISA.md` als System of Record — das Repo hat keine, und ab jetzt arbeiten mehrere Sessions gegen dasselbe Ziel.

---

## 3 · Mehrsprachigkeit

Drei Ebenen, die getrennt geplant werden müssen, weil sie unterschiedlich teuer sind:

| Ebene | Was | Werkzeug | Aufwand |
|---|---|---|---|
| UI-Strings | 17 Routen, Nav, Buttons, Fehlertexte | `next-intl` (App-Router-nativ, Server Components, Formatierung für Datum/Zahl) | ~1,5 Wochen Extraktion, meist Haiku-Mechanik |
| Kursinhalte | `content/rhythmusfundament/tag-1..40.md` + `data/rhythmusfundament-days.ts` | Ordner `content/{kurs}/{locale}/tag-N.md`, Fallback auf `de`, wenn Datei fehlt | Erstübersetzung per Inference-Tool, Nils-Review pro Tag |
| Videos | Bunny-Embeds | Video-ID je Locale in den Day-Metadaten; Dub-Pipeline liefert EN | läuft bereits |

**Entscheidungen im Plan:**
- Routing: Pfad-Präfix nur für Nicht-Default (`/en/training/…`), Deutsch bleibt präfixfrei — **alle bestehenden URLs bleiben gültig**.
- Locale im Profil (`profiles.locale`), Erstwahl aus `Accept-Language`, Umschalter im Nav (wie das `.lang-switcher`-Widget der Website).
- Datenbank: übersetzbare Felder in `programs`, `exercises`, `events` als `jsonb` (`{"de": …, "en": …}`) statt Translations-Tabelle — weniger Joins, ein Admin-Formular.
- `<html lang>` dynamisch; Datum/Zeit per next-intl in Locale + Zeitzone des Nutzers; Preise bleiben EUR, nur Anzeige lokalisiert.
- **Startset zum 21.12.: de + en.** Die fünf weiteren Website-Sprachen folgen erst, wenn Kursinhalt und Support in der Sprache tragbar sind — sonst verkauft die Website in sieben Sprachen einen Kurs, der in fünf davon deutsch ist. Kein ja/zh/pt/fr/es-Kursinhalt zum Launch.

---

## 4 · Kalender & Termine

Das erste sichtbare Skool-Ersatzstück und funktional klein — deshalb von Woche 12 (Juli-Plan) auf **KW37–40** vorgezogen.

**Datenmodell `events`:** `id`, `title jsonb`, `description jsonb`, `starts_at timestamptz`, `ends_at`, `kind` (`live_training` | `qa` | `workshop` | `retreat` | `community`), `location` (Text) und `zoom_url` (nur mit Zugriff sichtbar), `program_id` (optional → Kurs-Termin), `visibility` (`public` | `members` | `premium` | `program`), `created_by`. Speicherkonvention Europe/Berlin wie beim Drip. Wiederkehrende Termine = Serie als n Einzelevents mit `series_id` (kein RRULE-Motor).

**Zugriffsregel (eine Funktion, `hasEventAccess(user, event)` neben `course-access.ts`):** Titel/Beschreibung/Zeit sind für alle sichtbar (Verkaufskanal), `zoom_url` nur wenn `visibility` erfüllt ist: `program` ⇒ Enrollment im Programm, `premium` ⇒ `profiles.plan = premium`, `members` ⇒ eingeloggt. Sonst Kauf-CTA direkt am Termin.

**UI:** Listenansicht „Kommende Termine" (Monat-Gruppen) + Termin-Detail; Admin legt Termine im Coach-Bereich an. **Website-Anschluss:** eine Route `/api/events.json?locale=de` liefert das heutige Website-Schema (`title`, `date`, `time`, `type`, `location`, `link`); die Website-Sidebar zeigt damit dieselben Termine wie die App, `events.json` wird nicht mehr von Hand gepflegt.

Kürzungskandidaten innerhalb des Kalenders: RSVP, ICS-Feed pro Nutzer, Erinnerungs-Mail 24 h vorher. Kein externer Kalender-Sync (Google/Apple) in Phase 1.

---

## 5 · Kurszugang & Bezahlung

Der Juli-Plan wollte ein vollständiges Entitlement-System in 6 Wochen. Das ist nicht mehr nötig: `enrollments` + `redeem_access_code` **sind** das Entitlement. Was fehlt, ist nur der automatische Weg vom Kauf zum Enrollment.

- **Stripe-Webhook** (`app/api/stripe/webhook/route.ts`): `checkout.session.completed` → Programm aus Payment-Link-Metadaten (`program_slug`) lesen → Enrollment anlegen (neue SECURITY-DEFINER-Funktion `grant_enrollment(email, program, drip_start)`), Nutzer per E-Mail matchen oder Einladungs-Mail mit Magic-Link. Signaturprüfung, Idempotenz über `stripe_events(event_id)`-Tabelle.
- **Premium-Community-Abo** (29 €/290 €): `customer.subscription.created/updated/deleted` → `profiles.plan`. Free-Tier braucht kein Stripe-Objekt.
- **Zugangs-Codes bleiben** als Workshop-/Kulanzweg. Bestandskäufer der 399-€-Links werden einmalig per Code oder manuellem Enrollment übernommen.
- Kündigung/Refund setzt `enrollments.status`, löscht nie. Keine clientseitigen Enrollment-Writes — Regel aus dem Access-Gating-Run gilt weiter.
- **Von Anfang an spielen (26.9.) ist der echte erste Stichtag, nicht der 21.12.** 13 zahlende Teilnehmer sind die einzige realistische Beta-Kohorte dieses Jahres. Sie werden ab 26.9. **in der App** aufgenommen — das geht schon heute: Zugangs-Code mit `drip_start_date` für den RF-Zyklus-1-Bonus, Konto auf app.handpan.schule im Schul-Look, Termine des Kurses im Kalender. Kein neues Programm bauen; der Kursbetrieb selbst (Zoom, PDF) läuft daneben weiter. Damit sammelt jede Woche echtes Feedback statt einer späteren Migration.
- **Nicht-Code-Pflichten mit Deadline** (bisher in keinem Plan): Umsatzsteuer auf digitale Leistungen an EU-Kunden (Stripe Tax aktivieren), Rechnungsversand (Stripe Invoices), Widerrufsbelehrung und AGB (Discovery J3/J4 offen). Gehört in KW41–42, ist keine Entwicklerarbeit.
- Sicherheits-Review (RLS, Webhook, Zugriffslogik) fest an Checkpoint 2.

**Eine Community oder zwei?** Die Theme-Schicht trennt nur Optik. Sobald Feed und DMs kommen, muss entschieden sein, ob Gym- und Schul-Nutzer einander sehen. Empfehlung: **eine Community** — die Gym-Nutzer sind deine Schüler, das Gym ist ein Werkzeug der Schule; Feed und DMs erscheinen nur in der Schul-Navigation, aber es gibt keine `brand_id` auf Nutzerdaten und keine doppelten RLS-Policies. Wenn du das anders willst, muss `brand_id` in KW37 ins Datenmodell, nicht in KW44.

---

## 6 · Feed, DMs, Karte

1:1-DMs über Supabase Realtime mit Willkommens-DM „von Nils" als einziger getriggerter Nachricht bleiben **nicht kürzbar** — sie sind der direkte Draht, den Skool heute liefert. Beim Feed weiche ich vom Juli-Plan ab und stelle ihn dir als Entscheidung: mit ~30 Nutzern zum Launch ist ein leerer Feed schlechter als kein Feed, und die Skool-Community lebt heute vor allem von Terminen und Nachrichten. Empfehlung: **Feed → Januar 2027**, dafür die frei werdenden zwei Wochen als Puffer für Kaufweg und DMs. Wenn er doch zum Launch soll: ein Stream ohne Kategorien, YouTube-Links statt Upload. **Karte → Januar 2027** (isoliert, bringt keine Skool-Ablösung). Web-Push kürzbar.

---

## 7 · Zeitplan KW37–KW51

Annahme: **~2 Bautage/Woche** (Nils + KI-Sessions) = rund 30 Bautage. Das ist knapp; darum sind Feed und Karte draußen, das i18n-Gerüst liegt früh (Retrofit wird mit jeder neuen Seite teurer, die Übersetzung selbst kann warten), und KW49–51 sind Stabilisierung — die Launchwoche selbst baut nichts Neues mehr.

| KW | Zeitraum | Baustein | Ende der Woche steht |
|---|---|---|---|
| 37 | 7.–13.9. | **0 · Fundament**: Projekt-ISA, Theme-Schicht (Tokens, Fonts, `data-brand`, Nav/Logo), Domain `app.handpan.schule` auf Vercel, Website-Text „Abo ab August" korrigieren | App unter app.handpan.schule im Schul-Look erreichbar |
| 38 | 14.–20.9. | 0 · **i18n-Gerüst** (next-intl, Routing, `profiles.locale`) zusammen mit dem Theme, weil beides `layout.tsx`/`proxy.ts` anfasst; `events`-Migration + `hasEventAccess` | `/en/` rendert, Nils kann Termine anlegen |
| 39 | 21.–27.9. | **1 · Kalender-UI** (Liste, Detail, CTA), `/api/events.json`; **Fr 26.9.: VAAS-Kohorte kommt per Code in die App** | Termine in App + Website-Sidebar aus einer Quelle; 13 Beta-Nutzer aktiv |
| 40 | 28.9.–4.10. | 1 · Mobile-Politur Kalender, erstes Kohorten-Feedback; Stripe-Webhook-Skelett + `stripe_events` | **Checkpoint 1 (Fr 2.10.)** |
| 41 | 5.–11.10. | **2 · Kaufweg**: Checkout → Enrollment, Claim-/Einladungs-Flow, Bestandskäufer-Übernahme; Stripe Tax/Invoices, AGB/Widerruf (Nils) | Testkauf im Stripe-Testmodus erzeugt Enrollment |
| 42 | 12.–18.10. | 2 · Abo-Webhooks → `profiles.plan`, Härtung (Refund, Doppelkauf, Retries) | alle Kaufpfade grün |
| 43 | 19.–25.10. | 2 · UI-String-Extraktion (Haiku-Mechanik) + Content-Ordnerstruktur mit de-Fallback | UI vollständig aus Message-Dateien |
| 44 | 26.10.–1.11. | Sicherheits-Review (RLS, Webhook, `hasEventAccess`); Puffer für 2 | **Checkpoint 2 (Fr 30.10.)** |
| 45 | 2.–8.11. | **3 · DMs**: Postfach, Konversation, Realtime | DMs für Kohorte nutzbar |
| 46 | 9.–15.11. | 3 · DMs: Willkommens-DM, Mobile, Moderation (Sperren) | DMs live |
| 47 | 16.–22.11. | **4 · EN-Kursinhalt** RF Zyklus 1 (Erstübersetzung + Review), EN-Video-IDs | Tag 1–11 auf Englisch spielbar |
| 48 | 23.–29.11. | 4 · Puffer / Nachzügler aus 2–3; Beta auf 20–30 Schüler erweitern | **Checkpoint 3 (Fr 27.11.)** |
| 49 | 30.11.–6.12. | **5 · Beta breit**, Skool-Termine und Pinned-Inhalte übertragen, Datenschutz-Text (Supabase/Stripe/Bunny/Vercel) | Beta läuft |
| 50 | 7.–13.12. | 5 · Beta-Feedback, Bugfixes, letzte Mobile-Runden — keine neuen Features | launchfähig, eingefroren |
| 51 | 14.–21.12. | **Launch-Woche**: Website `/community/` von Skool auf App umstellen, Kommunikation an die Community | **So 21.12.: Eröffnung** |

**Checkpoints:**

| Datum | Prüfung | Bei Rückstand |
|---|---|---|
| Fr 2.10. (KW40) | Theme + Kalender live, VAAS-Kohorte in der App? | Theme einfrieren, Erinnerungs-Mails/RSVP/ICS streichen |
| Fr 30.10. (KW44) | Kaufweg grün, Strings extrahiert, Security-Review erledigt? | Abo-Webhooks streichen (Premium manuell bis Januar), EN-Kursinhalt auf Zyklus 1 begrenzen |
| Fr 27.11. (KW48) | DMs live, EN Zyklus 1 spielbar, Beta breit? | EN-Inhalt komplett nach Januar; letzte Scope-Entscheidung, danach nur Stabilisierung |

**Kürzungsliste (in dieser Reihenfolge):** 1. Web-Push · 2. Erinnerungs-Mails/RSVP/ICS · 3. Abo-Webhooks (Premium manuell setzen bis Januar) · 4. EN-Kursinhalt (Gerüst bleibt, Übersetzung Januar) · 5. Locale-Umschalter im Profil (nur URL-Präfix).
**Bereits draußen (Januar 2027):** Feed, Karte, Light-Mode, weitere Sprachen.
**Nicht kürzbar:** Theme-Schicht, Kalender mit Zugriffsregel, Kauf → Enrollment, 1:1-DMs, Mobile-Probe vor jedem Push.

---

## 8 · Modell-Routing (Stand 6.9., nach Nils' Vorgabe „Ausführen mit Opus")

**Hauptsession für alle Bau-Sessions: Opus.** Das Hauptmodell schaltest du selbst in der App um (Modellwahl bzw. `/model`) — ich kann die laufende Session nicht wechseln. Alles darunter wende ich **automatisch** über den `model`-Parameter beim Delegieren an; die Regel steht in `rhythm-gym/CLAUDE.md`, damit jede Session sie sieht.

| Arbeit | Modell | Wie es angewandt wird | Wann |
|---|---|---|---|
| Projekt-ISA, Theme-Mechanismus, `events`-Datenmodell, Webhook-Design, `hasEventAccess` | **Fable** | `Agent(subagent_type: Architect, model: fable)` aus der Opus-Session — oder du schaltest für Tag 1 von KW37 die Hauptsession auf Fable | KW37–38, KW40 |
| Sicherheits-Review (RLS, Webhook-Signatur, Zugriffslogik) | **Fable** + zweiter Leser **Opus** (Engineer) — Cato/Forge entfallen: kein `codex`, keine Moonshot-Creds | zwei getrennte Agents, read-only | KW44, KW49 |
| Feature-Implementierung: Kalender-UI, Kaufweg, i18n-Gerüst, DMs | **Opus** | Hauptsession; bei Parallelarbeit `Agent(subagent_type: Engineer, model: opus)` | KW37–46 |
| Codebase-Suche/Inventar vor jedem Baustein | **Sonnet** | `Agent(subagent_type: Explore, model: sonnet)` — schnell, billig, Ergebnis reicht | vor jedem Baustein |
| Mechanik: UI-String-Extraktion, Migrations-Boilerplate, Erstübersetzung EN, Copy-Fixes | **Haiku** | `Agent(model: haiku)` bzw. `bun TOOLS/Inference.ts fast` | KW43, KW47, laufend |
| Übersetzungs-Review Kursinhalt (Ton, Fachbegriffe wie tap/clap) | **Sonnet** + Nils | `Agent(model: sonnet)` liefert Vorschlag, Nils entscheidet | KW47 |
| Mobile-Verifikation 390×844 nach jedem Baustein | **Interceptor** (Pflicht, kein agent-browser) | kein Modell, Skill | jede Woche vor Push |
| Beta-Triage, Bugfixing | **Sonnet**; Root-Cause-Fälle **Opus** | Hauptsession Opus, Triage-Agent Sonnet | KW49–50 |
| Launch-Review gegen diesen Plan | **Fable** | `Agent(model: fable)` read-only oder Hauptsession | KW50 |

Faustregel bleibt: **Fable für Entscheidungen, die teuer rückgängig zu machen sind; Opus fürs Bauen; Sonnet fürs Suchen und Triagieren; Haiku für alles Mechanische.** Gegenüber Juli ist Sonnet als Bau-Modell durch Opus ersetzt (deine Vorgabe) und Fable läuft als Subagent statt als Hauptsession, damit du nicht ständig umschalten musst.

---

## 9 · Deine Entscheidungen (mit meiner Empfehlung)

1. **Brand-Modell:** Theme-Schicht statt Umbau oder Fork? — *Empfehlung: ja.*
2. **Light-Mode aus discovery.md:** streichen oder Q1/2027? — *Empfehlung: Q1/2027, Dark ist die Bühne, die deine Schüler kennen.*
3. **Sprach-Startset:** de + en zum 21.12.? — *Empfehlung: ja; weitere Sprachen erst mit fertigem Kursinhalt.*
4. **Von Anfang an spielen (26.9.):** Teilnehmer ab Tag 1 per Code in die App als Beta-Kohorte? — *Empfehlung: ja, kein neues Programm, aber die App ist ab 26.9. ihr Zuhause.*
5. **Feed → Januar 2027** statt Launch-Feature? — *Empfehlung: ja; leerer Feed schadet mehr als kein Feed. Abweichung vom Juli-Plan, deshalb deine Entscheidung.*
6. **Eine Community für Gym und Schule** (keine Mandantentrennung im Datenmodell)? — *Empfehlung: ja; sonst muss `brand_id` in KW37 rein.*
7. **Neues Datum fürs Community-Abo auf der Website:** 21.12.2026? — *Empfehlung: ja, mit „Warteliste" statt Skool-Link.*
8. **Wochenbudget ~2 Bautage:** realistisch? — *Wenn nein: Kürzungsliste sofort ab Punkt 1–3 anwenden.*

Erste Aktion nach Freigabe: Projekt-`ISA.md` für rhythm-gym anlegen, dann KW37.

---

## Verifikation des Plans (nach Freigabe, in der ersten Bausession)

- Plan nach `rhythm-gym/Plans/phasenplan-schule-des-lebens-v2.md` kopieren, Juli-Plan mit Hinweis „ersetzt durch v2" belassen.
- Memory `project_handpan-schule-des-lebens.md` auf v2-Stand bringen (15 Wochen, Theme-Schicht, de+en, Kalender vorgezogen).
- Anschlussstellen für KW37 sind benannt: `app/globals.css`, `app/layout.tsx`, `components/Nav.tsx`, `components/Logo.tsx`, `proxy.ts`, `app/lib/course-access.ts`, `app/lib/supabase/database.types.ts`, Website `css/style.css` + `fonts/fonts.css` + `js/main.js` (`loadEvents`).
- Erste Bau-Probe: app.handpan.schule zeigt Schul-Tokens, rhythmgym.io unverändert — Interceptor-Screenshots beider Hosts bei 390×844.
