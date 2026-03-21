-- DeckLayout v2 — Project equipment rigging arrangement
CREATE TABLE deck_layout.project_equipment_rigging (
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
CREATE POLICY "Allow all access" ON deck_layout.project_equipment_rigging FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_per_project_equipment ON deck_layout.project_equipment_rigging(project_equipment_id);
CREATE INDEX idx_per_rigging_item ON deck_layout.project_equipment_rigging(rigging_item_id);
