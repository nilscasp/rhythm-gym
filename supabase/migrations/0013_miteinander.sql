-- ─────────────────────────────────────────────────────────────────────────────
-- 0013 · Miteinander: Challenges, Treffen, Menschen (Umzug von Skool, Abschnitt G)
--
-- Plan: Plans/umzug-von-skool.md. Entscheidung 22.10.2026 (Schul-Gedächtnis
-- Stand/Entscheidungen.md): Die Community läuft auf WhatsApp, die Plattform
-- bekommt KEINEN Chat und KEINEN Feed. Stattdessen „Miteinander“:
--
--   · member_profiles     — Kontakt je Person (Region, Über mich, Handynummer,
--                           sichtbar ja/nein, offen für …). Nur die eigene Zeile
--                           ist lesbar. Andere sehen Profile ausschließlich über
--                           list_members() / get_member() — OHNE Nummer.
--   · connection_requests — „Verbindung anfragen“ mit einem kurzen Hallo
--                           (1–300 Zeichen). Schreiben nur über Funktionen.
--                           Die Nummer gibt connection_phone() heraus, und nur,
--                           wenn eine angenommene Anfrage zwischen beiden besteht.
--   · challenges (+ challenge_members) — öffentlich vorgeschlagen, andere tragen
--                           sich ein. Den WhatsApp-Gruppenlink sehen nur
--                           Teilnehmende (challenge_whatsapp_url()).
--   · meetups (+ meetup_attendees) — inoffizielle Treffen von Mitgliedern, keine
--                           Termine der Schule. Den genauen Ort sehen nur
--                           Zugesagte (meetup_exact_place()).
--
-- „Mitglied“ heißt vorerst: angemeldet. Die Frage, ab welcher Abo-Stufe
-- Miteinander offen ist, ist noch nicht entschieden. Darum gibt es EINE Stelle,
-- is_community_member(), die später an das Abo gebunden wird. Jede Policy und
-- jede Funktion hier fragt nur sie.
--
-- Muster wie 0010/0011:
--   · Schreiben mit Regeln (Platzzahl, Rate-Limit, Status) läuft über
--     SECURITY-DEFINER-Funktionen mit festem search_path.
--   · Geheime Spalten (phone, whatsapp_url, exact_place) sind nie direkt lesbar:
--     member_profiles nur die eigene Zeile; bei challenges/meetups wird das
--     Tabellen-SELECT entzogen und die erlaubten Spalten einzeln vergeben.
--   · Explizite Grants. anon bekommt nichts.
--   · Admin (is_admin_user) darf lesen, schließen und löschen (Moderation).
--     Moderation hält: closed_by_admin (challenges, meetups) und
--     member_moderation (ausgeblendete Profile, eigene Tabelle) setzt nur Admin über
--     admin_close_challenge/admin_close_meetup/admin_hide_member; Trigger
--     verhindern Wieder-Öffnen bzw. Sichtbar-Schalten. community_blocks sperrt
--     Personen für Anfragen, Beitreten und Anlegen.
--   · Kontaktanfragen: höchstens 10 offen, 5 neue je 24 h, je Paar eine in
--     30 Tagen, nach „Lieber nicht“ 90 Tage Ruhe.
--
-- Fehler aus den Funktionen tragen einen kurzen Code als Meldung
-- (z. B. 'too_many_open'); die App übersetzt ihn (app/lib/miteinander.ts,
-- MITEINANDER_ERRORS). Neue Codes nur zusammen mit dieser Liste.
--
-- Alles additiv: nur neue Tabellen, Funktionen, Trigger. Nichts Bestehendes
-- wird verändert.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 0 · Wer gehört dazu? ─────────────────────────────────────────────────────
-- Vorerst: jede angemeldete Person. Später an das Abo binden (z. B.
-- plan_rank(profiles.plan) >= 1 oder ein aktives Abo) — nur hier ändern.

create or replace function public.is_community_member()
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $function$
  select auth.uid() is not null;
$function$;

revoke execute on function public.is_community_member() from public, anon;
grant execute on function public.is_community_member() to authenticated, service_role;

-- ── 0b · Sperren (Moderation) ────────────────────────────────────────────────
-- Admin kann eine Person für Miteinander sperren: keine Anfragen, kein
-- Beitreten, nichts Neues anlegen, nichts wieder öffnen. Lesen bleibt (die
-- Person ist weiter Mitglied der Schule). Nur Admin sieht und pflegt die Liste.

create table if not exists public.community_blocks (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  reason     text check (reason is null or char_length(reason) <= 500),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.community_blocks is
  'Miteinander (0013): gesperrte Personen. Nur Admin. Geprüft von community_blocked().';

alter table public.community_blocks enable row level security;

drop policy if exists admins_all_community_blocks on public.community_blocks;
create policy admins_all_community_blocks on public.community_blocks
  for all to authenticated
  using (public.is_admin_user(auth.uid()))
  with check (public.is_admin_user(auth.uid()));

revoke all on public.community_blocks from anon, authenticated;
grant select, insert, update, delete on public.community_blocks to authenticated;
grant all on public.community_blocks to service_role;

-- Ist die aufrufende Person gesperrt? (Fragt nur nach sich selbst.)
create or replace function public.community_blocked()
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $function$
  select exists (select 1 from public.community_blocks b where b.user_id = auth.uid());
$function$;

revoke execute on function public.community_blocked() from public, anon;
grant execute on function public.community_blocked() to authenticated, service_role;

-- ── 1 · Profile ──────────────────────────────────────────────────────────────

create table if not exists public.member_profiles (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  -- Leer = Vorname aus profiles.full_name (siehe member_display_name).
  display_name text check (display_name is null or char_length(display_name) <= 60),
  -- Nur die Region („Raum München“), nie eine Adresse.
  region       text check (region is null or char_length(region) <= 80),
  about        text check (about is null or char_length(about) <= 500),
  -- E.164: + und 7–15 Ziffern. Normalisiert in der App (normalizePhone).
  phone        text check (phone is null or phone ~ '^\+[1-9][0-9]{6,14}$'),
  visible      boolean not null default false,
  open_for     text[] not null default '{}'::text[]
               check (open_for <@ array['partner', 'meetup', 'challenge']::text[]),
  -- Ob der Admin ein Profil ausgeblendet hat, steht NICHT hier (sonst wäre es
  -- mit Löschen und Neu-Anlegen weg), sondern in member_moderation.
  updated_at   timestamptz not null default now()
);

comment on table public.member_profiles is
  'Miteinander (0013): Kontakt je Person. Nur die eigene Zeile lesbar; andere über list_members()/get_member() ohne phone.';
comment on column public.member_profiles.phone is
  'Nie für andere lesbar. Herausgabe nur über connection_phone() nach angenommener Verbindung.';
comment on column public.member_profiles.visible is
  'true = erscheint unter „Menschen“. Standard aus.';

alter table public.member_profiles enable row level security;

drop policy if exists member_profiles_select_own on public.member_profiles;
create policy member_profiles_select_own on public.member_profiles
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists member_profiles_insert_own on public.member_profiles;
create policy member_profiles_insert_own on public.member_profiles
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists member_profiles_update_own on public.member_profiles;
create policy member_profiles_update_own on public.member_profiles
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists member_profiles_delete_own on public.member_profiles;
create policy member_profiles_delete_own on public.member_profiles
  for delete to authenticated using (auth.uid() = user_id);

-- Moderation: Admin liest alles und kann ein Profil ausblenden oder löschen.
drop policy if exists admins_all_member_profiles on public.member_profiles;
create policy admins_all_member_profiles on public.member_profiles
  for all to authenticated
  using (public.is_admin_user(auth.uid()))
  with check (public.is_admin_user(auth.uid()));

revoke all on public.member_profiles from anon, authenticated;
grant select, insert, update, delete on public.member_profiles to authenticated;
grant all on public.member_profiles to service_role;

-- ── 1a · Moderation von Profilen (nur Admin) ─────────────────────────────────
-- Eigene Tabelle, damit Ausblenden Löschen und Neu-Anlegen des Profils
-- übersteht. Quelle für list_members, get_member und request_connection.

create table if not exists public.member_moderation (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  hidden     boolean not null default true,
  reason     text check (reason is null or char_length(reason) <= 500),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

comment on table public.member_moderation is
  'Miteinander (0013): vom Admin ausgeblendete Profile. Nur Admin. Geprüft von member_is_hidden().';

alter table public.member_moderation enable row level security;

drop policy if exists admins_all_member_moderation on public.member_moderation;
create policy admins_all_member_moderation on public.member_moderation
  for all to authenticated
  using (public.is_admin_user(auth.uid()))
  with check (public.is_admin_user(auth.uid()));

revoke all on public.member_moderation from anon, authenticated;
grant select, insert, update, delete on public.member_moderation to authenticated;
grant all on public.member_moderation to service_role;

-- Intern (kein Grant an authenticated): ist dieses Profil ausgeblendet?
create or replace function public.member_is_hidden(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $function$
  select exists (
    select 1 from public.member_moderation mm where mm.user_id = p_user_id and mm.hidden
  );
$function$;

revoke execute on function public.member_is_hidden(uuid) from public, anon, authenticated;
grant execute on function public.member_is_hidden(uuid) to service_role;

-- Ausgeblendet heißt ausgeblendet: visible bleibt false, auch nach Löschen
-- und Neu-Anlegen. (Die Abfragen prüfen member_is_hidden zusätzlich.)
create or replace function public.member_profiles_enforce_hidden()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
begin
  if public.member_is_hidden(new.user_id) then
    new.visible := false;
  end if;
  return new;
end;
$function$;

revoke execute on function public.member_profiles_enforce_hidden() from public, anon, authenticated;

drop trigger if exists member_profiles_enforce_hidden on public.member_profiles;
create trigger member_profiles_enforce_hidden
  before insert or update on public.member_profiles
  for each row execute function public.member_profiles_enforce_hidden();

-- Admin blendet ein Profil aus (oder gibt es wieder frei). Beim Freigeben
-- bleibt visible false — sichtbar schaltet die Person selbst.
create or replace function public.admin_hide_member(p_user_id uuid, p_hidden boolean)
returns void
language plpgsql
volatile
security definer
set search_path to 'public', 'pg_catalog'
as $function$
begin
  if not public.is_admin_user(auth.uid()) then
    raise exception 'not_allowed';
  end if;
  insert into public.member_moderation (user_id, hidden, updated_by, updated_at)
  values (p_user_id, p_hidden, auth.uid(), now())
  on conflict (user_id) do update
    set hidden = excluded.hidden, updated_by = excluded.updated_by, updated_at = now();
  if p_hidden then
    update public.member_profiles set visible = false, updated_at = now() where user_id = p_user_id;
  end if;
end;
$function$;

revoke execute on function public.admin_hide_member(uuid, boolean) from public, anon;
grant execute on function public.admin_hide_member(uuid, boolean) to authenticated, service_role;

-- ── 1b · Anzeigename (intern) ────────────────────────────────────────────────
-- Eigener Name aus dem Profil, sonst der Vorname aus profiles.full_name, sonst
-- „Mitglied“. Nur intern: kein Grant an authenticated, sonst ließe sich zu
-- jeder bekannten user_id der Vorname abfragen. Die Funktionen unten laufen als
-- Eigentümer und dürfen sie rufen.

create or replace function public.member_display_name(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $function$
  select coalesce(
           (select nullif(btrim(mp.display_name), '')
              from public.member_profiles mp where mp.user_id = p_user_id),
           (select nullif(split_part(btrim(coalesce(pr.full_name, '')), ' ', 1), '')
              from public.profiles pr where pr.id = p_user_id),
           'Mitglied'
         );
$function$;

revoke execute on function public.member_display_name(uuid) from public, anon, authenticated;
grant execute on function public.member_display_name(uuid) to service_role;

-- ── 2 · Kontaktanfragen ──────────────────────────────────────────────────────

create table if not exists public.connection_requests (
  id          uuid primary key default gen_random_uuid(),
  from_user   uuid not null references public.profiles(id) on delete cascade,
  to_user     uuid not null references public.profiles(id) on delete cascade,
  message     text not null check (char_length(btrim(message)) between 1 and 300),
  status      text not null default 'pending'
              check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at  timestamptz not null default now(),
  answered_at timestamptz,
  constraint connection_requests_not_self check (from_user <> to_user)
);

comment on table public.connection_requests is
  'Miteinander (0013): kurzes Hallo, kein Chat. Schreiben nur über request_/answer_/withdraw_connection().';

-- Höchstens EINE offene Anfrage je Paar, egal in welche Richtung.
create unique index if not exists connection_requests_one_pending
  on public.connection_requests (least(from_user, to_user), greatest(from_user, to_user))
  where status = 'pending';

create index if not exists connection_requests_to_idx
  on public.connection_requests (to_user, status, created_at desc);
create index if not exists connection_requests_from_idx
  on public.connection_requests (from_user, status, created_at desc);

alter table public.connection_requests enable row level security;

-- Lesen: die beiden Beteiligten und Admin. Keine Schreib-Policies für
-- Mitglieder — alles läuft über die Funktionen (SECURITY DEFINER).
drop policy if exists connection_requests_select_party on public.connection_requests;
create policy connection_requests_select_party on public.connection_requests
  for select to authenticated using (auth.uid() = from_user or auth.uid() = to_user);

drop policy if exists admins_read_connection_requests on public.connection_requests;
create policy admins_read_connection_requests on public.connection_requests
  for select to authenticated using (public.is_admin_user(auth.uid()));

drop policy if exists admins_delete_connection_requests on public.connection_requests;
create policy admins_delete_connection_requests on public.connection_requests
  for delete to authenticated using (public.is_admin_user(auth.uid()));

revoke all on public.connection_requests from anon, authenticated;
grant select, delete on public.connection_requests to authenticated;
grant all on public.connection_requests to service_role;

-- ── 3 · Menschen finden (ohne Nummer) ────────────────────────────────────────
-- Nur sichtbare Profile, ohne die eigene Person. Suche: Teilstring in Name,
-- Region oder Über mich, ohne Groß/klein. strpos statt LIKE, damit % und _ in
-- der Suche keine Platzhalter sind.

create or replace function public.list_members(p_search text default null)
returns table (
  user_id      uuid,
  display_name text,
  region       text,
  about        text,
  open_for     text[],
  updated_at   timestamptz
)
language sql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $function$
  with q as (select lower(btrim(coalesce(p_search, ''))) as s)
  select mp.user_id,
         public.member_display_name(mp.user_id),
         mp.region,
         mp.about,
         mp.open_for,
         mp.updated_at
    from public.member_profiles mp, q
   where public.is_community_member()
     and mp.visible
     and not public.member_is_hidden(mp.user_id)
     and mp.user_id <> auth.uid()
     and (
          q.s = ''
       or strpos(lower(public.member_display_name(mp.user_id)), left(q.s, 80)) > 0
       or strpos(lower(coalesce(mp.region, '')), left(q.s, 80)) > 0
       or strpos(lower(coalesce(mp.about, '')), left(q.s, 80)) > 0
     )
   order by mp.updated_at desc
   limit 200;
$function$;

revoke execute on function public.list_members(text) from public, anon;
grant execute on function public.list_members(text) to authenticated, service_role;

-- Ein Profil (ohne Nummer). Sichtbar, wenn freigegeben (und nicht vom Admin
-- ausgeblendet), für sich selbst, für Admin — und sonst NUR, wenn
--   · die Person mich gerade anfragt (pending, ich bin to_user: ich soll sehen,
--     wer fragt), oder
--   · wir verbunden sind (accepted).
-- Abgelehnte oder zurückgezogene Anfragen öffnen ein verstecktes Profil nicht.

create or replace function public.get_member(p_user_id uuid)
returns table (
  user_id      uuid,
  display_name text,
  region       text,
  about        text,
  open_for     text[],
  visible      boolean
)
language sql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $function$
  select pr.id,
         public.member_display_name(pr.id),
         mp.region,
         mp.about,
         coalesce(mp.open_for, '{}'::text[]),
         coalesce(mp.visible, false)
    from public.profiles pr
    left join public.member_profiles mp on mp.user_id = pr.id
   where pr.id = p_user_id
     and public.is_community_member()
     and (
          (coalesce(mp.visible, false) and not public.member_is_hidden(pr.id))
       or pr.id = auth.uid()
       or public.is_admin_user(auth.uid())
       or exists (
            select 1 from public.connection_requests cr
             where cr.status = 'pending'
               and cr.to_user = auth.uid()
               and cr.from_user = pr.id
          )
       or exists (
            select 1 from public.connection_requests cr
             where cr.status = 'accepted'
               and ((cr.from_user = auth.uid() and cr.to_user = pr.id)
                 or (cr.to_user = auth.uid() and cr.from_user = pr.id))
          )
     );
$function$;

revoke execute on function public.get_member(uuid) from public, anon;
grant execute on function public.get_member(uuid) to authenticated, service_role;

-- ── 4 · Anfragen stellen, beantworten, zurückziehen ─────────────────────────

create or replace function public.request_connection(p_to_user uuid, p_message text)
returns uuid
language plpgsql
volatile
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_uid uuid := auth.uid();
  v_msg text := btrim(coalesce(p_message, ''));
  v_id  uuid;
begin
  if v_uid is null or not public.is_community_member() then
    raise exception 'not_member';
  end if;
  if public.community_blocked() then
    raise exception 'blocked';
  end if;
  if p_to_user is null or p_to_user = v_uid then
    raise exception 'not_allowed';
  end if;
  if char_length(v_msg) < 1 or char_length(v_msg) > 300 then
    raise exception 'message_length';
  end if;

  -- Anfragen nur an sichtbare (und nicht ausgeblendete) Profile.
  if not exists (
    select 1 from public.member_profiles mp
     where mp.user_id = p_to_user and mp.visible and not public.member_is_hidden(p_to_user)
  ) then
    raise exception 'not_visible';
  end if;

  -- Schon verbunden?
  if exists (
    select 1 from public.connection_requests cr
     where cr.status = 'accepted'
       and ((cr.from_user = v_uid and cr.to_user = p_to_user)
         or (cr.from_user = p_to_user and cr.to_user = v_uid))
  ) then
    raise exception 'already_connected';
  end if;

  -- Schon eine offene Anfrage zwischen beiden (in irgendeine Richtung)?
  if exists (
    select 1 from public.connection_requests cr
     where cr.status = 'pending'
       and ((cr.from_user = v_uid and cr.to_user = p_to_user)
         or (cr.from_user = p_to_user and cr.to_user = v_uid))
  ) then
    raise exception 'already_pending';
  end if;

  -- Abkühlzeiten je Paar (Absender → Empfänger), damit Zurückziehen und neu
  -- Anfragen keine Schleife wird:
  --   · „Lieber nicht“ gilt 90 Tage (gerechnet ab der Antwort).
  --   · Sonst höchstens EINE Anfrage je Paar in 30 Tagen, egal mit welchem
  --     Ausgang (zurückgezogen, gelöst …).
  if exists (
    select 1 from public.connection_requests cr
     where cr.from_user = v_uid and cr.to_user = p_to_user
       and cr.status = 'declined'
       and coalesce(cr.answered_at, cr.created_at) > now() - interval '90 days'
  ) then
    raise exception 'declined_recently';
  end if;
  if exists (
    select 1 from public.connection_requests cr
     where cr.from_user = v_uid and cr.to_user = p_to_user
       and cr.created_at > now() - interval '30 days'
  ) then
    raise exception 'cooldown';
  end if;

  -- Tagesobergrenze: höchstens 5 neue Anfragen in 24 Stunden.
  if (select count(*) from public.connection_requests cr
       where cr.from_user = v_uid and cr.created_at > now() - interval '24 hours') >= 5 then
    raise exception 'daily_limit';
  end if;

  -- Rate-Limit: höchstens 10 offene Anfragen je Person.
  if (select count(*) from public.connection_requests cr
       where cr.from_user = v_uid and cr.status = 'pending') >= 10 then
    raise exception 'too_many_open';
  end if;

  begin
    insert into public.connection_requests (from_user, to_user, message)
    values (v_uid, p_to_user, v_msg)
    returning id into v_id;
  exception when unique_violation then
    raise exception 'already_pending';
  end;

  return v_id;
end;
$function$;

revoke execute on function public.request_connection(uuid, text) from public, anon;
grant execute on function public.request_connection(uuid, text) to authenticated, service_role;

create or replace function public.answer_connection(p_request_id uuid, p_accept boolean)
returns text
language plpgsql
volatile
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_uid    uuid := auth.uid();
  v_status text := case when p_accept then 'accepted' else 'declined' end;
begin
  if v_uid is null or not public.is_community_member() then
    raise exception 'not_member';
  end if;
  -- Gesperrte dürfen ablehnen, aber nicht annehmen (kein Nummerntausch).
  if p_accept and public.community_blocked() then
    raise exception 'blocked';
  end if;

  update public.connection_requests
     set status = v_status, answered_at = now()
   where id = p_request_id
     and to_user = v_uid
     and status = 'pending';

  if not found then
    raise exception 'not_found';
  end if;
  return v_status;
end;
$function$;

revoke execute on function public.answer_connection(uuid, boolean) from public, anon;
grant execute on function public.answer_connection(uuid, boolean) to authenticated, service_role;

create or replace function public.withdraw_connection(p_request_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_member';
  end if;

  update public.connection_requests
     set status = 'withdrawn', answered_at = now()
   where id = p_request_id
     and from_user = v_uid
     and status = 'pending';

  if not found then
    raise exception 'not_found';
  end if;
end;
$function$;

revoke execute on function public.withdraw_connection(uuid) from public, anon;
grant execute on function public.withdraw_connection(uuid) to authenticated, service_role;

-- Verbindung lösen (Mockup: „Verbindung lösen“). Jede der beiden Seiten darf.
-- Danach gibt connection_phone() nichts mehr heraus. Was schon in WhatsApp
-- gespeichert ist, kann die Plattform nicht zurückholen — das sagt die Seite.

create or replace function public.end_connection(p_request_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_member';
  end if;

  update public.connection_requests
     set status = 'withdrawn', answered_at = now()
   where id = p_request_id
     and (from_user = v_uid or to_user = v_uid)
     and status = 'accepted';

  if not found then
    raise exception 'not_found';
  end if;
end;
$function$;

revoke execute on function public.end_connection(uuid) from public, anon;
grant execute on function public.end_connection(uuid) to authenticated, service_role;

-- Alle Anfragen, an denen ich beteiligt bin, mit Namen der anderen Person.
-- Für „Anfragen an dich“, den Status auf einem Profil und die Neuigkeiten.

create or replace function public.my_connection_requests()
returns table (
  id          uuid,
  direction   text,
  other_user  uuid,
  other_name  text,
  message     text,
  status      text,
  created_at  timestamptz,
  answered_at timestamptz
)
language sql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $function$
  select cr.id,
         case when cr.from_user = auth.uid() then 'out' else 'in' end,
         case when cr.from_user = auth.uid() then cr.to_user else cr.from_user end,
         public.member_display_name(case when cr.from_user = auth.uid() then cr.to_user else cr.from_user end),
         cr.message,
         cr.status,
         cr.created_at,
         cr.answered_at
    from public.connection_requests cr
   where auth.uid() is not null
     and (cr.from_user = auth.uid() or cr.to_user = auth.uid())
   order by coalesce(cr.answered_at, cr.created_at) desc
   limit 200;
$function$;

revoke execute on function public.my_connection_requests() from public, anon;
grant execute on function public.my_connection_requests() to authenticated, service_role;

-- ── 5 · Nummerntausch ────────────────────────────────────────────────────────
-- Die Nummer der anderen Person — nur bei angenommener Anfrage zwischen beiden.
-- Sonst null (auch, wenn die Person keine Nummer eingetragen hat).

create or replace function public.connection_phone(p_other_user uuid)
returns text
language sql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $function$
  select mp.phone
    from public.member_profiles mp
   where mp.user_id = p_other_user
     and mp.phone is not null
     and auth.uid() is not null
     and p_other_user <> auth.uid()
     and public.is_community_member()
     and not public.community_blocked()
     and exists (
           select 1 from public.connection_requests cr
            where cr.status = 'accepted'
              and ((cr.from_user = auth.uid() and cr.to_user = p_other_user)
                or (cr.from_user = p_other_user and cr.to_user = auth.uid()))
         );
$function$;

revoke execute on function public.connection_phone(uuid) from public, anon;
grant execute on function public.connection_phone(uuid) to authenticated, service_role;

-- ── 6 · Challenges ───────────────────────────────────────────────────────────

create table if not exists public.challenges (
  id           uuid primary key default gen_random_uuid(),
  created_by   uuid not null references public.profiles(id) on delete cascade,
  title        text not null check (char_length(btrim(title)) between 1 and 120),
  description  text check (description is null or char_length(description) <= 1000),
  area         text not null default 'frei'
               check (area in ('rhythmik', 'harmonik', 'komposition', 'soulset', 'frei')),
  starts_on    date not null,
  ends_on      date not null,
  max_members  integer check (max_members is null or max_members between 2 and 100),
  -- Nur Einladungslinks von WhatsApp-Gruppen (siehe isWhatsappGroupUrl).
  whatsapp_url text check (
                 whatsapp_url is null
                 or whatsapp_url ~ '^https://chat\.whatsapp\.com/[A-Za-z0-9_-]{8,64}$'
               ),
  status       text not null default 'open' check (status in ('open', 'closed')),
  -- Moderation: vom Admin geschlossen. Nur über admin_close_challenge() schreibbar
  -- (nicht im Spalten-Grant). Solange true, lässt sich status nicht auf open setzen.
  closed_by_admin boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint challenges_dates check (ends_on >= starts_on and ends_on <= starts_on + 366)
);

comment on table public.challenges is
  'Miteinander (0013): von Mitgliedern vorgeschlagen. whatsapp_url nie direkt lesbar — nur challenge_whatsapp_url().';

create index if not exists challenges_open_idx on public.challenges (status, starts_on);
create index if not exists challenges_created_by_idx on public.challenges (created_by);

create table if not exists public.challenge_members (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  joined_at    timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

create index if not exists challenge_members_user_idx on public.challenge_members (user_id);

alter table public.challenges enable row level security;
alter table public.challenge_members enable row level security;

-- Lesen: alle Mitglieder (ohne whatsapp_url, siehe Grants).
drop policy if exists challenges_select_members on public.challenges;
create policy challenges_select_members on public.challenges
  for select to authenticated using (public.is_community_member());

-- Anlegen: nur als man selbst, nur offen.
drop policy if exists challenges_insert_own on public.challenges;
create policy challenges_insert_own on public.challenges
  for insert to authenticated with check (
    public.is_community_member() and not public.community_blocked()
    and created_by = auth.uid() and status = 'open'
  );

-- Bearbeiten und schließen: wer sie vorgeschlagen hat.
drop policy if exists challenges_update_own on public.challenges;
create policy challenges_update_own on public.challenges
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- Moderation.
drop policy if exists admins_update_challenges on public.challenges;
create policy admins_update_challenges on public.challenges
  for update to authenticated
  using (public.is_admin_user(auth.uid()))
  with check (public.is_admin_user(auth.uid()));

drop policy if exists admins_delete_challenges on public.challenges;
create policy admins_delete_challenges on public.challenges
  for delete to authenticated using (public.is_admin_user(auth.uid()));

-- Wer dabei ist, sehen alle Mitglieder (Zahl und Liste auf der Seite).
drop policy if exists challenge_members_select_members on public.challenge_members;
create policy challenge_members_select_members on public.challenge_members
  for select to authenticated using (public.is_community_member());

drop policy if exists admins_delete_challenge_members on public.challenge_members;
create policy admins_delete_challenge_members on public.challenge_members
  for delete to authenticated using (public.is_admin_user(auth.uid()));

-- Grants: Tabellen-SELECT nicht vergeben, Spalten einzeln (ohne whatsapp_url).
-- Kommt eine Spalte dazu, muss sie hier ergänzt werden.
revoke all on public.challenges, public.challenge_members from anon, authenticated;
grant select (
  id, created_by, title, description, area, starts_on, ends_on,
  max_members, status, created_at, updated_at
) on public.challenges to authenticated;
grant insert (
  created_by, title, description, area, starts_on, ends_on, max_members, whatsapp_url
) on public.challenges to authenticated;
grant update (
  title, description, area, starts_on, ends_on, max_members, whatsapp_url, status, updated_at
) on public.challenges to authenticated;
grant delete on public.challenges to authenticated;
-- Beitreten/verlassen nur über die Funktionen.
grant select, delete on public.challenge_members to authenticated;
grant all on public.challenges, public.challenge_members to service_role;

-- Höchstens 5 offene Challenges je Person; wer vorschlägt, ist dabei.
create or replace function public.challenges_before_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
begin
  if (select count(*) from public.challenges c
       where c.created_by = new.created_by and c.status = 'open') >= 5 then
    raise exception 'too_many_open';
  end if;
  return new;
end;
$function$;

create or replace function public.challenges_after_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
begin
  insert into public.challenge_members (challenge_id, user_id)
  values (new.id, new.created_by)
  on conflict do nothing;
  return new;
end;
$function$;

revoke execute on function public.challenges_before_insert() from public, anon, authenticated;
revoke execute on function public.challenges_after_insert() from public, anon, authenticated;

drop trigger if exists challenges_before_insert on public.challenges;
create trigger challenges_before_insert
  before insert on public.challenges
  for each row execute function public.challenges_before_insert();

drop trigger if exists challenges_after_insert on public.challenges;
create trigger challenges_after_insert
  after insert on public.challenges
  for each row execute function public.challenges_after_insert();

-- Bearbeiten/Wieder-Öffnen absichern (Moderation und Limit):
--   · Vom Admin geschlossen → für Nicht-Admins gar nicht mehr änderbar.
--   · Gesperrte Personen dürfen nur noch status → 'closed' setzen, sonst nichts.
--   · Wieder öffnen zählt wie neu anlegen (höchstens 5 offene je Person).
-- closed_by_admin selbst steht in keinem Spalten-Grant; nur
-- admin_close_challenge() setzt es.
create or replace function public.challenges_before_update()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_admin boolean := public.is_admin_user(auth.uid());
begin
  if not v_admin then
    if old.closed_by_admin then
      raise exception 'closed_by_admin';
    end if;
    if public.community_blocked()
       and (new.status <> 'closed'
            or (new.title, new.description, new.area, new.starts_on, new.ends_on,
                new.max_members, new.whatsapp_url)
               is distinct from
               (old.title, old.description, old.area, old.starts_on, old.ends_on,
                old.max_members, old.whatsapp_url)) then
      raise exception 'blocked';
    end if;
  end if;
  if new.closed_by_admin and new.status = 'open' then
    raise exception 'closed_by_admin';
  end if;
  if old.status = 'closed' and new.status = 'open'
     and (select count(*) from public.challenges c
           where c.created_by = new.created_by and c.status = 'open' and c.id <> new.id) >= 5 then
    raise exception 'too_many_open';
  end if;
  new.updated_at := now();
  return new;
end;
$function$;

revoke execute on function public.challenges_before_update() from public, anon, authenticated;

drop trigger if exists challenges_before_update on public.challenges;
create trigger challenges_before_update
  before update on public.challenges
  for each row execute function public.challenges_before_update();

-- Admin schließt (p_closed true) oder gibt wieder frei (false; der Status
-- bleibt dann geschlossen, öffnen kann die Person selbst).
create or replace function public.admin_close_challenge(p_challenge_id uuid, p_closed boolean)
returns void
language plpgsql
volatile
security definer
set search_path to 'public', 'pg_catalog'
as $function$
begin
  if not public.is_admin_user(auth.uid()) then
    raise exception 'not_allowed';
  end if;
  update public.challenges
     set closed_by_admin = p_closed,
         status = case when p_closed then 'closed' else status end
   where id = p_challenge_id;
  if not found then
    raise exception 'not_found';
  end if;
end;
$function$;

revoke execute on function public.admin_close_challenge(uuid, boolean) from public, anon;
grant execute on function public.admin_close_challenge(uuid, boolean) to authenticated, service_role;

create or replace function public.join_challenge(p_challenge_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_uid uuid := auth.uid();
  v_c   public.challenges%rowtype;
begin
  if v_uid is null or not public.is_community_member() then
    raise exception 'not_member';
  end if;
  if public.community_blocked() then
    raise exception 'blocked';
  end if;

  -- Zeile sperren, damit zwei gleichzeitige Beitritte die Platzzahl nicht sprengen.
  select * into v_c from public.challenges where id = p_challenge_id for update;
  if not found then
    raise exception 'not_found';
  end if;
  if v_c.status <> 'open' or v_c.ends_on < current_date then
    raise exception 'closed';
  end if;
  if exists (select 1 from public.challenge_members
              where challenge_id = p_challenge_id and user_id = v_uid) then
    return;
  end if;
  if v_c.max_members is not null
     and (select count(*) from public.challenge_members
           where challenge_id = p_challenge_id) >= v_c.max_members then
    raise exception 'full';
  end if;

  insert into public.challenge_members (challenge_id, user_id) values (p_challenge_id, v_uid);
end;
$function$;

revoke execute on function public.join_challenge(uuid) from public, anon;
grant execute on function public.join_challenge(uuid) to authenticated, service_role;

create or replace function public.leave_challenge(p_challenge_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_member';
  end if;
  -- Wer vorgeschlagen hat, schließt die Challenge, statt sie zu verlassen.
  if exists (select 1 from public.challenges
              where id = p_challenge_id and created_by = v_uid) then
    raise exception 'creator_cannot_leave';
  end if;
  delete from public.challenge_members
   where challenge_id = p_challenge_id and user_id = v_uid;
end;
$function$;

revoke execute on function public.leave_challenge(uuid) from public, anon;
grant execute on function public.leave_challenge(uuid) to authenticated, service_role;

-- Gruppenlink: für Teilnehmende, wer vorgeschlagen hat, und Admin.
create or replace function public.challenge_whatsapp_url(p_challenge_id uuid)
returns text
language sql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $function$
  select nullif(c.whatsapp_url, '')
    from public.challenges c
   where c.id = p_challenge_id
     and auth.uid() is not null
     and public.is_community_member()
     and (
          c.created_by = auth.uid()
       or public.is_admin_user(auth.uid())
       or exists (select 1 from public.challenge_members cm
                   where cm.challenge_id = c.id and cm.user_id = auth.uid())
     );
$function$;

revoke execute on function public.challenge_whatsapp_url(uuid) from public, anon;
grant execute on function public.challenge_whatsapp_url(uuid) to authenticated, service_role;

-- Wer dabei ist, mit Namen. profile_visible sagt der App, ob sie auf das
-- Profil verlinken darf.
create or replace function public.challenge_people(p_challenge_id uuid)
returns table (
  user_id         uuid,
  display_name    text,
  is_creator      boolean,
  profile_visible boolean,
  joined_at       timestamptz
)
language sql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $function$
  select cm.user_id,
         public.member_display_name(cm.user_id),
         cm.user_id = c.created_by,
         coalesce(mp.visible, false),
         cm.joined_at
    from public.challenge_members cm
    join public.challenges c on c.id = cm.challenge_id
    left join public.member_profiles mp on mp.user_id = cm.user_id
   where cm.challenge_id = p_challenge_id
     and public.is_community_member()
   order by (cm.user_id = c.created_by) desc, cm.joined_at asc
   limit 200;
$function$;

revoke execute on function public.challenge_people(uuid) from public, anon;
grant execute on function public.challenge_people(uuid) to authenticated, service_role;

-- ── 7 · Treffen ──────────────────────────────────────────────────────────────

create table if not exists public.meetups (
  id          uuid primary key default gen_random_uuid(),
  created_by  uuid not null references public.profiles(id) on delete cascade,
  title       text not null check (char_length(btrim(title)) between 1 and 120),
  description text check (description is null or char_length(description) <= 1000),
  -- Region („Raum Freiburg“), öffentlich unter Mitgliedern.
  region      text check (region is null or char_length(region) <= 80),
  -- Grober Hinweis („am Monopteros“), öffentlich unter Mitgliedern.
  place_hint  text check (place_hint is null or char_length(place_hint) <= 120),
  -- Genaue Adresse oder Online-Link: nur über meetup_exact_place().
  exact_place text check (exact_place is null or char_length(exact_place) <= 300),
  starts_at   timestamptz not null,
  max_people  integer check (max_people is null or max_people between 2 and 200),
  online      boolean not null default false,
  status      text not null default 'open' check (status in ('open', 'closed')),
  -- Moderation wie bei challenges (admin_close_meetup()).
  closed_by_admin boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.meetups is
  'Miteinander (0013): inoffizielle Treffen von Mitgliedern, keine Termine der Schule. exact_place nur über meetup_exact_place().';

create index if not exists meetups_upcoming_idx on public.meetups (status, starts_at);
create index if not exists meetups_created_by_idx on public.meetups (created_by);

create table if not exists public.meetup_attendees (
  meetup_id uuid not null references public.meetups(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (meetup_id, user_id)
);

create index if not exists meetup_attendees_user_idx on public.meetup_attendees (user_id);

alter table public.meetups enable row level security;
alter table public.meetup_attendees enable row level security;

drop policy if exists meetups_select_members on public.meetups;
create policy meetups_select_members on public.meetups
  for select to authenticated using (public.is_community_member());

drop policy if exists meetups_insert_own on public.meetups;
create policy meetups_insert_own on public.meetups
  for insert to authenticated with check (
    public.is_community_member() and not public.community_blocked()
    and created_by = auth.uid() and status = 'open'
  );

drop policy if exists meetups_update_own on public.meetups;
create policy meetups_update_own on public.meetups
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists admins_update_meetups on public.meetups;
create policy admins_update_meetups on public.meetups
  for update to authenticated
  using (public.is_admin_user(auth.uid()))
  with check (public.is_admin_user(auth.uid()));

drop policy if exists admins_delete_meetups on public.meetups;
create policy admins_delete_meetups on public.meetups
  for delete to authenticated using (public.is_admin_user(auth.uid()));

drop policy if exists meetup_attendees_select_members on public.meetup_attendees;
create policy meetup_attendees_select_members on public.meetup_attendees
  for select to authenticated using (public.is_community_member());

drop policy if exists admins_delete_meetup_attendees on public.meetup_attendees;
create policy admins_delete_meetup_attendees on public.meetup_attendees
  for delete to authenticated using (public.is_admin_user(auth.uid()));

revoke all on public.meetups, public.meetup_attendees from anon, authenticated;
grant select (
  id, created_by, title, description, region, place_hint, starts_at,
  max_people, online, status, created_at, updated_at
) on public.meetups to authenticated;
grant insert (
  created_by, title, description, region, place_hint, exact_place, starts_at, max_people, online
) on public.meetups to authenticated;
grant update (
  title, description, region, place_hint, exact_place, starts_at, max_people, online, status, updated_at
) on public.meetups to authenticated;
grant delete on public.meetups to authenticated;
grant select, delete on public.meetup_attendees to authenticated;
grant all on public.meetups, public.meetup_attendees to service_role;

create or replace function public.meetups_before_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
begin
  if (select count(*) from public.meetups m
       where m.created_by = new.created_by and m.status = 'open'
         and m.starts_at > now()) >= 5 then
    raise exception 'too_many_open';
  end if;
  return new;
end;
$function$;

create or replace function public.meetups_after_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
begin
  insert into public.meetup_attendees (meetup_id, user_id)
  values (new.id, new.created_by)
  on conflict do nothing;
  return new;
end;
$function$;

revoke execute on function public.meetups_before_insert() from public, anon, authenticated;
revoke execute on function public.meetups_after_insert() from public, anon, authenticated;

drop trigger if exists meetups_before_insert on public.meetups;
create trigger meetups_before_insert
  before insert on public.meetups
  for each row execute function public.meetups_before_insert();

drop trigger if exists meetups_after_insert on public.meetups;
create trigger meetups_after_insert
  after insert on public.meetups
  for each row execute function public.meetups_after_insert();

-- Wie bei challenges: Moderation hält, Gesperrte dürfen nur schließen.
-- Limit (5 kommende offene Treffen) gilt, sobald ein Treffen durch das Update
-- „kommend und offen“ WIRD — durch Wieder-Öffnen oder durch Verschieben eines
-- vergangenen Treffens in die Zukunft.
create or replace function public.meetups_before_update()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_admin boolean := public.is_admin_user(auth.uid());
begin
  if not v_admin then
    if old.closed_by_admin then
      raise exception 'closed_by_admin';
    end if;
    if public.community_blocked()
       and (new.status <> 'closed'
            or (new.title, new.description, new.region, new.place_hint, new.exact_place,
                new.starts_at, new.max_people, new.online)
               is distinct from
               (old.title, old.description, old.region, old.place_hint, old.exact_place,
                old.starts_at, old.max_people, old.online)) then
      raise exception 'blocked';
    end if;
  end if;
  if new.closed_by_admin and new.status = 'open' then
    raise exception 'closed_by_admin';
  end if;
  if new.status = 'open' and new.starts_at > now()
     and not (old.status = 'open' and old.starts_at > now())
     and (select count(*) from public.meetups m
           where m.created_by = new.created_by and m.status = 'open'
             and m.starts_at > now() and m.id <> new.id) >= 5 then
    raise exception 'too_many_open';
  end if;
  new.updated_at := now();
  return new;
end;
$function$;

revoke execute on function public.meetups_before_update() from public, anon, authenticated;

drop trigger if exists meetups_before_update on public.meetups;
create trigger meetups_before_update
  before update on public.meetups
  for each row execute function public.meetups_before_update();

create or replace function public.admin_close_meetup(p_meetup_id uuid, p_closed boolean)
returns void
language plpgsql
volatile
security definer
set search_path to 'public', 'pg_catalog'
as $function$
begin
  if not public.is_admin_user(auth.uid()) then
    raise exception 'not_allowed';
  end if;
  update public.meetups
     set closed_by_admin = p_closed,
         status = case when p_closed then 'closed' else status end
   where id = p_meetup_id;
  if not found then
    raise exception 'not_found';
  end if;
end;
$function$;

revoke execute on function public.admin_close_meetup(uuid, boolean) from public, anon;
grant execute on function public.admin_close_meetup(uuid, boolean) to authenticated, service_role;

create or replace function public.join_meetup(p_meetup_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_uid uuid := auth.uid();
  v_m   public.meetups%rowtype;
begin
  if v_uid is null or not public.is_community_member() then
    raise exception 'not_member';
  end if;
  if public.community_blocked() then
    raise exception 'blocked';
  end if;

  select * into v_m from public.meetups where id = p_meetup_id for update;
  if not found then
    raise exception 'not_found';
  end if;
  if v_m.status <> 'open' or v_m.starts_at < now() then
    raise exception 'closed';
  end if;
  if exists (select 1 from public.meetup_attendees
              where meetup_id = p_meetup_id and user_id = v_uid) then
    return;
  end if;
  if v_m.max_people is not null
     and (select count(*) from public.meetup_attendees
           where meetup_id = p_meetup_id) >= v_m.max_people then
    raise exception 'full';
  end if;

  insert into public.meetup_attendees (meetup_id, user_id) values (p_meetup_id, v_uid);
end;
$function$;

revoke execute on function public.join_meetup(uuid) from public, anon;
grant execute on function public.join_meetup(uuid) to authenticated, service_role;

create or replace function public.leave_meetup(p_meetup_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_member';
  end if;
  if exists (select 1 from public.meetups
              where id = p_meetup_id and created_by = v_uid) then
    raise exception 'creator_cannot_leave';
  end if;
  delete from public.meetup_attendees
   where meetup_id = p_meetup_id and user_id = v_uid;
end;
$function$;

revoke execute on function public.leave_meetup(uuid) from public, anon;
grant execute on function public.leave_meetup(uuid) to authenticated, service_role;

-- Genauer Ort: für Zugesagte, wer eingetragen hat, und Admin.
create or replace function public.meetup_exact_place(p_meetup_id uuid)
returns text
language sql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $function$
  select nullif(btrim(m.exact_place), '')
    from public.meetups m
   where m.id = p_meetup_id
     and auth.uid() is not null
     and public.is_community_member()
     and (
          m.created_by = auth.uid()
       or public.is_admin_user(auth.uid())
       or exists (select 1 from public.meetup_attendees ma
                   where ma.meetup_id = m.id and ma.user_id = auth.uid())
     );
$function$;

revoke execute on function public.meetup_exact_place(uuid) from public, anon;
grant execute on function public.meetup_exact_place(uuid) to authenticated, service_role;

create or replace function public.meetup_people(p_meetup_id uuid)
returns table (
  user_id         uuid,
  display_name    text,
  is_creator      boolean,
  profile_visible boolean,
  joined_at       timestamptz
)
language sql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $function$
  select ma.user_id,
         public.member_display_name(ma.user_id),
         ma.user_id = m.created_by,
         coalesce(mp.visible, false),
         ma.joined_at
    from public.meetup_attendees ma
    join public.meetups m on m.id = ma.meetup_id
    left join public.member_profiles mp on mp.user_id = ma.user_id
   where ma.meetup_id = p_meetup_id
     and public.is_community_member()
   order by (ma.user_id = m.created_by) desc, ma.joined_at asc
   limit 200;
$function$;

revoke execute on function public.meetup_people(uuid) from public, anon;
grant execute on function public.meetup_people(uuid) to authenticated, service_role;
