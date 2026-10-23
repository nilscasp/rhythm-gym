# Bunny-Videos schützen (Token-Authentifizierung)

**Stand:** 23.10.2026 · Bauabschnitt I (`Plans/umzug-von-skool.md`)

## Was der Code tut

- Jede Seite, die ein Video zeigt, baut die Embed-URL auf dem Server: `bunnyEmbedSrc(videoId)` in `app/lib/bunny-embed.ts`.
- Ist `BUNNY_TOKEN_KEY` gesetzt, wird die URL signiert:
  `https://iframe.mediadelivery.net/embed/670773/{videoId}?…&token={sha256_hex(key + videoId + expires)}&expires={unix}`
  Gültig 6 Stunden ab Seitenaufruf (`BUNNY_TOKEN_TTL_SECONDS` in `app/lib/bunny-token.ts`).
- Ist der Schlüssel nicht gesetzt, bleibt alles wie bisher (unsigniert), und im Server-Log steht einmal pro Prozess:
  `[bunny] BUNNY_TOKEN_KEY nicht gesetzt — Videos werden unsigniert eingebettet`.
- Signiert wird nur dort, wo die Seite vorher den Zugriff geprüft hat:

| Seite | Prüfung vor dem Video |
|---|---|
| `/training/[slug]/[lektion]` (Kurse aus der DB) | `course-access.ts` – Video nur im Zweig „Zugriff + Lektion offen“ |
| `/training/rhythmusfundament/tag/[n]` | Anmeldung, Einschreibung, Tag freigeschaltet |
| `/beitraege/[slug]` | Anmeldung, Marke Schule, Lesbarkeit per RLS |
| `/tag-1` | bewusst öffentlich (geschenkter erster Tag) – wird signiert, damit das Geschenk auch mit Token-Pflicht läuft |

Der Schlüssel verlässt nie den Server; `BunnyVideoEmbed` bekommt nur die fertige URL.

## Einrichten – Reihenfolge einhalten

1. **Schlüssel holen.** Bunny → Stream → Bibliothek **670773** → *Security* → *Token Authentication Key* kopieren (noch **nicht** einschalten).
2. **Schlüssel eintragen.**
   - Vercel → Projekt → *Settings* → *Environment Variables*: `BUNNY_TOKEN_KEY` = Schlüssel (Production und Preview). Nicht als `NEXT_PUBLIC_…` anlegen.
   - Lokal in `.env.local`: `BUNNY_TOKEN_KEY=…`
3. **Code mit Schlüssel deployen.** Danach prüfen: Im Quelltext einer Lektion enthält die iframe-URL `token=` und `expires=`; das Video läuft. Bunny akzeptiert signierte URLs auch, solange die Token-Pflicht noch aus ist.
4. **Erst dann in Bunny einschalten** (gleiche Bibliothek, *Security*):
   - *Embed view token authentication* aktivieren.
   - *Allowed referrers* (Erlaubte Referrer):
     - `lernen.handpan.schule`
     - `www.rhythmgym.io`
     - `rhythmgym.io`
     - `localhost:3000`
   - Speichern, eine Lektion neu laden, Video prüfen (Handy 390 px und Desktop).
5. **Gegenprobe:** Eine iframe-URL ohne `token` (oder mit abgelaufenem `expires`) direkt im Browser öffnen – Bunny muss sie ablehnen.

Umgekehrt gilt: Wer die Token-Pflicht einschaltet, **bevor** der Schlüssel live ist, legt alle Videos lahm.

## Zurückrollen

Token-Pflicht in Bunny ausschalten – sofort laufen auch unsignierte URLs wieder. `BUNNY_TOKEN_KEY` kann bleiben.

## Schlüssel wechseln

Neuen Schlüssel in Bunny erzeugen → sofort in Vercel eintragen und neu deployen. Seiten, die vor dem Wechsel geladen wurden, zeigen bis zum Neuladen kein Video mehr.

## Grenzen

- Ein Token gilt 6 Stunden für genau dieses Video. Wer die URL in der Zeit weitergibt, teilt das Video – die Referrer-Liste begrenzt das auf unsere Domains.
- Längere Übe-Sitzungen über 6 Stunden auf derselben Seite: Neuladen holt eine frische URL.
- Seiten mit Video dürfen nicht statisch zwischengespeichert werden (heute alle dynamisch: Anmeldung/Cookies bzw. `searchParams` auf `/tag-1`). Wer eine dieser Seiten statisch macht, muss die Signatur neu denken.
