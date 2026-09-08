-- ─────────────────────────────────────────────────────────────────────────────
-- 0006 · Termine (Phasenplan v2 §4, KW39–40)
--
-- Das erste sichtbare Skool-Ersatzstück. Zwei Eigenschaften bestimmen den
-- Entwurf:
--
-- 1) Titel, Beschreibung und Zeit sind ÖFFENTLICH — der Kalender ist auch ein
--    Verkaufskanal. Wer nicht eingeloggt ist, soll sehen, was stattfindet.
-- 2) Die Zoom-Tür ist es NICHT. `zoom_url` hängt an `visibility`.
--
-- Weil RLS zeilen- und nicht spaltenweise wirkt, würde eine öffentliche
-- SELECT-Policy die Zoom-Links mit ausliefern. Darum zwei Schichten:
--   · Spalten-Privileg auf `zoom_url` für anon/authenticated entzogen
--     (PostgREST kann sie damit gar nicht erst anfragen)
--   · `event_zoom_url(uuid)` als SECURITY DEFINER — der einzige Weg zur Tür,
--     mit der Zugriffsprüfung im Rumpf.
-- Dieselbe Logik liegt zusätzlich in app/lib/event-access.ts, damit die
-- Oberfläche weiß, ob sie die Tür oder einen Kauf-Hinweis zeigt. Die Wahrheit
-- steht hier; TypeScript entscheidet nur über die Darstellung.
--
-- Wiederkehrende Termine sind n Einzelzeilen mit gemeinsamer `series_id` —
-- kein RRULE-Motor (Phasenplan §4, bewusste Vereinfachung).
-- Zeitzone: timestamptz, Anzeige in Europe/Berlin wie beim Drip.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),

  -- Übersetzbare Felder als jsonb ({"de": "…", "en": "…"}) statt eigener
  -- Translations-Tabelle: weniger Joins, ein Admin-Formular (Phasenplan §3).
  title       jsonb not null,
  description jsonb,

  starts_at   timestamptz not null,
  ends_at     timestamptz,

  kind        text not null
              check (kind in ('live_training','qa','workshop','retreat','community')),

  location    text,
  zoom_url    text,

  -- Kurs-Termin: sichtbar für alle, Tür nur für Eingeschriebene.
  program_id  uuid references public.programs(id) on delete set null,

  visibility  text not null default 'members'
              check (visibility in ('public','members','premium','program')),

  -- Serie = n Einzeltermine mit derselben series_id.
  series_id   uuid,

  -- Nicht jeder Termin hat eine Uhrzeit („The Handpan Path" steht auf der
  -- Website seit jeher nur mit Datum). Ohne dieses Feld müsste eine erfunden
  -- werden. true = nur Datum zeigen.
  all_day     boolean not null default false,

  -- Ziel für die Termine-Leiste auf handpan.schule. Leer = /termine/{id}.
  website_link text,

  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz
);

comment on column public.events.zoom_url is
  'Nur über event_zoom_url() lesbar — Spalten-Privileg für anon/authenticated entzogen.';
comment on column public.events.visibility is
  'public = für alle · members = eingeloggt · premium = Innerer Kreis · program = Enrollment im program_id';

create index if not exists events_starts_at_idx on public.events (starts_at);
create index if not exists events_series_idx on public.events (series_id) where series_id is not null;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.events enable row level security;

-- Lesen darf jeder, auch ausgeloggt: der Kalender ist ein Schaufenster.
drop policy if exists events_select_all on public.events;
create policy events_select_all on public.events
  for select using (true);

-- Schreiben darf nur Nils (is_admin_user, wie im Coach-Bereich).
drop policy if exists events_admin_write on public.events;
create policy events_admin_write on public.events
  for all
  using (public.is_admin_user(auth.uid()))
  with check (public.is_admin_user(auth.uid()));

-- ── Die Zoom-Tür ist keine normale Spalte ────────────────────────────────────
-- Defense in Depth: selbst wenn jemals eine großzügigere SELECT-Policy
-- dazukommt, kann PostgREST diese Spalte für anon/authenticated nicht liefern.
--
-- Achtung, das ist die Stelle, an der man sich täuscht: Supabase vergibt ein
-- TABELLENWEITES select an anon und authenticated. Solange das steht, ist ein
-- `revoke select (zoom_url)` wirkungslos — geprüft am 2026-09-08, die Spalte
-- blieb lesbar. Also erst das breite Recht entziehen, dann Spalte für Spalte
-- zurückgeben. Wer hier eine Spalte ergänzt, muss sie in dieser Liste nachtragen.
revoke select on public.events from anon, authenticated;
grant select (
  id, title, description, starts_at, ends_at, kind, location,
  program_id, visibility, series_id, all_day, website_link, created_at, updated_at
) on public.events to anon, authenticated;

revoke insert, update, delete on public.events from anon, authenticated;

-- ── Zugriffsregel ────────────────────────────────────────────────────────────
-- Gibt die Zoom-Tür zurück, wenn der Aufrufer sie haben darf, sonst null.
-- SECURITY DEFINER, damit die entzogenen Spalten-Privilegien nicht greifen;
-- search_path fest, damit niemand die Auflösung von `profiles` umbiegt.
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

  if v_visibility = 'premium' then
    if exists (
      select 1 from public.profiles
       where id = v_uid and plan = 'premium'
    ) then
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
