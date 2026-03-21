-- DeckLayout v2 — Project + project_equipment additional fields
ALTER TABLE deck_layout.project ADD COLUMN IF NOT EXISTS transit_hs_m        numeric;
ALTER TABLE deck_layout.project ADD COLUMN IF NOT EXISTS transit_tp_s        numeric;
ALTER TABLE deck_layout.project ADD COLUMN IF NOT EXISTS transit_heading_deg numeric;
ALTER TABLE deck_layout.project ADD COLUMN IF NOT EXISTS transit_duration_h  numeric;

ALTER TABLE deck_layout.project_equipment ADD COLUMN IF NOT EXISTS installation_sequence integer;
ALTER TABLE deck_layout.project_equipment ADD COLUMN IF NOT EXISTS hook_load_t          numeric;
