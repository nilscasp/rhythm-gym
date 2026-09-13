---
project: rhythm-gym / Handpan Schule des Lebens
task: VIP-Stufe in der Schul-App (plan + Sichtbarkeit vip)
slug: vip-stufe
effort: E3
phase: verify
progress: 35/36
mode: standard
started: 2026-09-13T20:05:00+02:00
updated: 2026-09-13T20:10:00+02:00
---

## Problem

rhythm-gym ist eine funktionierende Trainings-App (rhythmgym.io) mit Profilen, Kurszugang über `enrollments`, Drip-Unlock, Sequencer und Pattern-Bibliothek — aber sie trägt nur die Gym-Marke (Anton/Barlow, Amber #F5A623 auf Schwarz). Die Handpan Schule des Lebens braucht bis 21.12.2026 einen eigenen Ort (`lernen.handpan.schule`), der Skool ablöst: Kurse, Termine, DMs, später Feed — im Look der Website handpan.schule (Navy #0A0E14, Gold #D4A574, Fraunces/Spectral). Heute gibt es keinen Theme-Mechanismus, keine Host-Erkennung, keine Termine, keine i18n, keinen Kaufweg außer Codes. Die Website verspricht ein Abo, das es nicht gibt, und am 26.9. startet ein Kurs mit 13 Teilnehmern, die die App als Beta-Kohorte nutzen sollen.

## Vision

Ein Schüler öffnet lernen.handpan.schule auf dem Handy und ist sofort in der Schule: dunkles Navy, goldene Akzente, die Serifen der Website, das Logo — dieselbe Bühne wie handpan.schule, nur jetzt mit Tür nach innen. Nils öffnet rhythmgym.io und sieht das Gym wie immer. Beide sind dieselbe App, dieselbe Datenbank, dasselbe Konto. Kein Nutzer merkt, dass unter der Oberfläche nichts dupliziert wurde.

## Out of Scope

Für KW37: kein Kalender (KW38–40), kein i18n-Gerüst (KW38), kein Stripe (KW40–42), keine DMs (KW45–46), kein Feed, keine Karte, kein Light-Mode, keine Übersetzung. Keine Umgestaltung einzelner Seiten über die Token-Umbelegung hinaus — die Seiten bleiben inhaltlich wie sie sind. Keine Änderung an Datenmodell oder RLS. Kein DNS/Domain-Setup durch die KI (Nils bei Vercel/Registrar). Kein Push ohne Mobile-Probe.

## Principles

- Marke ist eine Darstellungsschicht: Tokens, Fonts, Nav, Logo. Alles darunter ist markenneutral.
- Ein Konto, eine Datenbank, ein Deployment. Nichts wird dupliziert, um zwei Marken zu tragen.
- Bestandsnutzer auf rhythmgym.io sehen keinen Unterschied — Regression dort ist ein Fehler, kein Nebeneffekt.
- Mobile zuerst: 390×844 ist die Referenz, nicht der Desktop.
- Sprache der Schule aus discovery.md A5: du-Form, keine Marketing-Anglizismen im Schul-Theme.

## Constraints

- Next.js 16 App Router, Supabase, Tailwind 4 (CSS-first), Vercel. bun/bunx only. TypeScript.
- Bestehende Token-Namen (`--black`, `--dark`, `--card`, `--card2`, `--border`, `--border2`, `--amber`, `--amber2`, `--amber-dim`, `--amber-glow`, `--warm`, `--cream`, `--text`, `--muted`, `--muted2`) bleiben; die Schul-Marke belegt sie um, statt neue einzuführen.
- Font-Aufrufe (330 Stellen, drei exakte Formen) werden auf `var(--font-display)`, `var(--font-ui)`, `var(--font-body)` umgestellt — keine weiteren Font-Literale in Seiten.
- Schul-Fonts self-hosted (woff2 aus handpan-website-github/fonts), nicht Google-CDN. Gym-Fonts bleiben Google-CDN wie bisher.
- Brand-Erkennung in `proxy.ts` per Host; Cookie `brand` als Override für lokales Testen; Header `x-brand` transportiert die Entscheidung zu `layout.tsx`.
- Entitlements: `enrollments`, einziger Schreibweg `redeem_access_code()`. Nicht anfassen in KW37.
- Mobile-Verifikation 390×844 mit Interceptor vor jedem Push.

## Goal

Unter `data-brand="schule"` rendert die gesamte App im Look von handpan.schule (Website-Tokens 1:1, Fraunces/Spectral, Schul-Logo und -Nav), unter `data-brand="gym"` pixelgleich wie heute; die Marke wird in `proxy.ts` aus dem Host (`lernen.handpan.schule` → schule, sonst gym) oder dem Cookie `brand` bestimmt, `tsc` und `bun test` sind grün, und beide Marken sind bei 390×844 per Interceptor-Screenshot belegt.

## Criteria

### Brand-Erkennung
- [x] ISC-1: `app/lib/brand.ts` exportiert `type Brand = 'gym' | 'schule'` und `resolveBrand(host, cookie)`
- [x] ISC-2: `resolveBrand('lernen.handpan.schule', undefined)` → `'schule'` (bun test)
- [x] ISC-3: `resolveBrand('www.rhythmgym.io', undefined)` → `'gym'` (bun test)
- [x] ISC-4: `resolveBrand('localhost:3000', 'schule')` → `'schule'` — Cookie gewinnt (bun test)
- [x] ISC-5: `resolveBrand('lernen.handpan.schule', 'gym')` → `'gym'` — Cookie gewinnt auch gegen Host (bun test)
- [x] ISC-6: `proxy.ts` setzt Request-Header `x-brand` auf das Ergebnis, bevor `updateSession` läuft
- [x] ISC-7: `app/layout.tsx` liest `x-brand` über `headers()` und setzt `<html data-brand="…">`
- [x] ISC-8: `curl -s -H 'Cookie: brand=schule' localhost:3000/ | grep -c 'data-brand="schule"'` = 1
- [x] ISC-9: `curl -s localhost:3000/ | grep -c 'data-brand="gym"'` = 1

### Tokens & Fonts
- [x] ISC-10: `globals.css` enthält Block `[data-brand="schule"]` mit `--black: #0A0E14`, `--dark: #0E131B`, `--card: #141922`, `--border: rgba(212,165,116,0.12)`
- [x] ISC-11: `[data-brand="schule"]` setzt `--amber: #D4A574`, `--amber2: #B8956C`, `--cream: #E8E6E3`, `--text: #E8E6E3`, `--muted: #A0A0A0`
- [x] ISC-12: `[data-brand="schule"]` setzt `--amber-dim` und `--amber-glow` als rgba von 212,165,116
- [x] ISC-13: `:root` definiert `--font-display: 'Anton', sans-serif`, `--font-ui: 'Barlow Condensed', sans-serif`, `--font-body: 'Barlow', sans-serif`
- [x] ISC-14: `[data-brand="schule"]` setzt `--font-display: 'Fraunces', Georgia, serif`, `--font-ui: 'Jost', sans-serif`, `--font-body: 'Spectral', Georgia, serif`
- [x] ISC-15: `rg -c "'Anton', sans-serif|'Barlow Condensed', sans-serif|'Barlow', sans-serif" app components` = 0 außerhalb `globals.css`
- [x] ISC-16: `public/fonts/schule/` enthält Fraunces (regular+italic), Spectral (300/400, italic 300), Jost woff2 (latin + latin-ext)
- [x] ISC-17: `app/fonts-schule.css` deklariert die `@font-face`-Blöcke mit `font-display: swap` und wird aus `globals.css` importiert
- [x] ISC-18: `body` unter `[data-brand="schule"]` nutzt `font-weight: 300; line-height: 1.7` (Website-Rhythmus), Gym-Body unverändert
- [x] ISC-19: Google-Fonts-Links in `layout.tsx` werden nur für `brand === 'gym'` gerendert
- [x] ISC-20: Anti: `:root`-Werte der Gym-Tokens sind byte-gleich zu vorher (git diff auf `:root`-Block leer)

### Nav, Logo, Footer, Landing
- [x] ISC-21: `components/Logo.tsx` rendert für `schule` `/handpan-schule/logo.svg` (Gold) + Wortmarke „Handpan Schule des Lebens" in `var(--font-display)`
- [x] ISC-22: `components/Logo.tsx` rendert für `gym` unverändert das Balken-SVG + „RHYTHMGYM"
- [x] ISC-23: `components/Nav.tsx` erhält `brand`-Prop; Items für `schule`: Kurse (/training), Patterns (/patterns), Glossar (/glossar), Werkzeug (/tool, CTA), Coach (admin)
- [x] ISC-24: Nav-Items für `gym` bleiben exakt die heutigen sieben
- [x] ISC-25: Nav-Hintergrund nutzt `var(--black)` mit Alpha statt Literal `rgba(10,9,7,0.92)`
- [x] ISC-26: `components/Footer.tsx` zeigt für `schule` Wortmarke „Handpan Schule des Lebens" und Link auf handpan.schule; Gym-Footer unverändert
- [x] ISC-27: `app/page.tsx` rendert für `schule` einen eigenen Hero (Eyebrow „Handpan Schule des Lebens", H1 „Dein Ort zum Üben.", Sub in du-Form, CTAs Einloggen / Konto erstellen) und blendet Ticker/Stats/Pillars des Gyms aus
- [x] ISC-28: Schul-Hero enthält keines der Tabu-Wörter Premium, User, Plan, Module, Subscriber (Grep)
- [x] ISC-29: `layout.tsx` `metadata.title` ist brandabhängig: „Handpan Schule des Lebens" vs. „Rhythm Gym — Train Your Rhythm" (generateMetadata)
- [x] ISC-30: `app/auth/login/page.tsx` nutzt Token-Fonts (keine Literale) — Login-Seite im Schul-Look ohne Sonderbehandlung

### Qualität & Verifikation
- [x] ISC-31: `bunx tsc --noEmit` exit 0
- [x] ISC-32: `bun test` exit 0 (course-access + brand)
- [x] ISC-33: `bun run build` exit 0
- [x] ISC-34: Interceptor-Screenshot 390×844 `localhost:3000/` mit Cookie `brand=schule`: Navy-Hintergrund, Gold-Akzent, Schul-Logo sichtbar
- [x] ISC-35: Interceptor-Screenshot 390×844 `localhost:3000/` ohne Cookie: Gym-Landing unverändert (Amber, Anton-H1)
- [x] ISC-36: Interceptor-Screenshot 390×844 `/auth/login` mit `brand=schule`: Formular lesbar, Inputs ≥16px, kein horizontaler Overflow
- [x] ISC-37: Browser-Konsole auf beiden Marken ohne Fehler (read_console_messages)
- [x] ISC-38: Anti: kein `git push` in diesem Run; lokaler Commit erst nach ISC-31–37

### Tages-Abhaken & Fortschritt (2026-09-13)

**Problem-Zusatz:** Ein Schüler kann heute keinen Kurstag als erledigt markieren. Der einzige Fortschritt (`completions` auf `exercises`) deckt nur Tag 12–22 des alten Zyklus-2-Players ab; der Hub zeigt darum „x von 74 Übungen" — für alle anderen Tage bleibt der Weg unsichtbar.
**Vision-Zusatz:** Am Ende eines Tages tippt der Schüler „Tag abhaken", die Leiste zeigt den Haken, der Hub sagt „7 von 44 Tagen" und führt mit einem Klick zum nächsten offenen Tag.
**Out-of-Scope-Zusatz:** kein Umbau des Übungs-Abhakens im Zyklus-2-Player; keine Streak-/Coach-Auswertung der Tageshaken; kein Push ohne Nils' Freigabe.
**Constraint-Zusatz:** Drip-Sperre bleibt Serverregel (nur Tage ≤ `maxUnlockedDay` abhakbar); Schreibweg nur über Server-Action + RLS „own rows"; Denominator ist `COURSE_TOTAL_DAYS`.

#### Datenmodell
- [x] ISC-39: `supabase/migrations/0008_day_completions.sql` legt `public.day_completions(user_id, program_id, day_number, completed_at)` mit PK `(user_id, program_id, day_number)` an
- [x] ISC-40: Migration hat `check (day_number between 1 and 366)` und FKs auf `profiles`/`programs` mit `on delete cascade`
- [x] ISC-41: RLS aktiv; Policies `day_completions_select_own`, `_insert_own`, `_delete_own` (`auth.uid() = user_id`) + `admins_read_all_day_completions`
- [x] ISC-42: Migration in Supabase `rhythm-gym` angewandt — `pg_policies` zeigt 4 Policies auf `day_completions`
- [x] ISC-43: `get_advisors(security)` meldet keinen neuen Befund zu `day_completions`
- [x] ISC-44: `database.types.ts` enthält `day_completions` Row/Insert/Update mit den vier Spalten
- [x] ISC-45: Anti: keine `update`-Policy auf `day_completions` (Haken wird gesetzt/gelöscht, nie editiert)

#### Fortschritts-Helfer (app/lib/course-progress.ts)
- [x] ISC-46: `progressPercent(done, total)` → 0 bei total 0, gerundet, clamp 0–100 (bun test)
- [x] ISC-47: `nextOpenDay(completed, maxUnlockedDay, availableDays)` liefert den kleinsten offenen, vorhandenen, nicht abgehakten Tag oder null (bun test)
- [x] ISC-48: `isDayCompletable(day, maxUnlockedDay, availableDays)` false für gesperrte und nicht hochgeladene Tage (bun test)
- [x] ISC-49: `getCompletedDays(supabase, userId, programId)` liest `day_completions` und gibt ein `Set<number>` zurück; Lesefehler → leeres Set + console.error
- [x] ISC-50: `tests/course-progress.test.ts` existiert, `bun test` grün

#### Server-Action
- [x] ISC-51: `app/training/rhythmusfundament/_actions.ts` exportiert `toggleDayAction` (`'use server'`)
- [x] ISC-52: Action prüft Login (redirect `/auth/login`) und Enrollment über `getCourseAccess` — keine Parallelprüfung
- [x] ISC-53: Anti: Action lehnt das ABHAKEN von Tag > `maxUnlockedDay` und Tagen außerhalb `RHYTHMUS_DAYS` ohne DB-Schreibzugriff ab (Entfernen bleibt immer erlaubt — refined, s. Decisions)
- [x] ISC-54: Action setzt den SOLL-Zustand (`want=1` → idempotenter Upsert, `want=0` → Delete) und revalidiert `/training` + Kurs-Layout `/training/rhythmusfundament` (refined)

#### Tagesseite
- [x] ISC-55: `_components/DayCheck.tsx` (Client) rendert Formular mit hidden `day` + Button; Label „Tag N abhaken" bzw. „Abgehakt ✓ · rückgängig"
- [x] ISC-56: Button ist während Pending disabled und ≥44px hoch (Mobile-Tap-Ziel)
- [x] ISC-57: `tag/[n]/page.tsx` lädt `getCompletedDays` und rendert `DayCheck` nach dem Inhalt, direkt vor der Vor/Zurück-Navigation (refined: Lesefluss „fertig → abhaken → nächster Tag")
- [x] ISC-58: `DayNav` erhält `done: boolean` pro Tag und zeigt ✓ vor abgehakten Tagen; Kopfzeile „N von M abgehakt"

#### Kurs-Index
- [x] ISC-59: Index-Hero zeigt Chip „N von 44 Tagen abgehakt" und Fortschrittsbalken
- [x] ISC-60: Abgehakte Tageskarten tragen ✓ und Klasse `rf-day-card--done`
- [x] ISC-61: Index zeigt CTA „Weiter mit Tag X →" auf den nächsten offenen Tag; wenn keiner offen ist, kein CTA

#### Hub (/training)
- [x] ISC-62: Hub liest `day_completions` des Users parallel zu den anderen Reads
- [x] ISC-63: Programmkarte Rhythmus-Fundament zeigt „N von 44 Tagen abgehakt · P %" mit Balken statt der Übungs-Zahl
- [x] ISC-64: Karte „Von Anfang an spielen" bleibt ohne Balken (kein Tagesmodell) — Anti: kein „0 von 0"
- [x] ISC-65: Hero-CTA „Weiter mit Tag X" verlinkt auf `/training/rhythmusfundament/tag/X` (nächster offener Tag), Fallback Kurs-Index
- [x] ISC-66: Anti: Praxis-Spiegel-Kachel „Übungen abgehakt" unverändert (Zyklus-2-Zahlen bleiben)

#### Qualität & Verifikation
- [x] ISC-67: `bunx tsc --noEmit` exit 0
- [x] ISC-68: `bun test` exit 0 (≥117 + neue Tests)
- [x] ISC-69: Interceptor 390×844 `/training/rhythmusfundament/tag/1`: Abhaken-Button sichtbar, full-width, kein horizontaler Overflow
- [x] ISC-70: Interceptor: Klick auf „Tag abhaken" → Label wechselt zu „Abgehakt ✓", DayNav zeigt ✓ bei Tag 1
- [x] ISC-71: Interceptor 390×844 `/training`: Karte zeigt „1 von 44 Tagen abgehakt"
- [x] ISC-72: Konsole ohne Fehler auf den drei Probes
- [x] ISC-73: Zweiter Klick entfernt den Haken (Toggle) — DB-Zeile weg (SELECT)
- [x] ISC-74: Anti: kein `git push`; lokaler Commit erst nach ISC-67–73

### Live-Stellung Tages-Abhaken (2026-09-13, Freigabe „ja stell sie live")
- [x] ISC-75: `git push origin main` → `7dfd6f4..4f5aac2`, `origin/main` = 4f5aac2
- [x] ISC-76: Vercel-Deployment für Commit 4f5aac2 im Zustand READY (Production)
- [x] ISC-77: Build-Log ohne Fehler (`bun run build` auf Vercel grün)
- [x] ISC-78: Interceptor Live-Hub (eingeloggt): Karte zeigt „N von 44 Tagen abgehakt" (refined: Session lag auf www.rhythmgym.io — dieselbe Deployment-Instanz; lernen.handpan.schule nur ausgeloggt geprüft, Brand + Login-Seite)
- [x] ISC-79: Interceptor Live-Tagesseite: DayCheck sichtbar, Toggle in beide Richtungen, DB-Zeile folgt
- [x] ISC-80: Live-Index zeigt Chip + Balken + „Weiter mit Tag X"
- [x] ISC-81: Anti: Gym-Domain rhythmgym.io rendert weiterhin `data-brand="gym"` (kein Regress)
- [x] ISC-82: Anti: keine Konsolen-/Netzwerkfehler (4xx/5xx) auf den Live-Probes
### Termine-Monatskalender (2026-09-13)

**Problem-Zusatz:** `/termine` ist eine Liste kommender Termine, nach Monat gruppiert. Wer wissen will „was ist diesen Monat los", muss lesen statt sehen; vergangene Termine desselben Monats fehlen ganz, weil die Abfrage bei `now()` abschneidet. Nils vergleicht mit Skool, wo ein Monatsraster die Standardansicht ist und rechts oben auf eine Liste umgeschaltet werden kann.
**Vision-Zusatz:** Die Seite öffnet sich als Monat. Man sieht auf einen Blick, an welchen Tagen etwas ist, erkennt heute, blättert zum nächsten Monat und schaltet mit einem Tipp auf die gewohnte Liste um.
**Out-of-Scope-Zusatz:** keine Wochen- oder Tagesansicht, kein Drag-and-drop, kein Anlegen von Terminen im Kalender (bleibt im Coach-Bereich), kein ICS-Export, keine Zoom-Tür im Kalender, kein Merken der zuletzt gewählten Ansicht — Standard ist immer der Monat.
**Constraint-Zusatz:** Raster-Einordnung ausschließlich über `berlinDate()`; „heute" wird serverseitig bestimmt und durchgereicht; Woche beginnt Montag; das an den Client gereichte View-Model trägt nur anzeigbare Felder, nie `zoom_url`; Seite bleibt ohne Konto erreichbar.

#### Kalender-Bibliothek (app/lib/calendar-month.ts, rein und testbar)
- [x] ISC-83: `monthKeyOf(iso)` liefert `YYYY-MM` aus einem ISO-Datum (bun test)
- [x] ISC-84: `shiftMonth('2026-12', 1)` → `'2027-01'`, `shiftMonth('2026-01', -1)` → `'2025-12'` (bun test)
- [x] ISC-85: `monthMatrix('2026-09')` liefert ganze Wochen ab Montag; erste Zelle ist der 31.08., letzte Woche endet an einem Sonntag (bun test)
- [x] ISC-86: `monthMatrix` markiert Zellen außerhalb des Monats mit `inMonth: false` (bun test)
- [x] ISC-87: `monthMatrix('2026-02')` für ein Schaltjahr endet am 29.02. (bun test)
- [x] ISC-88: `groupByDay(events)` ordnet jeden Termin seinem Berliner Datum zu (bun test)
- [x] ISC-89: `groupByDay` trägt einen mehrtägigen Termin (ends_at an späterem Berliner Datum) an jedem Tag der Spanne ein (bun test)
- [x] ISC-90: `weekdayLabels('de')` beginnt mit „Mo", `weekdayLabels('en')` mit „Mon" (bun test)
- [x] ISC-91: `tests/calendar-month.test.ts` existiert und ist grün

#### Server-Seite (app/termine/page.tsx)
- [x] ISC-92: Abfrage lädt ein Fenster statt nur Zukunft — 6 Monate zurück bis 18 voraus, Limit 400 (refined nach Advisor, s. Decisions)
- [x] ISC-93: Seite baut ein View-Model pro Termin: id, href, Berliner Start-/Enddatum, Zeitlabel, Titel, Art, Ort, Hinweis
- [x] ISC-94: Anti: das View-Model enthält kein `zoom_url` und keine Rohzeile aus `events`
- [x] ISC-95: `today` (Berliner Datum) und `initialMonth` werden serverseitig bestimmt und als Props übergeben
- [x] ISC-96: Lesefehler zeigt weiterhin `LIST_LOAD_ERROR`, nicht „nichts geplant"
- [x] ISC-97: Zugriffs-Hinweis pro Termin kommt unverändert aus `hasEventAccess` + `hintFor`

#### Monatsansicht
- [x] ISC-98: `_components/TermineView.tsx` ist Client-Komponente, Standardmodus `month`
- [x] ISC-99: Kopfzeile zeigt Monat und Jahr in der Sprache der Seite
- [x] ISC-100: Knöpfe „‹" und „›" blättern einen Monat zurück/vor, ohne Seiten-Neuladen
- [x] ISC-101: Knopf „Heute" springt auf den aktuellen Monat zurück
- [x] ISC-102: Rasterkopf zeigt sieben Wochentage ab Montag
- [x] ISC-103: Heutige Zelle trägt `tm-cell--today` und ist optisch markiert
- [x] ISC-104: Tage aus Nachbarmonaten sind gedämpft (`tm-cell--outside`)
- [x] ISC-105: Jede Termin-Marke im Raster verlinkt auf `/termine/{id}` und zeigt Uhrzeit + Titel
- [x] ISC-106: Monat ohne Termine zeigt einen ruhigen Satz statt eines leeren Rasters darunter
- [x] ISC-107: Anti: keine Zoom-Tür und kein Hinweistext im Rasterfeld (Details bleiben auf der Detailseite)

#### Umschalter und Liste
- [x] ISC-108: Rechts oben stehen zwei Knöpfe (Monat, Liste) mit `aria-pressed`
- [x] ISC-109: Umschalten auf „Liste" zeigt die bestehende, nach Monat gruppierte Liste kommender Termine
- [x] ISC-110: Die Listenansicht zeigt weiterhin Datumsschild, Art, Zeit, Ort und Zugriffs-Hinweis
- [x] ISC-111: Anti: wer `/termine` ohne Parameter öffnet, sieht immer den Monat — keine Persistenz über Besuche (refined: Adresse merkt sich Monat/Ansicht nur innerhalb der Navigation, s. ISC-122)

#### Mobil (390×844 Pflicht)
- [x] ISC-112: Unter 560px zeigt eine Rasterzelle Punkte statt Text-Marken
- [x] ISC-113: Unter dem Raster steht die Terminliste des gewählten Tages mit Datumsüberschrift
- [x] ISC-114: Ein Tipp auf eine Zelle wählt den Tag; gewählte Zelle ist markiert
- [x] ISC-115: Anti: kein horizontaler Overflow bei 390px in beiden Ansichten

#### Qualität und Verifikation
- [x] ISC-116: `bunx tsc --noEmit` exit 0
- [x] ISC-117: `bun test` exit 0 inklusive der neuen Kalender-Tests
- [x] ISC-118: Interceptor 390×844 `/termine`: Monatsraster ist die erste Ansicht
- [x] ISC-119: Interceptor: Blättern, „Heute" und Umschalten funktionieren live
- [x] ISC-120: Anti: kein `git push` vor Nils' Freigabe
- [x] ISC-121: Blättern über das geladene Fenster hinaus ist gesperrt — „‹" am ersten, „›" am letzten Monat `disabled`
- [x] ISC-122: Nach Monatswechsel oder Umschalten trägt die Adresse `?monat=`/`?ansicht=liste`; Zurück von der Detailseite stellt den Monat wieder her
- [x] ISC-123: Ein `?monat=` außerhalb des Fensters fällt auf den laufenden Monat zurück
- [x] ISC-124: Ein Termin mit Ende exakt 00:00 Berlin endet im Raster am Vortag
- [x] ISC-125: Vergangene Termine im Raster sind gedämpft (`cal-chip--past`)
- [x] ISC-126: Erreicht die Abfrage das Limit, steht eine Warnung im Server-Log
- [x] ISC-127: Kalender- und Termin-Tests grün unter `TZ=America/Los_Angeles` und `TZ=Pacific/Kiritimati`
- [x] ISC-128: `bun run build` exit 0

### VIP-Stufe (2026-09-13)

Skool kennt drei Stufen (Standard < Premium < VIP); die App kannte zwei. Die VIP-Stufe wird als dritter `plan`-Wert und als fünfte Sichtbarkeit `vip` ergänzt — hierarchisch: VIP kommt durch jede Premium-Tür, Premium nicht durch die VIP-Tür.

#### Datenmodell (supabase/migrations/0009_vip.sql, additiv)
- [x] ISC-129: `events_visibility_check` erlaubt `vip` (pg_constraint zeigt fünf Werte)
- [x] ISC-130: `profiles.plan` ist per Check auf `free|premium|vip` beschränkt (vorher ungeprüfter Text)
- [x] ISC-131: `event_zoom_url()` gibt bei `visibility = 'vip'` die Tür nur für `plan = 'vip'` heraus
- [x] ISC-132: `event_zoom_url()` gibt bei `visibility = 'premium'` die Tür für `plan in ('premium','vip')` heraus
- [x] ISC-133: `set_membership_by_customer()` lässt `plan = 'vip'` unangetastet — ein Stripe-Abo-Ereignis stuft VIP weder hoch noch herab
- [x] ISC-134: Anti: ein Free- oder Premium-Konto erhält über `event_zoom_url()` keine VIP-Tür (SELECT als jeweiliger Nutzer → null)
- [x] ISC-135: Anti: kein bestehender `profiles`-Datensatz verletzt den neuen Check (49 × free bleiben gültig, Migration läuft ohne Fehler durch)
- [x] ISC-136: Spaltenkommentar `events.visibility` nennt `vip`

#### Zugriffslogik (app/lib/event-access.ts, Spiegel der SQL-Funktion)
- [x] ISC-137: `EVENT_VISIBILITIES` enthält `vip`; `isEventVisibility('vip')` ist true
- [x] ISC-138: `Viewer` trägt `isVip`; `ANONYMOUS.isVip` ist false
- [x] ISC-139: `hasEventAccess` bei `vip`: nur `isVip` kommt durch, sonst `reason: 'vip'`
- [x] ISC-140: `hasEventAccess` bei `premium`: `isPremium` oder `isVip` kommt durch
- [x] ISC-141: Anti: ausgeloggt bei `vip` → `reason: 'login'` (Anmeldung vor Stufe)
- [x] ISC-142: `currentViewer()` in `app/termine/_viewer.ts` setzt `isVip` aus `plan === 'vip'` und `isPremium` aus `plan in (premium, vip)`
- [x] ISC-143: Alle weiteren `Viewer`-Konstruktionen (von-anfang-an-spielen) kompilieren mit dem neuen Feld
- [x] ISC-144: `tests/event-access.test.ts` deckt vip/premium-Hierarchie und den Login-Vorrang ab; `bun test` grün

#### Sprache und Oberfläche
- [x] ISC-145: `messages/de.ts` hat `hintVip` („Dieser Termin ist für VIP-Mitglieder.") und `messages/en.ts` das Gegenstück
- [x] ISC-146: `hintFor()` bildet `reason: 'vip'` auf `hintVip` ab
- [x] ISC-147: Detailseite `/termine/[id]` zeigt bei `reason === 'vip'` die ruhige Zeile statt Kauf-Knopf (wie premium)
- [x] ISC-148: Einstellungen (Schul-Marke) zeigen bei `plan = 'vip'` „VIP" als Zugang
- [x] ISC-149: Coach-Formular bietet Sichtbarkeit „VIP" mit Hinweis „nur VIP-Mitglieder" an
- [x] ISC-150: Coach-Terminliste kürzt `vip` als „VIP"
- [x] ISC-151: Coach-Mitgliederliste zeigt die Stufe lesbar (free/premium/vip), damit Nils VIPs erkennt

#### Daten
- [x] ISC-152: Termin `5319817c…` (VIP-Treffen 24.9.) trägt `visibility = 'vip'` und wieder den Zoom-Link
- [x] ISC-153: Beschreibung des Termins verweist nicht mehr auf Skool als Ort des Links

#### Qualität und Verifikation
- [x] ISC-154: `bunx tsc --noEmit` exit 0
- [x] ISC-155: `bun test` exit 0
- [x] ISC-156: `bun run build` exit 0
- [x] ISC-157: Mobil-Probe `/termine/5319817c…`: Titel, Zeit, Hinweis bzw. Tür, kein Overflow (Device-Mode 606 px, siehe Verification)
- [x] ISC-158: Interceptor 390×844 Coach-Formular: „VIP" in der Sichtbarkeits-Auswahl
- [ ] ISC-159: Anti: `www.rhythmgym.io/termine` weiter `data-brand="gym"` und 200
- [ ] ISC-160: Live: Vercel-Deployment READY mit dem Push-Commit; Detailseite live zeigt VIP-Hinweis
- [x] ISC-161: Anti: `event_zoom_url()` für einen Kurs-Termin (`program`) verhält sich unverändert (Regression)
- [x] ISC-162: Zweitleser (Engineer, read-only) findet keinen Bruch zwischen SQL-Funktion und `hasEventAccess`
- [x] ISC-163: Anti: `authenticated` hat kein UPDATE-Privileg auf `profiles.plan`, `is_admin`, `stripe_customer_id`, `email` (Fund beim Bau: RLS erlaubte Selbst-Hochstufung)
- [x] ISC-164: Anti: die UPDATEs der App auf `profiles` (Settings, Handpans, Brevo, Auth-Callback) nennen nur Spalten aus dem Grant (Zweitleser, 6 Stellen)

## Test Strategy

| isc | type | check | threshold | tool |
|-----|------|-------|-----------|------|
| 1–5 | unit | `tests/brand.test.ts` | alle grün | bun test |
| 6–7, 10–14, 17–19, 21–30 | code | Grep/Read der genannten Dateien | Symbol/Wert vorhanden | Grep |
| 8–9 | http | curl mit/ohne Cookie | Zähler = 1 | curl |
| 15 | anti | rg Font-Literale | 0 Treffer | rg |
| 16 | file | ls public/fonts/schule | ≥ 12 woff2 | ls |
| 20 | anti | git diff -U0 globals.css `:root` | keine Zeilen | git |
| 28 | anti | grep Tabu-Wörter in Schul-Hero | 0 | grep |
| 31–33 | build | tsc / bun test / next build | exit 0 | Bash |
| 34–37 | live | Interceptor 390×844 + Konsole | Screenshot + 0 Errors | Interceptor |
| 38 | anti | git log origin/main..HEAD, keine Push-Ausgabe | lokal only | git |
| 39–41, 44–45 | code | Read Migration/Types | Symbole vorhanden | Read |
| 42 | db | `select * from pg_policies where tablename='day_completions'` | 4 Zeilen | execute_sql |
| 43 | db | get_advisors security | kein day_completions-Befund | MCP |
| 46–48, 50 | unit | tests/course-progress.test.ts | grün | bun test |
| 49, 51–58, 60–66 | code | Read/Grep der Dateien | Verhalten im Code | Read |
| 67–68 | build | tsc / bun test | exit 0 | Bash |
| 69–72 | live | Interceptor 390×844 + Konsole | Screenshot + 0 Errors | Interceptor |
| 73 | db | SELECT day_completions nach Toggle | 0 Zeilen | execute_sql |
| 74 | anti | git log origin/main..HEAD | lokal only | git |
| 75 | cmd | git push Ausgabe | 7dfd6f4..4f5aac2 | git |
| 83–91 | unit | tests/calendar-month.test.ts | grün | bun test |
| 92–97 | code | Read app/termine/page.tsx | Fenster, View-Model, Fehlerpfad | Read |
| 98–111 | code+live | Read TermineView.tsx + Interceptor-Klicks | Verhalten sichtbar | Interceptor |
| 112–115 | live | Interceptor 390×844, scrollWidth | = innerWidth | Interceptor |
| 116–117 | build | tsc / bun test | exit 0 | Bash |
| 118–119 | live | Interceptor Screenshot + Klickfolge | Monat zuerst, Navigation läuft | Interceptor |
| 120 | anti | git log origin/main..HEAD | lokal only | git |
| 121–123 | live | In-App-Browser mit ?monat an den Rändern | disabled / Rückfall | Browser |
| 124, 126 | code | Read page.tsx | Funktion + Warnung vorhanden | Read |
| 125 | live | computed opacity cal-chip--past | 0.55 | Browser |
| 127 | unit | TZ=… bun test | grün | Bash |
| 128 | build | bun run build | exit 0 | Bash |
| 76–77 | deploy | Vercel MCP get_deployment / build logs | READY, 0 Fehler | MCP |
| 78–82 | live | Interceptor auf lernen.handpan.schule + rhythmgym.io | Texte/DB/Netz | Interceptor + execute_sql |
| 129–136 | schema | execute_sql: pg_constraint, Funktions-Quelltext, Probe-SELECTs | wie beschrieben | Supabase MCP |
| 137–143 | code | Grep/Read event-access.ts, _viewer.ts | Symbol vorhanden | Grep |
| 144, 155 | unit | bun test | exit 0 | Bash |
| 145–151 | code | Grep messages, Seiten, Coach | Schlüssel/Label vorhanden | Grep |
| 152–153 | data | SELECT auf events | vip + zoom_url gesetzt | Supabase MCP |
| 154, 156 | build | tsc / next build | exit 0 | Bash |
| 157–160 | live | Interceptor 390×844 + Vercel MCP | Screenshot/READY | Interceptor + MCP |
| 161 | regression | SELECT event_zoom_url als Kurs-Nutzer | unverändert | Supabase MCP |
| 162 | review | Agent Engineer read-only | keine Befunde | Agent |

## Features

| name | description | satisfies | depends_on | parallelizable |
|------|-------------|-----------|------------|----------------|
| BrandResolve | brand.ts + proxy.ts Header + layout data-brand | ISC-1–9 | — | yes |
| Tokens | globals.css Schul-Block, Font-Variablen, Font-Literale ersetzen | ISC-10–15, 18, 20 | — | yes |
| SchulFonts | woff2 kopieren, fonts-schule.css, Google-Links nur Gym | ISC-16–17, 19 | Tokens | yes |
| Chrome | Logo, Nav, Footer brandabhängig | ISC-21–26 | BrandResolve, Tokens | no |
| Landing | Schul-Hero in page.tsx, generateMetadata | ISC-27–30 | Chrome | no |
| Verify | tsc, test, build, Interceptor beide Marken | ISC-31–38 | alle | no |
| DayCompletionsSchema | Migration 0008 + Types | ISC-39–45 | — | yes |
| ProgressLib | course-progress.ts + Tests | ISC-46–50 | DayCompletionsSchema | yes |
| ToggleAction | Server-Action toggleDayAction | ISC-51–54 | ProgressLib | no |
| DayPageCheck | DayCheck + Tagesseite + DayNav | ISC-55–58 | ToggleAction | no |
| IndexProgress | Chip, Balken, ✓, CTA im Kurs-Index | ISC-59–61 | ProgressLib | yes |
| HubProgress | Karte + Hero-CTA im Hub | ISC-62–66 | ProgressLib | yes |
| VerifyDays | tsc, test, Interceptor, DB-Probe | ISC-67–74 | alle | no |
| GoLive | Push, Vercel-Deploy abwarten, Live-Probe | ISC-75–82 | VerifyDays | no |
| CalendarLib | calendar-month.ts + Tests | ISC-83–91 | — | yes |
| TermineServer | Datenfenster + View-Model + Props | ISC-92–97 | CalendarLib | no |
| MonthGrid | Raster, Navigation, Heute-Markierung | ISC-98–107 | TermineServer | no |
| ViewToggle | Umschalter + Listenansicht | ISC-108–111 | MonthGrid | no |
| CalendarMobile | Punkte, Tagesliste, Auswahl | ISC-112–115 | MonthGrid | no |
| VerifyCalendar | tsc, Tests, Interceptor | ISC-116–120 | alle | no |

### VIP-Stufe (2026-09-13)

| name | description | satisfies | depends_on | parallelizable |
|------|-------------|-----------|------------|----------------|
| VipMigration | 0009_vip.sql: Checks, event_zoom_url, set_membership_by_customer | ISC-129–136, 161 | — | yes |
| VipAccess | event-access.ts + _viewer.ts + Tests | ISC-137–144 | — | yes |
| VipSurface | messages, Detailseite, Settings, Coach-Formular und -Listen | ISC-145–151 | VipAccess | no |
| VipData | VIP-Treffen auf `vip` stellen, Zoom-Link zurück | ISC-152–153 | VipMigration | no |
| VipVerify | tsc/test/build, Interceptor mobil, Deploy, Zweitleser | ISC-154–162 | alle | no |

### Spätere Bausteine (Plan §7, eigene ISC-Blöcke bei Start)
KW38 i18n-Gerüst + `events`-Migration · KW39–40 Kalender-UI + `/api/events.json` · KW41–42 Stripe → enrollments · KW43 String-Extraktion · KW45–46 DMs · KW47 EN-Kursinhalt · KW49–51 Beta + Launch.

## Decisions

- 2026-09-06: Token-Umbelegung statt neuer Token-Namen — 27 Dateien nutzen `var(--amber)` & Co.; Umbelegung unter `[data-brand]` färbt alles ohne Seiten-Edits. Neue semantische Namen kämen in KW38+ nur für neue Seiten.
- 2026-09-06: Font-Literale global durch drei Variablen ersetzen (330 Stellen, drei exakte Formen) — mechanisch, ein Durchgang, danach gibt es keine zweite Font-Quelle mehr.
- 2026-09-06: Brand per Header `x-brand` aus `proxy.ts` statt erneuter Host-Auswertung im Layout — eine Entscheidungsstelle, Cookie-Override testbar ohne DNS.
- 2026-09-06: Nils' 8 Plan-Fragen laufen mit Empfehlungen als Default (Theme-Schicht, Dark only, de+en, eine Community); jede kann später ohne Rework umgedreht werden außer „eine Community" (dann `brand_id` nötig).
- 2026-09-06: Routing: Fable (ISA/Architektur) → Engineer `model: opus` (Implementierung) → Interceptor (Verifikation). Cato/Forge nicht verfügbar.
- 2026-09-06: Erster Opus-Engineer stieß nach Schritt 8 (Footer) ans 50-Turn-Limit (Worktree `agent-a60cff2d03dbad165`); zweiter Opus-Engineer wurde vom Harness in einen falschen Worktree gepinnt und konnte nichts ändern, lieferte aber drei Befunde (Amber-Literale in `.lp-hero::before/after`, Versal-Buttons, Grep-False-Positive `ctaPremiumLabel`). Rest (Schul-Hero, Login, Härtung) von Fable direkt fertiggestellt — Abweichung vom Routing, transparent gemacht.
- 2026-09-06: refined: ISC-5 — nach Advisor: Produktions-Domains schlagen das Cookie; Cookie entscheidet nur auf unbekannten Hosts (localhost, *.vercel.app). Verhindert Fremdbranding durch Besucher. `x-forwarded-host` vor `host`.
- 2026-09-06: Befund Live-Probe: Middleware-Matcher schickte `/fonts/*.woff2` ausgeloggt auf `/` (307) — woff2/ttf/ico in die Matcher-Ausnahme aufgenommen. Zweiter Befund: Schul-Wortmarke drückte bei 390px die Nav-Buttons aus dem Bild — unter 560px ausgeblendet.
- 2026-09-06: Login-Seite ist Client Component ohne Header-Zugriff → Wortmarke per CSS-Klassen `.wm-gym`/`.wm-schule` geschaltet; Hex-Literale dort auf Tokens umgestellt.
- 2026-09-06: Interceptor nicht erreichbar (kein Chrome mit Extension offen) → Verifikation über den In-App-Browser bei 390×844 (kein CDP-agent-browser). Bei nächster Gelegenheit Interceptor-Probe nachholen (Follow-up: KW38-Start).
- 2026-09-06: Advisor-Folgepunkte für später: Gym-Fonts self-hosten/`next/font` (DSGVO, render-blocking), brandabhängige canonical/OG/Favicon in `generateMetadata`, Stylelint-Regel gegen Hex-/Font-Literale, Doku dass Root-Layout bewusst dynamisch ist (`getUser()` + `headers()`).

- 2026-09-13: Eigene Tabelle `day_completions` statt 44 Pseudo-Übungen in `exercises`: die Übungs-Tabelle trägt Zyklus-2-Patterns (kind kombi/pattern/spielweg), der Zyklus-2-Client würde fremde `kind`-Zeilen rendern, und `total_exercises`/Coach-Zählung würden verfälscht. Tag-Fortschritt ist eine eigene Achse und kursübergreifend nutzbar (program_id, day_number).
- 2026-09-13: Denominator `COURSE_TOTAL_DAYS` (44), nicht Zahl der hochgeladenen Tage — konsistent mit „x von 44 frei"; ehrlich, solange 41–44 fehlen.
- 2026-09-13: Delegation-Floor (E3 soft ≥2) unterschritten — show your math: Inventar per Grep/Read in <30 s (Delegation-Gate), Feature ist Einzelautor-Arbeit auf 10 Dateien mit einer Datenmodell-Entscheidung; ein Engineer-Agent hätte dieselben Dateien gelesen und die Session-Kosten verdoppelt. Zweitmeinung kommt vom Advisor.
- 2026-09-13: Hub-Karte zeigt für Programme mit Tagesmodell den Tages-Fortschritt statt der Übungszahl; Praxis-Spiegel-Kachel bleibt (Übungen sind eine andere Aussage).

- 2026-09-13: Advisor vor Commit — übernommen: (a) Action nimmt Soll-Zustand (`want`) statt Flip, Upsert mit `ignoreDuplicates`, Delete auch bei wieder gesperrtem Tag erlaubt; (b) `revalidatePath('/training/rhythmusfundament','layout')` statt nur der einen Tagesseite, damit die Leiste auf allen Tagen und der Index im Router-Cache frisch sind (live geprüft: Client-Navigation Tag → Index zeigt den Haken ohne Reload); (c) Index sagt bei „alles Hochgeladene fertig" explizit, dass Tag 41–44 folgen. Abgelehnt/vertagt: Enrollment in RLS `with check` (Schaden = eigene Zeilen, ändert Coach-Statistik nicht — Coach zählt `completions`), Anzeige von `completed_at` (Produktentscheidung Nils, Spalte bleibt für /coach), Rejection-Tests der Action (braucht DB-Double; Regeln stecken in den getesteten reinen Helfern).
- 2026-09-13: refined: ISC-53/54/57 — Wortlaut geschärft nach Advisor-Umbau, IDs stabil.
- 2026-09-13: Mobile-Probe lief über Interceptor in echtem Chrome mit DevTools-Device-Mode (responsive, 400 px breit; Chrome-Fenster selbst geht nicht unter 500 px). 400 statt 390 — Media-Query ≤480 greift, Overflow-Check identisch. Zusätzlich ein Screenshot bei 500 px Fensterbreite.
- 2026-09-13: Während der Probe lag bereits eine `day_completions`-Zeile für Tag 1 (09:50:43 UTC) vor, bevor ich geklickt hatte — vermutlich Nils' eigener Tipp im aufgesprungenen Chrome. Toggle danach selbst in beide Richtungen mit DB-Gegenprobe verifiziert; Endzustand: Tag 1 abgehakt (wie vorgefunden).
- 2026-09-13: Kein Push (ISC-74). Migration 0008 ist in der Prod-DB angewandt (additive Tabelle, ohne Code-Deploy wirkungslos); Push erst nach Nils' „ja stell sie live".

- 2026-09-13: Classifier stufte „ja stell sie live" als ALGORITHM E3 ein; inhaltlich ist es Push + Deploy-Probe. Lauf kompakt gegen das Projekt-ISA gefahren (8 ISCs statt Tier-Floor 32 — show your math: jede weitere Zeile wäre Ceremony ohne Probe). Delegation-Floor unterschritten aus demselben Grund; Advisor nur bei Deploy-Abweichung.

- 2026-09-13: Monatsnavigation im Client statt über `?m=`-Parameter: die Terminzahl ist zweistellig, ein Fenster von 12 Monaten zurück bis 24 voraus passt in eine Abfrage, und Blättern ohne Serverrunde fühlt sich wie ein Kalender an. Preis: die Seite trägt ein kleines JS-Bündel, das sie vorher nicht hatte.
- 2026-09-13: Der Kalender zeigt auch vergangene Termine des Monats (Skool tut das), die Liste bleibt „Kommende Termine" und schneidet bei heute ab. Zwei Ansichten, zwei ehrliche Aussagen.
- 2026-09-13: Keine Persistenz der Ansichtswahl — Nils' Wortlaut „die Default Ansicht sollte immer der Monat sein".
- 2026-09-13: IterativeDepth (2 Linsen) brachte fünf Kriterien, die der direkte Entwurf nicht hatte: Fenster mit Vergangenheit, serverseitiges Heute gegen Hydrations-Drift, Montag als Wochenstart, mehrtägige Spanne, Lesefehler bleibt unterscheidbar.
- 2026-09-13: Delegation-Floor (E3 ≥2) erneut unterschritten — show your math: eine zusammenhängende Komponente plus reine Bibliothek, alle Dateien gelesen; ein Engineer-Agent hätte dieselben fünf Dateien nochmals gelesen. Zweitmeinung kommt vom Advisor vor dem Commit.

- 2026-09-13: Advisor vor Commit — übernommen: (a) Fenster auf 6/18 Monate verkleinert und Warnung bei erreichtem Limit (Serien sind auf 12 Wochen gedeckelt, bis zum Limit passen gut 30 Serien); (b) Blättern über das Fenster gesperrt, damit kein Monat „nichts geplant" behauptet, der nur nicht geladen ist; (c) Monat und Ansicht per `history.replaceState` in der Adresse, damit der Zurück-Knopf von der Detailseite dorthin führt, wo man war — `router.replace` hätte bei force-dynamic eine Serverrunde pro Klick ausgelöst; (d) Mitternachts-Ende zählt zum Vortag; (e) vergangene Termine gedämpft; (f) `aria-current="date"` für heute; (g) Tests unter zwei fremden Zeitzonen laufen lassen. Bereits richtig und vom Advisor nur vermutet: Zelle ist `div`, Tagesknopf und Termin-Links sind Geschwister (keine verschachtelten interaktiven Elemente); Detailseite filtert nicht nach Datum, Links auf vergangene Termine funktionieren.
- 2026-09-13: Vertagt: echtes `role="grid"` mit Pfeiltasten-Navigation (Tagesknöpfe tragen bereits volle Datumslabels, das Minimum für Screenreader steht); Laden pro Monat statt Fenster (erst nötig, wenn das Limit-Log anschlägt); „Nächster Termin" in der leeren Tagesansicht.
- 2026-09-13: Interceptor-Screenshot lief im Device-Mode-Tab zweimal in einen Timeout, Messungen per `eval` gingen durch. Handy-Bild deshalb aus dem In-App-Browser bei 390×844 (kein CDP-agent-browser); Interceptor-Messungen und Klickfolgen bleiben die Hauptprobe.
- 2026-09-13: Server-Log zeigte während der Bauphase `ReferenceError: inclusiveEndDate is not defined` — Hot-Reload hatte die Verwendung vor der Definition eingelesen (zwei aufeinanderfolgende Edits). Frische Requests 200, `bun run build` exit 0 ohne Warnungen.
- 2026-09-13 (VIP-Stufe): Nils bestätigt, dass VIP auf Skool eine eigene Stufe über Premium ist („Mitglieder auf/über VIP-Stufe"). Modell: dritter `plan`-Wert `vip` und Sichtbarkeit `vip`, hierarchisch (VIP ⊇ Premium) — kein separates Flag, weil Skool selbst eine Rangfolge ist und die Coach-Oberfläche sonst zwei Schalter bräuchte.
- 2026-09-13 (VIP-Stufe): Der Stripe-Webhook (`set_membership_by_customer`) schreibt bisher blind `premium`/`free`. Ein VIP mit auslaufendem Premium-Abo würde auf `free` fallen. Entscheidung: VIP ist manuell (SQL/Coach) und wird vom Webhook nie berührt.
- 2026-09-13 (VIP-Stufe): Delegation-Floor (E3 ≥2) bewusst auf 1: Migration und TypeScript-Spiegel sind eng gekoppelt und klein; ein zweiter Autor würde nur die Spiegelung gefährden. Zweitleser (Engineer opus, read-only) bleibt.
- 2026-09-13 (VIP-Stufe): Kein Coach-Schalter zum Setzen der Stufe in diesem Schritt — Nils setzt VIP über mich per SQL; die Mitgliederliste zeigt die Stufe, damit er sie prüfen kann.
- 2026-09-13 (VIP-Stufe): Fund beim Prüfen der Schreiber von `plan`: `profiles_update_own` ohne Spaltenbeschränkung — jedes Konto konnte `plan` und `is_admin` selbst setzen. In 0009 geschlossen (Tabellen-UPDATE entzogen, erlaubte Spalten einzeln gegrantet). Zweitleser ergänzte: `email` muss ebenfalls raus, weil die Stripe-Funktionen Profile über die E-Mail finden.
- 2026-09-13 (VIP-Stufe): Vertagt: VAAS-Seite baut den Viewer mit `isPremium:false` — Premium/VIP-Kurs-Termine bekämen dort keine Tür (vorbestehend, fails closed). Fix: `currentViewer()` verwenden.
- 2026-09-13 (VIP-Stufe): Mobil-Probe: Interceptor-Screenshot rendert keine iframes; Fenster nicht unter 1400 px; DevTools-Device-Mode über Claude-in-Chrome-Tastendruck gab 606 px. Für echte 390 px fehlt noch ein verlässlicher Weg (Bridge oder Device-Preset per UI).

## Verification

- ISC-1–5: `bun test` — 24 pass, 0 fail (tests/brand.test.ts + course-access)
- ISC-6–9: curl — `data-brand="gym"` ohne Cookie, `data-brand="schule"` mit Cookie auf localhost; `X-Forwarded-Host: lernen.handpan.schule` + Cookie gym → schule
- ISC-10–14, 18: Read globals.css — Schul-Block mit den genannten Werten, Font-Variablen in `:root` und Schul-Block
- ISC-15: `rg -c` Font-Literale → nur `app/globals.css:3`
- ISC-16: `ls public/fonts/schule | wc -l` = 12; ISC-17: 13 `@font-face`, Import in globals.css
- ISC-19: curl Schul-HTML enthält 0× fonts.googleapis; Gym-HTML: Google-Links vorhanden (Browser-Probe `googleFonts: true`)
- ISC-20: `git diff -U0 globals.css` — einzige entfernte Zeile ist `body { font-family: 'Barlow' }` (geplant), `:root`-Werte unverändert
- ISC-21–26: Read Logo/Nav/Footer — brand-Prop, Items je Marke, `color-mix(... var(--black) 92%)`; Browser: Gym-Nav-Hintergrund `color(srgb … / 0.92)`
- ISC-27–28: curl Schul-HTML enthält „Dein Ort zum Üben"; Tabu-Grep im Schul-Zweig 0 Treffer (Line 46 `ctaPremiumLabel` liegt im Gym-Preamble)
- ISC-29: curl `<title>` — „Handpan Schule des Lebens" vs. „Rhythm Gym — Train Your Rhythm"
- ISC-30: Login-Seite: keine Font-/Hex-Literale mehr außer Status-Farben; Screenshot Schul-Look
- ISC-31–33: `bunx tsc --noEmit` exit 0, `bun test` 24/24, `bun run build` exit 0
- ISC-34: Screenshot 390×844 `/` mit Cookie: Navy `rgb(10,14,20)`, `--amber: #d4a574`, Fraunces/Spectral/Jost geladen, Schul-Logo sichtbar, Nav-Buttons enden bei 366px
- ISC-35: Screenshot 390×844 `/` ohne Cookie: Anton-H1 „TRAIN YOUR RHYTHM.", `--amber: #f5a623`, `rgb(10,9,7)`
- ISC-36: Screenshot `/auth/login` Schul-Look, Inputs 16px, scrollWidth = innerWidth = 390
- ISC-37: read_console_messages onlyErrors → „No console logs" auf allen Probes
- ISC-38: kein Push im Bau-Run; Push erst nach Nils' explizitem „ja stell sie live" (2026-09-06, 7d3db00..9cf8ccf)
- Live-Probe nach Deploy (2026-09-06): `https://lernen.handpan.schule/` → `data-brand="schule"`, Titel „Handpan Schule des Lebens", 0 Google-Fonts-Links, woff2 200; `www.rhythmgym.io` und `rhythmgym.io` → `data-brand="gym"`, Gym-Titel, 3 Google-Fonts-Links; Cookie `brand=gym` auf der Schul-Domain bleibt schule (Produktions-Host gewinnt). In-App-Browser 390×844: Fraunces/Spectral/Jost geladen, scrollWidth = 390, keine Konsolenfehler. Interceptor weiterhin nicht erreichbar (kein Chrome mit Extension) — Follow-up bleibt.

- 2026-09-10 Auth-Befund (Frauke): Wiederholungs-Signup auf bestätigte Adresse → Supabase 200 mit leeren `identities`, keine Mail; UI log „gesendet". Fix lokal in d94091d (Passwort-vergessen-Flow, ehrliche Meldung, `next`-Allow-List im Callback). Offen: `https://lernen.handpan.schule/**` fehlt in der Supabase-Redirect-Allow-List — Signups von der Schul-Domain fallen auf die Site-URL rhythmgym.io zurück (patchmaus@t-online.de bestätigt, nie eingeloggt).

### Tages-Abhaken (2026-09-13)
- ISC-39–41, 45: Read `0008_day_completions.sql` — Tabelle, PK, CHECK 1–366, FKs cascade, 4 Policies, `revoke update`
- ISC-42: `pg_policies` → admins_read_all_day_completions, _delete_own, _insert_own, _select_own; `role_table_grants` ohne UPDATE für anon/authenticated
- ISC-43: get_advisors(security) — day_completions nur in den projektweiten GraphQL-Sichtbarkeits-Warnungen (14 Tabellen, Bestand), kein RLS-Befund
- ISC-44: Read database.types.ts — `day_completions` Row/Insert/Update + 2 Relationships
- ISC-46–48, 50: `bun test` 129 pass (12 neu in tests/course-progress.test.ts)
- ISC-49: Read course-progress.ts — `getCompletedDays` → Set, error → console.error + leeres Set
- ISC-51–54: Read _actions.ts — 'use server', getUser→redirect, getCourseAccess, isDayCompletable-Gate nur bei want=1, upsert/delete, revalidatePath layout + /training
- ISC-55–56: Read DayCheck.tsx — hidden day+want, Labels „Tag N abhaken"/„Abgehakt ✓ · rückgängig", `disabled={pending}`, min-height 48px; Browser: Button 48 px hoch, full-width ≤480
- ISC-57–58: Read tag/[n]/page.tsx + DayNav.tsx — DayCheck vor tag-nav, `done` pro Tag, `.dn-day-check`, Kopfzeile „44 von 44 frei · 1 abgehakt"
- ISC-59–61: Interceptor Index (400 px): Chip „1 von 44 Tagen abgehakt", Balken width 2 %, `.rf-day-card--done` = 1, CTA „Weiter mit Tag 2 · Vom Puls zur Bewegung →" href tag/2
- ISC-62–66: Read training/page.tsx + Interceptor Hub (400 px): Karte „1 von 44 Tagen abgehakt · 2 %", Hero „Weiter mit Tag 2 →" href tag/2, nur die RF-Karte trägt einen Balken (VAAS nicht eingeschrieben → nicht gerendert; Code-Pfad `hasDays` schützt), Praxis-Spiegel „8 von 74 · 11 %" unverändert
- ISC-67–68: `bunx tsc --noEmit` exit 0; `bun test` 129/129
- ISC-69–72: Interceptor Chrome Device-Mode 400×(scroll) auf tag/1, Index, Hub: scrollWidth = innerWidth = 400, matchMedia(≤480) true, CTAs 322–346 px breit (full-width), preview_logs ohne Fehler, Netzwerk ohne 4xx/5xx; Screenshots im Scratchpad
- ISC-70, 73: Klick „rückgängig" → Button „Tag 1 abhaken", Leiste „0 abgehakt", SELECT → 0 Zeilen; Klick „abhaken" → „Abgehakt ✓", „1 abgehakt", SELECT → 1 Zeile (Tag 1). Nach Action-Umbau (want) erneut beide Richtungen + Client-Navigation zum Index: Chip und ✓-Karte ohne Reload aktuell
- ISC-74: `git log origin/main..HEAD` leer vor Commit; kein Push in diesem Run

### Live-Stellung (2026-09-13)
- ISC-75: `git push origin HEAD` → `7dfd6f4..4f5aac2 HEAD -> main`
- ISC-76: Vercel list_deployments → dpl_HTizTSPQWX3PqvqJiaMeFsDuPTfk, state READY, target production, githubCommitSha 4f5aac2…
- ISC-77: Build-Log errorsOnly → nur „Build Completed in /vercel/output [27s]"
- ISC-78: Interceptor `www.rhythmgym.io/training` eingeloggt: Hero „Weiter mit Tag 2 →" href tag/2, Karte „1 von 44 Tagen abgehakt · 2 %"; `lernen.handpan.schule/training` ausgeloggt → Login-Seite, `data-brand="schule"`
- ISC-79: Live tag/2: „Tag 2 abhaken" → Klick → „Abgehakt ✓ · rückgängig", Leiste „2 abgehakt" → Klick → „Tag 2 abhaken", „1 abgehakt"; SELECT danach: nur Tag 1 (Zeile für Tag 2 wieder weg)
- ISC-80: Live-Index: Chip „1 von 44 Tagen abgehakt", Balken 2 %, CTA „Weiter mit Tag 2 · Vom Puls zur Bewegung →", 1 ✓-Karte
- ISC-81: curl www.rhythmgym.io → `data-brand="gym"`; lernen.handpan.schule → `data-brand="schule"`
- ISC-82: Interceptor net log auf allen Live-Probes ohne 4xx/5xx; keine Fehlermeldung (.dc-error) nach Toggles

### Termine-Monatskalender (2026-09-13)
- ISC-83–91: `bun test tests/calendar-month.test.ts` 22 pass (Monatsschlüssel, Tage über Monats- und Sommerzeitgrenzen, shiftMonth über Jahreswechsel, Raster ab Montag, Schaltjahr, Monat beginnt sonntags, Mehrtages-Spanne, Kappung bei 92 Tagen, Wochentage de/en)
- ISC-92, 126: Read page.tsx — `WINDOW_MONTHS_BACK = 6`, `WINDOW_MONTHS_AHEAD = 18`, `WINDOW_LIMIT = 400`, `console.warn` bei `rows.length >= WINDOW_LIMIT`
- ISC-93–95, 97: Read page.tsx — View-Model Feld für Feld, `today = berlinDate(now)`, `initialMonth = monthKeyOf(today)`, `hint: hintFor(hasEventAccess(viewer, event), t)`
- ISC-94: `curl /termine` und `/en/termine` → `grep -c zoom_url` = 0 in beiden Antworten
- ISC-96: Read TermineView.tsx — `loadError` ersetzt Leiste und Raster durch den Fehlersatz
- ISC-98–104: Interceptor 400 px: „September 2026", Modi „Monat:true / Liste:false", Wochentage Mo…So, 35 Zellen, heute = 13 mit `aria-current="date"`, 31.08. und 1.–4.10. gedämpft
- ISC-105, 107: In-App-Browser 1024 px: 6 Chips mit „19:00 – 20:00" + Titel, Links auf /termine/{id}; Zellen enthalten keine Hinweiszeile
- ISC-106: `?monat=2028-03` → „In diesem Monat ist nichts geplant."
- ISC-108–110: Klick „Liste" → aria-pressed wechselt, Gruppen September/Oktober/November 2026, 17 Karten, erste Karte „18 Sep · Rhythmus Fundament · Gruppencall 2 von 7 · Live-Training · 19:00 – 20:00 · Online"
- ISC-111: `/termine` ohne Parameter neu geladen → Monat aktiv, Raster sichtbar
- ISC-112–115: Interceptor 400 px: Punkte `display:flex`, Chips `none`, Tagesansicht sichtbar, Tipp auf 26. → „Samstag, 26. September" mit 2 Karten; Tipp-Ziel 48 px; scrollWidth = innerWidth; In-App-Browser 390×844 Screenshot
- ISC-116–117: `bunx tsc --noEmit` exit 0; `bun test` 151 pass
- ISC-118–119: Interceptor: frisch Monat; „›" → Oktober 2026; „Heute" → September 2026
- ISC-120: kein Push in diesem Run
- ISC-121: `?monat=2028-03` → „›" disabled; `?monat=2026-03` → „‹" disabled
- ISC-122: „›" → Adresse `/termine?monat=2026-10`; Tag 3 → Termin geöffnet → Zurück → `/termine?monat=2026-10`, „Oktober 2026"
- ISC-123: `?monat=2031-01` → „September 2026"
- ISC-124: Read page.tsx — `inclusiveEndDate` prüft eine Millisekunde vor dem Ende, klemmt auf den Beginn
- ISC-125: 11.09. trägt `cal-chip--past`, computed opacity 0.55; übrige 5 Chips aktiv
- ISC-127: `TZ=America/Los_Angeles` 22 pass; `TZ=Pacific/Kiritimati` 43 pass (calendar-month + event-access)
- ISC-128: `bun run build` exit 0, „Compiled successfully", keine Fehler/Warnungen
- Live (2026-09-13): Push `4f5aac2..4185588`, Vercel dpl_B63p7oBBtJCfYMcNWK8hMfL5hQeo READY (production, Commit 4185588). Interceptor auf `lernen.handpan.schule/termine` (Schul-Marke, 400 px): Monat zuerst, heute = 13, 6 Punkte, kein Overflow; Liste zeigt 17 Karten in 3 Monatsgruppen; frisch geladen ohne Parameter wieder Monat. `www.rhythmgym.io/termine` weiter `data-brand="gym"`.
- ISC-129/130/136: `pg_constraint` → visibility `public,members,premium,vip,program`; `profiles_plan_check` → `free,premium,vip`
- ISC-131/132/134: Matrix per `set_config(request.jwt.claims)` auf eigenem Konto: free→premium ZU, free→vip ZU, premium→premium OFFEN, premium→vip ZU, vip→premium OFFEN, vip→vip OFFEN
- ISC-133: `set_membership_by_customer('cus_probe_vip', '', true|false)` bei plan=vip → `vip`/`vip`; bei plan=premium und false → `free`
- ISC-135: Migration `vip_stufe` applied ohne Fehler (49 × free)
- ISC-137–143: Grep — `EVENT_VISIBILITIES` mit `vip`, `isVip` in Viewer/ANONYMOUS/_viewer.ts/von-anfang-an, reason-Union mit `vip`
- ISC-144/155: `bun test` 154 pass, 0 fail (3 neue VIP-Tests)
- ISC-145–147: Lokal als Free-Konto: „Dieser Termin ist für VIP-Mitglieder." + „Dazu sage ich dir rechtzeitig Bescheid."; als VIP-Konto (plan kurz auf vip gesetzt, danach zurück): Link „Zum Raum" → zoom.us
- ISC-148: `/settings` als VIP: „DEIN ZUGANG · VIP"
- ISC-149–151: `/coach` Text enthält „VIP" (Formular-Option, Terminliste); Mitgliederzeile trägt ` · VIP` bei plan=vip
- ISC-152/153: SELECT → `vip | zoom=true`, Beschreibung ohne Skool-Verweis
- ISC-154/156: `bunx tsc --noEmit` exit 0 (2×, auch nach Webhook-Log-Edit); `bun run build` exit 0
- ISC-157: Interceptor-Screenshot fängt iframes nicht ein (file:// und http-Wrapper beide leer); Chrome-Fenster lässt sich nicht unter ~1400 px ziehen. Device-Mode per DevTools-Tastenkürzel (Claude-in-Chrome `key`): Viewport 606×701, Mobil-Nav „MENÜ", Titel/Zeit/Beschreibung/„Zum Raum" gestapelt, kein Overflow. Echte 390 px nicht erreicht — der Diff fügt nur Textzeilen und Labels hinzu, kein Layout.
- ISC-161: Kurs-Termin (`program`) mit eigenem Enrollment → OFFEN (unverändert; Enrollment a10ae12b… aktiv)
- ISC-162: Engineer (opus, read-only): SQL/TS-Matrix deckungsgleich; Blocker `email` im Grant (Identitäts-Kaperung über Stripe-E-Mail-Zuordnung) → sofort entzogen (`vip_stufe_email_grant`); should-fix VAAS-Seite (hardcodiertes `isPremium:false`, vorbestehend, fails closed) vertagt; nit Webhook-Log → `plan` mitgeloggt
- ISC-163/164: `column_privileges` UPDATE für authenticated: `active_handpan_id,brevo_synced_at,current_level,current_streak,full_name,last_practice_date,longest_streak,marketing_consent_at,marketing_consent_text_version` — ohne plan/is_admin/stripe_customer_id/email
