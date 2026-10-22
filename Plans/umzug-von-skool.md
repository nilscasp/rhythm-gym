# Umzug von Skool auf die Lernplattform

**Stand:** 22.10.2026 · Nils: „Ich würde gerne die Plattform so schnell wie möglich switchen … Lass uns das jetzt einfach durchziehen und bauen.“
Ersetzt für den Umzug die Reihenfolge in `phasenplan-schule-des-lebens-v2.md` §7. Entscheidungen dazu im Schul-Gedächtnis, `Stand/Entscheidungen.md` (22.10.2026).

## Was feststeht

- Das Community-Abo startet am 01.11.2026 noch in Skool. Die Plattform wird parallel gebaut; wenn sie steht, ziehen alle in einem Schritt um.
- Gespräch und Austausch laufen auf WhatsApp (bestehende WhatsApp-Community, Kursgruppen legt Nils an). Die Plattform hat **keinen Chat und keinen Feed**.
- Statt Feed: Beiträge von Nils (Hinweis oben auf „Heute“), Benachrichtigungsleiste, „Gedanke der Woche“.
- „Miteinander“: Challenges, inoffizielle Treffen, Menschen mit Kontaktanfrage (Handynummer erst nach Zustimmung, Vorschlag).
- Premium enthält Handpan Kompass, Elemente, Community-Lektionen, Aufzeichnungen, No Extra Time. VIP alles aus Premium plus zweiter Live-Call.
- Videos: 67 weitere Videos liegen in Bunny, Zuordnung in `Content-Hub/Upload/bunny-upload-2026-10-22.json` (2T-nils-1).
- Mockup: https://claude.ai/artifact/CANauqWiPUALq6YoeNcZdV (Ansichten 1–8).

## Bauabschnitte

| # | Abschnitt | Inhalt | Stand |
|---|---|---|---|
| A | Kursmodell | Migration 0010: Kurse → Abschnitte → Lektionen in der DB, Fortschritt je Lektion, „im Abo ab Stufe X enthalten“, WhatsApp-Link je Kurs/Runde; `course-access.ts` prüft Enrollment oder Stufe | in Arbeit |
| B | Kursseiten | Kursübersicht und Lektionsseite im Schule-Design (Video, Kapitel, Text, PDF, Abhaken, Kursgruppe) | offen |
| C | Inhalte einspielen | Seed aus der Bunny-Zuordnung + Skool-Texten: Kompass, Elemente, Kreativ, VAA, Aufzeichnungen | offen |
| D | Heute und Navigation | Startseite nach Mockup 1 (Schule-Texte statt Gym), Nav: Heute · Kurse · Üben · Live · Miteinander · Mein Weg | offen |
| E | Beiträge, Neuigkeiten, Gedanke der Woche | Tabellen + Coach-Formular für Nils, Glocke mit ungelesenen Neuigkeiten | offen |
| F | Abo über Stripe | Checkout für Premium/VIP in der App, Kundenportal, Webhook ordnet Preise per Metadaten Stufen zu, Coach: Stufe von Hand setzen. Produkte legt die Sitzung „stripe-produkte“ an (`docs/stripe-produkte.md`) | offen |
| G | Miteinander | Profil (Telefon, Region, Über mich, offen für …), Kontaktanfragen, Challenges, Treffen | offen |
| H | Live-Ergänzungen | Aufzeichnungen an Terminen, Frage vorab, Kalender-Export | offen |
| I | Schutz und Recht | Bunny-Token-Auth und Referrer `lernen.handpan.schule`, AGB (Nummerntausch), Datenschutzangaben beim Kauf, Sicherheits-Review | offen |
| J | Umzug | Zugänge für Skool-Mitglieder, Ankündigung, Skool parallel bis zum Stichtag | offen |

Reihenfolge: A → B → C ergeben die erste nutzbare Fassung (Kurse auf der Plattform). Danach D, F, E, G, H; I vor dem Livegang; J zuletzt.

## Bleibt unverändert

Rhythmus Fundament (`data/rhythmusfundament-days.ts`, `app/training/rhythmusfundament/`), rhythmgym.io, bestehende URLs.
