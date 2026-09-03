# Phasenplan: rhythm-gym → Handpan Schule des Lebens (Phase 1 „Schulraum")

**Zeitraum:** Woche 1 = Mo, 6. Juli 2026 · Ziel-Launch: **Wintersonnenwende, 21. Dezember 2026** (24 Wochen)

---

## Bau-Reihenfolge auf einen Blick

| Baustein | Wochen | Zeitfenster |
|---|---|---|
| 0 — Fundament & technisches Konzept | W1–2 | 6.–19. Juli |
| A — Entitlement- & Stripe-System | W3–8 | 20. Juli – 30. Aug |
| B — Kurse/Kalender (UI + Admin) | W7–12 | 10. Aug – 27. Sep |
| C — Karte | W13–15 | 28. Sep – 18. Okt |
| D — Feed + DMs | W16–20 | 19. Okt – 22. Nov |
| E — PWA-Feinschliff, Migration, Beta | W21–24 | 23. Nov – 20. Dez |

Bausteine A und B überlappen bewusst: sobald das Entitlement-Datenmodell steht (Ende W6), kann die Kalender-UI dagegen gebaut werden, während Stripe-Webhooks und Kaufflüsse parallel fertig werden.

---

## Block 0 — Fundament (W1–2)

- Datenmodell entwerfen und reviewen: `events`, `courses`, `cohorts`, `entitlements`, `entitlement_rules` (abgeleitete Regeln „Kurs X ⇒ Termin Y"), Verknüpfung zu Stripe-Price-IDs. Das ist das wichtigste Artefakt des ganzen Projekts — hier zwei volle Wochen investieren.
- Bestehende rhythm-gym-Tabellen (Profile, Programme, Completions) auf Anschlussstellen prüfen; Migrationsstrategie festlegen.
- PWA-Basis anlegen: Manifest, Service Worker-Gerüst, Installierbarkeit — früh, damit alles Folgende von Anfang an mobil verifiziert wird.
- **Ende W2:** Datenmodell final, Migrationen geschrieben, leerer aber installierbarer PWA-Rahmen deployed.

## Baustein A — Entitlement- & Stripe-System (W3–8)

Der technisch aufwändigste Teil, deshalb zuerst. Alles andere baut darauf auf.

- **W3–4:** Entitlement-Kern: Tabellen + RLS-Policies in Supabase, zentrale `hasAccess(user, resource)`-Prüfung als einzige Wahrheitsquelle. Abgeleitete Regeln (Kurs ⇒ Termin) implementieren.
- **W5–6:** Stripe-Integration: Einzelkauf pro Event/Kurs (eigene Price-IDs), Abo-Bündel, die mehrere Entitlements vergeben. Webhook-Handling (Kauf, Kündigung, fehlgeschlagene Zahlung) inkl. Entzug von Entitlements.
- **W7–8:** Härtung: Edge-Cases (Abo-Kündigung mitten im Kurs, Doppelkäufe, Refunds), Test-Suite gegen die Zugriffslogik, Stripe-Testmodus-Durchläufe aller Kaufpfade.
- **Ende W8:** Jeder Kaufweg (Einzeltermin, Kurs, Abo-Bündel) vergibt und entzieht Entitlements korrekt und automatisch.

## Baustein B — Kurse/Kalender (W7–12)

- **W7–9:** Kalenderansicht für alle eingeloggten Nutzer — alle Community-Termine sichtbar, auch ohne Besitz (Verkaufskanal). Termin-Detailseite mit granularer Sperre: Beschreibung/Bild öffentlich, Zoom-Link nur mit Entitlement, sonst Kauf-CTA direkt am Termin.
- **W10–11:** Admin-Bereich: Termine anlegen (Beschreibung, Bild, Zoom-Link, Price-ID-Zuordnung), Kurse und Kohorten verwalten, Nutzer Kohorten zuordnen.
- **W12:** Mobile-Verifikation (390×844, Pflicht), Politur, interner Testlauf mit echten Terminen.
- **Ende W12:** Nils kann einen echten Kurs mit Terminen anlegen, ein Testnutzer kann ihn kaufen und den Zoom-Link sehen. **Das ist das Herzstück der Skool-Ablösung — ab hier ist der Kern funktionsfähig.**

## Baustein C — Karte (W13–15)

- **W13:** Opt-in-Flow im Profil, Stadt-Eingabe (nur Stadt-Ebene, Geocoding auf Stadt-Zentroid).
- **W14:** Kartenansicht mit Nutzer-Pins, Profil-Popup mit „Nachricht senden"-Link (verweist zunächst auf E-Mail/Profil, ab W18 auf DMs).
- **W15:** Datenschutz-Review, Mobile-Verifikation, Politur.

Bewusst kompakt gehalten — die Karte ist funktional klein und gut isolierbar.

## Baustein D — Feed + DMs (W16–20)

- **W16–17:** Feed: Posts mit Kategorien, YouTube-Link-Erkennung mit Embed/Vorschau, chronologische Sortierung, Admin-Moderation (Löschen/Pinnen).
- **W18–19:** 1:1-DMs: Postfach, Konversationsansicht, Realtime via Supabase. Getriggerte Nachrichten „von Nils" im selben Postfach: Willkommen bei Registrierung, Bestätigung bei Kauf — nutzt dieselbe DM-Infrastruktur, kein separater Kanal.
- **W20:** Web-Push-Benachrichtigungen für neue DMs (und optional Feed-Aktivität), Kartenverlinkung auf DMs umstellen, Mobile-Verifikation.

## Block E — Feinschliff, Migration, Launch (W21–24)

- **W21:** Ende-zu-Ende-Testlauf des gesamten Nutzerwegs: Registrierung → Willkommens-DM → Kalender durchstöbern → Kauf → Zoom-Link → Karte → Feed.
- **W22:** Skool-Migration vorbereiten: Inhalte/Termine übertragen, Kommunikationsplan an die Community, kleine Beta-Gruppe (5–10 vertraute Schüler) einladen.
- **W23:** Beta-Feedback einarbeiten, Bugfixes, Performance, letzte Mobile-Runden. Bewusst als Puffer angelegt.
- **W24:** Launch-Woche. **So, 21.12.2026: Öffnung der Handpan Schule des Lebens.**

---

## Modell-Einsatzplan (Entwicklung)

Welches KI-Modell wann die Arbeit macht — abgestimmt auf die Blöcke oben:

| Arbeit | Modell | Wann |
|---|---|---|
| Architektur & Datenmodell-Design (Entitlements, RLS-Konzept) | **Fable** | Block 0, Beginn Baustein A |
| Sicherheits-Review vor Freigabe (RLS-Policies, Stripe-Webhooks, Zugriffslogik) | **Fable** + **Cato** (GPT-5.4, Cross-Vendor-Audit) | Ende W4, Ende W8 |
| Tägliche Implementierung (Features, UI, Tests) | **Sonnet**, bei E3+-Coding-Tasks mit **Forge** (GPT-5.4) parallel | durchgehend W3–W20 |
| Mechanische Arbeit (Boilerplate, Migrationen ausführen, kleine UI-Fixes, Textkorrekturen) | **Haiku** | durchgehend, wo trivial |
| Beta-Feedback triagieren & Bugfixing | **Sonnet** | W22–23 |
| Launch-Review (Gesamtprüfung gegen Plan) | **Fable** | W21 |

Faustregel: **Fable für Entscheidungen, die teuer rückgängig zu machen sind** (Datenmodell, Sicherheit, Architektur), **Sonnet für das tägliche Bauen**, **Haiku für alles Mechanische**. Die zwei Fable-Sicherheits-Reviews (W4, W8) sind fest eingeplant, weil das Entitlement-System die Stelle ist, an der Fehler echtes Geld und Vertrauen kosten.

Runtime-Modelle der App selbst (welches Modell der Coach-Agent später nutzt) sind Phase-2-Thema — Kurzform als Vormerkung: strukturierte Übungsvorschläge → Haiku (billig, schnell), freier Chat später → Sonnet.

---

## Checkpoints

| Datum | Prüfung | Konsequenz bei Rückstand |
|---|---|---|
| **Fr, 28. Aug (Ende W8)** | Entitlement/Stripe komplett? Alle Kaufpfade grün? | Größter Hebel: hier Rückstand = alles verschiebt sich. Sofort Scope in B–D kürzen (siehe unten), nicht in A. |
| **Fr, 25. Sep (Ende W12)** | Kalender + Kaufweg Ende-zu-Ende nutzbar? | Falls ja: Kern steht, Rest ist verhandelbar. Falls nein: Karte streichen, C-Wochen an B geben. |
| **Fr, 20. Nov (Ende W20)** | Feed + DMs live? Beta startklar? | Letzter Punkt für Scope-Entscheidungen vor dem Launch. Danach nur noch Stabilisierung, keine neuen Features. |

---

## Kürzungs-Kandidaten (in dieser Reihenfolge)

1. **Web-Push** — DMs und Feed funktionieren auch mit E-Mail-Benachrichtigung als Übergang. Spart ~1 Woche, null Kernnutzen-Verlust.
2. **Karte** — funktional klein, aber komplett isoliert und ohne Abhängigkeiten. Verschiebt sich verlustfrei auf Januar; die Skool-Ablösung (Kurse + Feed + DMs) braucht sie nicht.
3. **Getriggerte DMs außer Willkommensnachricht** — Kaufbestätigung und Streak-Meilensteine nachrüsten, nur die Willkommens-DM zum Launch.
4. **Feed-Kategorien** — Feed startet notfalls ohne Kategorien (ein Stream), Kategorien folgen.

**Nicht kürzbar:** Entitlement/Stripe, Kalender mit granularer Zugriffssteuerung, 1:1-DMs. Das ist der Mindestumfang, unter dem die Skool-Ablösung ihren Sinn verliert.

---

## Explizit nicht in diesem Zeitplan

Phase 2 (Personalisierungs-/Coach-Agent samt Skill-Taxonomie mit Quiz-Tagging) ist bewusst kein Teil dieses Plans und startet erst nach dem 21.12. mit einer eigenen Vertiefungsrunde. Gleiches gilt für die geparkten Themen: nutzergenerierte Karten-Treffen, Kohorten-Priorisierung im Feed, Gruppen-Chats und externer Kalender-Sync. Nichts davon blockiert den Launch — das Datenmodell aus Block 0 hält die Anschlussstellen dafür offen.
