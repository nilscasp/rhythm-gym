-- ─────────────────────────────────────────────────────────────────────────────
-- 0007 · Kaufweg (Phasenplan v2 §5, KW41–42)
--
-- Bisher gibt es genau einen Weg in einen Kurs: einen Zugangs-Code einlösen
-- (redeem_access_code, SECURITY DEFINER). Verkauft wird aber über Stripe
-- Payment-Links auf handpan.schule — dazwischen sitzt heute Handarbeit.
--
-- Diese Migration schließt die Lücke, ohne das Entitlement anzufassen:
-- `enrollments` bleibt die einzige Wahrheit, und niemand schreibt clientseitig
-- hinein. Neu sind drei Dinge:
--
-- 1) `stripe_events` — jedes verarbeitete Stripe-Ereignis genau einmal.
--    Stripe stellt mehrfach zu; ohne diese Tabelle bekäme jemand bei einer
--    Wiederholung ein zweites Enrollment oder ein zurückgesetztes Startdatum.
--
-- 2) `pending_enrollments` — wer kauft, hat oft noch kein Konto. Der Kauf
--    wartet dann unter der E-Mail-Adresse, bis dieselbe Adresse bestätigt
--    ist. Kein Konto anlegen im Namen von jemandem, kein Magic-Link-Versand
--    aus dem Webhook heraus.
--
-- 3) Zwei Funktionen als einzige Schreibwege:
--    · grant_enrollment_by_email() — nur für service_role (der Webhook)
--    · claim_pending_enrollments() — für den frisch bestätigten Nutzer selbst
--
-- Beide sind SECURITY DEFINER. Die Rechte werden ausdrücklich entzogen und
-- nur der jeweils vorgesehenen Rolle gegeben; ein Aufruf mit dem öffentlichen
-- Schlüssel läuft ins Leere.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1 · Ereignisse nur einmal verarbeiten ────────────────────────────────────
create table if not exists public.stripe_events (
  event_id     text primary key,
  type         text not null,
  received_at  timestamptz not null default now(),
  payload_note text
);

alter table public.stripe_events enable row level security;
-- Keine Policy für anon/authenticated: niemand außer service_role sieht das.
revoke all on public.stripe_events from anon, authenticated;

-- ── 2 · Käufe, die auf ihr Konto warten ──────────────────────────────────────
create table if not exists public.pending_enrollments (
  id                uuid primary key default gen_random_uuid(),
  -- Kleingeschrieben und getrimmt gespeichert, damit der Abgleich mit der
  -- Anmeldeadresse nicht an Groß-/Kleinschreibung scheitert.
  email             text not null,
  program_id        uuid not null references public.programs(id) on delete cascade,
  drip_start_date   date,
  stripe_session_id text unique,
  created_at        timestamptz not null default now(),
  claimed_at        timestamptz,
  claimed_by        uuid references auth.users(id) on delete set null
);

create index if not exists pending_enrollments_email_idx
  on public.pending_enrollments (email) where claimed_at is null;

alter table public.pending_enrollments enable row level security;
revoke all on public.pending_enrollments from anon, authenticated;

comment on table public.pending_enrollments is
  'Käufe ohne Konto. Werden von claim_pending_enrollments() eingelöst, sobald dieselbe Adresse bestätigt ist.';

-- ── 3a · Der Weg vom Kauf ins Enrollment ─────────────────────────────────────
-- Wird ausschließlich vom Stripe-Webhook gerufen (service_role). Legt entweder
-- sofort ein Enrollment an oder parkt den Kauf unter der Adresse.
create or replace function public.grant_enrollment_by_email(
  p_email        text,
  p_program_slug text,
  p_drip_start   date default null,
  p_session_id   text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_email   text := lower(trim(p_email));
  v_program uuid;
  v_user    uuid;
begin
  if v_email is null or v_email = '' then
    return jsonb_build_object('ok', false, 'error', 'missing_email');
  end if;

  select id into v_program from programs where slug = p_program_slug;
  if v_program is null then
    return jsonb_build_object('ok', false, 'error', 'unknown_program');
  end if;

  select id into v_user from profiles where lower(email) = v_email;

  if v_user is not null then
    -- Bereits eingeschrieben? Dann nichts anfassen — ein zweiter Kauf darf ein
    -- laufendes drip_start_date nicht zurücksetzen (dieselbe Regel wie in
    -- redeem_access_code).
    if exists (select 1 from enrollments where user_id = v_user and program_id = v_program) then
      return jsonb_build_object('ok', true, 'already_enrolled', true);
    end if;

    insert into enrollments (user_id, program_id, drip_start_date, status, started_at)
    values (v_user, v_program, p_drip_start, 'active', now());

    return jsonb_build_object('ok', true, 'enrolled', true);
  end if;

  -- Kein Konto: Kauf parken. stripe_session_id ist eindeutig, ein erneut
  -- zugestelltes Ereignis legt also keinen zweiten Eintrag an.
  insert into pending_enrollments (email, program_id, drip_start_date, stripe_session_id)
  values (v_email, v_program, p_drip_start, p_session_id)
  on conflict (stripe_session_id) do nothing;

  return jsonb_build_object('ok', true, 'pending', true);
end;
$function$;

revoke execute on function public.grant_enrollment_by_email(text, text, date, text) from public, anon, authenticated;
grant execute on function public.grant_enrollment_by_email(text, text, date, text) to service_role;

-- ── 3b · Der Kauf holt sein Konto ein ────────────────────────────────────────
-- Läuft nach der Mailbestätigung für den angemeldeten Nutzer. Nimmt nur
-- Einträge, die auf SEINE bestätigte Adresse lauten.
create or replace function public.claim_pending_enrollments()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog', 'auth'
as $function$
declare
  v_user    uuid := auth.uid();
  v_email   text;
  v_claimed integer := 0;
  rec       record;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  -- Die Adresse kommt aus auth.users, nicht aus einem Formular — und nur, wenn
  -- sie bestätigt ist. Sonst könnte jemand mit einer fremden, unbestätigten
  -- Adresse einen fremden Kauf einsammeln.
  select lower(trim(email)) into v_email
    from auth.users
   where id = v_user and email_confirmed_at is not null;

  if v_email is null then
    return jsonb_build_object('ok', true, 'claimed', 0, 'note', 'email_unconfirmed');
  end if;

  for rec in
    select * from pending_enrollments
     where email = v_email and claimed_at is null
     for update
  loop
    if not exists (
      select 1 from enrollments
       where user_id = v_user and program_id = rec.program_id
    ) then
      insert into enrollments (user_id, program_id, drip_start_date, status, started_at)
      values (v_user, rec.program_id, rec.drip_start_date, 'active', now());
      v_claimed := v_claimed + 1;
    end if;

    update pending_enrollments
       set claimed_at = now(), claimed_by = v_user
     where id = rec.id;
  end loop;

  return jsonb_build_object('ok', true, 'claimed', v_claimed);
end;
$function$;

revoke execute on function public.claim_pending_enrollments() from public, anon;
grant execute on function public.claim_pending_enrollments() to authenticated, service_role;

-- ── 4 · Abo-Stand am Profil ──────────────────────────────────────────────────
-- Der Innere Kreis ist ein Abo. Der Webhook setzt hierüber `plan` und merkt
-- sich die Stripe-Kundennummer, damit spätere Ereignisse ohne E-Mail zuordenbar
-- bleiben. Nur service_role.
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
     set plan = case when p_active then 'premium' else 'free' end
   where id = v_user;

  return jsonb_build_object('ok', true, 'plan', case when p_active then 'premium' else 'free' end);
end;
$function$;

revoke execute on function public.set_membership_by_customer(text, text, boolean) from public, anon, authenticated;
grant execute on function public.set_membership_by_customer(text, text, boolean) to service_role;
