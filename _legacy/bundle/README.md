# Rhythm Gym — Testversion-Bundle

Dieses Bundle enthält alle Module der Rhythm-Gym-App in ihrem aktuellen Stand. Ziel: zu einer einzigen, design-konsistenten Web-App zusammenführen und als Testversion auf `rhythmgym.io` (Vercel) deployen. Test-User sind die aktuellen Teilnehmer:innen des Rhythmus-Fundament-Kurses (Zyklus 2).

---

## Projekt-Kontext

**Rhythm Gym** ist eine SaaS-Plattform für tägliches Rhythmus-Training, primär für Handpan-Spieler. Aufgebaut von Nils Caspar (Drummer, Perkussionist, Handpan-Lehrer aus Eching/München) — Teil von „Handpan Schule des Lebens" (`nilscaspar.de`, `handpan.schule`).

**Stack (bereits live):**
- Next.js auf Vercel
- Supabase (Frankfurt) — Tabellen: `profiles`, `patterns`, `training_logs`, `ai_conversations`
- Stripe (angebunden, noch nicht für Premium-Gating aktiv)
- GitHub: `github.com/nilscasp/rhythm-gym`
- Live: `https://www.rhythmgym.io`

**Designsystem (verbindlich für die Web-App):**
- Hintergrund: `#0A0907` (dunkel)
- Akzent: `#F5A623` (amber)
- Sekundäre Akzente: `#FF6B35` (warm), `#E8920F` (amber dunkler)
- Cream/Text hell: `#F5EDD8`
- Text Standard: `#D4C9AD`
- Muted: `#7A7060`
- Kartenhintergrund: `#1C1A14`
- Border: `#2E2A1E`

**Schriften (alle via Google Fonts):**
- Display: `Anton` (Headlines, all-caps)
- Labels/UI-Akzente: `Barlow Condensed` (uppercase, letter-spacing)
- Body: `Barlow` (300/400/600)

**Pädagogische Prinzipien — wichtig zu erhalten:**
- Fill = Verdichtung am Phrasenende (Energie rauf)
- Break = Reduktion / Stille (Energie runter)
- Beide haben dieselbe strukturelle Funktion mit umgekehrten Mitteln
- Subdivision ≠ Polyrhythmus ≠ Cross-Rhythmus (nicht synonym verwenden)

---

## Module im Bundle

| Datei | Funktion | Status | Designsystem |
|---|---|---|---|
| `rhythm_gym_landing.html` | Landing Page mit Hero, Pillars, Pricing | fertig (CTAs ohne Routes) | dark/amber ✓ |
| `rhythmus-bibliothek.html` | Wissens-Hub mit 6 konzeptuellen Layern | fertig (Tool-Links sind Placeholder) | dark/amber ✓ |
| `breaks-und-fills-rhythm-gym.html` | Vertieftes Wissens-Modul (Fill/Break) | fertig | dark/amber ✓ |
| `rhythm-tool-complete.html` | Pattern-Browser, 612 kuratierte Patterns | fertig (kein Audio) | **türkis/dunkelblau ✗** |
| `rhythmus_drummaschine.jsx` | Interaktive Drum-Maschine mit Tone.js Audio | fertig (Hero-Feature!) | **türkis/braun ✗** |
| `interaktiver_rhythmus_werkzeug.jsx` | Älterer Pattern-Editor (kein Audio) | redundant zur Drum-Maschine | warm/orange ✗ |

**Wichtig:** Die Drum-Maschine im Bundle ist eine **Rekonstruktion aus Project-Knowledge-Snippets**. Das Original (`rhythmus_drummaschine.jsx`) hat zusätzlich einen `accentShift`-State und feinere `dynamics`-Stufen pro Step (p/mf/f), die hier vereinfacht wurden. Falls Nils die Originaldatei zur Hand hat, sollte sie verwendet werden.

---

## Drum-Maschine — Technische Details

Die Drum-Maschine ist das **Hero-Feature** der Testversion. Sie nutzt:
- **Tone.js** (`import * as Tone from 'tone'`)
- **Refs-Pattern** für State während Tone.Sequence-Wiedergabe (kein Loop-Neustart bei Pattern-Änderungen)
- **Sound-Set:** Fingersnap (NoiseSynth white), Hand Clap (NoiseSynth pink), Bass Drum/Kick (MembraneSynth, pitchDecay 0.08), Shaker (NoiseSynth, sehr leise), Metronom (Synth square wave als Woodblock)
- **BPM-Range:** 20–160, Default 90, Presets bei 40/60/90/120
- **Notation:** `.` = Pause, `x` = Fingersnap, `X` = Hand Clap, `!` = Bass Drum

---

## Was als Nächstes gebraucht wird

Siehe `CLAUDE_CODE_PROMPT.md` für den ausführlichen Auftrag. Kurz:

1. Module zu **einer Next.js-App** verschmelzen
2. Pattern-Browser und Drum-Maschine auf **dark/amber** umfärben
3. **Top-Nav** über alle Pages
4. **Kurs-Patterns aus dem Rhythmus-Fundament Zyklus 2** als kuratierte Preset-Liste in die Drum-Maschine — die müssen vom User abgefragt werden (siehe `PATTERNS_TEMPLATE.json`)
5. Auf `rhythmgym.io` deployen

**Bewusst nicht in dieser Iteration:**
- Auth (Supabase Magic Link kommt später)
- Stripe-Premium-Gating
- AI-Recommendations
- Audio-Playback für die 612-Pattern-Bibliothek
- Streaks, Accountability-Matching

---

## Kontaktinfo

- Nils Caspar — `kontakt@nilscaspar.de`
- Handpan Schule des Lebens, Bahnhofstr. 39, 85386 Eching
