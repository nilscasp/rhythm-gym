-- ─────────────────────────────────────────────────────────────────────────────
-- 0012 · Abo und Kurse in der App kaufen (Umzug von Skool, Abschnitt F)
--
-- Plan: Plans/umzug-von-skool.md, Produkte: docs/stripe-produkte.md.
-- Additiv. Keine bestehende Funktion wird verändert; set_membership_by_customer
-- (0007/0009) bleibt, wie sie ist, wird vom neuen Webhook aber nicht mehr
-- gerufen.
--
-- Warum eine neue Funktion statt 0009 anzupassen: 0009 sagt „VIP wird von Hand
-- vergeben, der Webhook lässt es in Ruhe“. Ab jetzt kann VIP auch über Stripe
-- gekauft werden — und muss dann mit dem Abo auch wieder enden. Die Grenze
-- verläuft nicht mehr zwischen den Stufen, sondern zwischen den QUELLEN:
--
--   profiles.plan_source = 'stripe'  → der Webhook setzt die Stufe tier-genau
--   profiles.plan_source = 'manual'  → Nils hat von Hand gesetzt (Raten per
--                                       Überweisung, Übergänge); der Webhook
--                                       fasst die Stufe nicht an
--   profiles.plan_source = null      → noch nie gesetzt (Default)
--
-- Inhalt:
--   1) profiles.plan_source
--   2) enrollments.status kennt 'refunded'
--   3) course_purchases: welcher Kauf (PaymentIntent) zu welchem Kurs gehört —
--      ohne diese Zuordnung kann charge.refunded keinen Kurs finden
--   4) link_stripe_customer()     — Kunde ↔ Profil (service_role)
--   5) set_plan_by_customer()     — Stufe tier-genau, manual-Schutz (service_role)
--   6) record_course_purchase()   — Kauf merken (service_role)
--   7) refund_course_purchase()   — Rückerstattung → Enrollment 'refunded' (service_role)
--   8) admin_set_plan() / admin_release_plan() — Coach-Sicht /coach/mitglieder
--
-- Bestandsregel aus 0009 bleibt bestehen: `plan`, `plan_source`,
-- `stripe_customer_id`, `is_admin` und `email` sind nicht selbst schreibbar
-- (das Spalten-UPDATE-Privileg nennt sie nicht; neue Spalten sind damit
-- automatisch geschützt).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1 · Quelle der Stufe ─────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists plan_source text;

alter table public.profiles drop constraint if exists profiles_plan_source_check;
alter table public.profiles add constraint profiles_plan_source_check
  check (plan_source is null or plan_source in ('stripe', 'manual'));

comment on column public.profiles.plan_source is
  'Woher `plan` kommt: stripe (Webhook, tier-genau) · manual (Nils von Hand, Webhook lässt es in Ruhe) · null (nie gesetzt)';

comment on column public.profiles.plan is
  'free · premium · vip. Gesetzt vom Webhook (set_plan_by_customer, plan_source=stripe) oder von Hand (admin_set_plan, plan_source=manual).';

-- Bestand: wer heute schon VIP ist, hat es von Hand bekommen (0009). Damit der
-- neue Webhook diese Menschen nicht beim ersten Ereignis herunterstuft, gilt
-- ihre Stufe als manuell.
update public.profiles
   set plan_source = 'manual'
 where plan = 'vip' and plan_source is null;

-- Ein Kunde gehört genau einem Profil. Teilindex, weil die meisten null sind.
create unique index if not exists profiles_stripe_customer_id_key
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

-- ── 2 · Enrollment-Status 'refunded' ─────────────────────────────────────────
-- Die Basistabelle `enrollments` stammt nicht aus diesen Migrationen; ob sie
-- eine CHECK-Regel auf `status` trägt, steht hier nicht fest. Darum
-- vorsichtig: eine vorhandene Regel wird um 'refunded' ERWEITERT (alter
-- Ausdruck OR status = 'refunded'), nicht ersetzt. Ohne Regel passiert nichts.
-- Zugang prüfen weiterhin nur `coalesce(status,'active') = 'active'`
-- (has_program_access, event_zoom_url, course-access.ts) — 'refunded' sperrt
-- also ohne weitere Änderung.

do $$
declare
  rec record;
  v_expr text;
begin
  for rec in
    select c.conname, pg_get_constraintdef(c.oid) as def
      from pg_constraint c
     where c.conrelid = 'public.enrollments'::regclass
       and c.contype = 'c'
       and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    if rec.def ilike '%refunded%' then
      continue;
    end if;
    -- def hat die Form 'CHECK (<ausdruck>)' (ggf. mit NOT VALID dahinter).
    v_expr := regexp_replace(rec.def, '^CHECK\s*', '', 'i');
    v_expr := regexp_replace(v_expr, '\s*NOT VALID\s*$', '', 'i');
    execute format('alter table public.enrollments drop constraint %I', rec.conname);
    execute format(
      'alter table public.enrollments add constraint %I check ((%s) or status = %L)',
      rec.conname, v_expr, 'refunded'
    );
  end loop;
end
$$;

comment on column public.enrollments.status is
  'active (oder null) = Zugang · refunded = Kauf erstattet (Webhook charge.refunded) · andere Werte = kein Zugang';

-- ── 3 · Kurskäufe ────────────────────────────────────────────────────────────

create table if not exists public.course_purchases (
  stripe_session_id        text primary key,
  stripe_payment_intent_id text unique,
  stripe_customer_id       text,
  -- Kleingeschrieben, wie in pending_enrollments.
  email                    text,
  user_id                  uuid references auth.users(id) on delete set null,
  program_id               uuid not null references public.programs(id) on delete cascade,
  created_at               timestamptz not null default now(),
  refunded_at              timestamptz
);

create index if not exists course_purchases_user_idx on public.course_purchases (user_id);

alter table public.course_purchases enable row level security;
revoke all on public.course_purchases from anon, authenticated;

comment on table public.course_purchases is
  'Bezahlte Kurs-Checkouts (Webhook). Brücke von charge.refunded (PaymentIntent) zum Enrollment. Nur service_role.';

alter table public.pending_enrollments
  add column if not exists refunded_at timestamptz;

comment on column public.pending_enrollments.refunded_at is
  'Erstattet, bevor das Konto existierte. claimed_at wird dann ebenfalls gesetzt, damit claim_pending_enrollments() den Kauf nicht mehr einlöst.';

-- ── 4 · Kunde ↔ Profil ───────────────────────────────────────────────────────
-- Gerufen vom Webhook mit der Nutzer-Id aus client_reference_id bzw. den
-- Abo-Metadaten (beides setzt nur unser eigener Checkout für eine angemeldete
-- Person). p_replace: bei Abos darf ein neuer Kunde einen alten ersetzen
-- (z. B. alter Kunde in Stripe gelöscht), bei Kurskäufen nicht.

create or replace function public.link_stripe_customer(
  p_user     uuid,
  p_customer text,
  p_replace  boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_current text;
  v_owner   uuid;
begin
  if p_user is null or coalesce(trim(p_customer), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'missing_argument');
  end if;

  select stripe_customer_id into v_current from profiles where id = p_user for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'unknown_user');
  end if;

  if v_current = p_customer then
    return jsonb_build_object('ok', true, 'linked', false, 'already', true);
  end if;

  -- Gehört der Kunde schon jemand anderem? Dann nicht umhängen.
  select id into v_owner from profiles where stripe_customer_id = p_customer and id <> p_user;
  if v_owner is not null then
    return jsonb_build_object('ok', false, 'error', 'customer_taken');
  end if;

  if v_current is not null and not p_replace then
    return jsonb_build_object('ok', true, 'linked', false, 'kept_existing', true);
  end if;

  update profiles set stripe_customer_id = p_customer where id = p_user;
  return jsonb_build_object('ok', true, 'linked', true, 'replaced', v_current is not null);
end;
$function$;

revoke execute on function public.link_stripe_customer(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.link_stripe_customer(uuid, text, boolean) to service_role;

-- ── 5 · Stufe tier-genau setzen ──────────────────────────────────────────────
-- p_plan ist die Stufe, die ALLE Abos des Kunden zusammen ergeben (der
-- Webhook rechnet das höchste laufende aus, app/lib/stripe-events.ts →
-- planFromSubscriptions). Hier nur noch: Profil finden, manual-Schutz,
-- schreiben. Kein WHERE-Filter für den Schutz: ein Treffer mit 0 Zeilen sähe
-- für den Webhook wie ein Fehler aus (dieselbe Überlegung wie in 0009).

create or replace function public.set_plan_by_customer(
  p_customer text,
  p_plan     text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_user   uuid;
  v_plan   text;
  v_source text;
begin
  if p_plan is null or p_plan not in ('free', 'premium', 'vip') then
    return jsonb_build_object('ok', false, 'error', 'invalid_plan');
  end if;

  select id, plan, plan_source into v_user, v_plan, v_source
    from profiles
   where stripe_customer_id = p_customer
   for update;

  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'unknown_customer');
  end if;

  if v_source = 'manual' then
    return jsonb_build_object('ok', true, 'skipped', 'manual', 'plan', coalesce(v_plan, 'free'));
  end if;

  update profiles
     set plan = p_plan,
         plan_source = 'stripe'
   where id = v_user;

  return jsonb_build_object(
    'ok', true,
    'plan', p_plan,
    'previous', coalesce(v_plan, 'free')
  );
end;
$function$;

revoke execute on function public.set_plan_by_customer(text, text) from public, anon, authenticated;
grant execute on function public.set_plan_by_customer(text, text) to service_role;

-- ── 6 · Kurskauf merken ──────────────────────────────────────────────────────
-- Läuft NACH grant_enrollment_by_email (0007, unverändert). Merkt sich den
-- PaymentIntent für spätere Rückerstattungen. Ein erneuter Kauf nach einer
-- Erstattung macht ein 'refunded'-Enrollment wieder aktiv (grant_enrollment_
-- by_email lässt bestehende Zeilen bewusst in Ruhe).

create or replace function public.record_course_purchase(
  p_session_id     text,
  p_payment_intent text,
  p_customer       text,
  p_email          text,
  p_program_slug   text,
  p_user           uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_program uuid;
  v_email   text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_user    uuid;
  v_reactivated integer := 0;
begin
  if coalesce(trim(p_session_id), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'missing_session');
  end if;

  select id into v_program from programs where slug = p_program_slug;
  if v_program is null then
    return jsonb_build_object('ok', false, 'error', 'unknown_program');
  end if;

  -- Nutzer: die übergebene Id nur, wenn es das Profil gibt; sonst über die Adresse.
  if p_user is not null then
    select id into v_user from profiles where id = p_user;
  end if;
  if v_user is null and v_email is not null then
    select id into v_user from profiles where lower(email) = v_email;
  end if;

  insert into course_purchases (
    stripe_session_id, stripe_payment_intent_id, stripe_customer_id, email, user_id, program_id
  )
  values (
    p_session_id, nullif(trim(coalesce(p_payment_intent, '')), ''), nullif(trim(coalesce(p_customer, '')), ''),
    v_email, v_user, v_program
  )
  on conflict (stripe_session_id) do nothing;

  if v_user is not null then
    update enrollments
       set status = 'active'
     where user_id = v_user
       and program_id = v_program
       and status = 'refunded';
    get diagnostics v_reactivated = row_count;
  end if;

  return jsonb_build_object('ok', true, 'user_known', v_user is not null, 'reactivated', v_reactivated > 0);
end;
$function$;

revoke execute on function public.record_course_purchase(text, text, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.record_course_purchase(text, text, text, text, text, uuid) to service_role;

-- ── 7 · Rückerstattung ───────────────────────────────────────────────────────
-- Nur volle Erstattungen kommen hier an (der Webhook prüft das). Der Kauf wird
-- über den PaymentIntent gefunden; Käufe aus der Zeit vor 0012 sind nicht
-- verzeichnet → 'unknown_purchase', Nils sperrt dann von Hand.

create or replace function public.refund_course_purchase(p_payment_intent text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  rec       course_purchases%rowtype;
  v_user    uuid;
  v_enr     integer := 0;
  v_pending integer := 0;
begin
  select * into rec from course_purchases where stripe_payment_intent_id = p_payment_intent for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'unknown_purchase');
  end if;

  if rec.refunded_at is not null then
    return jsonb_build_object('ok', true, 'already_refunded', true);
  end if;

  v_user := rec.user_id;
  if v_user is null and rec.email is not null then
    select id into v_user from profiles where lower(email) = rec.email;
  end if;

  if v_user is not null then
    update enrollments
       set status = 'refunded'
     where user_id = v_user
       and program_id = rec.program_id
       and coalesce(status, 'active') <> 'refunded';
    get diagnostics v_enr = row_count;
  end if;

  -- Noch nicht eingelöst? Dann bleibt es dabei.
  update pending_enrollments
     set refunded_at = now(),
         claimed_at  = coalesce(claimed_at, now())
   where stripe_session_id = rec.stripe_session_id
     and refunded_at is null;
  get diagnostics v_pending = row_count;

  update course_purchases set refunded_at = now() where stripe_session_id = rec.stripe_session_id;

  return jsonb_build_object('ok', true, 'enrollments', v_enr, 'pending', v_pending);
end;
$function$;

revoke execute on function public.refund_course_purchase(text) from public, anon, authenticated;
grant execute on function public.refund_course_purchase(text) to service_role;

-- ── 8 · Coach: Stufe von Hand ────────────────────────────────────────────────
-- Für Raten per Überweisung und Übergänge. Läuft als `authenticated`, prüft
-- selbst, ob der Aufrufer Admin ist (is_admin_user, wie in 0010). Setzt
-- plan_source = 'manual' — ab da lässt der Webhook die Stufe in Ruhe, auch
-- wenn später ein Stripe-Abo dazukommt oder endet.

create or replace function public.admin_set_plan(p_email text, p_plan text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_user  uuid;
  v_count integer;
begin
  if not public.is_admin_user(auth.uid()) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if p_plan is null or p_plan not in ('free', 'premium', 'vip') then
    return jsonb_build_object('ok', false, 'error', 'invalid_plan');
  end if;

  if v_email = '' then
    return jsonb_build_object('ok', false, 'error', 'missing_email');
  end if;

  select count(*) into v_count from profiles where lower(email) = v_email;
  if v_count = 0 then
    return jsonb_build_object('ok', false, 'error', 'unknown_email');
  end if;
  if v_count > 1 then
    return jsonb_build_object('ok', false, 'error', 'ambiguous_email');
  end if;

  update profiles
     set plan = p_plan,
         plan_source = 'manual'
   where lower(email) = v_email
   returning id into v_user;

  return jsonb_build_object('ok', true, 'plan', p_plan, 'plan_source', 'manual');
end;
$function$;

revoke execute on function public.admin_set_plan(text, text) from public, anon;
grant execute on function public.admin_set_plan(text, text) to authenticated;

-- Gegenstück: die Stufe wieder Stripe überlassen. Ändert `plan` nicht — die
-- nächste Abo-Meldung von Stripe setzt sie dann.
create or replace function public.admin_release_plan(p_email text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_count integer;
begin
  if not public.is_admin_user(auth.uid()) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select count(*) into v_count from profiles where lower(email) = v_email;
  if v_count <> 1 then
    return jsonb_build_object('ok', false, 'error', case when v_count = 0 then 'unknown_email' else 'ambiguous_email' end);
  end if;

  update profiles
     set plan_source = case when stripe_customer_id is not null then 'stripe' else null end
   where lower(email) = v_email;

  return jsonb_build_object('ok', true);
end;
$function$;

revoke execute on function public.admin_release_plan(text) from public, anon;
grant execute on function public.admin_release_plan(text) to authenticated;
