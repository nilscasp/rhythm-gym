# Stripe-Produkte der Lernplattform

Stand: 22.10.2026. Konto „Handpan Schule des Lebens“ (`acct_1T6U0dAEDyfR18n4`). Angelegt auf Nils' Freigabe vom 22.10.2026. Keine Schlüssel in dieser Datei.

## Konventionen

- **Währung:** Euro.
- **Steuer:** Endpreise, Steuercode `txcd_20030000` (allgemeine Dienstleistungen), kein Steuersatz hinterlegt (Nils, 22.10.2026). Ob § 19 UStG gilt, ist hier nicht festgehalten.
- **Metadaten am Preis** (bei Premium/VIP zusätzlich `platform`, `tier` am Produkt), damit der Webhook ein Enrollment bzw. `profiles.plan` zuordnen kann:
  - Abos: `platform=lernen`, `tier=premium|vip`, `interval=month|year`
  - Kurse: `platform=lernen`, `course_slug=<programs.slug>`
- **Lookup-Keys** sind in Test und Live gleich. Der Code sollte Preise darüber holen (`prices.list({ lookup_keys: [...] })`), nicht über fest eingetragene IDs.
- **Nicht in Stripe:** Raten fürs Jahresabo (laufen per Überweisung, muss auf der Plattform als Weg angegeben werden, Freischaltung von Hand), Testphasen (gibt es nicht), Payment Links und Webhooks für die Plattform.
- **Offen:** Übergangspreise für Kursteilnehmende (erstes Jahresabo Premium 525 €, VIP 1.125 €). Nils denkt an einen Rabattcode; Stripe zeigt einen Code im Checkout als Rabatt an, was mit der Regel „nie Rabatt sagen“ kollidiert. Alternative: eigener Jahrespreis mit Metadatum `offer=kurs-uebergang`. Entscheidung beim Bau des Kaufwegs.

## Testmodus (Sandbox)

| Produkt | Produkt-ID | Preis | Intervall | Preis-ID | Lookup-Key |
|---|---|---|---|---|---|
| Premium | `prod_VUPHkqa8KDopt9` | 70,00 € | Monat | `price_1UTQUnAEDyfR18n4P6fSB6hb` | `lernen_premium_month` |
| | | 700,00 € | Jahr | `price_1UTQV9AEDyfR18n4HbTDPFJ9` | `lernen_premium_year` |
| VIP | `prod_VUPIaB0da3vn9H` | 150,00 € | Monat | `price_1UTQVJAEDyfR18n4Ptp8MP9e` | `lernen_vip_month` |
| | | 1.500,00 € | Jahr | `price_1UTQVUAEDyfR18n4Z1Zq4TMJ` | `lernen_vip_year` |
| Rhythmus Fundament (Testkopie) | `prod_VUPJkINcxaYeAf` | 399,00 € | einmalig | `price_1UTQWIAEDyfR18n4ckgAXJB6` | `lernen_rhythmusfundament` |
| Von Anfang an spielen (Testkopie) | `prod_VUPIVw8iktRPAL` | 505,00 € | einmalig | `price_1UTQWTAEDyfR18n4QVlvB1bB` | `lernen_von-anfang-an-spielen` |

## Live-Modus

Angelegt am 22.10.2026 nach Nils' zweitem Okay. Premium und VIP sind neu; bei RF und VAA wurden nur Metadaten und Lookup-Key an den bestehenden Preisen ergänzt (Betrag, Name, Payment Links unverändert, Produkte selbst ohne neue Metadaten).

| Produkt | Produkt-ID | Preis | Intervall | Preis-ID | Lookup-Key |
|---|---|---|---|---|---|
| Premium | `prod_VUPPSgmdwQUvLW` | 70,00 € | Monat | `price_1UTQaSAEDyfR18n4LjrNLmfu` | `lernen_premium_month` |
| | | 700,00 € | Jahr | `price_1UTQboAEDyfR18n4Cp2OH2W1` | `lernen_premium_year` |
| VIP | `prod_VUPThbHMyzz4Xd` | 150,00 € | Monat | `price_1UTQexAEDyfR18n48FLxwBse` | `lernen_vip_month` |
| | | 1.500,00 € | Jahr | `price_1UTQfdAEDyfR18n4N4reO71l` | `lernen_vip_year` |
| Rhythmus Fundament (bestehend) | `prod_UDxs16Ewd67kRh` | 399,00 € | einmalig | `price_1UAwUxAEDyfR18n4gCzEZC91` | `lernen_rhythmusfundament` |
| Von Anfang an spielen (bestehend) | `prod_UwxJhXptOQJvo3` | 505,00 € | einmalig | `price_1UEoXjAEDyfR18n4rGleEbtc` | `lernen_von-anfang-an-spielen` |

Hinweis Steuer: Die Live-Preise stehen auf Steuerverhalten „Standard (abgeleitet von der Währung)“, das Konto leitet EUR als inklusive ab, genau wie bei den älteren Kurspreisen. Die Test-Preise sind explizit `inclusive`. Für den Checkout gleichwertig, solange keine Steuerregistrierung hinterlegt ist.

## Rhythmus Fundament 1.5 (Live, 23.10.2026)

Auf Nils' Bitte als eigenes Produkt mit Payment Link für den Verkaufsstart angelegt. Noch nicht an die Plattform angebunden (keine Metadaten, kein Lookup-Key, kein `programs.slug`), Freischaltung läuft bis dahin wie bisher von Hand.

| Produkt | Produkt-ID | Preis | Preis-ID | Payment Link |
|---|---|---|---|---|
| Rhythmus Fundament 1.5 | `prod_VUgioEk9qhG9Bi` | 89,00 € einmalig | `price_1UThKcAEDyfR18n4eyqrG3Fk` | `plink_1UThLCAEDyfR18n4qGsZynnQ`, https://buy.stripe.com/00w4gya9QbvP4TT6iX1ZS0b |

Link-Einstellungen wie beim RF-Link 399 € (Rechnungsadresse, vollständiger Name, Telefonnummer, automatische Steuer, keine Promo-Codes, Standard-Bestätigungsseite). Beschreibung (Nils, 23.10.2026): „Ein 22-tägiges Programm, das die letzten zwei Zyklen von Rhythmus Fundament 1.0 aufgreift und vertieft. Nur für Teilnehmende von Rhythmus Fundament 1.0.“ Bild: quadratisches Icon 1000×1000 (Nachtblau mit warmem Kreis-Glühen, feiner Goldrahmen, „Rhythmus Fundament“ in Warmweiß und „1.5“ in Gold, beides Fraunces leicht, Schul-Logo bei etwa 9 % Deckkraft mittig im Kreis). Das 16:9-Cover passte im Checkout nicht. Die Beschränkung auf Teilnehmende von 1.0 steht nur im Text; der Link selbst ist offen. Beim Duplizieren entstand nebenbei „(Copy) Rhythmus Fundament“ (`prod_VUggJyJgLVhKet`), ungenutzt und archiviert.

## Bestand Live, nicht verändert

- Rhythmus Fundament: 359 € ist weiter aktiv und hat einen aktiven Payment Link.
- Von Anfang an spielen: 450 € ist noch als Standardpreis markiert und hat einen aktiven Payment Link.
- Übrige Produkte (Kaufbegleitung, Rhythm Fundament Course in USD, Einsteigerkurse) gehören nicht zur Plattform.
- Der Testschlüssel in `.env.local` wird von Stripe als ungültig abgelehnt (22.10.2026), er muss erneuert werden, bevor der Code gegen die Sandbox läuft.
