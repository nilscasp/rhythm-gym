# Brevo-Einrichtung für Briefe, Tag 1 und Konto-Einwilligung

> Gehört zu `Plans/plan-uebergang-lernplattform-leadmagnet.md` §3. Alles hier passiert im Brevo-Konto (Nils) bzw. in Vercel. Der Code in `app/lib/brevo.ts`, `app/api/briefe/route.ts` und `app/auth/callback/route.ts` setzt diese Einrichtung voraus.

## 1. Listen (Kontakte → Listen)

| Liste | Zweck | Wer landet hier |
|---|---|---|
| **Briefe** | Regel-Liste für alle Impulse und die Willkommensstrecke | Tag-1-Formular (nach DOI) und Konto-Signup mit Checkbox (nach Mail-Bestätigung) |
| **Eröffnung** | Warteliste für den Inneren Kreis (21.12.2026) | Formular auf handpan.schule/community/ |
| **Schüler** | Kohorte „Von Anfang an spielen" + RF-Teilnehmer | manuell von Nils gepflegt |

Die bestehende Footer-Newsletter-Liste der Website bleibt, wie sie ist. Wenn sie mit „Briefe" zusammengelegt werden soll: Kontakte exportieren, in „Briefe" importieren, DOI-Status übernehmen.

## 2. Kontakt-Attribute (Kontakte → Einstellungen → Kontaktattribute)

| Attribut | Typ | Wert |
|---|---|---|
| `QUELLE` | Text | `landing`, `konto`, `website` |
| `EINWILLIGUNG_AM` | Text (ISO-Zeitstempel) | wird vom Konto-Sync gesetzt |
| `EINWILLIGUNG_TEXT_VERSION` | Text | `2026-09-v1` (siehe `app/lib/consent.ts`) |

## 3. Double-Opt-in-Vorlage (Kampagnen → Vorlagen)

Eine transaktionale Vorlage „Bestätige deine Adresse", Absender `kontakt@handpan.schule`. Pflicht-Platzhalter: `{{ doubleoptin }}` als Bestätigungslink. Text-Vorschlag:

> Betreff: Ein Klick, dann gehört Tag 1 dir
>
> Hallo, du hast dich für die Briefe aus der Schule eingetragen. Bestätige das bitte mit einem Klick, dann öffnet sich Tag 1 aus dem Rhythmus-Fundament: {{ doubleoptin }}
> Wenn du das nicht warst, ignoriere diese Mail einfach.
> Nils Caspar · Musiker & Künstler

Die **Vorlagen-ID** (Zahl in der URL) ist `BREVO_DOI_TEMPLATE_ID`. Die Weiterleitung nach dem Klick setzt der Code pro Anfrage auf `https://lernen.handpan.schule/tag-1?bestaetigt=1`.

## 4. API-Schlüssel und Vercel

Brevo: Konto → SMTP & API → API-Schlüssel → neuen Schlüssel „lernen.handpan.schule" anlegen. In Vercel (Projekt rhythm-gym → Settings → Environment Variables, Production + Preview):

```
BREVO_API_KEY=xkeysib-…
BREVO_LIST_BRIEFE_ID=<Nummer der Liste „Briefe">
BREVO_DOI_TEMPLATE_ID=<Nummer der DOI-Vorlage>
```

Lokal dieselben drei Zeilen in `.env.local`. Ohne diese Variablen antwortet `/api/briefe` mit 503 und einem freundlichen Hinweis, der Signup läuft trotzdem.

## 5. Formular „Eröffnung" (Kontakte → Formulare)

Neues Formular, nur E-Mail, Double-Opt-in an, Liste „Eröffnung", Erfolgs-Text „Fast geschafft: Schau in dein Postfach." Die **Formular-URL** (`https://….sibforms.com/serve/…`) in `handpan-website-github/community/index.html` bei `WAITLIST_FORM_URL` eintragen (TODO-Kommentar im Inline-Script).

## 6. Automation „Willkommensstrecke" (Automatisierungen)

- Einstiegspunkt: „Kontakt wird zu Liste hinzugefügt" → Liste **Briefe**.
- Bedingung direkt danach: Kontakt **nicht** in Liste „Schüler" → sonst Ausstieg.
- Schritte: M1 sofort → 2 Tage warten → M2 → 2 Tage warten → M3 → (M4–M12 folgen nach Freigabe, Takt laut `newsletter-willkommensstrecke.md` §6).
- Ausstiegsregel: Abmeldung beendet die Automation. Während die Strecke läuft keine Kampagnen an denselben Kontakt (Kollisionsregel 7.6 im Newsletter-Plan).
- Mail-Texte: `handpan-website-github/Plans/willkommensstrecke-mails-m1-m3.md`.

## 7. Test (vor dem Live-Schalten)

1. Eigene Test-Adresse auf lernen.handpan.schule unter „Dein erster Tag, geschenkt" eintragen → DOI-Mail kommt → Klick landet auf `/tag-1?bestaetigt=1` mit Banner → Kontakt steht in „Briefe" mit `QUELLE=landing` → M1 kommt innerhalb weniger Minuten.
2. Zweite Test-Adresse: Konto mit Checkbox anlegen → Supabase-Bestätigungsmail klicken → Kontakt steht in „Briefe" mit `QUELLE=konto` und `EINWILLIGUNG_AM` → M1 kommt. Ohne Checkbox: kein Brevo-Kontakt.
3. Dritte Test-Adresse in „Schüler" eintragen, dann in „Briefe" → keine Willkommensmail.
4. Abmeldelink in M1 klicken → Kontakt abgemeldet, Automation beendet.
