---
project: rhythm-gym / Handpan Schule des Lebens
task: KW37 Fundament — Theme-Schicht, Brand-Erkennung, Schul-Marke lokal sichtbar
slug: handpan-schule-kw37-theme
effort: E3
phase: complete
progress: 38/38
mode: standard
started: 2026-09-06T14:30:00+02:00
updated: 2026-09-06T13:01:34+0200
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

## Features

| name | description | satisfies | depends_on | parallelizable |
|------|-------------|-----------|------------|----------------|
| BrandResolve | brand.ts + proxy.ts Header + layout data-brand | ISC-1–9 | — | yes |
| Tokens | globals.css Schul-Block, Font-Variablen, Font-Literale ersetzen | ISC-10–15, 18, 20 | — | yes |
| SchulFonts | woff2 kopieren, fonts-schule.css, Google-Links nur Gym | ISC-16–17, 19 | Tokens | yes |
| Chrome | Logo, Nav, Footer brandabhängig | ISC-21–26 | BrandResolve, Tokens | no |
| Landing | Schul-Hero in page.tsx, generateMetadata | ISC-27–30 | Chrome | no |
| Verify | tsc, test, build, Interceptor beide Marken | ISC-31–38 | alle | no |

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
- ISC-38: kein Push; lokaler Commit auf Worktree-Branch, danach Merge nach main
