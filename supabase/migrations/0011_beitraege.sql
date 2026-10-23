-- ─────────────────────────────────────────────────────────────────────────────
-- 0011 · Beiträge von Nils und Neuigkeiten (Umzug von Skool, Bauabschnitt E)
--
-- Plan: Plans/umzug-von-skool.md. Die Plattform hat keinen Feed und keinen
-- Chat (Gespräch läuft auf WhatsApp). Statt Feed:
--
--   · posts       — Beiträge von Nils (Text, optional Bunny-Video), je mit
--                   Zielgruppe members / premium / vip. Schreiben nur Admin
--                   (Coach-Bereich), lesen nur angemeldet und nur, wenn die
--                   Stufe passt.
--   · news_state  — EINE Zeile je Person: wann sie zuletzt in die Glocke
--                   geschaut hat. Neuigkeiten selbst werden in der App
--                   berechnet (app/lib/news.ts), nicht gespeichert.
--
-- Stufen: dieselbe Rangfolge wie überall — plan_rank() aus 0010
-- (free < premium < vip). VIP liest Premium-Beiträge, Premium keine VIP-Beiträge.
-- Das TypeScript-Gegenstück ist app/lib/plan.ts.
--
-- Alles additiv: zwei neue Tabellen, eine neue Funktion. Nichts Bestehendes
-- wird verändert.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1 · Beiträge ─────────────────────────────────────────────────────────────

create table if not exists public.posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null check (length(btrim(title)) > 0),
  body_md      text,
  video_guid   text,
  audience     text not null default 'members'
               check (audience in ('members', 'premium', 'vip')),
  -- null = Entwurf. Ein Datum in der Zukunft = geplant (erscheint dann).
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references public.profiles(id) on delete set null,
  -- Dieselbe Form wie app/lib/slug.ts (isValidSlug).
  constraint posts_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80)
);

comment on table public.posts is
  'Beiträge von Nils (Abschnitt E). Lesen: angemeldet + veröffentlicht + Stufe passt (can_read_post). Schreiben: Admin.';
comment on column public.posts.audience is
  'members = jede angemeldete Person · premium = ab Premium (auch VIP) · vip = nur VIP';
comment on column public.posts.published_at is
  'null = Entwurf. Sichtbar erst ab diesem Zeitpunkt.';

create index if not exists posts_published_idx
  on public.posts (published_at desc)
  where published_at is not null;

-- ── 2 · Darf diese Person einen Beitrag dieser Zielgruppe lesen? ────────────
-- SECURITY DEFINER, weil sie aus der RLS-Policy heraus profiles lesen muss,
-- unabhängig von dessen eigenen Policies. Unbekannte Zielgruppe → false.

create or replace function public.can_read_post(p_audience text)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $function$
  select auth.uid() is not null
     and (
          p_audience = 'members'
       or (
            p_audience in ('premium', 'vip')
            and exists (
              select 1 from public.profiles pr
               where pr.id = auth.uid()
                 and public.plan_rank(pr.plan) >= public.plan_rank(p_audience)
            )
          )
     );
$function$;

revoke execute on function public.can_read_post(text) from public, anon;
grant execute on function public.can_read_post(text) to authenticated, service_role;

-- ── 3 · RLS für Beiträge ─────────────────────────────────────────────────────
-- Zwei Policies statt einer mit OR (wie 0010): Leser werten is_admin_user()
-- nicht aus, Admin sieht auch Entwürfe und geplante Beiträge.

alter table public.posts enable row level security;

drop policy if exists posts_select_published on public.posts;
create policy posts_select_published on public.posts
  for select to authenticated using (
    published_at is not null
    and published_at <= now()
    and public.can_read_post(audience)
  );

drop policy if exists admins_all_posts on public.posts;
create policy admins_all_posts on public.posts
  for all to authenticated
  using (public.is_admin_user(auth.uid()))
  with check (public.is_admin_user(auth.uid()));

-- anon bekommt nichts. authenticated darf schreiben — RLS lässt nur Admin durch.
revoke all on public.posts from anon, authenticated;
grant select, insert, update, delete on public.posts to authenticated;
grant all on public.posts to service_role;

-- ── 4 · Wann zuletzt in die Neuigkeiten geschaut ─────────────────────────────

create table if not exists public.news_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  seen_at timestamptz not null default now()
);

comment on table public.news_state is
  'Eine Zeile je Person: Zeitpunkt, zu dem sie zuletzt die Neuigkeiten geöffnet hat. Ungelesen = danach veröffentlicht.';

alter table public.news_state enable row level security;

-- Nur die eigene Zeile. seen_at darf nicht in die Zukunft geschoben werden
-- (ein paar Minuten Spiel für Uhren-Abweichung) — sonst wäre „ungelesen“
-- für Wochen stumm.
drop policy if exists news_state_select_own on public.news_state;
create policy news_state_select_own on public.news_state
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists news_state_insert_own on public.news_state;
create policy news_state_insert_own on public.news_state
  for insert to authenticated with check (
    auth.uid() = user_id and seen_at <= now() + interval '5 minutes'
  );

drop policy if exists news_state_update_own on public.news_state;
create policy news_state_update_own on public.news_state
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and seen_at <= now() + interval '5 minutes');

-- Kein DELETE: ohne Zeile gälte wieder alles als ungelesen.
revoke all on public.news_state from anon, authenticated;
grant select, insert, update on public.news_state to authenticated;
grant all on public.news_state to service_role;
