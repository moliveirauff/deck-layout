-- DeckLayout — Add UNIQUE constraints to result tables
-- Required for upsert(onConflict: ...) to work correctly in Supabase.
-- Without these, upsert falls back to INSERT and creates duplicate rows.

-- lowering_result: one per project_equipment
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_lowering_result_pe') THEN
    ALTER TABLE deck_layout.lowering_result ADD CONSTRAINT uq_lowering_result_pe UNIQUE (project_equipment_id);
  END IF;
END $$;

-- stability_result: one per project
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_stability_result_project') THEN
    ALTER TABLE deck_layout.stability_result ADD CONSTRAINT uq_stability_result_project UNIQUE (project_id);
  END IF;
END $$;

-- sea_fastening_result: one per project_equipment
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_sea_fastening_result_pe') THEN
    ALTER TABLE deck_layout.sea_fastening_result ADD CONSTRAINT uq_sea_fastening_result_pe UNIQUE (project_equipment_id);
  END IF;
END $$;

-- weather_window_result: one per project_equipment
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_weather_window_result_pe') THEN
    ALTER TABLE deck_layout.weather_window_result ADD CONSTRAINT uq_weather_window_result_pe UNIQUE (project_equipment_id);
  END IF;
END $$;
