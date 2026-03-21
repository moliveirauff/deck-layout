-- DeckLayout v2 — splash_zone_result additional fields
ALTER TABLE deck_layout.splash_zone_result ADD COLUMN IF NOT EXISTS snap_load_risk   boolean;
ALTER TABLE deck_layout.splash_zone_result ADD COLUMN IF NOT EXISTS hook_load_t      numeric;
ALTER TABLE deck_layout.splash_zone_result ADD COLUMN IF NOT EXISTS buoyancy_t       numeric;
