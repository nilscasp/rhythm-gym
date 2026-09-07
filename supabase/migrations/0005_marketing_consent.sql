-- ─────────────────────────────────────────────────────────────────────────────
-- 0005 · Marketing-Einwilligung — Protokoll im Profil
-- (Plans/plan-uebergang-lernplattform-leadmagnet.md §3, „Rechtliches")
--
-- Wer bei der Registrierung die Checkbox „Briefe aus der Schule" setzt, muss
-- nachweisbar Ja gesagt haben: WANN (marketing_consent_at) und ZU WELCHEM TEXT
-- (marketing_consent_text_version, siehe app/lib/consent.ts). Beides reist als
-- raw_user_meta_data durch den Signup und wird beim Anlegen des Profils
-- übernommen — der Client schreibt die Spalten nie selbst.
--
-- brevo_synced_at macht den Brevo-Upsert idempotent: der Sync in
-- app/auth/callback/route.ts läuft genau einmal, nach der Mailbestätigung.
-- Nutzer dürfen ihr eigenes Profil aktualisieren (Policy profiles_update_own),
-- deshalb braucht es dafür keine zusätzliche Funktion.
--
-- Additiv, if not exists — kein Backfill, bestehende Profile bleiben NULL
-- (= keine Einwilligung, keine Briefe).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists marketing_consent_at timestamptz,
  add column if not exists marketing_consent_text_version text,
  add column if not exists brevo_synced_at timestamptz;

comment on column public.profiles.marketing_consent_at is
  'Zeitpunkt der Einwilligung in die „Briefe aus der Schule". NULL = keine Einwilligung.';
comment on column public.profiles.marketing_consent_text_version is
  'Version des Einwilligungstexts (CONSENT_TEXT_VERSION in app/lib/consent.ts).';
comment on column public.profiles.brevo_synced_at is
  'Zeitpunkt des erfolgreichen Brevo-Upserts. NULL = noch nicht übertragen.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Profil-Anlage aus auth.users — Live-Definition vom 2026-09-07
-- (pg_get_functiondef) plus die zwei Consent-Spalten. Sonst unverändert:
-- SECURITY DEFINER, search_path public + pg_catalog, nullif auf full_name,
-- on conflict do nothing. Der Trigger on_auth_user_created zeigt auf die
-- Funktion und bleibt bestehen.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    marketing_consent_at,
    marketing_consent_text_version
  )
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data->>'full_name', ''),
    -- Null-sicher: fehlender oder leerer Wert bleibt NULL statt zu werfen.
    nullif(new.raw_user_meta_data->>'marketing_consent_at', '')::timestamptz,
    nullif(new.raw_user_meta_data->>'marketing_consent_text_version', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;
