-- ============================================================
-- DeckLayout — Ensure RLS policies exist on all tables
-- 002_ensure_rls.sql
-- Schema: deck_layout
-- ============================================================

DO $$ BEGIN

  ALTER TABLE IF EXISTS deck_layout.vessel ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'deck_layout' AND tablename = 'vessel' AND policyname = 'Allow all access') THEN
    EXECUTE 'CREATE POLICY "Allow all access" ON deck_layout.vessel FOR ALL USING (true) WITH CHECK (true)';
  END IF;

  ALTER TABLE IF EXISTS deck_layout.vessel_barrier ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'deck_layout' AND tablename = 'vessel_barrier' AND policyname = 'Allow all access') THEN
    EXECUTE 'CREATE POLICY "Allow all access" ON deck_layout.vessel_barrier FOR ALL USING (true) WITH CHECK (true)';
  END IF;

  ALTER TABLE IF EXISTS deck_layout.deck_load_zone ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'deck_layout' AND tablename = 'deck_load_zone' AND policyname = 'Allow all access') THEN
    EXECUTE 'CREATE POLICY "Allow all access" ON deck_layout.deck_load_zone FOR ALL USING (true) WITH CHECK (true)';
  END IF;

  ALTER TABLE IF EXISTS deck_layout.crane_curve_point ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'deck_layout' AND tablename = 'crane_curve_point' AND policyname = 'Allow all access') THEN
    EXECUTE 'CREATE POLICY "Allow all access" ON deck_layout.crane_curve_point FOR ALL USING (true) WITH CHECK (true)';
  END IF;

  ALTER TABLE IF EXISTS deck_layout.equipment_library ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'deck_layout' AND tablename = 'equipment_library' AND policyname = 'Allow all access') THEN
    EXECUTE 'CREATE POLICY "Allow all access" ON deck_layout.equipment_library FOR ALL USING (true) WITH CHECK (true)';
  END IF;

  ALTER TABLE IF EXISTS deck_layout.project ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'deck_layout' AND tablename = 'project' AND policyname = 'Allow all access') THEN
    EXECUTE 'CREATE POLICY "Allow all access" ON deck_layout.project FOR ALL USING (true) WITH CHECK (true)';
  END IF;

  ALTER TABLE IF EXISTS deck_layout.project_equipment ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'deck_layout' AND tablename = 'project_equipment' AND policyname = 'Allow all access') THEN
    EXECUTE 'CREATE POLICY "Allow all access" ON deck_layout.project_equipment FOR ALL USING (true) WITH CHECK (true)';
  END IF;

  ALTER TABLE IF EXISTS deck_layout.rao_entry ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'deck_layout' AND tablename = 'rao_entry' AND policyname = 'Allow all access') THEN
    EXECUTE 'CREATE POLICY "Allow all access" ON deck_layout.rao_entry FOR ALL USING (true) WITH CHECK (true)';
  END IF;

  ALTER TABLE IF EXISTS deck_layout.splash_zone_result ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'deck_layout' AND tablename = 'splash_zone_result' AND policyname = 'Allow all access') THEN
    EXECUTE 'CREATE POLICY "Allow all access" ON deck_layout.splash_zone_result FOR ALL USING (true) WITH CHECK (true)';
  END IF;

  ALTER TABLE IF EXISTS deck_layout.sea_state_limit ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'deck_layout' AND tablename = 'sea_state_limit' AND policyname = 'Allow all access') THEN
    EXECUTE 'CREATE POLICY "Allow all access" ON deck_layout.sea_state_limit FOR ALL USING (true) WITH CHECK (true)';
  END IF;

  ALTER TABLE IF EXISTS deck_layout.scatter_diagram_entry ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'deck_layout' AND tablename = 'scatter_diagram_entry' AND policyname = 'Allow all access') THEN
    EXECUTE 'CREATE POLICY "Allow all access" ON deck_layout.scatter_diagram_entry FOR ALL USING (true) WITH CHECK (true)';
  END IF;

  ALTER TABLE IF EXISTS deck_layout.weather_window_result ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'deck_layout' AND tablename = 'weather_window_result' AND policyname = 'Allow all access') THEN
    EXECUTE 'CREATE POLICY "Allow all access" ON deck_layout.weather_window_result FOR ALL USING (true) WITH CHECK (true)';
  END IF;

END $$;
