-- ============================================================
-- DeckLayout — Vessel RAO Entry Table
-- 003_vessel_rao.sql
-- Schema: deck_layout
-- ============================================================

CREATE TABLE deck_layout.vessel_rao_entry (
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
CREATE POLICY "Allow all access" ON deck_layout.vessel_rao_entry FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_vessel_rao_entry_vessel ON deck_layout.vessel_rao_entry(vessel_id);
