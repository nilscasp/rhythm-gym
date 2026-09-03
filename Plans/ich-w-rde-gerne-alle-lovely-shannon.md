# Rhythmus Fundament · Englisches Voiceover mit Voicebox (Stimmklon)

## Kontext

Der 40-Tage-Kurs „Rhythmus Fundament" hat 36 Videos (Tag 1–40 ohne 17/22/27/36 im Datenfile; Bunny-Library hält 40), insgesamt ca. 425 Minuten, 1080p, gehostet auf Bunny Stream (GUIDs in `data/rhythmusfundament-days.ts`, Embed in `app/training/rhythmusfundament/_components/BunnyVideoEmbed.tsx`). Nils will alle Videos mit einer englischen Tonspur in seiner eigenen (geklonten) Stimme versehen. Werkzeug: die lokale Open-Source-App Voicebox (jamiepine/voicebox, v0.5.0), die bereits läuft und ein Klon-Profil „Nils" enthält.

**Antwort auf „klappt das?": Ja, mit zwei ehrlichen Einschränkungen.**

1. Der Voicebox-MCP-Server ist dafür das falsche Werkzeug. Er bietet nur `speak` (spielt Audio über Lautsprecher ab), `transcribe`, `list_profiles`, `list_captures`. Für Batch-Generierung mit Dateiausgabe nutzen wir stattdessen die REST-API derselben App (`http://127.0.0.1:17493`, OpenAPI unter `/openapi.json`) direkt aus TypeScript. Kein MCP-Setup nötig.
2. Kein Lippensync. Nils ist im Bild; die englische Stimme wird zeitlich in die deutschen Sprechfenster gelegt, aber Mundbewegungen passen nicht. Das ist bei jedem Dub so und muss akzeptiert werden.

Weitere Risiken (Akzent-Bleed des Klons, Timing-Überlauf EN vs. DE, Demucs-Artefakte auf Handpan, Whisper-Halluzinationen in Musikpassagen) sind im Plan mit Gegenmaßnahmen adressiert. Der Pilot (Tag 1) entscheidet, ob die Qualität für alle 36 Videos reicht.

## Festgestellte Ausgangslage (verifiziert)

| Bereich | Stand |
|---|---|
| Maschine | Apple M5, 24 GB RAM, 548 GB frei |
| Voicebox | läuft, Port 17493, Engine Qwen3-TTS 1.7B via MLX geladen; Profil „Nils" (de, 1 Sample 19,7 s); Nils hat heute bereits einen EN-Testclip erzeugt (~3× Echtzeit Generierung) |
| Cross-lingual | Qwen3-TTS unterstützt DE und EN und Klon-Transfer über Sprachen hinweg; Chatterbox Multilingual (23 Sprachen) als Alternative, nicht heruntergeladen |
| STT | openai-whisper 20240930 + torch 2.8 mit MPS, CLI `~/Library/Python/3.9/bin/whisper`, Modelle large-v3-turbo/medium/small/base gecacht. Voicebox `/transcribe` liefert keine Timestamps, daher lokal Whisper |
| Trennung | Demucs nicht installiert; per `uvx` on demand |
| ffmpeg/ffprobe | vorhanden (Homebrew) |
| Originale | Nils sagt „lokal vorhanden", aber keine „Tag N - HD 1080p.mov" auf `/`, `~/Movies` oder `/Volumes/2T-nils-1` gefunden. Wahrscheinlich in `Webinare und online Kurse.fcpbundle` (FCP) und die Exporte gelöscht. Fallback: Bunny MP4-Fallback 1080p ist aktiv (`play_1080p.mp4`), für den Dub ausreichend |
| Repo | keine Media-Tools, kein i18n, keine Untertitel; `scripts/` enthält ein bun-Script; `BUNNY_STREAM_API_KEY` in `.env.local` vorhanden, ungenutzt |

Entscheidungen von Nils: Pilot = Tag 1 (15:34). Nils schreibt die englischen Skripte selbst. Nils legt zusätzlich ein Profil aus einer echten englischen Aufnahme an. Ausgabe erst als lokale MP4-Datei, Auslieferung später entscheiden.

## Architektur in einem Satz

Whisper liefert die deutschen Sprechfenster mit Timestamps → daraus ein editierbares Dub-Skript, in das Nils Englisch schreibt → Voicebox generiert pro Segment eine EN-WAV → Timing-Fit ins Fenster → Mix: Original-Audio außerhalb der Sprache, Demucs-Musikstem (oder Stille) unter der EN-Stimme innerhalb der Sprache → Loudness-Match → Mux als MP4 mit EN-Spur (DE optional als zweite Spur).

## Dateien

**Arbeitsverzeichnis (außerhalb git):** `${DUB_WORKDIR:-$HOME/Movies/RhythmGym-Dub}/`

```
config.json          Stimme/Engine/Seed/Instruct, Schwellen, Defaults
sources.json         { "1": "/Pfad/Tag 1 Clip 1 - HD 1080p.mov", ... } oder Bunny-Fallback
tts-cache/<sha256>.wav|json   globaler Cache (Text+Profil+Seed+Instruct)
voice-test/          30-s-Stimmtest, 2–3 Varianten
tag-01/
  state.json         Step-Fingerprints (Resumability)
  01-audio/orig.48k.wav
  05-sep/no_vocals.48k.wav, vocals.16k.wav      (Demucs)
  02-asr/whisper.json, segments.json
  03-script/dub-script.md   ← Nils editiert hier
  03-script/script.json
  04-tts/sNNN.wav, tts.json
  06-fit/fit.json, sNNN.fit.wav
  07-mix/en.mix.wav, en.final.wav, loudness.json
  08-out/tag-01.en.mp4, tag-01.en.srt, tag-01.fit-report.md
```

**CLI im Repo:** `scripts/dub/` (TypeScript, bun, keine neuen Dependencies; `node:util parseArgs`, `Bun.spawn`, `fetch`). Einstieg: `bun scripts/dub/dub.ts <step> --day N`.

| Datei | Aufgabe |
|---|---|
| `dub.ts` | Arg-Parsing, Step-Dispatch, Composites `prep` / `render` / `batch` |
| `config.ts`, `types.ts`, `state.ts` | Config laden, Pfade, Typen, Step-Fingerprints |
| `ffmpeg.ts` | `run`, `probe`, `rmsDb`, `loudness`, `decodeF32`, `atempo` |
| `sources.ts` | `sources.json` lesen; `--scan <dir>` sucht `Tag N` Dateien; Bunny-Download-Fallback (`play_1080p.mp4`, Referer-Header) |
| `extract.ts` | Step A |
| `separate.ts` | Demucs via uvx |
| `transcribe.ts` | Whisper + Utterance-Merging → `segments.json` |
| `script.ts` | `dub-script.md` schreiben / parsen / `--refresh` |
| `voicebox.ts` | einziger REST-Client (`/profiles`, `/generate`, `/generate/{id}/status`, `/audio/{id}`, `/tasks/active`) |
| `tts.ts` | Step C mit Cache, sequentiell |
| `fit.ts`, `mix.ts`, `mux.ts`, `qa.ts` | Steps D–G |
| `voiceTest.ts`, `doctor.ts` | Stufe 0 |

Reihenfolge: `doctor` → `voice-test` → `sources` → `extract` → `separate` → `transcribe` → `script` → (Nils schreibt) → `tts` → `fit` → `mix` → `mux` → `qa`. `prep` = extract…script, `render` = tts…qa.

## Schritte

### A · Audio extrahieren
```
ffmpeg -y -i "<src>" -map 0:a:0 -vn -ac 2 -ar 48000 -c:a pcm_s16le 01-audio/orig.48k.wav
```
Fingerprint (size+mtime) in `state.json`; mehrere Audiostreams → Liste anzeigen, `--audio-stream k`.

### B1 · Demucs (vor Whisper, damit Whisper den Vocals-Stem transkribiert)
```
PYTORCH_ENABLE_MPS_FALLBACK=1 uvx --python 3.11 --from demucs demucs -n htdemucs --two-stems=vocals -d mps -o 05-sep 01-audio/orig.48k.wav
```
Erstlauf installiert demucs+torch (~2 GB) via uv. Erwartung M5/MPS 2–4 min für 15 min; CPU-Fallback 8–15 min. Stems auf 48 k (no_vocals) und 16 k mono (vocals) resamplen.

### B2 · Whisper (DE, Wort-Timestamps)
```
PYTORCH_ENABLE_MPS_FALLBACK=1 ~/Library/Python/3.9/bin/whisper 05-sep/vocals.16k.wav \
  --model large-v3-turbo --device mps --fp16 False --language de --task transcribe \
  --word_timestamps True --output_format json --output_dir 02-asr \
  --condition_on_previous_text False --no_speech_threshold 0.6 --logprob_threshold -1.0 \
  --compression_ratio_threshold 2.4 --hallucination_silence_threshold 2 \
  --initial_prompt "Handpan, Ding, Tonfeld, Slap, Ghostnote, Puls, Offbeat, Takt, Achtel, Sechzehntel."
```
CPU-Fallback bei MPS-Fehler. `doctor` testet Whisper vorab auf einem 60-s-Ausschnitt.

**Utterance-Merging → `segments.json`:** Whisper-Segmente mit hohem `no_speech_prob`/schlechtem `avg_logprob`/Halluzinations-Phrasen verwerfen; Wörter zu Utterances mergen (Pause > 0,7 s, max 25 s, Satzende ab 8 s); `slotEnd` = Start der nächsten Utterance − 0,25 s; Auto-Flags `music` (RMS des no_vocals-Stems im Segment > −40 dBFS) und `suspect` (Vocals-RMS < −45 dBFS = Text ohne Stimme).

```json
{ "id":"s001","start":3.12,"end":9.80,"slotEnd":13.77,"slotSec":10.65,"spokenSec":6.68,
  "de":"Hallo und herzlich willkommen …","deWords":14,
  "auto":{"music":false,"suspect":false,"musicRmsDb":-58.3,"vocalsRmsDb":-22.1} }
```

### B3 · Dub-Skript (Nils' Editierfläche): `03-script/dub-script.md`
Sektionierte Markdown-Datei statt Tabelle (mehrzeiliges Englisch, keine `|`-Probleme, diff-freundlich, zeilenanker-parsebar):
```
## s001 · 00:03.1 → 00:09.8 · spoken 6.7s · slot 10.7s · DE 14 words · EN target ~17 · max 29
DE: Hallo und herzlich willkommen zum ersten Tag.
EN:
FLAGS:
```
Parse-Regeln: `EN:` bis zur nächsten `FLAGS:`/`NOTE:`/`##`; `FLAGS:` aus `music | silence | keep-de | skip | seed=<int> | tempo=1`. Fehlendes EN → Status `missing` (Warnung). `script` überschreibt eine bestehende `.md` nie ohne `--force`; `script --refresh` erneuert nur Header/DE, behält EN/FLAGS, verschobene IDs landen unter `## orphaned`. Wortbudget aus `wordsPerSec` (nach Stimmtest kalibriert).

### C · TTS via Voicebox REST (sequentiell, gecacht)
Cache-Key = sha256(profileId, engine, modelSize, language, seed, instruct, normalisierter Text). Pro Segment: `GET /tasks/active` warten → `POST /generate` `{profile_id, text, language:"en", engine:"qwen", model_size:"1.7B", seed, instruct, max_chunk_chars:800, crossfade_ms:50, normalize:true}` → Poll `/generate/{id}/status` (1,5 s; Timeout max(90 s, 8×geschätzt)) → `GET /audio/{id}` → Stille trimmen, auf 48 k resamplen, in `tts-cache/` legen. 3 Retries mit Backoff; `ECONNREFUSED` = „Voicebox nicht offen", Exit 2, Zustand bleibt. Text-Lint vor dem Senden (Ziffern ausschreiben, `&`, `%`, Emoji, > 600 Zeichen).

### D · Timing-Fit
`slot = slotEnd − start`. EN ≤ slot → ok. Sonst `atempo = enDur/slot` bis Cap 1,12. Darüber: Status `overflow`, Report nennt „~N Wörter kürzen". `mix` verweigert bei `overflow` (außer `--allow-overflow` für Vorschau). Nie das Video schneiden, nie das nächste Segment verschieben. EN kürzer als DE → Rest ist Bed.

### E · Bed-Track und Mix
Segment-Klasse: `FLAGS` > Auto-`music` > Default `silence`. Innerhalb der Sprechfenster: `music` → no_vocals-Stem ×0,8; `silence` → no_vocals ×0,25 (Raumton statt digitaler Stille); `keep-de` → Original unangetastet. Außerhalb der Fenster: Original 1:1.
Umsetzung als drei f32le-Hüllkurven/Spuren (48 k, 25-ms-Rampen) aus TypeScript + ein ffmpeg-Aufruf mit `amultiply` × 2 und `amix=inputs=3:normalize=0` (sample-genau, klickfrei, kein 100-Input-Filtergraph).

### F · Loudness und Mux
`loudnorm` zweistufig: Original messen (I/LRA), Mix messen, dann `loudnorm=I=<orig>:TP=-1.5:LRA=<orig>:measured_*:linear=true`. Fällt loudnorm in den dynamischen Modus → `volume`+`alimiter`.
```
ffmpeg -y -i "<src>" -i 07-mix/en.final.wav -map 0:v:0 -map 1:a:0 -map 0:a:0 -dn -sn \
  -c:v copy -c:a aac -b:a 192k -ar 48000 \
  -metadata:s:a:0 language=eng -disposition:a:0 default -metadata:s:a:1 language=deu -disposition:a:1 0 \
  -movflags +faststart 08-out/tag-01.en.mp4
```
ProRes-Quelle → `.mov` ausgeben oder `hevc_videotoolbox` transkodieren. Prüfen: Dauer = Quelle ±0,05 s, Stream 0:a:0 = eng.

### G · QA
`tag-01.en.srt` (aus `fit.json`, später als Bunny-Caption nutzbar), `tag-01.fit-report.md` (pro Segment DE-s, EN-s, Ratio, atempo, Bed, Status, Aktion), `dub.ts ab --day 1 --at 120 --len 30` schneidet DE/EN-Vergleichs-WAVs und spielt sie via `afplay`. Volle Sichtung mit Spurwechsel in IINA/VLC.

## Pilot-Sequenz (Tag 1)

0. `bun scripts/dub/dub.ts doctor` — ffmpeg, whisper (60-s-MPS-Probe), uvx, Voicebox `/profiles`, `sources.json`, Disk ≥ 20 GB.
1. **Stimmtest zuerst (30 s, 3 Varianten):** `voice-test --profile <DE-Profil>`, `--profile <neues EN-Profil>`, optional `--engine chatterbox` (nur wenn in Voicebox heruntergeladen). Nils hört ab und wählt; `voice-test --choose <label>` schreibt `config.tts` und `wordsPerSec`. Kein ganzes Video, bevor die Stimme abgenommen ist.
2. Quelle klären: Pfad zur Tag-1-Datei in `sources.json` eintragen (FCP-Re-Export aus `Webinare und online Kurse.fcpbundle`) oder `sources --bunny --day 1` (1080p-Fallback-MP4).
3. `prep --day 1` (10–15 min Maschinenzeit). `segments.json` auf Plausibilität prüfen.
4. Nils füllt `dub-script.md` (EN). `script --lint --day 1` warnt bei Budget/Ziffern.
5. `render --day 1` (TTS ≈ 25–30 min bei ~9 min Sprache). Fit-Report lesen, `overflow`-Zeilen kürzen, erneut `render` (nur geänderte Zeilen werden neu generiert).
6. `ab --day 1 --at <t>` und Sichtung von `tag-01.en.mp4`. Freigabe oder Tuning (`bed.*`, `instruct`, `seed=` pro Zeile).

## Skalierung auf 35 Videos (nach Pilot-Freigabe)

- Zwei Phasen, weil TTS von Nils' Schreiben abhängt: `batch prep --days 2-40` (eine Nacht) und `batch render --days 2-40 --only-ready`.
- Schätzung: Whisper 45–90 min, Demucs ~1,5 h, TTS ~13 h (≈255 min EN-Audio × 3). Zwei Nächte oder tageweise.
- Overnight: `caffeinate -dims bun scripts/dub/dub.ts batch render … | tee -a logs/…`. Voicebox-App muss offen bleiben; Watchdog pingt `/profiles` bis 6 h, 3 Fehlversuche pro Zeile → `failed`, weiter.
- Resumability über `state.json`-Fingerprints pro Step; `--force <step>` invalidiert nachgelagerte Steps.
- Demucs und TTS nie parallel (GPU/RAM).

## Risiken und Grenzen (ehrlich)

- **Akzent:** Klon aus 19,7 s Deutsch bringt deutsche Prosodie ins Englische; `instruct` repariert keinen Akzent. Das EN-Sample-Profil ist der realistische Weg. Entscheidung in Stufe 1, nicht nach 36 Videos.
- **Timing:** EN ist oft 10–20 % länger; erster Durchlauf wird `overflow`-Zeilen haben. Hebel: Wortbudget im Skript-Header, atempo ≤ 1,12.
- **Demucs auf Handpan:** Obertöne können in den Vocals-Stem leaken (Musik wird dünner), Stimmreste im no_vocals (deutsche „Geister" unter EN in `music`-Segmenten). Gegenmittel: `musicGain` senken, `FLAGS: silence`, notfalls `htdemucs_ft` (4× langsamer).
- **Whisper:** Halluzinationen in Musikpassagen; abgefangen durch Vocals-Stem-Input, Flags, `suspect`, `FLAGS: skip`.
- **API-Drift:** Voicebox 0.5.0 in `config.json` festhalten; Status-Strings aus `/openapi.json` in einer Konstante; nur `voicebox.ts` kennt die API.
- **Referenzsample:** Der `reference_text` des bestehenden Samples wirkt abgeschnitten („zuwenden konnten. …"); für Qwen-Cloning sollte er exakt zum Audio passen. Beim Stimmtest prüfen, ggf. 2–3 saubere 10–20-s-Ausschnitte aus den Kursvideos (gleiches Mikro, gleicher Raum) mit exaktem Whisper-Transkript als weitere Samples anlegen.

## Out of Scope (jetzt)

App-i18n (englische Markdown-Inhalte, Locale-Routing), Bunny-Re-Upload, DE/EN-Umschalter im Player, Caption-Upload. Hinweis für später: Bunny Stream unterstützt Multi-Audio nur aus der hochgeladenen Quelldatei; das DE+EN-gemuxte MP4 aus Step F ist genau dieses Upload-Format (neue GUID → `videoId` im Datenfile tauschen).

## Nebenbefund

Tage 17, 22, 27, 36 haben kein `videoId` im Datenfile, obwohl Bunny fertige Videos dafür hat (6d351105…, 92e1ef26…, 28ae9c17…, 22a92ead…). Als separater Task vorgeschlagen.

## Verifikation

- `doctor` grün (alle Tools, Voicebox erreichbar, MPS-Whisper-Probe).
- Stimmtest: 3 WAVs in `voice-test/`, Nils' Wahl in `config.json`.
- `segments.json` Tag 1: Sprechanteil plausibel (ca. 50–70 %), keine `suspect`-Segmente mit Text in reinen Spielpassagen (Stichprobe hören).
- `tts.json`: alle Nicht-skip-Zeilen `ok`; zweiter `render` ohne Textänderung generiert 0 neue Clips (Cache-Beweis).
- `fit-report.md`: 0 `overflow` vor finalem Mix.
- `tag-01.en.mp4`: `ffprobe` zeigt Video-Stream kopiert (gleicher Codec/Bitrate), Dauer = Quelle ±0,05 s, Spur 0 `eng`, Spur 1 `deu`; Integrated LUFS EN-Spur = DE-Spur ±1 LU.
- Hörprobe: `ab` an drei Stellen (reine Rede, Rede über Spiel, reines Spiel): kein deutscher Rest hörbar, Handpan in Spielpassagen identisch zum Original, keine Klicks an Segmentgrenzen.
