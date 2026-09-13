-- ─────────────────────────────────────────────────────────────────────────────
-- 0009 · VIP-Stufe (2026-09-13)
--
-- Skool kennt drei Stufen: Standard < Premium < VIP. Die App kannte zwei
-- (`plan` free|premium, Sichtbarkeit public|members|premium|program). Das
-- VIP-Treffen am 24.9. braucht eine Tür, die nur VIP-Mitglieder öffnen.
--
-- Drei Dinge passieren hier, alle additiv:
--
-- 1) `vip` als dritter `plan`-Wert und als fünfte Sichtbarkeit. Hierarchisch:
--    VIP kommt durch jede Premium-Tür, Premium nicht durch die VIP-Tür.
--    Dieselbe Rangfolge steht in app/lib/event-access.ts — beide Stellen
--    ändern sich nur zusammen.
--
-- 2) Der Stripe-Webhook (`set_membership_by_customer`) schrieb bisher blind
--    premium/free. Ein VIP mit auslaufendem Premium-Abo wäre still auf free
--    gefallen. VIP wird von Hand vergeben und vom Webhook nie berührt.
--
-- 3) Ein Fund beim Prüfen: `profiles_update_own` erlaubte jedem Konto, die
--    eigene Zeile OHNE Spaltenbeschränkung zu ändern — also auch `plan` und
--    `is_admin`. Das Spalten-Privileg wird entzogen. Die App schreibt diese
--    Spalten nirgends clientseitig; der Webhook läuft über SECURITY DEFINER
--    mit service_role, der Signup-Trigger als Eigentümer.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1 · Werte ────────────────────────────────────────────────────────────────

alter table public.events drop constraint if exists events_visibility_check;
alter table public.events add constraint events_visibility_check
  check (visibility in ('public','members','premium','vip','program'));

comment on column public.events.visibility is
  'public = für alle · members = eingeloggt · premium = Innerer Kreis (auch VIP) · vip = nur VIP-Mitglieder · program = Enrollment im program_id';

-- `plan` war bisher freier Text. Bestand: ausschließlich ''free'' (Default).
alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check
  check (plan is null or plan in ('free','premium','vip'));

comment on column public.profiles.plan is
  'free · premium (Stripe-Abo, Webhook) · vip (von Hand, Webhook lässt es in Ruhe)';

-- ── 2 · Zoom-Tür ─────────────────────────────────────────────────────────────
-- Gleiche Signatur wie in 0006, damit die Grants erhalten bleiben.

create or replace function public.event_zoom_url(p_event_id uuid)
returns text
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_visibility text;
  v_program_id uuid;
  v_zoom       text;
  v_uid        uuid := auth.uid();
  v_plan       text;
begin
  select visibility, program_id, zoom_url
    into v_visibility, v_program_id, v_zoom
    from public.events
   where id = p_event_id;

  if not found or v_zoom is null then
    return null;
  end if;

  -- Öffentliche Termine: Tür für alle offen.
  if v_visibility = 'public' then
    return v_zoom;
  end if;

  -- Alles Weitere setzt eine Anmeldung voraus.
  if v_uid is null then
    return null;
  end if;

  if v_visibility = 'members' then
    return v_zoom;
  end if;

  if v_visibility in ('premium', 'vip') then
    select plan into v_plan from public.profiles where id = v_uid;

    -- VIP steht über Premium: VIP öffnet beide Türen, Premium nur seine.
    if v_plan = 'vip' then
      return v_zoom;
    end if;
    if v_visibility = 'premium' and v_plan = 'premium' then
      return v_zoom;
    end if;
    return null;
  end if;

  if v_visibility = 'program' then
    if v_program_id is null then
      return null;
    end if;
    if exists (
      select 1 from public.enrollments
       where user_id = v_uid
         and program_id = v_program_id
         and coalesce(status, 'active') = 'active'
    ) then
      return v_zoom;
    end if;
    return null;
  end if;

  return null;
end;
$function$;

revoke execute on function public.event_zoom_url(uuid) from public;
grant execute on function public.event_zoom_url(uuid) to anon, authenticated;

-- ── 3 · Webhook lässt VIP in Ruhe ────────────────────────────────────────────
-- Gleiche Signatur wie in 0007. Der Fall wird in der Zuweisung entschieden,
-- nicht per WHERE: eine WHERE-Sperre hätte 0 Zeilen gemeldet und den Webhook
-- bei jedem VIP in eine Wiederholungsschleife geschickt.

create or replace function public.set_membership_by_customer(
  p_customer_id text,
  p_email       text,
  p_active      boolean
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_user  uuid;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_plan  text;
begin
  select id into v_user from profiles where stripe_customer_id = p_customer_id;

  if v_user is null and v_email <> '' then
    select id into v_user from profiles where lower(email) = v_email;
    if v_user is not null then
      update profiles set stripe_customer_id = p_customer_id where id = v_user;
    end if;
  end if;

  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'unknown_customer');
  end if;

  update profiles
     set plan = case
                  when plan = 'vip' then 'vip'
                  when p_active     then 'premium'
                  else 'free'
                end
   where id = v_user
   returning plan into v_plan;

  return jsonb_build_object('ok', true, 'plan', v_plan);
end;
$function$;

revoke execute on function public.set_membership_by_customer(text, text, boolean) from public, anon, authenticated;
grant execute on function public.set_membership_by_customer(text, text, boolean) to service_role;

-- ── 4 · Stufe und Adminrecht sind nicht selbst wählbar ───────────────────────
-- Ein Spalten-REVOKE allein greift nicht, solange das Tabellen-Privileg
-- besteht (Postgres addiert Privilegien). Darum wie in 0006 bei `zoom_url`:
-- Tabellen-Privileg entziehen, erlaubte Spalten einzeln zurückgeben.
-- PostgREST prüft pro Anfrage nur die genannten Spalten: die UPDATEs der App
-- (Einstellungen, Handpans, Brevo-Stempel) nennen keine der drei und laufen
-- unverändert. INSERT macht allein der Signup-Trigger (als Eigentümer).
-- `email` bleibt draußen: die Stripe-Funktionen (set_membership_by_customer,
-- grant_enrollment_by_email) suchen Profile über die E-Mail — wer sie selbst
-- ändern dürfte, könnte sich das Abo eines anderen Kunden zuweisen.

revoke insert, update on public.profiles from anon, authenticated;
grant update (
  full_name, current_level, current_streak, longest_streak,
  last_practice_date, active_handpan_id, marketing_consent_at,
  marketing_consent_text_version, brevo_synced_at
) on public.profiles to authenticated;
