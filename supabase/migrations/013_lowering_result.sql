-- DeckLayout v2 — Lowering result per equipment
CREATE TABLE IF NOT EXISTS deck_layout.lowering_result (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_equipment_id     uuid NOT NULL REFERENCES deck_layout.project_equipment(id) ON DELETE CASCADE,
  hook_load_submerged_t    numeric NOT NULL,
  buoyancy_force_kn        numeric NOT NULL,
  max_current_drag_kn      numeric NOT NULL,
  max_current_depth_m      numeric,
  residual_hook_tension_t  numeric NOT NULL,
  residual_ok              boolean NOT NULL,
  landing_load_t           numeric,
  calculated_at            timestamptz NOT NULL,
  created_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE deck_layout.lowering_result ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access' AND tablename = 'lowering_result' AND schemaname = 'deck_layout') THEN CREATE POLICY "Allow all access" ON deck_layout.lowering_result FOR ALL USING (true) WITH CHECK (true); END IF; END $$;
CREATE INDEX IF NOT EXISTS idx_lowering_pe ON deck_layout.lowering_result(project_equipment_id);
