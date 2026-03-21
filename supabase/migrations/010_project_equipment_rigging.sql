-- DeckLayout v2 — Project equipment rigging arrangement
CREATE TABLE IF NOT EXISTS deck_layout.project_equipment_rigging (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_equipment_id     uuid NOT NULL REFERENCES deck_layout.project_equipment(id) ON DELETE CASCADE,
  rigging_item_id          uuid NOT NULL REFERENCES deck_layout.rigging_item(id) ON DELETE RESTRICT,
  quantity                 integer NOT NULL,
  angle_from_vertical_deg  numeric NOT NULL,
  sling_force_t            numeric,
  sling_force_design_t     numeric,
  wll_ok                   boolean,
  created_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE deck_layout.project_equipment_rigging ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access' AND tablename = 'project_equipment_rigging' AND schemaname = 'deck_layout') THEN CREATE POLICY "Allow all access" ON deck_layout.project_equipment_rigging FOR ALL USING (true) WITH CHECK (true); END IF; END $$;
CREATE INDEX IF NOT EXISTS idx_per_project_equipment ON deck_layout.project_equipment_rigging(project_equipment_id);
CREATE INDEX IF NOT EXISTS idx_per_rigging_item ON deck_layout.project_equipment_rigging(rigging_item_id);
