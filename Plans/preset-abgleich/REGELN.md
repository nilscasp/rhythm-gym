# Preset-Abgleich: Grafik → Stepsequenzer

Ziel (Nils, 29.09.2026): Die Presets im DayPlayer sollen das spielen, was die Tagesgrafiken zeigen. Sie sind die Basis, in die sich Lernende einklinken, keine exakte Melodie. Unklares wird markiert, nicht geraten.

## Quellen je Tag

1. `public/rhythmusfundament/grafiken/tag-N/` (overview_* = ganze Übung, lowerthird_* = einzelne Variante/Handsatz)
2. Begleitbuch: `~/Documents/Claude/Projects/Rhythmus Fundament/Begleitbuch/grafik_print/svg/` (`_neu/overview_tag01…04, 12`, `tag_41_variation/`); SVGs vorher per `qlmanage -t -s 1920 -o <dir> <svg>` in PNG wandeln
3. Ohne Grafik (Tag 5–11, 42–44): Abschnitt `◇ DEINE PRAXIS` in `content/rhythmusfundament/tag-N.md`. Alles daraus gilt als **unsicher** und wird markiert.

## Übersetzung

- **Raster**: 16 Schritte = die Zählreihe `1 e und e 2 e und e 3 e und e 4 e und e`. Was der Kurs „Takt 1–4“ nennt, sind diese vier Vierergruppen (Schritt 0, 4, 8, 12).
- **Zeichen** (eins pro Schritt):
  - DING → `D`
  - SLAP → `S`
  - TON, Tonfeld, Mitte, Melodie, Bass, Fill, T·1↔T·2 → `T` (Tonhöhe egal, der Player wählt selbst)
  - Slap und Ton gleichzeitig → `X`
  - grauer Punkt, „L“-Kreis, Ghostnote → `g`
  - leer/Pause → `.`
  - `P` (immer gleicher Wiederholungston) nur behalten, wo es schon steht
- **Eine Hand läuft durch** (Puls in Triolen, „linke Hand · alle Sechzehntel“): zweite Spur `wiederholung` (gleich lang, meist `P` bzw. `g`) — ein Tonfeld, das wiederholt wird, **nicht „Puls“** (der Puls ist die 1), `pattern` ist dann nur die Spielhand, Handsatz `frei`. Beide Spuren klingen pro Schritt gleichzeitig. Eingeführt am 29.09.2026 für Tag 25–28, 34 (Entkoppeln) und 37–43.
- **Ding und Akkord auf demselben Schlag**: der Akkord (`T`) gewinnt, der Ding fällt weg (Nils, 29.09.2026).
- **Unterteilung**: `1 e und e` → `16n` (Standard, weglassen); `1 + 2 +` → `8n`; `1 und die` → `8t` (12 Schritte je 4 Schläge, zweitaktig 24). Mehr als 16 Schritte nur, wenn die Grafik mehrere Bögen zeigt.
- **Handsatz**: nur ändern, wenn die Grafik ihn nennt (Handsatz 1 = `R-L`, 2 = `L-R`, 3 = `RR-LL`, 4 = `LL-RR`, 5 = `paradiddle`, frei = `frei`). Sonst bestehenden Wert lassen.
- **BPM**: bestehenden Wert lassen.
- **IDs**: Entspricht ein bestehendes Preset einer Grafik, bleibt die ID (Videokapitel verweisen darauf), nur Muster/Label/Hint werden korrigiert. Neue Presets bekommen eine neue kebab-case-ID. Presets ohne Gegenstück in der Grafik werden **nicht gelöscht**, sondern markiert.
- **Label** ≤ 32 Zeichen, deutsch, im Stil der vorhandenen; **Hint** aus dem Untertitel der Grafik.
- **Reihenfolge**: wie im Kursablauf (Grundform zuerst, dann Stufen).

## Ergebnis je Tag

`Plans/preset-abgleich/tag-NN.json`:

```json
{
  "day": 26,
  "sources": ["grafiken/tag-26/overview_tag26_teil_1_v1.png"],
  "presets": [ { "id": "", "label": "", "hint": "", "pattern": "", "handsatz": "R-L", "bpm": 60, "subdivision": "16n" } ],
  "changes": [ { "id": "", "kind": "unchanged | pattern-fixed | label-fixed | new | no-graphic", "before": "", "after": "", "note": "" } ],
  "unclear": [ "Was Nils entscheiden oder anhören muss" ]
}
```

`presets` ist die vollständige neue Liste des Tages. `subdivision` nur setzen, wenn nicht `16n`.
