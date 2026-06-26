-- ─────────────────────────────────────────────────────────────────────────────
-- saved_patterns — Unterteilung (subdivision) pro Pattern persistieren
--
-- Bisher wurde beim Speichern nur die notation gesichert, nicht das Raster, in
-- dem sie gemeint war. Ein Pattern mit 7 Schlägen × Achtel (14 Zellen, 8n) lud
-- daher als 16n zurück → falsche Gruppierung/Zählung, Schläge-Chip ohne aktiven
-- Wert (14 ist kein sauberes Vielfaches der 16n-Schrittweite 4).
--
-- subdivision spiegelt SubdivisionKey im Tool: '4n' | '8n' | '16n' | '32n'.
-- default '16n' = bisheriges Tool-Default; bestehende Zeilen werden damit
-- aufgefüllt (die echte historische Unterteilung ist nicht rekonstruierbar,
-- 16n entspricht aber dem alten Verhalten → keine Änderung für alte Patterns).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.saved_patterns
  add column subdivision text not null default '16n'
    check (subdivision in ('4n', '8n', '16n', '32n'));
