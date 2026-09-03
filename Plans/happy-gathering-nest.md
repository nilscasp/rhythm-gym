# Eigenes Handpan-Instrument im Onboarding + instrument-aware Playback (v1)

## Context

Heute kennt Rhythm Gym das Instrument des Users **gar nicht**: der `DayPlayer` spielt `T` (Tonfeld) hartkodiert als `A4` und `D` (Ding) als `C2` — egal welche Handpan jemand wirklich besitzt. Die Settings-Seite verspricht das Feature bereits dem User (`app/settings/page.tsx:361-371`: „…Skala deiner Handpan…"), und im `HandpanVisualizer` steht ein expliziter Kommentar zur geplanten „Phase 2" (Steps mit konkreten Tönen). Wir bauen genau diesen vorbereiteten Pfad.

**Ziel:** Jeder User gibt beim Onboarding sein Instrument an — Skala-Template wählen **oder** frei bauen. Das gespeicherte Layout (Ding + Tonfelder) wird mit dem Rhythmus-Trainer verbunden, sodass **alle 40 bestehenden Übungstage automatisch in der echten Skala des Users klingen** — ohne ein einziges Pattern anzufassen.

Inspirationsquelle: der [handpan_editor](https://eikhen.github.io/handpan_editor) (Vanilla-JS, unminified). Wir übernehmen **nur** die Skalen-Bibliothek + das freie Builder-Konzept; der „was-ist-spielbar"-Completeness-Motor bleibt bewusst **geparkt** für die spätere Schulapp.

## Locked Scope (mit Nils abgestimmt)

- **Multi-Instrument**: User kann mehrere Pans besitzen, eines ist aktiv → neue `handpans`-Tabelle.
- **Freier Builder**: Töne frei hinzufügen/entfernen/umbenennen (wie im Editor), nicht nur Template-Tweaks.
- **Schnitt bei Stufe 2** (instrument-aware Playback). **Geparkt**: Stufe 3 (per-Step-Notennotation in Patterns) und der Completeness-/Akkord-Motor.

## 1 — Datenmodell

**Neue Tabelle `public.handpans`:**

| Spalte | Typ | Notiz |
|---|---|---|
| `id` | `uuid` PK `default gen_random_uuid()` | wie alle Tabellen |
| `user_id` | `uuid NOT NULL` | FK → `profiles(id)` `ON DELETE CASCADE` (wie `saved_patterns.user_id`) |
| `name` | `text NOT NULL` | z.B. „Meine D-Kurd" |
| `scale_name` | `text NULL` | Template-Key (`"d-kurd-10"`) bzw. `NULL` bei Custom |
| `notes` | `jsonb NOT NULL` | spiegelt `HandpanNote[]`; `notes[0]` = Ding |
| `created_at` | `timestamptz NOT NULL default now()` | |
| `updated_at` | `timestamptz NULL` | wie `saved_patterns` |

**Aktives Instrument:** neue Spalte `profiles.active_handpan_id uuid NULL` → FK → `handpans(id)` `ON DELETE SET NULL`. (Skalar-FK auf `profiles` statt `is_active`-Flag: atomar umschaltbar, eine Quelle der Wahrheit, `profiles` wird auf jeder Render-Route ohnehin schon gelesen; gelöschter aktiver Pan → Pointer wird `NULL` → automatischer Fallback auf A4/C2.)

**RLS** (an `auth.uid() = user_id`, wie überall): `handpans_select_own` / `_insert_own` (WITH CHECK) / `_update_own` / `_delete_own`. **Wichtig:** RLS erzwingt **nicht**, dass ein gesetztes `active_handpan_id` dem User gehört — das wird in der Server-Action garantiert (wir inserten den Pan unmittelbar vorher für genau diesen User).

**Migrations versionieren (neu):** bisher liegt das Schema nur im Supabase-Dashboard, **keine** Migrationsdateien im Repo. Ab hier `supabase/migrations/` anlegen; dieses Feature = `supabase/migrations/0001_handpans.sql` als Source of Truth. Anwenden via Supabase-MCP `apply_migration`, danach `get_advisors` (Security-Lint) zur RLS-Bestätigung. **Free-Tier weckt:** Projekt pausiert bei Inaktivität → vor DB-Ops mit einem MCP-Read (`list_tables`) aufwecken.

## 2 — Seed-Templates & Typen

- **`data/handpan-templates.ts`** (neu): wird **per Skript generiert** (nicht von Hand abgetippt) — `bun` fetcht die 8 öffentlichen JSONs des Editors (`…/src/templates/{d-kurd-10,d-celtic-10,d-aegean-20,d-kurd-18,e-amara-20,e-kurd-21,fs-low-pygmy-21,fs-nordlys-15}.json`) und emittiert das TS-Modul. Generator-Skript liegt unter `/tmp` (Wegwerf). Shape:
  ```ts
  interface HandpanNote { id: string; label: string; x: number; y: number; r: number }
  interface HandpanTemplate { name: string; scaleKey: string; pan: {cx:number;cy:number;r:number}; notes: HandpanNote[] }
  ```
  Koordinaten im 1000×1000-Layoutraum; `notes[0]` = Ding. `scaleKey` → `handpans.scale_name`.
- **`app/lib/handpan.ts`** (neu): Bridge-Typ vom DB-Row zur App. Weil `notes` als `jsonb` als `Json` generiert wird, eine einzige Narrowing-Grenze:
  ```ts
  interface Handpan extends Omit<HandpanRow,'notes'> { notes: HandpanNote[] }
  function rowToHandpan(row): Handpan  // (row.notes as unknown as HandpanNote[]) ?? []
  interface PitchMap { ding: string; tonfields: string[] }
  function derivePitchMap(h: Handpan | null): PitchMap | null
  ```
  (Cast-Muster wie die `*Row`-Casts in `app/training/page.tsx`.)
- **Typen-Regen:** nach der Migration `database.types.ts` via MCP `generate_typescript_types` neu generieren (kein CLI im Repo). Hinweis: Supabase-Clients nutzen `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (neuer Publishable Key) — transparent über die bestehenden `createClient()`-Factories.

## 3 — Onboarding-Flow

Heute: `app/training/page.tsx:165-167` leitet bei leerem `full_name` auf `/settings?onboarding=true`; die Onboarding-Branch in `app/settings/page.tsx` (`isOnboarding`, Server-Form → Server-Action `updateProfile`, Z. 86-111) sammelt `full_name` + `current_level` und `redirect('/training')`.

**Änderung — zweistufiges Onboarding:**
1. Schritt 1 (Name + Level) bleibt Server-Form. `updateProfile` bekommt ein hidden `onboarding=true` und leitet dann auf `/settings?onboarding=true&step=instrument` (statt `/training`). Normale Settings-Edits leiten weiter wie bisher.
2. `settings/page.tsx` liest `step` aus `searchParams`; bei `isOnboarding && step==='instrument'` rendert es die neue Client-Komponente statt der Namens-Form. Page-Shell + `SETTINGS_CSS` wiederverwenden.
3. **Neue Server-Action `app/settings/_actions.ts` → `saveHandpanAction`** (Konvention wie `app/training/_actions.ts`; Muster wie `redeemCodeAction` mit `useActionState` für Inline-Fehler): auth-gate → `name`/`scale_name`/`notes` (JSON, validiert: nicht-leeres Array aus `{id,label,x,y,r}`) → `INSERT handpans … .select('id').single()` → `UPDATE profiles SET active_handpan_id=<id>` → `revalidatePath('/training','/settings')` → `redirect('/training')`.

**Onboarding-Gate** bleibt auf `full_name` (Stufe-2-Playback fällt bei fehlendem Instrument auf A4/C2 zurück) → **rückwärtskompatibel** für Bestands-User.

## 4 — Freier Builder

Neue Client-Komponenten:
- **`app/settings/_components/OnboardingInstrumentStep.tsx`** — Orchestrator: Template-Grid (8 Karten aus `HANDPAN_TEMPLATES`) + „Eigene Handpan bauen"-Karte; hält `notes[]`/`name`-State; wired `saveHandpanAction` via `useActionState` (Muster: `RedeemCodeCard.tsx`). Template-Karte: speichert direkt („Skala so übernehmen") mit optionalem „anpassen" → öffnet Builder vorbefüllt. Custom-Karte: startet mit `scale_name=null` + einer Ding-Note.
- **`app/settings/_components/HandpanBuilder.tsx`** — freier Canvas: rendert `HandpanNote[]` (freie `x/y/r`) in ein `viewBox="0 0 1000 1000"` SVG (ein `<circle>`+`<text>` pro Note, Bowl aus `pan.{cx,cy,r}`). Note hinzufügen (`crypto.randomUUID()`, Default `C4` nahe Zentrum) / entfernen (≥1 behalten) / **Pitch-Label umbenennen** (prominent — das speist das Playback) / Instrument benennen. Save serialisiert `{name,scale_name,notes}` (notes als `JSON.stringify` in hidden fields).

**Reuse-Analyse:** `HandpanVisualizer` ist **nicht** wiederverwendbar als Builder-Canvas (fest auf 8-Slot-Ring + Glow-zu-Step verdrahtet). Stattdessen neuer datengetriebener Free-Layout-Renderer, der aber die **visuelle Sprache** des Visualizers übernimmt (Palette `STRIKE_COLORS`, `hp-bowl-gradient`, Sage-Tonfeld/Warm-Ding, Ding = `notes[0]` farblich abgesetzt) + die `<style>`-in-Component-/Inline-CSS-Konvention.

## 5 — Instrument-aware Playback (die v1-Auszahlung)

**Datenfluss — server-seitig laden, als Prop reichen.** `app/training/rhythmusfundament/tag/[n]/page.tsx` ist eine async Server-Component mit bereits vorhandenem `createClient()` + `getUser()` (Z. 76-80) und rendert `<DayPlayer …/>` (Z. 201). Dort nach dem Access-Check: `profiles.active_handpan_id` laden → falls gesetzt `handpans`-Row laden → `derivePitchMap(rowToHandpan(hp))` → `<DayPlayer … pitchMap={pitchMap} />` (nur das serialisierbare `{ding, tonfields[]}` reichen, nicht den ganzen Pan).

**Im `DayPlayer`** (`_components/DayPlayer.tsx`): optionales Prop `pitchMap?: PitchMap | null`. Im `Tone.Sequence`-Callback die zwei hartkodierten Pitches ersetzen:
- **`'T'` (Z. 296):** Tonfeld-Index per **geteiltem Resolver** bestimmen (siehe unten) aus `step` + `hands[step]` (beide im Callback verfügbar, `hands` Z. 171-174) → `pitchMap.tonfields[idx % tonfields.length]`.
- **`'D'` (Z. 304):** `pitchMap.ding`.
- Beide Synths (`PluckSynth` Tonfeld, `MembraneSynth` Ding) nehmen einen Notennamen als erstes Argument → Drop-in. `g`/`S` bleiben unverändert (Noise).

**Geteilter Resolver gegen Drift:** `resolveTonfeldSpotId` lebt heute nur im `HandpanVisualizer` (Z. 140-150, nutzt `Math.floor(stepIndex/2)`-Rotation, R→[0,2,4,6] L→[1,3,5,7] frei→`stepIndex%8`). In neues Modul **`app/lib/handpan-mapping.ts`** ziehen als `resolveTonfieldIndex(stepIndex, hand): number` (0-basiert). Visualizer delegiert künftig dorthin (kein Verhaltenswechsel); `DayPlayer` importiert dasselbe — so bleiben Audio und (spätere) Visualisierung deckungsgleich.

**Pitch-Normalisierung:** Labels (`"D3"`,`"Bb3"`,`"F#4"`) sind gültige Tone.js-Notennamen, solange ASCII `#`/`b`. In `derivePitchMap` Unicode `♯`/`♭` → ASCII normalisieren (an der Ableitungsgrenze, nicht im Audio-Thread).

**Fallback:** `pitchMap == null` (kein aktiver Pan / gelöscht / leer) → bestehende `'A4'`/`'C2'` behalten: `pitchMap?.ding ?? 'C2'`, `pitchMap ? tonfields[idx%len] : 'A4'`. **Null Regression** für Bestands-User ohne Instrument.

## Bekannte v1-Vereinfachungen (bewusst)

- **Tonfeld-Mapping = Array-Reihenfolge.** `derivePitchMap` nimmt `notes[0]`=Ding und die **ersten 8 Nicht-Ding-Noten in Layout-Reihenfolge** als Tonfelder (`notes.slice(1).slice(0,8)`). Klassifikation Top- vs. Bottom-Note nach Position/Radius ist **out of scope** für v1; Bottom-/Extra-Töne sind stumm bis Stufe 3. Für die 8 gelieferten Templates (top-fields-first, `notes[0]`=Ding) passt das exakt. `% len` sorgt dafür, dass auch Pans mit <8 Tonfeldern klingen. In Code-Kommentar + Builder-UI klar benennen.

## Build-Reihenfolge

1. Migration `supabase/migrations/0001_handpans.sql` (Tabelle + RLS + `profiles.active_handpan_id`) → MCP `apply_migration` → `get_advisors`.
2. Typen-Regen → `database.types.ts` überschreiben (MCP `generate_typescript_types`).
3. Seed `data/handpan-templates.ts` (Bun-Generator) + `app/lib/handpan.ts` + `app/lib/handpan-mapping.ts`.
4. Server-Action `app/settings/_actions.ts`.
5. Builder-UI (`OnboardingInstrumentStep.tsx` + `HandpanBuilder.tsx`) + `settings/page.tsx` Step-Branch + `updateProfile`-Redirect.
6. Playback: `tag/[n]/page.tsx` Fetch + `DayPlayer.tsx` Prop + Z. 296/304 ersetzen.
7. Verify.

(Schritte 3–4 unabhängig von 5–6 → parallelisierbar.)

## Kritische Dateien

**Neu:** `supabase/migrations/0001_handpans.sql`, `data/handpan-templates.ts`, `app/lib/handpan.ts`, `app/lib/handpan-mapping.ts`, `app/settings/_actions.ts`, `app/settings/_components/OnboardingInstrumentStep.tsx`, `app/settings/_components/HandpanBuilder.tsx`.

**Geändert:** `app/training/rhythmusfundament/_components/DayPlayer.tsx` (Prop + Z. 296/304), `app/settings/page.tsx` (Step-Branch + `updateProfile`-Redirect), `app/training/rhythmusfundament/tag/[n]/page.tsx` (Fetch + `pitchMap` an Z. 201), `app/lib/supabase/database.types.ts` (regeneriert), `components/HandpanVisualizer.tsx` (Resolver an `handpan-mapping.ts` delegieren).

## Verifikation

Supabase-Projekt vorher wecken (MCP-Read). `npm run dev` (Next 16.2.9), danach `npx tsc --noEmit` für die neuen Typen/Casts.

**End-to-End mit Interceptor bei Viewport 390×844 (iPhone — Projektregel):**
1. **Onboarding:** frischer User (leer `full_name`) → `/training` leitet auf `?onboarding=true` → Name+Level submit → landet auf `?step=instrument` (nicht direkt `/training`).
2. **Template-Pfad:** Template wählen → speichern → `/training`. Per MCP `execute_sql`: genau eine `handpans`-Row, `profiles.active_handpan_id` zeigt darauf.
3. **Custom-Pfad:** Custom → Noten hinzufügen, Pitches umbenennen (z.B. Ding `D3`, Tonfeld `A3`), benennen, speichern. `notes`-JSONB + `scale_name=null` prüfen.
4. **Instrument-aware Playback (Auszahlung):** Rhythmus-Fundament-Tag mit Kurszugang öffnen, Play → **per Gehör** prüfen, dass Ding/Tonfelder in der gewählten Skala klingen, nicht A4/C2. Gegenprobe mit zweitem Instrument mit klar anderem Ding. Mobile: Player- + Builder-Layout läuft bei 390px nicht über, Inputs ≥16px (iOS-Zoom).
5. **Fallback:** User mit `active_handpan_id=NULL` (oder aktiven Pan löschen) → Tag öffnen, Play → spielt weiter mit A4/C2, kein Crash/keine Stille.
6. **RLS:** MCP `get_advisors` (security) → RLS auf `handpans` aktiv, keine Warnungen.

Optional: Interceptor monitor/replay des Onboarding→Build→Play-Flows als Regression-Skript aufnehmen (meistfrequentierter Pfad + Audio-Naht).
