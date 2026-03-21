-- DeckLayout v2 — Current profile data per project
CREATE TABLE deck_layout.current_profile_entry (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           uuid NOT NULL REFERENCES deck_layout.project(id) ON DELETE CASCADE,
  depth_m              numeric NOT NULL,
  current_speed_ms     numeric NOT NULL,
  current_direction_deg numeric,
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE deck_layout.current_profile_entry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON deck_layout.current_profile_entry FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_current_profile_project ON deck_layout.current_profile_entry(project_id);
