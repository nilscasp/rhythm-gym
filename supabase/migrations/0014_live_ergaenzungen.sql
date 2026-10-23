-- ─────────────────────────────────────────────────────────────────────────────
-- 0014 · Live-Ergänzungen (Umzug von Skool, Bauabschnitt H)
--
-- Plan: Plans/umzug-von-skool.md, Zeile H. Drei Stücke:
--
-- 1) AUFZEICHNUNGEN AN TERMINEN — keine neue Spalte an `events`.
--    Die Aufzeichnungen gibt es schon: Lektionen in Bibliotheken
--    (programs.kind = 'library', z. B. „VIP-Calls“, „Kompass Live“), und
--    `lessons.event_id` (Migration 0010) verknüpft eine Lektion mit ihrem
--    Termin. Die Video-GUID steht in `lesson_contents.video_guid` und ist nur
--    mit has_program_access() lesbar.
--    Damit sind Teilnahme und Aufzeichnung von selbst getrennt:
--      · Teilnahme    = events.visibility        (z. B. 'vip'  → nur Stufe 2)
--      · Aufzeichnung = programs.included_in_plan der Bibliothek
--                                                 (z. B. 'premium' → ab Stufe 1)
--    Eine zweite Video-Spalte an `events` hätte dieselbe Aufnahme doppelt
--    geführt und eine zweite Zugriffsregel neben has_program_access() gebraucht.
--    Neu ist nur ein Schreibweg für Nils: link_event_recording() legt die
--    Lektion samt Inhalt in einem Schritt an oder aktualisiert sie.
--
-- 2) FRAGE VORAB — Tabelle `event_questions`.
--    Lesen: die eigenen Fragen (RLS) und Admin alles. Schreiben ausschließlich
--    über submit_event_question() / withdraw_event_question() (SECURITY
--    DEFINER); anon/authenticated haben KEIN insert/update/delete.
--    Ob jemand fragen darf, entscheidet has_event_access() — dieselbe Regel
--    wie die Zoom-Tür (event_zoom_url, 0010), plus Admin. event_zoom_url()
--    bleibt hier bewusst unangetastet. TypeScript-Spiegel:
--    hasEventAccess()/canAskQuestion() in app/lib/event-access.ts.
--
-- 3) KALENDER-EXPORT braucht nichts in der DB: Titel und Zeit sind ohnehin
--    öffentlich (0006), die .ics enthält keinen Zoom-Link.
--
-- Additiv: neue Tabelle, neue Funktionen, ein neuer Index. Nichts Bestehendes
-- wird geändert oder gelöscht.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Aufzeichnungen: schneller Weg vom Termin zur Lektion ────────────────────

create index if not exists lessons_event_idx
  on public.lessons (event_id)
  where event_id is not null;

-- ── Zugriffsregel für Termine (ohne Zoom-Link) ──────────────────────────────

create or replace function public.has_event_access(p_event_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_visibility text;
  v_program_id uuid;
  v_uid        uuid := auth.uid();
  v_plan       text;
begin
  select visibility, program_id
    into v_visibility, v_program_id
    from public.events
   where id = p_event_id;

  if not found then
    return false;
  end if;

  if v_visibility = 'public' then
    return true;
  end if;

  if v_uid is null then
    return false;
  end if;

  if public.is_admin_user(v_uid) then
    return true;
  end if;

  if v_visibility = 'members' then
    return true;
  end if;

  if v_visibility in ('premium', 'vip') then
    select plan into v_plan from public.profiles where id = v_uid;
    return public.plan_rank(v_plan) >= public.plan_rank(v_visibility);
  end if;

  if v_visibility = 'program' then
    return v_program_id is not null and public.has_program_access(v_program_id);
  end if;

  return false;
end;
$function$;

revoke execute on function public.has_event_access(uuid) from public, anon;
grant execute on function public.has_event_access(uuid) to authenticated, service_role;

-- ── Fragen vorab ────────────────────────────────────────────────────────────

create table if not exists public.event_questions (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text not null
             check (char_length(btrim(body)) between 3 and 1000),
  created_at timestamptz not null default now()
);

comment on table public.event_questions is
  'Fragen vorab zu einem Termin. Lesen: eigene + Admin. Schreiben nur über submit_event_question()/withdraw_event_question().';

create index if not exists event_questions_event_idx
  on public.event_questions (event_id, created_at);
create index if not exists event_questions_user_idx
  on public.event_questions (user_id);

alter table public.event_questions enable row level security;

drop policy if exists event_questions_select_own on public.event_questions;
create policy event_questions_select_own on public.event_questions
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists admins_read_all_event_questions on public.event_questions;
create policy admins_read_all_event_questions on public.event_questions
  for select to authenticated
  using (public.is_admin_user(auth.uid()));

revoke all on public.event_questions from anon, authenticated;
grant select on public.event_questions to authenticated;
grant all on public.event_questions to service_role;

-- Frage einreichen: nur mit Zugang, nur vor Beginn, höchstens 3 je Termin.
create or replace function public.submit_event_question(p_event_id uuid, p_body text)
returns uuid
language plpgsql
volatile
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_uid       uuid := auth.uid();
  v_body      text := btrim(coalesce(p_body, ''));
  v_starts_at timestamptz;
  v_id        uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if char_length(v_body) < 3 or char_length(v_body) > 1000 then
    raise exception 'invalid_body' using errcode = '22023';
  end if;

  select starts_at into v_starts_at from public.events where id = p_event_id;
  if not found then
    raise exception 'unknown_event' using errcode = '22023';
  end if;

  if v_starts_at <= now() then
    raise exception 'event_started' using errcode = '22023';
  end if;

  if not public.has_event_access(p_event_id) then
    raise exception 'no_access' using errcode = '42501';
  end if;

  if (select count(*) from public.event_questions
       where event_id = p_event_id and user_id = v_uid) >= 3 then
    raise exception 'too_many_questions' using errcode = '22023';
  end if;

  insert into public.event_questions (event_id, user_id, body)
  values (p_event_id, v_uid, v_body)
  returning id into v_id;

  return v_id;
end;
$function$;

revoke execute on function public.submit_event_question(uuid, text) from public, anon;
grant execute on function public.submit_event_question(uuid, text) to authenticated;

-- Eigene Frage zurückziehen (löscht sie). Fremde Fragen: false, kein Fehler —
-- so verrät die Antwort nicht, ob es die ID gibt.
create or replace function public.withdraw_event_question(p_question_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return false;
  end if;

  delete from public.event_questions
   where id = p_question_id
     and user_id = v_uid;

  return found;
end;
$function$;

revoke execute on function public.withdraw_event_question(uuid) from public, anon;
grant execute on function public.withdraw_event_question(uuid) to authenticated;

-- ── Aufzeichnung verknüpfen (nur Admin) ─────────────────────────────────────
-- Legt in einer Bibliothek die Lektion zum Termin an (oder aktualisiert sie)
-- und setzt die Bunny-Video-ID. Schlüssel: (program_id, slug) mit
-- slug = 'termin-YYYY-MM-DD-<8 Zeichen der Termin-ID>' — einmal je Termin und
-- Bibliothek, erneutes Aufrufen überschreibt Titel und Video.

create or replace function public.link_event_recording(
  p_event_id   uuid,
  p_program_id uuid,
  p_video_guid text,
  p_title      text
)
returns uuid
language plpgsql
volatile
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_uid       uuid := auth.uid();
  v_guid      text := lower(btrim(coalesce(p_video_guid, '')));
  v_title     text := btrim(coalesce(p_title, ''));
  v_starts_at timestamptz;
  v_slug      text;
  v_lesson_id uuid;
begin
  if v_uid is null or not public.is_admin_user(v_uid) then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  if v_guid !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'invalid_video_guid' using errcode = '22023';
  end if;

  if char_length(v_title) < 1 or char_length(v_title) > 200 then
    raise exception 'invalid_title' using errcode = '22023';
  end if;

  select starts_at into v_starts_at from public.events where id = p_event_id;
  if not found then
    raise exception 'unknown_event' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.programs where id = p_program_id and kind = 'library'
  ) then
    raise exception 'not_a_library' using errcode = '22023';
  end if;

  v_slug := 'termin-'
         || to_char(v_starts_at at time zone 'Europe/Berlin', 'YYYY-MM-DD')
         || '-' || left(p_event_id::text, 8);

  insert into public.lessons (program_id, slug, title, media_kind, event_id, published_at)
  values (p_program_id, v_slug, v_title, 'video', p_event_id, now())
  on conflict (program_id, slug) do update
     set title        = excluded.title,
         event_id     = excluded.event_id,
         published_at = coalesce(public.lessons.published_at, excluded.published_at),
         updated_at   = now()
  returning id into v_lesson_id;

  insert into public.lesson_contents (lesson_id, video_guid)
  values (v_lesson_id, v_guid)
  on conflict (lesson_id) do update
     set video_guid = excluded.video_guid,
         updated_at = now();

  return v_lesson_id;
end;
$function$;

revoke execute on function public.link_event_recording(uuid, uuid, text, text) from public, anon;
grant execute on function public.link_event_recording(uuid, uuid, text, text) to authenticated;
