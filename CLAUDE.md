# rhythm-gym / Handpan Schule des Lebens

Plan: `Plans/phasenplan-schule-des-lebens-v2.md` (freigegeben 2026-09-06, Launch 21.12.2026). Lies ihn vor jeder Bau-Session; §7 sagt, welche KW dran ist, §9 listet Nils' offene Entscheidungen.

## Modell-Routing (Nils' Vorgabe, automatisch anwenden)

Hauptsession für Bau-Sessions ist **Opus** (Nils schaltet selbst um). Beim Delegieren immer den `model`-Parameter setzen:

| Arbeit | `model` | Agent |
|---|---|---|
| Architektur, Datenmodell, RLS/Webhook-Design, Sicherheits-Review, Launch-Review | `fable` | Architect / Engineer (read-only bei Reviews) |
| Feature-Implementierung, Root-Cause-Bugfixes | `opus` | Engineer |
| Codebase-Suche, Inventar, Beta-Triage, Übersetzungs-Review-Vorschläge | `sonnet` | Explore / general-purpose |
| String-Extraktion, Migrations-Boilerplate, Erstübersetzung, Copy-Fixes | `haiku` | general-purpose oder `bun ~/.claude/PAI/TOOLS/Inference.ts fast` |

Cato/Forge/Anvil nicht verwenden (kein `codex`, keine Moonshot-Creds) — Zweitleser ist ein zweiter `opus`-Engineer.

## Regeln

- Entitlement = `enrollments`; einziger User-Schreibweg `redeem_access_code()`. Neue Kaufwege erzeugen Enrollments über SECURITY-DEFINER-Funktionen, nie clientseitig.
- Zugriffslogik nur in `app/lib/course-access.ts` (Kurse) und dem geplanten `hasEventAccess` (Termine) — keine Parallelprüfungen in Routen.
- Marke ist eine Theme-Schicht (`data-brand` aus dem Host), keine zweite App; rhythmgym.io wird nie umgeleitet.
- Deutsch bleibt präfixfrei; bestehende URLs dürfen durch i18n nicht brechen.
- Mobile-Verifikation 390×844 mit Interceptor vor jedem Push (siehe globale CLAUDE.md).
- Migrationen additiv unter `supabase/migrations/`, Supabase-Free-Tier vor DB-Ops mit einem MCP-Read wecken, danach `get_advisors`.
