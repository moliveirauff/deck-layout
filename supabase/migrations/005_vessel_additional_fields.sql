-- DeckLayout v2 — Vessel additional fields
ALTER TABLE deck_layout.vessel ADD COLUMN IF NOT EXISTS draft_operating_m        numeric;
ALTER TABLE deck_layout.vessel ADD COLUMN IF NOT EXISTS lbp_m                    numeric;
ALTER TABLE deck_layout.vessel ADD COLUMN IF NOT EXISTS beam_m                   numeric;
ALTER TABLE deck_layout.vessel ADD COLUMN IF NOT EXISTS displacement_t           numeric;
ALTER TABLE deck_layout.vessel ADD COLUMN IF NOT EXISTS crane_min_radius_m       numeric;
ALTER TABLE deck_layout.vessel ADD COLUMN IF NOT EXISTS crane_max_hook_height_m  numeric;
ALTER TABLE deck_layout.vessel ADD COLUMN IF NOT EXISTS dp_class                 text CHECK (dp_class IS NULL OR dp_class IN ('DP1','DP2','DP3','none'));
ALTER TABLE deck_layout.vessel ADD COLUMN IF NOT EXISTS kg_lightship_m           numeric;
ALTER TABLE deck_layout.vessel ADD COLUMN IF NOT EXISTS gm_min_m                 numeric;
ALTER TABLE deck_layout.vessel ADD COLUMN IF NOT EXISTS roll_natural_period_s    numeric;
ALTER TABLE deck_layout.vessel ADD COLUMN IF NOT EXISTS pitch_natural_period_s   numeric;
ALTER TABLE deck_layout.vessel ADD COLUMN IF NOT EXISTS deck_elevation_m         numeric;
