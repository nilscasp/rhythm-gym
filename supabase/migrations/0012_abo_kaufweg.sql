-- ─────────────────────────────────────────────────────────────────────────────
-- 0012 · Abo und Kurse in der App kaufen (Umzug von Skool, Abschnitt F)
--
-- Plan: Plans/umzug-von-skool.md, Produkte: docs/stripe-produkte.md.
-- Additiv. set_membership_by_customer und grant_enrollment_by_email (0007/0009)
-- bleiben, wie sie sind; der neue Webhook ruft sie nicht mehr. Einzige
-- geänderte Funktion: claim_pending_enrollments (gleiche Signatur, merkt sich
-- jetzt, ob es ein Enrollment angelegt hat, und löst erstattete Käufe nicht ein).
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
--   3) course_purchases: welcher Kauf (PaymentIntent) GENAU welches Enrollment
--      freigeschaltet hat — ohne das kann charge.refunded nichts sicher sperren
--   4) link_stripe_customer()     — Kunde ↔ Profil (service_role; der Webhook
--                                   ruft es nur für nachweislich eigene Checkouts)
--   5) set_plan_by_customer()     — Stufe tier-genau, manual-Schutz (service_role)
--   6) grant_course_purchase()    — Kurs freischalten + Beleg (service_role)
--      claim_pending_enrollments() neu definiert (merkt sich, was es anlegt)
--   7) refund_course_purchase()   — Erstattung sperrt nur das Enrollment, das
--                                   dieser Kauf angelegt hat (service_role)
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
-- Jeder bezahlte Kurs-Checkout bekommt eine Zeile, und zwar mit GENAU dem
-- Enrollment (oder geparkten Kauf), das er freigeschaltet hat. Nur darüber
-- findet eine Erstattung später ihr Ziel — nie über die E-Mail-Adresse, sonst
-- träfe sie auch ein Enrollment aus einem Zugangscode oder einem früheren Kauf.

create table if not exists public.course_purchases (
  stripe_session_id        text primary key,
  stripe_payment_intent_id text unique,
  stripe_customer_id       text,
  -- Kleingeschrieben, wie in pending_enrollments. Nur zur Nachvollziehbarkeit.
  email                    text,
  user_id                  uuid references auth.users(id) on delete set null,
  program_id               uuid not null references public.programs(id) on delete cascade,
  -- Was dieser Kauf freigeschaltet hat. `enrollments` hat keine eigene Id
  -- (Schlüssel: Nutzer + Programm); darum der Anker aus Nutzer und dem
  -- started_at der Zeile. Wird das Enrollment gelöscht und später neu angelegt
  -- (z. B. per Code), passt started_at nicht mehr — die Erstattung trifft es
  -- dann nicht.
  enrolled_user_id         uuid,
  enrollment_started_at    timestamptz,
  -- true nur, wenn DIESER Kauf das Enrollment angelegt oder ein erstattetes
  -- wieder geöffnet hat. false = es bestand schon (Code, früherer Kauf).
  created_enrollment       boolean not null default false,
  pending_enrollment_id    uuid references public.pending_enrollments(id) on delete set null,
  created_at               timestamptz not null default now(),
  refunded_at              timestamptz
);

create index if not exists course_purchases_user_idx on public.course_purchases (user_id);

alter table public.course_purchases enable row level security;
revoke all on public.course_purchases from anon, authenticated;

comment on table public.course_purchases is
  'Bezahlte Kurs-Checkouts (Webhook, grant_course_purchase). Brücke von charge.refunded (PaymentIntent) zum konkreten Enrollment. Nur service_role.';

alter table public.pending_enrollments
  add column if not exists refunded_at timestamptz;
alter table public.pending_enrollments
  add column if not exists created_enrollment boolean not null default false;
alter table public.pending_enrollments
  add column if not exists enrollment_started_at timestamptz;

comment on column public.pending_enrollments.refunded_at is
  'Erstattet, bevor das Konto existierte. claimed_at wird dann ebenfalls gesetzt, damit claim_pending_enrollments() den Kauf nicht mehr einlöst.';
comment on column public.pending_enrollments.created_enrollment is
  'true = claim_pending_enrollments() hat aus diesem Kauf ein Enrollment ANGELEGT (für claimed_by, started_at = enrollment_started_at). false = beim Einlösen bestand schon eines; es gehört nicht zu diesem Kauf.';

-- ── 4 · Kunde ↔ Profil ───────────────────────────────────────────────────────
-- Gerufen vom Webhook NUR für Checkout-Sessions, die nachweislich aus unserem
-- eigenen Checkout stammen (kein Payment Link, metadata.platform = 'lernen',
-- metadata.user_id = client_reference_id; trustedCheckoutUserId in
-- app/lib/stripe-events.ts). client_reference_id allein reicht nie: Payment
-- Links nehmen ihn aus der URL. Abo-Ereignisse verknüpfen gar nicht.
-- p_replace = true nur beim nachgewiesenen eigenen Abo-Checkout, bei
-- Kurskäufen nie.

create or replace function public.link_stripe_customer(
  p_user     uuid,
  p_customer text,
  p_replace  boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
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
set search_path to 'pg_catalog', 'public'
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

-- ── 6 · Kurskauf freischalten und merken ────────────────────────────────────
-- Ersetzt für Käufe ab 0012 den Aufruf von grant_enrollment_by_email (die
-- Funktion bleibt unverändert bestehen). Gleiche Regeln wie dort — bestehendes
-- Enrollment nicht anfassen, ohne Konto parken —, aber in EINER Transaktion
-- mit dem Kaufbeleg, damit feststeht, welches Enrollment zu welchem Kauf
-- gehört und ob dieser Kauf es angelegt hat.
--
-- p_user ist nur gesetzt, wenn der Webhook die Session als unseren eigenen
-- Checkout erkannt hat (trustedCheckoutUserId in app/lib/stripe-events.ts).
-- Sonst wird wie bei Payment Links über die E-Mail-Adresse zugeordnet.
--
-- Idempotent über stripe_session_id: eine zweite Zustellung ändert nichts.

create or replace function public.grant_course_purchase(
  p_session_id     text,
  p_payment_intent text,
  p_customer       text,
  p_email          text,
  p_program_slug   text,
  p_drip_start     date default null,
  p_user           uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_program  uuid;
  v_email    text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_user     uuid;
  v_found    boolean := false;
  v_status   text;
  v_started  timestamptz;
  v_created  boolean := false;
  v_pending  uuid;
  v_outcome  text;
begin
  if coalesce(trim(p_session_id), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'missing_session');
  end if;

  select id into v_program from programs where slug = p_program_slug;
  if v_program is null then
    return jsonb_build_object('ok', false, 'error', 'unknown_program');
  end if;

  -- Schon verarbeitet? Dann nichts tun.
  if exists (select 1 from course_purchases where stripe_session_id = p_session_id) then
    return jsonb_build_object('ok', true, 'outcome', 'duplicate');
  end if;

  if p_user is not null then
    select id into v_user from profiles where id = p_user;
  end if;
  if v_user is null and v_email is not null then
    select id into v_user from profiles where lower(email) = v_email;
  end if;

  if v_user is null and v_email is null then
    return jsonb_build_object('ok', false, 'error', 'missing_email');
  end if;

  if v_user is not null then
    select true, status, started_at into v_found, v_status, v_started
      from enrollments
     where user_id = v_user and program_id = v_program
     for update;

    if not coalesce(v_found, false) then
      v_started := now();
      insert into enrollments (user_id, program_id, drip_start_date, status, started_at)
      values (v_user, v_program, p_drip_start, 'active', v_started);
      v_created := true;
      v_outcome := 'enrolled';
    elsif v_status = 'refunded' then
      -- Früher erstattet, jetzt neu gekauft: dieser Kauf öffnet es wieder
      -- und darf es bei einer erneuten Erstattung auch wieder schließen.
      update enrollments set status = 'active'
       where user_id = v_user and program_id = v_program;
      v_created := true;
      v_outcome := 'reactivated';
    else
      -- Besteht schon (Zugangscode, früherer Kauf): nicht anfassen und nicht
      -- als „durch diesen Kauf entstanden“ markieren.
      v_outcome := 'already_enrolled';
    end if;
  else
    insert into pending_enrollments (email, program_id, drip_start_date, stripe_session_id)
    values (v_email, v_program, p_drip_start, p_session_id)
    on conflict (stripe_session_id) do nothing
    returning id into v_pending;
    if v_pending is null then
      select id into v_pending from pending_enrollments where stripe_session_id = p_session_id;
    end if;
    v_outcome := 'pending';
  end if;

  insert into course_purchases (
    stripe_session_id, stripe_payment_intent_id, stripe_customer_id, email, user_id, program_id,
    enrolled_user_id, enrollment_started_at, created_enrollment, pending_enrollment_id
  )
  values (
    p_session_id,
    nullif(trim(coalesce(p_payment_intent, '')), ''),
    nullif(trim(coalesce(p_customer, '')), ''),
    v_email, v_user, v_program,
    v_user, v_started, v_created, v_pending
  )
  on conflict (stripe_session_id) do nothing;

  return jsonb_build_object('ok', true, 'outcome', v_outcome, 'user_known', v_user is not null);
end;
$function$;

revoke execute on function public.grant_course_purchase(text, text, text, text, text, date, uuid) from public, anon, authenticated;
grant execute on function public.grant_course_purchase(text, text, text, text, text, date, uuid) to service_role;

-- ── 6b · Einlösen merkt sich, was es angelegt hat ────────────────────────────
-- Gleiche Signatur und Regeln wie in 0007. Neu: Legt das Einlösen ein
-- Enrollment an, steht am geparkten Kauf created_enrollment = true und das
-- started_at der neuen Zeile. Bestand schon eines, bleibt es false — eine
-- spätere Erstattung darf es dann nicht sperren. Erstattete Käufe
-- (refunded_at) werden nicht eingelöst.

create or replace function public.claim_pending_enrollments()
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth'
as $function$
declare
  v_user    uuid := auth.uid();
  v_email   text;
  v_claimed integer := 0;
  v_started timestamptz;
  rec       record;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  -- Die Adresse kommt aus auth.users, nicht aus einem Formular — und nur, wenn
  -- sie bestätigt ist.
  select lower(trim(email)) into v_email
    from auth.users
   where id = v_user and email_confirmed_at is not null;

  if v_email is null then
    return jsonb_build_object('ok', true, 'claimed', 0, 'note', 'email_unconfirmed');
  end if;

  for rec in
    select * from pending_enrollments
     where email = v_email and claimed_at is null and refunded_at is null
     for update
  loop
    v_started := null;
    if not exists (
      select 1 from enrollments
       where user_id = v_user and program_id = rec.program_id
    ) then
      v_started := now();
      insert into enrollments (user_id, program_id, drip_start_date, status, started_at)
      values (v_user, rec.program_id, rec.drip_start_date, 'active', v_started);
      v_claimed := v_claimed + 1;
    end if;

    update pending_enrollments
       set claimed_at = now(),
           claimed_by = v_user,
           created_enrollment = v_started is not null,
           enrollment_started_at = v_started
     where id = rec.id;
  end loop;

  return jsonb_build_object('ok', true, 'claimed', v_claimed);
end;
$function$;

revoke execute on function public.claim_pending_enrollments() from public, anon;
grant execute on function public.claim_pending_enrollments() to authenticated, service_role;

-- ── 7 · Rückerstattung ───────────────────────────────────────────────────────
-- Nur volle Erstattungen kommen hier an (der Webhook prüft das). Gesperrt wird
-- höchstens GENAU das Enrollment, das dieser Kauf angelegt hat (Nutzer +
-- Programm + started_at) — keine Suche über die E-Mail-Adresse. Bestand das
-- Enrollment schon vorher, wird nur der Kauf als erstattet markiert
-- ('preexisting_enrollment'); der Webhook meldet das laut, Nils entscheidet.
-- Spiegel: decideRefund() in app/lib/stripe-events.ts.
-- Käufe aus der Zeit vor 0012 sind nicht verzeichnet → 'unknown_purchase'.

create or replace function public.refund_course_purchase(p_payment_intent text)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  rec        course_purchases%rowtype;
  v_pend     pending_enrollments%rowtype;
  v_user     uuid;
  v_started  timestamptz;
  v_action   text;
  v_count    integer := 0;
begin
  select * into rec from course_purchases where stripe_payment_intent_id = p_payment_intent for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'unknown_purchase');
  end if;

  if rec.refunded_at is not null then
    return jsonb_build_object('ok', true, 'action', 'already_refunded');
  end if;

  if rec.enrolled_user_id is not null then
    if rec.created_enrollment then
      v_user := rec.enrolled_user_id;
      v_started := rec.enrollment_started_at;
      v_action := 'revoke_enrollment';
    else
      v_action := 'preexisting_enrollment';
    end if;
  elsif rec.pending_enrollment_id is not null then
    select * into v_pend from pending_enrollments where id = rec.pending_enrollment_id for update;
    if found and v_pend.claimed_at is null then
      update pending_enrollments
         set refunded_at = now(), claimed_at = now()
       where id = v_pend.id;
      v_action := 'close_pending';
    elsif found and v_pend.created_enrollment and v_pend.claimed_by is not null then
      v_user := v_pend.claimed_by;
      v_started := v_pend.enrollment_started_at;
      v_action := 'revoke_enrollment';
      update pending_enrollments set refunded_at = now() where id = v_pend.id;
    else
      v_action := 'preexisting_enrollment';
    end if;
  else
    v_action := 'nothing_granted';
  end if;

  if v_user is not null then
    update enrollments
       set status = 'refunded'
     where user_id = v_user
       and program_id = rec.program_id
       and started_at is not distinct from v_started
       and coalesce(status, 'active') <> 'refunded';
    get diagnostics v_count = row_count;
    -- Passt started_at nicht mehr (Zeile inzwischen neu angelegt), wird nichts
    -- gesperrt. Das meldet die Antwort, damit der Webhook es laut loggt.
    if v_count = 0 then
      v_action := 'enrollment_changed';
    end if;
  end if;

  update course_purchases set refunded_at = now() where stripe_session_id = rec.stripe_session_id;

  return jsonb_build_object('ok', true, 'action', v_action, 'enrollments', v_count);
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
set search_path to 'pg_catalog', 'public'
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

-- Gegenstück: die Stufe wieder Stripe überlassen.
--   · Mit Stripe-Kunde: plan_source = 'stripe', `plan` bleibt, bis Stripe das
--     nächste Ereignis meldet (der Coach-Bildschirm sagt das so).
--   · Ohne Stripe-Kunde: es gibt nichts, wonach sich die Stufe richten könnte
--     → plan = 'free', plan_source = null.
create or replace function public.admin_release_plan(p_email text)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_email  text := lower(trim(coalesce(p_email, '')));
  v_count  integer;
  v_plan   text;
  v_source text;
begin
  if not public.is_admin_user(auth.uid()) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select count(*) into v_count from profiles where lower(email) = v_email;
  if v_count <> 1 then
    return jsonb_build_object('ok', false, 'error', case when v_count = 0 then 'unknown_email' else 'ambiguous_email' end);
  end if;

  update profiles
     set plan        = case when stripe_customer_id is not null then plan else 'free' end,
         plan_source = case when stripe_customer_id is not null then 'stripe' else null end
   where lower(email) = v_email
   returning plan, plan_source into v_plan, v_source;

  return jsonb_build_object('ok', true, 'plan', v_plan, 'plan_source', v_source);
end;
$function$;

revoke execute on function public.admin_release_plan(text) from public, anon;
grant execute on function public.admin_release_plan(text) to authenticated;

-- ── 9 · Alte Wege bleiben, sind aber markiert ────────────────────────────────
-- Nicht gelöscht (Abwärtskompatibilität), der Webhook ruft sie nicht mehr.

comment on function public.set_membership_by_customer(text, text, boolean) is
  'Ersetzt durch set_plan_by_customer (0012). Bleibt für Abwärtskompatibilität; der Webhook ruft sie nicht mehr.';

comment on function public.grant_enrollment_by_email(text, text, date, text) is
  'Für Kurskäufe ersetzt durch grant_course_purchase (0012), das zusätzlich den Kaufbeleg für Erstattungen schreibt. Bleibt für Abwärtskompatibilität.';

