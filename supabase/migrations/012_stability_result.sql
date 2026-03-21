-- DeckLayout v2 — Stability result per project
CREATE TABLE IF NOT EXISTS deck_layout.stability_result (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            uuid NOT NULL REFERENCES deck_layout.project(id) ON DELETE CASCADE,
  total_deck_load_t     numeric NOT NULL,
  displacement_loaded_t numeric NOT NULL,
  kg_loaded_m           numeric NOT NULL,
  gm_loaded_m           numeric NOT NULL,
  gm_ok                 boolean NOT NULL,
  trim_moment_tm        numeric NOT NULL,
  trim_angle_deg        numeric NOT NULL,
  trim_ok               boolean NOT NULL,
  list_moment_tm        numeric NOT NULL,
  list_angle_deg        numeric NOT NULL,
  list_ok               boolean NOT NULL,
  all_ok                boolean NOT NULL,
  calculated_at         timestamptz NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE deck_layout.stability_result ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access' AND tablename = 'stability_result' AND schemaname = 'deck_layout') THEN CREATE POLICY "Allow all access" ON deck_layout.stability_result FOR ALL USING (true) WITH CHECK (true); END IF; END $$;
CREATE INDEX IF NOT EXISTS idx_stability_project ON deck_layout.stability_result(project_id);
