-- ─────────────────────────────────────────────────────────────────────────────
-- Drip-Unlock härten — Teilnehmer dürfen ihr Enrollment nicht selbst ändern
--
-- Review-Befund (2026-09-02): die Alt-Policies enrollments_update_own und
-- enrollments_delete_own (aus der Closed-Beta) ließen jeden eingeschriebenen
-- User per supabase-js sein eigenes drip_start_date auf NULL setzen (→ alle
-- 40 Tage offen) oder das Enrollment löschen und einen anderen Code einlösen.
--
-- Die App hat KEINEN Update-/Delete-Pfad auf enrollments (grep app/ →
-- nur SELECTs; einziger Schreibweg ist redeem_access_code, SECURITY DEFINER).
-- Deshalb: beide Policies droppen + Spalten-Privileg entziehen (Defense in
-- Depth, falls jemals wieder eine Update-Policy dazukommt).
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists enrollments_update_own on public.enrollments;
drop policy if exists enrollments_delete_own on public.enrollments;

revoke update (drip_start_date, access_code_id) on public.enrollments
  from authenticated, anon;
