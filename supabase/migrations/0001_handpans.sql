-- ─────────────────────────────────────────────────────────────────────────────
-- handpans — per-user instrument layouts (Ding + Tonfelder), plus aktiver-Pan-Pointer
--
-- Erste versionierte Migration. Bisher lag das Schema nur im Supabase-Dashboard;
-- ab hier ist supabase/migrations/ die Source of Truth.
--
-- notes (jsonb) spiegelt HandpanNote[]: { id, label, x, y, r }; notes[0] = Ding.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.handpans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  scale_name  text,
  notes       jsonb not null,
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz default timezone('utc', now())
);

create index handpans_user_id_idx on public.handpans (user_id);

alter table public.handpans enable row level security;

create policy handpans_select_own on public.handpans
  for select using (auth.uid() = user_id);
create policy handpans_insert_own on public.handpans
  for insert with check (auth.uid() = user_id);
create policy handpans_update_own on public.handpans
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy handpans_delete_own on public.handpans
  for delete using (auth.uid() = user_id);

-- Aktives Instrument pro User. ON DELETE SET NULL → gelöschter aktiver Pan
-- nullt den Pointer → Playback fällt sauber auf den A4/C2-Default zurück.
alter table public.profiles
  add column active_handpan_id uuid references public.handpans(id) on delete set null;
