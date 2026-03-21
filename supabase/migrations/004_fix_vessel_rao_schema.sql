-- ============================================================
-- DeckLayout — Fix vessel_rao_entry schema
-- 004_fix_vessel_rao_schema.sql
--
-- Move vessel_rao_entry from public schema (where 003 created it
-- incorrectly) to the deck_layout schema.
-- Safe to run multiple times (idempotent).
-- ============================================================

-- Drop from public if it exists there
DROP TABLE IF EXISTS public.vessel_rao_entry;

-- Ensure the table exists in deck_layout (may already exist from seed)
CREATE TABLE IF NOT EXISTS deck_layout.vessel_rao_entry (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vessel_id                   uuid NOT NULL REFERENCES deck_layout.vessel(id) ON DELETE CASCADE,
  wave_direction_deg          numeric NOT NULL,
  wave_period_s               numeric NOT NULL,
  heave_amplitude_m_per_m     numeric NOT NULL,
  heave_phase_deg             numeric NOT NULL,
  roll_amplitude_deg_per_m    numeric NOT NULL,
  roll_phase_deg              numeric NOT NULL,
  pitch_amplitude_deg_per_m   numeric NOT NULL,
  pitch_phase_deg             numeric NOT NULL,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE deck_layout.vessel_rao_entry ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'deck_layout'
      AND tablename  = 'vessel_rao_entry'
      AND policyname = 'Allow all access'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow all access" ON deck_layout.vessel_rao_entry FOR ALL USING (true) WITH CHECK (true)';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vessel_rao_entry_vessel ON deck_layout.vessel_rao_entry(vessel_id);
