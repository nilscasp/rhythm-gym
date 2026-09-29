# Übe-Station für die Tagesvideos (Rhythmus-Fundament)

## Context

Teilnehmende aus der Kohorte melden zwei Dinge: Das **Spieltempo im Video** ist zu hoch, um mitzuspielen, und sie müssen immer wieder **die Stelle suchen, an der eine Aufgabe beginnt**. Heute ist das Tagesvideo ein nacktes Bunny-iframe (`BunnyVideoEmbed.tsx`) ohne Kapitel. Nur Tag 26 hat eine Kapitelliste, und die steht als Fließtext im Markdown ohne Sprungfunktion. Der DayPlayer (eigenes Tempo, 30–160 BPM, Presets) steht daneben, weiß aber nichts vom Video.

Ziel: Das Video wird zum Übewerkzeug. Man springt per Klick zur Aufgabe, spielt sie langsamer ab, lässt den Abschnitt in Schleife laufen und wechselt mit einem Klick zu „Selbst üben“ im DayPlayer mit dem passenden Preset.

Timing: Wir sind in KW40, und die heißt „erstes Kohorten-Feedback“. Das passt, kostet aber etwa 1,5 Bautage vor Checkpoint 1 (Fr 2.10.). Das Feature wird deshalb in Stufen geschnitten. Stufe 1 lässt sich allein ausliefern.

## Stufe 0: Spike Bunny-Player-API (≈1 h, vor allem anderen)

Bunny unterstützt player.js (`https://assets.mediadelivery.net/playerjs/playerjs-latest.min.js`) per postMessage. Das prüfen wir auf localhost:
- `setCurrentTime`, `getCurrentTime`, `play`, `on('timeupdate')` für Sprung, aktives Kapitel und Schleife
- **Wiedergabegeschwindigkeit**: Ob player.js das bei Bunny kann, ist unklar.
  - Fallback A: Nils schaltet im Bunny-Dashboard unter Library → Player → Controls die eingebaute Geschwindigkeitswahl ein. Das geht ohne Code; die Tonhöhe bleibt erhalten.
  - Fallback B: Sprung per Neuladen des iframes mit `&t=SEKUNDEN`, falls player.js ganz ausfällt.

Das Ergebnis entscheidet, ob die Tempo-Chips im eigenen UI liegen oder im Bunny-Menü.

## Stufe 1: Kapitel und Sprungmarken

**Datenmodell** in `data/rhythmusfundament-days.ts`: `RhythmusDay` bekommt ein optionales Feld

```ts
chapters?: { label: string; start: number; end?: number; presetId?: string }[]
```

`start`/`end` sind Sekunden. `end` ist standardmäßig der Start des nächsten Kapitels. `presetId` verweist auf ein vorhandenes `RhythmusPreset.id`. Das Feld ist rein additiv, eine Migration braucht es nicht.

**UI**: Aus `BunnyVideoEmbed` wird ein Client-Wrapper `PracticeVideo` (neu, `app/training/rhythmusfundament/_components/PracticeVideo.tsx`) mit dem Hook `useBunnyPlayer(iframeRef)`. Unter dem Video steht eine Kapitelliste („Aufgabe 2 · Paradiddle 02:11“). Ein Klick springt hin und spielt ab. Das aktive Kapitel wird über `timeupdate` hervorgehoben.

Tag 26: Die Liste `▾ KAPITEL IM VIDEO` wandert aus `content/rhythmusfundament/tag-26.md` ins Datenfeld, damit sie nicht doppelt existiert.

## Stufe 2: Tempo und Schleife

- Tempo-Chips **0,5× · 0,75× · 1×**, falls der Spike das hergibt. Die zuletzt gewählte Geschwindigkeit merkt sich der Browser im `localStorage` unter `rg-video-rate`, mit try/catch nach dem Muster von `rg-tool-volumes` in `app/tool/page.tsx`.
- Umschalter **„Abschnitt wiederholen“**: Erreicht `timeupdate` das Kapitelende, springt das Video zurück auf den Kapitelstart.

## Stufe 3: Brücke zum DayPlayer

- Kapitel mit `presetId` bekommen den Knopf **„Selbst üben →“**. Er pausiert das Video, wählt das Preset im DayPlayer und scrollt zum Player.
- Dafür kommt ein kleiner Client-Context `PracticeProvider` (neu) auf die Tagesseite `app/training/rhythmusfundament/tag/[n]/page.tsx` und umschließt Video und Layout.
- `DayPlayer.tsx` liest aus dem Context ein `requestedPresetId` und nutzt den vorhandenen Preset-Wechsel. Neue Wechsellogik gibt es nicht.
- Das Tempo übernimmt der User im DayPlayer selbst. Genau das ist der individuelle Teil.

## Zeitmarken: automatischer Vorschlag, Nils prüft

Das Skript `scripts/chapters/propose.ts` (Bun/TS):
1. liest `~/Movies/RhythmGym-Dub/tag-XX/02-asr/segments.json` (liegt für alle 44 Tage vor), den Abschnitt `◇ DEINE PRAXIS` aus `content/rhythmusfundament/tag-XX.md` und die Preset-Labels des Tages
2. lässt über `bun ~/.claude/PAI/TOOLS/Inference.ts standard` die Aufgabenwechsel vorschlagen und jeder Aufgabe ein Preset zuordnen
3. setzt jeden Start auf den **Anfang eines Whisper-Segments**, also an eine Satzgrenze und nie mitten in den Satz
4. schreibt `Plans/kapitel-vorschlaege/tag-XX.md` mit Klick-Links `?t=` zum Gegenprüfen

Nach Nils' Freigabe trägt ein zweiter Modus (`--apply`) die Kapitel in `data/rhythmusfundament-days.ts` ein.

Der Pilot umfasst **Tag 1–5 und Tag 26**. Wenn die Vorschläge taugen, folgt der Rest in Blöcken von 10 Tagen.

Offen für i18n in KW43/47: Die Kapitel-Labels sind deutsch im Datenfile und müssen mit der EN-Content-Struktur übersetzbar werden.

## Kritische Dateien

- `app/training/rhythmusfundament/_components/BunnyVideoEmbed.tsx`: bleibt die Basis und bekommt einen iframe-Ref
- `app/training/rhythmusfundament/_components/PracticeVideo.tsx`: neu
- `app/training/rhythmusfundament/_components/DayPlayer.tsx`: Preset-Anfrage aus dem Context
- `app/training/rhythmusfundament/tag/[n]/page.tsx`: Provider und Einbindung
- `data/rhythmusfundament-days.ts`: Feld `chapters`
- `scripts/chapters/propose.ts`: neu
- `content/rhythmusfundament/tag-26.md`: Kapitelliste entfernen

## Verifikation

1. `bunx tsc --noEmit` und Lint auf die geänderten Dateien
2. Dev-Server, Tag 1 (Pilot): Kapitel klicken und per player.js `getCurrentTime` prüfen, ob der Wert am Kapitelstart ±1 s liegt. Schleife: nach dem Kapitelende springt das Video zurück. Tempo: der Wert wird übernommen.
3. „Selbst üben“ wählt das richtige Preset im DayPlayer, das Video pausiert
4. Tag ohne `chapters` und Tag 44 ohne Player rendern unverändert
5. **Interceptor bei 390×844** vor dem Push: Kapitelliste und Chips umbrechen sauber, Knöpfe sind volle Breite, kein horizontales Scrollen, der sticky Player überlappt nicht
6. Nils hört an zwei Pilot-Tagen gegen, ob die Kapitelgrenzen an Satzanfängen liegen
