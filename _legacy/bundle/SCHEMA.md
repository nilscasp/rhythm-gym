# Rhythmen Zyklus 2 · JSON-Schema

Dieses Dokument beschreibt die Struktur von `rhythmen_zyklus2.json`.
Das JSON enthält alle Rhythmen aus Zyklus 2 (Tag 12–22) als parsbare Daten — geeignet für eine Web-App, die die Rhythmen visualisieren, abspielen oder als interaktive Übung anbieten soll.

---

## Top-Level

```json
{
  "schema_version": "1.0",
  "generated": "2026-05-08",
  "cycle": { ... },
  "constants": { ... },
  "days": [ ... ]
}
```

| Feld | Typ | Beschreibung |
|---|---|---|
| `schema_version` | string | Schema-Version, semver-kompatibel |
| `generated` | string | Generierungsdatum ISO-8601 |
| `cycle` | object | Metadaten zum Zyklus (Nummer, Titel, Tag-Anzahl) |
| `constants` | object | gemeinsame Konstanten — Schlag-Typen, Hand-Patterns, Zähleinheit, Strukturmerkmale |
| `days` | array | 11 Tag-Objekte (Tag 12 bis 22) |

---

## `constants`

### `strike_types`

Vier Schlag-Typen kommen vor. Jeder hat einen Anzeige-Label, eine Vorschlag-Farbe und eine Akzent-Markierung.

```json
"strike_types": {
  "ding":    { "label": "Ding",      "color": "#8B4513", "is_accent": true,  "description": "tiefer Bass-Akzent..." },
  "slap":    { "label": "Slap",      "color": "#F5A623", "is_accent": true,  "description": "perkussiver Akzent..." },
  "tonfeld": { "label": "Tonfeld",   "color": "#9CA98A", "is_accent": false, "description": "klingendes Tonfeld..." },
  "gn":      { "label": "Ghostnote", "color": "#D5CCB8", "is_accent": false, "description": "leiser Stütz-Schlag..." }
}
```

### `hand_pattern_types`

Drei Hand-Pattern-Typen werden in Zyklus 2 verwendet.

```json
"hand_pattern_types": {
  "R-L":  { "label": "Wechselschlag rechts beginnend", "pattern_per_takt": ["R","L","R","L"] },
  "L-R":  { "label": "Wechselschlag links beginnend",  "pattern_per_takt": ["L","R","L","R"] },
  "frei": { "label": "freier Handsatz", "pattern_per_takt": null }
}
```

`pattern_per_takt` definiert die Hand-Folge **innerhalb eines Takts**. Da pro Takt 4 Sechzehntel sind und alle Bögen 4 Takte haben, wiederholt sich dieses Pattern in jedem Takt — die Akzent-Hand fällt damit immer auf die 1.

### `counting_per_takt`

Die deutsche Sechzehntel-Zählweise pro Takt:

```json
"counting_per_takt": [
  ["1","e","und","de"],
  ["2","e","und","de"],
  ["3","e","und","de"],
  ["4","e","und","de"]
]
```

### `structure`

```json
"structure": {
  "takt_count": 4,
  "subdivisions_per_takt": 4,
  "total_subdivisions": 16,
  "subdivision_unit": "Sechzehntel",
  "time_signature_explanation": "Vier Takte · pro Takt vier Sechzehntel · zusammen ein Bogen"
}
```

---

## `days[]` — Tag-Objekt

Jedes Tag-Objekt hat diese Form:

```json
{
  "number": 14,
  "title": "Vom Zählen zum Füllen · die andere Hand",
  "subtitle": "Takt 4 · Stufen 1 → 3 · Handsatz L – R · 1. Kombi-Übung",
  "summary": "Was die rechte Hand schon trägt, beginnt die linke...",
  "handsatz": "L-R",
  "focus_takt": 4,
  "patterns": [ ... ],
  "kombi": { ... } | null,
  "options": [ ... ] | null
}
```

| Feld | Typ | Beschreibung |
|---|---|---|
| `number` | int | Tag-Nummer (12–22) |
| `title` | string | Haupttitel |
| `subtitle` | string | Untertitel mit Fokus + Handsatz |
| `summary` | string | erläuternder Fließtext |
| `handsatz` | string | `"R-L"`, `"L-R"`, `"frei"` |
| `focus_takt` | int \| null | 1-indexiert (1–4); `null` bei Tag 12, 21, 22 |
| `patterns` | array | alle Patterns dieses Tages (Basis + Stufen + Übungen) |
| `kombi` | object \| null | Kombi-Übung, falls vorhanden |
| `options` | array \| null | nur bei Tag 22 (zwei Spielwege) |

---

## `patterns[]` — Pattern-Objekt

Ein Pattern ist ein vollständiger 4-Takt-Bogen mit allen 16 Schlägen.

```json
{
  "id": "stufe_2_melodisch",
  "label": "Stufe 2 melodisch",
  "type": "stufe",
  "stage": 2,
  "track": "melodisch",
  "focus_takt": 4,
  "takte": [...],
  "events": [...]
}
```

### Pattern-Typen

| `type` | Bedeutung |
|---|---|
| `basis` | reiner Basisrhythmus ohne Variation |
| `stufe` | Stufen-Variation am Fokus-Takt — `stage` 1–4, `track` `"perkussiv"` oder `"melodisch"` |
| `uebung` | Tag-21-Übungen (A · B · C) — `loop: true` |

### Pattern-IDs (deterministisch)

| `id` | wann |
|---|---|
| `basis` | jeder Tag mit Basisrhythmus |
| `stufe_<N>_perkussiv` | Stufe N perkussiv (Slap-Verdichtung) |
| `stufe_<N>_melodisch` | Stufe N melodisch (Tonfeld-Linie) |
| `uebung_a` · `uebung_b` · `uebung_c` | Tag 21 |
| `schablone` | Tag 22 (leeres Gerüst) |

### `takte` — kompakte 2D-Repräsentation

```json
"takte": [
  ["ding", "gn", "gn", "gn"],          // T1: Ding + 3 gn
  ["slap", "gn", "gn", "gn"],          // T2: Slap + 3 gn
  ["gn",   "gn", "gn", "gn"],          // T3: still
  ["slap", "tonfeld", "tonfeld", "tonfeld"]  // T4: Slap + 3 Tonfelder (Stufe 3 melodisch)
]
```

4 Arrays à 4 Strings. Werte: `"ding"`, `"slap"`, `"tonfeld"`, `"gn"`.

### `events` — flache Sequencer-Repräsentation

Für jeden der 16 Sechzehntel-Positionen ein Event:

```json
{
  "position": 12,         // 0..15 (Bogen-Position)
  "takt": 4,              // 1..4
  "sub": 1,               // 1..4 (Position innerhalb des Takts)
  "counting": "4",        // Zähl-Silbe ("1","e","und","de" oder "2"... oder "3"... oder "4"...)
  "strike": "slap",       // Schlag-Typ
  "hand": "L"             // "R" / "L" / null bei freiem Handsatz
}
```

Diese Repräsentation ist ideal für einen Sequencer, der Tick-für-Tick ein Event abfeuert.

---

## `kombi` — Bogen-Sequenz

Eine Kombi-Übung kettet mehrere Patterns zu einer längeren Phrase.

```json
"kombi": {
  "name": "Wellenbogen",
  "description": "Vier Bögen — Aufbau und Rückkehr...",
  "loop": true,
  "rounds": 1,
  "sequence": [
    { "bogen": 1, "pattern_id": "stufe_1_perkussiv" },
    { "bogen": 2, "pattern_id": "stufe_2_melodisch" },
    { "bogen": 3, "pattern_id": "stufe_3_melodisch" },
    { "bogen": 4, "pattern_id": "stufe_2_melodisch" }
  ]
}
```

`pattern_id` referenziert ein Pattern aus dem `patterns[]`-Array desselben Tages. Bei mehreren Runden (z.B. Tag 17/18) hat jedes Sequenz-Element zusätzlich `runde: 1|2`.

**Vorhanden bei Tag** 14, 15, 16, 17, 18, 19, 20.
**Tag 12, 13, 21, 22:** kein Kombi.

---

## `options` — nur Tag 22

Tag 22 hat statt fester Patterns zwei offene Spielwege:

```json
"options": [
  {
    "id": "option_1",
    "name": "Ein Bogen, vier Wiederholungen",
    "description": "Wähle ein Vier-Takt-Gefüge...",
    "structure": { "bogen_count": 4, "loop": true, "variation_starts_at_bogen": 2 }
  },
  {
    "id": "option_2",
    "name": "Lieblingsbögen kombinieren",
    "description": "Setze vier deiner gesammelten...",
    "structure": { "bogen_count": 4, "loop": true, "source": "user_collection" }
  }
]
```

---

## Anwendungs-Hinweise für die Web-App

### Pattern abspielen
Iteriere `pattern.events` in Reihenfolge der `position`. Pro Event: feuere den Schlag (`strike`) mit der angegebenen Hand (`hand`).

### Kombi abspielen
Für jede `kombi.sequence`-Entry: lade `pattern_id` aus dem Tages-Pattern-Array, spiele dessen Events. Wenn `kombi.loop: true`, wiederhole nach Ende der Sequenz von vorn.

### Visualisierung
Nutze `pattern.takte` (kompakter) für statische Anzeige. Färbe Schläge mit `constants.strike_types[type].color`. Zeige Zähleinheit und Hand unter jeder Position via `event.counting` + `event.hand`.

### Üben mit Stufen-Wahl
Auf der Tag-Detail-Seite: zeige alle `type: "stufe"`-Patterns als wählbare Optionen. Filter nach `stage` und `track`.

### Tempo / BPM
Im JSON nicht festgelegt. Empfehlung der Web-App: Standard 60 BPM (Quarter), variabel zwischen 40–120 BPM. Pro Sechzehntel = `60 / BPM / 4` Sekunden.

---

## Daten-Statistik

- **11 Tage** (Tag 12 bis 22)
- **65 Patterns** insgesamt (Basis + Stufen + Übungen)
- **7 Kombi-Übungen** (Tag 14–20)
- **2 offene Optionen** (Tag 22)
- **Schlag-Typen:** 4 (ding, slap, tonfeld, gn)
- **Hand-Patterns:** 3 (R-L, L-R, frei)

---

## Beispiel: Tag 14 vollständig

```json
{
  "number": 14,
  "title": "Vom Zählen zum Füllen · die andere Hand",
  "subtitle": "Takt 4 · Stufen 1 → 3 · Handsatz L – R · 1. Kombi-Übung",
  "summary": "...",
  "handsatz": "L-R",
  "focus_takt": 4,
  "patterns": [
    { "id": "basis", "label": "Basisrhythmus", "type": "basis", "takte": [...], "events": [...] },
    { "id": "stufe_1_perkussiv", "label": "Stufe 1 perkussiv", "stage": 1, "track": "perkussiv", ... },
    { "id": "stufe_1_melodisch", ... },
    { "id": "stufe_2_perkussiv", ... },
    { "id": "stufe_2_melodisch", ... },
    { "id": "stufe_3_perkussiv", ... },
    { "id": "stufe_3_melodisch", ... }
  ],
  "kombi": {
    "name": "Wellenbogen",
    "description": "Vier Bögen — Aufbau und Rückkehr...",
    "loop": true,
    "rounds": 1,
    "sequence": [
      { "bogen": 1, "pattern_id": "stufe_1_perkussiv" },
      { "bogen": 2, "pattern_id": "stufe_2_melodisch" },
      { "bogen": 3, "pattern_id": "stufe_3_melodisch" },
      { "bogen": 4, "pattern_id": "stufe_2_melodisch" }
    ]
  }
}
```
