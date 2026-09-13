-- ─────────────────────────────────────────────────────────────────────────────
-- day_completions — ein Kurstag ist abgehakt (pro User, Programm, Tagesnummer)
--
-- Warum eine eigene Tabelle und nicht 44 Pseudo-Zeilen in `exercises`:
-- `exercises`/`completions` tragen die Zyklus-2-Patterns (Tag 12–22, kind
-- kombi/pattern/spielweg) für den alten Player und die Coach-Zählung. Der
-- Tages-Fortschritt ist eine andere Aussage („ich habe diesen Tag gemacht")
-- und gilt für jeden Tag jedes Programms mit Tagesmodell.
--
-- Die Drip-Sperre wird NICHT hier geprüft — sie lebt ausschließlich in
-- app/lib/course-access.ts und wird in der Server-Action durchgesetzt. RLS
-- sorgt nur dafür, dass niemand fremde Haken liest, setzt oder löscht.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.day_completions (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  program_id   uuid not null references public.programs(id) on delete cascade,
  day_number   integer not null check (day_number between 1 and 366),
  completed_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, program_id, day_number)
);

create index if not exists day_completions_program_user_idx
  on public.day_completions (program_id, user_id);

alter table public.day_completions enable row level security;

create policy day_completions_select_own on public.day_completions
  for select using (auth.uid() = user_id);
create policy day_completions_insert_own on public.day_completions
  for insert with check (auth.uid() = user_id);
create policy day_completions_delete_own on public.day_completions
  for delete using (auth.uid() = user_id);
create policy admins_read_all_day_completions on public.day_completions
  for select using (public.is_admin_user(auth.uid()));

-- Haken werden gesetzt oder gelöscht, nie editiert (Defense in Depth wie 0004).
revoke update on public.day_completions from authenticated, anon;
