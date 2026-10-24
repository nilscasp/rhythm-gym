-- ─────────────────────────────────────────────────────────────────────────────
-- 0015 · Lieder: gemeinsame Bibliothek der Mitglieder (nur Marke schule)
--
-- Mitglieder laden eigene Lieder als Handpan-Tab hoch und finden die der
-- anderen. Entscheidungen Nils (24.10.2026):
--   · lebt in der Lern-App, nur auf lernen.handpan.schule (nicht Rhythm Gym)
--   · hochladen und stöbern nur für zahlende Mitglieder
--   · neue Lieder sind erst nach Freigabe (Admin) für alle sichtbar
--
-- „Zahlendes Mitglied“ heißt hier: Abo ab premium ODER eine aktive
-- Einschreibung in einen Kurs. EINE Stelle: is_song_member(). Jede Funktion
-- fragt nur sie.
--
-- Muster wie 0013:
--   · Die Tabelle ist für authenticated nicht direkt lesbar oder schreibbar.
--     Lesen und Schreiben nur über SECURITY-DEFINER-Funktionen mit festem
--     search_path. anon bekommt nichts.
--   · Fehler tragen einen kurzen Code als Meldung (z. B. 'not_member'); die App
--     übersetzt ihn (app/lib/lieder.ts, LIEDER_ERRORS). Neue Codes nur zusammen
--     mit dieser Liste.
--   · Ein geändertes Lied geht wieder in die Prüfung (status 'eingereicht').
--   · Tabs aus einem Notepan-Import tragen data.privat = true und werden
--     abgelehnt ('privat_song'): fremde Lieder gehören nicht in die Bibliothek.
--
-- Alles additiv: nur neue Tabelle und Funktionen.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 0 · Wer darf? ────────────────────────────────────────────────────────────

create or replace function public.is_song_member()
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
            select 1 from public.profiles pr
             where pr.id = auth.uid() and public.plan_rank(pr.plan) >= 1
          )
       or exists (
            select 1 from public.enrollments e
             where e.user_id = auth.uid() and coalesce(e.status, 'active') = 'active'
          )
     );
$function$;

revoke execute on function public.is_song_member() from public, anon;
grant execute on function public.is_song_member() to authenticated, service_role;

-- ── 1 · Tabelle ──────────────────────────────────────────────────────────────

create table if not exists public.songs (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  title       text not null check (char_length(btrim(title)) between 1 and 120),
  artist      text check (artist is null or char_length(artist) <= 120),
  difficulty  text not null default 'Mittel' check (difficulty in ('Leicht', 'Mittel', 'Schwer')),
  handpan     text check (handpan is null or char_length(handpan) <= 80),
  bpm         integer check (bpm is null or bpm between 20 and 300),
  measures    integer check (measures is null or measures between 1 and 2000),
  -- Der Tab in Schreibform (SongSource aus app/lib/lieder/model.ts)
  data        jsonb not null check (pg_column_size(data) <= 600000),
  own_work    boolean not null check (own_work),
  status      text not null default 'eingereicht' check (status in ('eingereicht', 'freigegeben', 'abgelehnt')),
  review_note text check (review_note is null or char_length(review_note) <= 500),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.songs is
  'Lieder (0015): Handpan-Tabs der Mitglieder. Nur über list_songs/get_song/submit_song/delete_song/admin_review_song.';

create index if not exists songs_status_idx on public.songs (status, updated_at desc);
create index if not exists songs_owner_idx on public.songs (owner_id);

alter table public.songs enable row level security;
-- Keine Policies für authenticated: alles läuft über die Funktionen unten.
revoke all on public.songs from anon, authenticated;
grant all on public.songs to service_role;

-- ── 2 · Lesen ────────────────────────────────────────────────────────────────
-- p_scope: 'alle' (freigegeben) · 'meine' (eigene, jeder Status) · 'pruefen' (Admin: eingereicht)

create or replace function public.list_songs(p_scope text default 'alle')
returns table (
  id uuid, title text, artist text, difficulty text, handpan text, bpm integer, measures integer,
  status text, review_note text, author_name text, is_mine boolean, updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $function$
begin
  if not public.is_song_member() then
    raise exception 'not_member';
  end if;
  if p_scope = 'pruefen' and not public.is_admin_user(auth.uid()) then
    raise exception 'not_admin';
  end if;
  return query
    select s.id, s.title, s.artist, s.difficulty, s.handpan, s.bpm, s.measures, s.status,
           case when s.owner_id = auth.uid() or public.is_admin_user(auth.uid()) then s.review_note end,
           public.member_display_name(s.owner_id),
           s.owner_id = auth.uid(),
           s.updated_at
      from public.songs s
     where case p_scope
             when 'meine'   then s.owner_id = auth.uid()
             when 'pruefen' then s.status = 'eingereicht'
             else s.status = 'freigegeben'
           end
     order by s.updated_at desc
     limit 500;
end;
$function$;

revoke execute on function public.list_songs(text) from public, anon;
grant execute on function public.list_songs(text) to authenticated, service_role;

-- Ein Lied mit Tab. Sichtbar, wenn freigegeben, eigenes oder Admin.
create or replace function public.get_song(p_id uuid)
returns table (
  id uuid, title text, artist text, difficulty text, handpan text, status text, review_note text,
  author_name text, is_mine boolean, data jsonb, updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $function$
begin
  if not public.is_song_member() then
    raise exception 'not_member';
  end if;
  return query
    select s.id, s.title, s.artist, s.difficulty, s.handpan, s.status,
           case when s.owner_id = auth.uid() or public.is_admin_user(auth.uid()) then s.review_note end,
           public.member_display_name(s.owner_id),
           s.owner_id = auth.uid(),
           s.data, s.updated_at
      from public.songs s
     where s.id = p_id
       and (s.status = 'freigegeben' or s.owner_id = auth.uid() or public.is_admin_user(auth.uid()));
end;
$function$;

revoke execute on function public.get_song(uuid) from public, anon;
grant execute on function public.get_song(uuid) to authenticated, service_role;

-- ── 3 · Schreiben ────────────────────────────────────────────────────────────
-- Neu (p_id null) oder eigenes Lied ändern. Danach immer 'eingereicht'.

create or replace function public.submit_song(
  p_id uuid,
  p_title text,
  p_artist text,
  p_difficulty text,
  p_handpan text,
  p_bpm integer,
  p_measures integer,
  p_data jsonb,
  p_own_work boolean
)
returns uuid
language plpgsql
volatile
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_pending integer;
begin
  if not public.is_song_member() then raise exception 'not_member'; end if;
  if coalesce(p_own_work, false) is not true then raise exception 'not_own_work'; end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 120 then raise exception 'invalid_title'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or jsonb_typeof(p_data -> 'sections') <> 'array'
     or pg_column_size(p_data) > 600000 then
    raise exception 'invalid_data';
  end if;
  if coalesce((p_data ->> 'privat')::boolean, false) then raise exception 'privat_song'; end if;

  if p_id is null then
    select count(*) into v_pending from public.songs where owner_id = v_uid and status = 'eingereicht';
    if v_pending >= 10 then raise exception 'too_many_pending'; end if;
    insert into public.songs (owner_id, title, artist, difficulty, handpan, bpm, measures, data, own_work)
    values (v_uid, btrim(p_title), nullif(btrim(coalesce(p_artist, '')), ''),
            coalesce(p_difficulty, 'Mittel'), nullif(btrim(coalesce(p_handpan, '')), ''),
            p_bpm, p_measures, p_data, true)
    returning songs.id into v_id;
    return v_id;
  end if;

  update public.songs s
     set title = btrim(p_title),
         artist = nullif(btrim(coalesce(p_artist, '')), ''),
         difficulty = coalesce(p_difficulty, s.difficulty),
         handpan = nullif(btrim(coalesce(p_handpan, '')), ''),
         bpm = p_bpm,
         measures = p_measures,
         data = p_data,
         own_work = true,
         status = 'eingereicht',
         review_note = null,
         reviewed_by = null,
         reviewed_at = null,
         updated_at = now()
   where s.id = p_id and s.owner_id = v_uid
  returning s.id into v_id;
  if v_id is null then raise exception 'not_found'; end if;
  return v_id;
end;
$function$;

revoke execute on function public.submit_song(uuid, text, text, text, text, integer, integer, jsonb, boolean) from public, anon;
grant execute on function public.submit_song(uuid, text, text, text, text, integer, integer, jsonb, boolean) to authenticated, service_role;

-- Eigenes Lied löschen; Admin darf jedes löschen.
create or replace function public.delete_song(p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path to 'public', 'pg_catalog'
as $function$
begin
  if not public.is_song_member() then raise exception 'not_member'; end if;
  delete from public.songs s
   where s.id = p_id and (s.owner_id = auth.uid() or public.is_admin_user(auth.uid()));
  if not found then raise exception 'not_found'; end if;
end;
$function$;

revoke execute on function public.delete_song(uuid) from public, anon;
grant execute on function public.delete_song(uuid) to authenticated, service_role;

-- ── 4 · Freigabe (Admin) ─────────────────────────────────────────────────────

create or replace function public.admin_review_song(p_id uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql
volatile
security definer
set search_path to 'public', 'pg_catalog'
as $function$
begin
  if not public.is_admin_user(auth.uid()) then raise exception 'not_admin'; end if;
  if p_note is not null and char_length(p_note) > 500 then raise exception 'invalid_note'; end if;
  update public.songs
     set status = case when p_approve then 'freigegeben' else 'abgelehnt' end,
         review_note = nullif(btrim(coalesce(p_note, '')), ''),
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = p_id;
  if not found then raise exception 'not_found'; end if;
end;
$function$;

revoke execute on function public.admin_review_song(uuid, boolean, text) from public, anon;
grant execute on function public.admin_review_song(uuid, boolean, text) to authenticated, service_role;
