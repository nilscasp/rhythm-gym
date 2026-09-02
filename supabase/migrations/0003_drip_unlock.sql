-- ─────────────────────────────────────────────────────────────────────────────
-- Drip-Unlock — Kurstage werden ab einem Startdatum täglich freigeschaltet
--
-- Ein Zugangs-Code kann ein `drip_start_date` tragen. Beim Einlösen wird das
-- Datum (plus die Code-Referenz) in das Enrollment kopiert. Die Freischaltung
-- selbst wird NICHT in der DB berechnet (Supabase läuft UTC) — sie lebt
-- ausschließlich in app/lib/course-access.ts: Tag N ist offen, sobald
-- heute (Europe/Berlin) >= drip_start_date + (N-1) Tage.
--
-- NULL = alles sofort offen. Alle bestehenden Enrollments bleiben damit
-- unverändert (Grandfathering, kein Backfill).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.access_codes
  add column if not exists drip_start_date date;

alter table public.enrollments
  add column if not exists drip_start_date date,
  add column if not exists access_code_id uuid
    references public.access_codes(id) on delete set null;

-- redeem_access_code(): identisch zu fundament_access_gating, plus Kopie von
-- drip_start_date + access_code_id in das neue Enrollment. Der
-- already_enrolled-Pfad bleibt VOR den Code-Checks → ein zweiter Aufruf
-- überschreibt nie ein bestehendes drip_start_date.
create or replace function public.redeem_access_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
  rec access_codes%rowtype;
  v_inserted integer;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
  end if;

  select * into rec from access_codes
   where upper(trim(code)) = upper(trim(p_code))
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  if exists (
    select 1 from enrollments
    where user_id = v_user and program_id = rec.program_id
  ) then
    return jsonb_build_object('ok', true, 'already_enrolled', true);
  end if;

  if not rec.active then
    return jsonb_build_object('ok', false, 'error', 'inactive');
  end if;
  if rec.expires_at is not null and rec.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;
  if rec.uses >= rec.max_uses then
    return jsonb_build_object('ok', false, 'error', 'exhausted');
  end if;

  insert into enrollments (user_id, program_id, status, drip_start_date, access_code_id)
  values (v_user, rec.program_id, 'active', rec.drip_start_date, rec.id)
  on conflict (user_id, program_id) do nothing
  returning 1 into v_inserted;

  if v_inserted is null then
    return jsonb_build_object('ok', true, 'already_enrolled', true);
  end if;

  update access_codes set uses = uses + 1 where id = rec.id;
  return jsonb_build_object('ok', true, 'drip_start_date', rec.drip_start_date);
end;
$function$;
