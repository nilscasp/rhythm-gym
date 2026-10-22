-- ─────────────────────────────────────────────────────────────────────────────
-- 0010 · Kurse, Abschnitte, Lektionen (Umzug von Skool, Bauabschnitt A)
--
-- Plan: Plans/umzug-von-skool.md. Bisher kennt die App genau ein Kursmodell:
-- das Rhythmus Fundament mit 44 Tagen aus Dateien im Repo. Für den Umzug
-- brauchen Kompass, Elemente, Kreativ, „Von Anfang an spielen“ und die
-- Aufzeichnungen ein Modell in der DB:
--
--   programs ─┬─ program_sections ─┐
--             └──────────── lessons ┴─ lesson_contents   (1:1, der Inhalt)
--                                    └─ lesson_attachments (PDF / Link)
--                                    └─ lesson_completions (Haken je Person)
--
-- Zwei Schichten, wie bei den Terminen (0006):
--   · Die GLIEDERUNG (programs, program_sections, lessons) ist öffentlich
--     lesbar — sie ist zugleich das Schaufenster („das steckt im Kurs“).
--   · Der INHALT (lesson_contents: Text + Video-GUID, lesson_attachments)
--     liegt in eigenen Tabellen und ist nur mit Zugriff lesbar. Zugriff heißt:
--     has_program_access(program_id) — aktives Enrollment ODER Abo-Stufe, in
--     der der Kurs enthalten ist (programs.included_in_plan) ODER Admin.
--
-- Die Abo-Rangfolge (free < premium < vip) steht ab jetzt an EINER Stelle in
-- SQL: plan_rank(). event_zoom_url() wird darauf umgestellt. Das TypeScript-
-- Gegenstück ist app/lib/plan.ts — beide ändern sich nur zusammen.
--
-- Was hier NICHT geprüft wird: der Drip (lessons.unlock_day). Wie beim
-- Rhythmus Fundament lebt die Datumsrechnung ausschließlich in
-- app/lib/course-access.ts; RLS entscheidet nur „Kurs ja/nein“.
--
-- WhatsApp: Gespräch läuft auf WhatsApp (keine Plattform-Chats). Jeder Kurs
-- hat optional einen Gruppenlink (programs.whatsapp_url), eine Kursrunde kann
-- ihn überschreiben (access_codes.whatsapp_url). Herausgegeben wird der Link
-- ausschließlich von program_whatsapp_url() (SECURITY DEFINER) — nur an
-- Menschen mit Zugriff.
--
-- GEPRÜFT AM 22.10.2026 (Live-Projekt rhythm-gym, per MCP gelesen):
--   · programs: RLS an, eine Policy `programs_select_all` (SELECT, public).
--     Tabellenweite Grants für anon/authenticated (SELECT, INSERT, UPDATE,
--     DELETE …). Spalten: id, slug, title, description, level (NOT NULL),
--     category (NOT NULL), total_exercises, published_at, created_at.
--     → Weil die Policy jede Zeile freigibt, würde whatsapp_url öffentlich.
--       Darum wie in 0006/0009: Tabellen-SELECT entziehen, erlaubte Spalten
--       einzeln zurückgeben (Abschnitt 1b). Die App liest programs überall
--       mit expliziter Spaltenliste (geprüft: app/, components/), nie mit *.
--   · access_codes: RLS an, nur Policy `admins_all_access_codes` (ALL).
--     Nicht-Admins sehen keine Zeile. Ein Spalten-Revoke auf whatsapp_url wäre
--     bei bestehendem Tabellen-SELECT wirkungslos und entfällt deshalb: den
--     Link schützt RLS (nur Admin), herausgegeben wird er nur über
--     program_whatsapp_url().
--
-- Alles additiv. Keine bestehende Zeile wird verändert; neue Spalten haben
-- Defaults, die das heutige Verhalten beschreiben (kind 'course',
-- included_in_plan null = nur über Enrollment).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1 · programs: Art, Abo-Stufe, Kursgruppe, Reihenfolge ───────────────────

alter table public.programs
  add column if not exists kind text not null default 'course';
alter table public.programs drop constraint if exists programs_kind_check;
alter table public.programs add constraint programs_kind_check
  check (kind in ('course', 'library'));

alter table public.programs
  add column if not exists included_in_plan text;
alter table public.programs drop constraint if exists programs_included_in_plan_check;
alter table public.programs add constraint programs_included_in_plan_check
  check (included_in_plan is null or included_in_plan in ('premium', 'vip'));

alter table public.programs
  add column if not exists whatsapp_url text;

alter table public.programs
  add column if not exists sort_order integer not null default 100;

comment on column public.programs.kind is
  'course = Kurs mit Reihenfolge und Fortschritt · library = Sammlung (Aufzeichnungen), neueste zuerst, ohne Fortschritt';
comment on column public.programs.included_in_plan is
  'null = nur über Enrollment · premium = im Abo ab Premium enthalten (auch VIP) · vip = nur VIP';
comment on column public.programs.whatsapp_url is
  'Link zur Kursgruppe. Nie direkt lesbar (Spalten-Privileg entzogen) — nur über program_whatsapp_url().';

-- ── 1b · whatsapp_url nicht öffentlich ───────────────────────────────────────
-- Postgres addiert Privilegien: ein Spalten-REVOKE greift nicht, solange das
-- Tabellen-SELECT besteht. Darum Tabellen-SELECT weg, Spalten einzeln zurück.
-- Die Liste ist genau der geprüfte Bestand plus die neuen Spalten außer
-- whatsapp_url. Kommt später eine Spalte dazu, muss sie hier ergänzt werden.

revoke select on public.programs from anon, authenticated;
grant select (
  id, slug, title, description, level, category, total_exercises,
  published_at, created_at,
  kind, included_in_plan, sort_order
) on public.programs to anon, authenticated;

-- ── 1c · Kursgruppe je Kursrunde ─────────────────────────────────────────────
-- Eine Kursrunde = ein Zugangs-Code (trägt schon drip_start_date). Kein
-- Spalten-Revoke hier: RLS lässt nur Admins Zeilen sehen (siehe Kopf).

alter table public.access_codes
  add column if not exists whatsapp_url text;

comment on column public.access_codes.whatsapp_url is
  'Kursgruppe dieser Runde; überschreibt programs.whatsapp_url. Herausgabe nur über program_whatsapp_url().';

-- ── 2 · Rangfolge der Abo-Stufen ─────────────────────────────────────────────
-- Spiegel von app/lib/plan.ts (PLAN_RANK). Unbekannt/null = 0 (fail closed).

create or replace function public.plan_rank(p_plan text)
returns integer
language sql
immutable
set search_path to 'public', 'pg_catalog'
as $function$
  select case p_plan
           when 'vip'     then 2
           when 'premium' then 1
           else 0
         end;
$function$;

grant execute on function public.plan_rank(text) to anon, authenticated, service_role;

-- ── 3 · Zugriff auf einen Kurs ───────────────────────────────────────────────
-- Spiegel von resolveAccess() in app/lib/course-access.ts.
-- SECURITY DEFINER, weil sie aus RLS-Policies heraus enrollments und profiles
-- lesen muss, unabhängig von deren eigenen Policies.

create or replace function public.has_program_access(p_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $function$
  select auth.uid() is not null
     and (
          public.is_admin_user(auth.uid())
       or exists (
            select 1 from public.enrollments e
             where e.user_id = auth.uid()
               and e.program_id = p_program_id
               and coalesce(e.status, 'active') = 'active'
          )
       or exists (
            select 1
              from public.programs p
              join public.profiles pr on pr.id = auth.uid()
             where p.id = p_program_id
               and p.included_in_plan is not null
               and public.plan_rank(pr.plan) >= public.plan_rank(p.included_in_plan)
          )
     );
$function$;

revoke execute on function public.has_program_access(uuid) from public, anon;
grant execute on function public.has_program_access(uuid) to authenticated, service_role;

-- ── 4 · Abschnitte ───────────────────────────────────────────────────────────

create table if not exists public.program_sections (
  id         uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  slug       text not null,
  title      text not null,
  sort_order integer not null default 100,
  unique (program_id, slug)
);

create index if not exists program_sections_program_idx
  on public.program_sections (program_id, sort_order);

-- ── 5 · Lektionen (öffentliche Gliederung) ───────────────────────────────────

create table if not exists public.lessons (
  id               uuid primary key default gen_random_uuid(),
  program_id       uuid not null references public.programs(id) on delete cascade,
  section_id       uuid references public.program_sections(id) on delete set null,
  slug             text not null,
  sort_order       integer not null default 100,
  title            text not null,
  subtitle         text,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  media_kind       text not null default 'video'
                   check (media_kind in ('video', 'audio', 'text')),
  -- Drip: Lektion wird am Tag N der Kursrunde frei (null = sofort). Geprüft
  -- nur in app/lib/course-access.ts, nicht hier.
  unlock_day       integer check (unlock_day is null or unlock_day between 1 and 366),
  -- Aufzeichnung eines Termins (Bibliotheken).
  event_id         uuid references public.events(id) on delete set null,
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (program_id, slug)
);

create index if not exists lessons_program_idx
  on public.lessons (program_id, sort_order);
create index if not exists lessons_section_idx
  on public.lessons (section_id);

-- ── 6 · Inhalt (nur mit Zugriff) ─────────────────────────────────────────────

create table if not exists public.lesson_contents (
  lesson_id  uuid primary key references public.lessons(id) on delete cascade,
  body_md    text,
  video_guid text,
  updated_at timestamptz not null default now()
);

create table if not exists public.lesson_attachments (
  id           uuid primary key default gen_random_uuid(),
  lesson_id    uuid not null references public.lessons(id) on delete cascade,
  title        text not null,
  kind         text not null default 'pdf' check (kind in ('pdf', 'link')),
  storage_path text,
  url          text,
  sort_order   integer not null default 100,
  -- Genau eine Quelle: Datei im Storage ODER externer Link.
  constraint lesson_attachments_one_source
    check ((storage_path is null) <> (url is null))
);

create index if not exists lesson_attachments_lesson_idx
  on public.lesson_attachments (lesson_id, sort_order);

-- ── 7 · Fortschritt je Lektion ───────────────────────────────────────────────
-- day_completions (0008) bleibt für das Rhythmus Fundament unberührt.

create table if not exists public.lesson_completions (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  lesson_id    uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index if not exists lesson_completions_lesson_idx
  on public.lesson_completions (lesson_id);

-- ── 8 · RLS ──────────────────────────────────────────────────────────────────

alter table public.program_sections   enable row level security;
alter table public.lessons            enable row level security;
alter table public.lesson_contents    enable row level security;
alter table public.lesson_attachments enable row level security;
alter table public.lesson_completions enable row level security;

-- Gliederung: für alle sichtbar.
create policy program_sections_select_all on public.program_sections
  for select using (true);

-- Zwei Policies statt einer mit OR: anon soll is_admin_user() nie auswerten
-- müssen. Alles, was is_admin_user()/has_program_access() ruft, gilt nur
-- `to authenticated`.
create policy lessons_select_published on public.lessons
  for select to anon, authenticated using (published_at is not null);
create policy admins_read_all_lessons on public.lessons
  for select to authenticated using (public.is_admin_user(auth.uid()));

-- Inhalt: veröffentlichte Lektion (Admin sieht auch Entwürfe) UND Zugriff.
create policy lesson_contents_select_access on public.lesson_contents
  for select to authenticated using (
    exists (
      select 1 from public.lessons l
       where l.id = lesson_contents.lesson_id
         and (l.published_at is not null or public.is_admin_user(auth.uid()))
         and public.has_program_access(l.program_id)
    )
  );

create policy lesson_attachments_select_access on public.lesson_attachments
  for select to authenticated using (
    exists (
      select 1 from public.lessons l
       where l.id = lesson_attachments.lesson_id
         and (l.published_at is not null or public.is_admin_user(auth.uid()))
         and public.has_program_access(l.program_id)
    )
  );

-- Schreiben: nur Admin (Coach-Bereich). Der Seed läuft mit service_role.
create policy admins_write_program_sections on public.program_sections
  for all to authenticated using (public.is_admin_user(auth.uid()))
  with check (public.is_admin_user(auth.uid()));
create policy admins_write_lessons on public.lessons
  for all to authenticated using (public.is_admin_user(auth.uid()))
  with check (public.is_admin_user(auth.uid()));
create policy admins_write_lesson_contents on public.lesson_contents
  for all to authenticated using (public.is_admin_user(auth.uid()))
  with check (public.is_admin_user(auth.uid()));
create policy admins_write_lesson_attachments on public.lesson_attachments
  for all to authenticated using (public.is_admin_user(auth.uid()))
  with check (public.is_admin_user(auth.uid()));

-- Haken: eigene lesen/setzen/löschen; setzen nur mit Zugriff auf den Kurs.
create policy lesson_completions_select_own on public.lesson_completions
  for select to authenticated using (auth.uid() = user_id);
create policy lesson_completions_insert_own on public.lesson_completions
  for insert to authenticated with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.lessons l
       where l.id = lesson_completions.lesson_id
         and public.has_program_access(l.program_id)
    )
  );
create policy lesson_completions_delete_own on public.lesson_completions
  for delete to authenticated using (auth.uid() = user_id);
create policy admins_read_all_lesson_completions on public.lesson_completions
  for select to authenticated using (public.is_admin_user(auth.uid()));

-- ── 9 · Grants (explizit; Supabase-Defaults zuerst entziehen) ───────────────
-- Inhalt bekommt anon gar nicht erst: die Policy ruft has_program_access(),
-- das anon nicht ausführen darf — ohne Grant gibt es statt eines Fehlers
-- schlicht keinen Zugriff.

revoke all on public.program_sections, public.lessons, public.lesson_contents,
              public.lesson_attachments, public.lesson_completions
  from anon, authenticated;

grant select on public.program_sections, public.lessons to anon, authenticated;
grant insert, update, delete on public.program_sections, public.lessons to authenticated;

grant select, insert, update, delete on public.lesson_contents, public.lesson_attachments
  to authenticated;

-- Haken werden gesetzt oder gelöscht, nie editiert (wie 0008).
grant select, insert, delete on public.lesson_completions to authenticated;

grant all on public.program_sections, public.lessons, public.lesson_contents,
             public.lesson_attachments, public.lesson_completions
  to service_role;

-- ── 10 · Kursgruppe herausgeben ──────────────────────────────────────────────
-- null ohne Zugriff. Sonst: Link der Kursrunde (access_codes des aktiven
-- Enrollments), sonst der Kurslink.

create or replace function public.program_whatsapp_url(p_program_id uuid)
returns text
language plpgsql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_uid uuid := auth.uid();
  v_url text;
begin
  if v_uid is null or not public.has_program_access(p_program_id) then
    return null;
  end if;

  select ac.whatsapp_url into v_url
    from public.enrollments e
    join public.access_codes ac on ac.id = e.access_code_id
   where e.user_id = v_uid
     and e.program_id = p_program_id
     and coalesce(e.status, 'active') = 'active'
     and ac.whatsapp_url is not null
     and ac.whatsapp_url <> ''
   limit 1;

  if v_url is not null then
    return v_url;
  end if;

  select nullif(p.whatsapp_url, '') into v_url
    from public.programs p
   where p.id = p_program_id;

  return v_url;
end;
$function$;

revoke execute on function public.program_whatsapp_url(uuid) from public, anon;
grant execute on function public.program_whatsapp_url(uuid) to authenticated, service_role;

-- ── 11 · Zoom-Tür über plan_rank / has_program_access ───────────────────────
-- Gleiche Signatur wie 0006/0009, damit die Grants erhalten bleiben.
-- Verhalten für premium/vip unverändert (VIP öffnet beide Türen, Premium nur
-- seine). Bei visibility 'program' entscheidet jetzt has_program_access():
-- aktives Enrollment wie bisher, zusätzlich Admin und Abo-Stufe, falls der
-- Kurs im Abo enthalten ist.

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

  if v_visibility = 'public' then
    return v_zoom;
  end if;

  if v_uid is null then
    return null;
  end if;

  if v_visibility = 'members' then
    return v_zoom;
  end if;

  if v_visibility in ('premium', 'vip') then
    select plan into v_plan from public.profiles where id = v_uid;
    if public.plan_rank(v_plan) >= public.plan_rank(v_visibility) then
      return v_zoom;
    end if;
    return null;
  end if;

  if v_visibility = 'program' then
    if v_program_id is null then
      return null;
    end if;
    if public.has_program_access(v_program_id) then
      return v_zoom;
    end if;
    return null;
  end if;

  return null;
end;
$function$;

revoke execute on function public.event_zoom_url(uuid) from public;
grant execute on function public.event_zoom_url(uuid) to anon, authenticated;
