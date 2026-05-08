# Claude-Code-Prompt: Rhythm Gym Testversion

> **Wie verwenden:** Diesen gesamten Prompt in Claude Code einfügen, nachdem du das Bundle in einen Arbeitsordner entpackt hast (oder noch besser: in einen Ordner innerhalb deines `rhythm-gym`-Repos klont).

---

## Kontext

Ich heiße Nils Caspar und baue **Rhythm Gym** (`rhythmgym.io`), eine SaaS für tägliches Rhythmus-Training für Handpan-Spieler. Die App ist auf Vercel als Next.js deployt, Supabase ist angebunden, Stripe vorbereitet. GitHub-Repo: `github.com/nilscasp/rhythm-gym`.

Ich habe in den letzten Wochen mehrere isolierte Module gebaut — eine Landing Page, einen Wissens-Hub, ein Wissens-Modul über Breaks & Fills, einen Pattern-Browser mit 612 Patterns, und eine funktionierende Drum-Maschine mit Tone.js Audio. Lies bitte zuerst die `README.md` in diesem Ordner — dort steht der vollständige Kontext, das Designsystem und der Status jedes Moduls.

**Mein Ziel:** Eine **Testversion** auf `rhythmgym.io` deployen, die meine aktuellen Rhythmus-Fundament-Kursteilnehmer (Zyklus 2) als Closed-Beta-Tester nutzen können.

---

## Auftrag

### 1. Module zu einer Next.js-App verschmelzen

Lege im bestehenden `rhythm-gym`-Repo (oder einem neuen) folgende Struktur an:

```
app/
  layout.tsx                                   ← gemeinsame Top-Nav, Footer, Fonts
  page.tsx                                     ← Landing (aus rhythm_gym_landing.html)
  bibliothek/
    page.tsx                                   ← Wissens-Hub (aus rhythmus-bibliothek.html)
    breaks-und-fills/
      page.tsx                                 ← Wissens-Modul (aus breaks-und-fills-rhythm-gym.html)
  tool/
    page.tsx                                   ← Drum-Maschine (aus rhythmus_drummaschine.jsx)
  patterns/
    page.tsx                                   ← Pattern-Browser (aus rhythm-tool-complete.html)
components/
  Nav.tsx                                      ← gemeinsame Top-Nav
  Footer.tsx
data/
  course-patterns.ts                           ← Kurs-Patterns aus Rhythmus Fundament Zyklus 2
  pattern-library.ts                           ← die 612 Patterns (aus rhythm-tool-complete.html extrahiert)
```

Konvertiere die existierenden HTML-Files zu sauberen TSX-Components. Inline-Styles sind ok für die Tool-Module; für die Layout-Pages wäre Tailwind oder CSS Modules sauberer — entscheide pragmatisch.

### 2. Designsystem vereinheitlichen — alles dark/amber

Die Landing Page, Bibliothek und Breaks-und-Fills sind bereits im richtigen Design (siehe Tokens in der `README.md`). Was umgefärbt werden muss:

- **Pattern-Browser** (`rhythm-tool-complete.html`): aktuell türkis/dunkelblau (`#4ecdc4` auf `#1a1a2e`) → muss auf dark/amber umgebaut werden, dieselben CSS-Variablen wie die Bibliothek nutzen.
- **Drum-Maschine** (`rhythmus_drummaschine.jsx`): aktuell türkis/braun mit `#1a1a2e`/`#16213e` Background und `#D2691E` Akzent → komplett auf dark/amber. Der bronze-braune Akzent (`#8B4513`–`#CD853F`) im Header-Gradient kann bleiben oder durch Amber ersetzt werden. Die Pattern-Step-Farben (`#4ECDC4`, `#FF6B6B`, `#FFD700`) am besten so anpassen, dass sie zum Amber-Akzent harmonieren.

**Wichtig — nicht übergeneralisieren:** Die Email-Templates (`rhythmus_*.html`) haben absichtlich ein anderes Designsystem (warmer Brown-Gradient `#8B4513`/`#D2691E`, Table-basiert). Die werden NICHT in die Web-App integriert.

### 3. Top-Nav über alle Pages

Eine konsistente Sticky-Top-Nav mit:
- Logo links: „RHYTHM**GYM**" (Anton-Font, Amber-Akzent auf „GYM")
- Nav-Items rechts: Bibliothek · Breaks & Fills · Patterns · **Tool** (das Tool als visuell hervorgehobener CTA, weil das Hero-Feature ist)
- Mobile: Burger-Menü
- Hintergrund: `rgba(10,9,7,0.92)` mit `backdrop-filter: blur(16px)`, Border-Bottom 1px in `#2E2A1E`

### 4. Kurs-Patterns einbauen

In der Drum-Maschine gibt es aktuell eine Sektion „Schnell-Presets" mit generischen Mustern (Viertel, Achtel, Tresillo etc.). 

**Bitte stelle mir am Anfang gezielt Fragen, um meine Rhythmus-Fundament-Patterns für Zyklus 2 abzufragen.** Schau dir dafür `PATTERNS_TEMPLATE.json` an — dort steht das Format. Die Patterns sollen als zweite, hervorgehobene Sektion oberhalb der generischen Presets erscheinen, mit Header „Rhythmus Fundament — Zyklus 2" und einem optionalen Untertitel pro Pattern (z. B. „Woche 3 — Grundgroove").

Speichere die Patterns sauber in `data/course-patterns.ts` als typisiertes Array, damit ich sie später leicht erweitern kann.

### 5. Bibliothek mit Tool verlinken

In `rhythmus-bibliothek.html` und `breaks-und-fills-rhythm-gym.html` gibt es Placeholder-Links („Im Rhythm Tool üben — bald verfügbar"). Bitte aktiviere diese als echte Links nach `/tool` (oder mit Query-Parameter, falls bestimmte Patterns vorausgewählt werden sollen — bei Polyrhythmus, Subdivision etc.).

### 6. Deploy auf Vercel

Wenn alles lokal mit `npm run dev` sauber läuft:
- Branch erstellen, Commit, Push
- Auf Vercel als Preview deployen lassen, mir den Preview-Link geben
- Wenn ich „go" sage: auf `main` mergen → Production-Deploy auf `rhythmgym.io`

---

## Bewusst NICHT in dieser Iteration

- Keine Auth, kein Login (alle Pages public)
- Kein Stripe-Gating
- Keine AI-Recommendations
- Kein Audio-Playback für die 612 Bibliothekspatterns (das kommt später, ist große Arbeit)
- Keine Streaks, kein Accountability-Matching
- Kein User-spezifischer State (alles ephemeral im Browser)

---

## Prinzipien für den Code

- **Nils' Pädagogik nicht verwässern:** Begriffe wie Fill, Break, Subdivision, Polyrhythmus sind präzise unterschieden. Niemals synonym verwenden.
- **Tone.js Refs-Pattern beibehalten:** Pattern-Änderungen während der Wiedergabe müssen sofort hörbar sein, ohne Sequence-Neustart. Siehe `rhythmus_drummaschine.jsx` als Vorlage.
- **Kein localStorage/sessionStorage** außer für temporäre Single-Session-Sachen wie BPM. Nichts, was später in Supabase gehört.
- **Single-File-Components wo möglich**, klare Trennung wo nötig.
- **Mobile first:** Die Drum-Maschine wird auf dem Handy genutzt (täglich, kurz). Bitte saubere Touch-Targets und Responsive-Layout.
- **Kommentar-Sprache:** Deutsch in nutzerseitigen Strings, Englisch im Code (Variablen, Funktionsnamen, Kommentare).

---

## Workflow für unsere Zusammenarbeit

1. Lies `README.md`, alle HTML/JSX-Files und `PATTERNS_TEMPLATE.json` durch.
2. Stelle mir präzise Fragen, falls etwas unklar ist (z. B. zur Repo-Struktur, ob neuer Branch, ob existierende Pages überschrieben werden sollen).
3. Frag mich nach den Kurs-Patterns — am besten Pattern für Pattern, mit Bestätigung der 16-Step-Notation, bevor du das nächste fragst.
4. Arbeite in nachvollziehbaren Commits, keine Mega-Commits.
5. Wenn du auf eine Designentscheidung stößt, die nicht eindeutig ist (z. B. „soll der Pattern-Browser in der Nav heißen oder Bibliothek/Patterns?"), frag kurz.

Los geht's — fang mit dem Einlesen an und melde dich, wenn du die Files verstanden hast.
