-- ─────────────────────────────────────────────────────────────────────────────
-- 0016 · Programm „Rhythmus Fundament 1.5"
--
-- 22 Tage (02.–23.11.2026), nur für Teilnehmende von RF 1.0. Eigenes
-- Programm, damit Zugang, Drip und Haken (day_completions) unabhängig vom
-- RF-1.0-Enrollment laufen. Zugang wie immer nur über enrollments:
-- Zugangs-Code (redeem_access_code) aus /coach, Kurs „Rhythmus Fundament 1.5".
--
-- Den Kalender trägt die App (RF15_START_DATE in
-- data/rhythmusfundament-1-5-days.ts): hat ein Enrollment kein eigenes
-- drip_start_date, gilt Tag 1 = 2026-11-02. Rein additiv, idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.programs (slug, title, description, level, category, total_exercises, published_at)
values (
  'rhythmusfundament-1-5',
  'Rhythmus Fundament 1.5',
  '22 Tage für Teilnehmende von Rhythmus Fundament 1.0. Jeder Tag in drei Blöcken: Fingerübung, kompositorisches Denken, Muskelgedächtnis.',
  'fortgeschritten',
  'rhythmusfundament',
  0,
  now()
)
on conflict (slug) do nothing;
