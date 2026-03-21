-- DeckLayout v2 — Equipment additional fields
ALTER TABLE deck_layout.equipment_library ADD COLUMN IF NOT EXISTS cog_x_m           numeric DEFAULT 0;
ALTER TABLE deck_layout.equipment_library ADD COLUMN IF NOT EXISTS cog_y_m           numeric DEFAULT 0;
ALTER TABLE deck_layout.equipment_library ADD COLUMN IF NOT EXISTS cog_z_m           numeric;
ALTER TABLE deck_layout.equipment_library ADD COLUMN IF NOT EXISTS rigging_weight_t   numeric;
ALTER TABLE deck_layout.equipment_library ADD COLUMN IF NOT EXISTS contingency_pct    numeric DEFAULT 5;
ALTER TABLE deck_layout.equipment_library ADD COLUMN IF NOT EXISTS cd_override_x      numeric;
ALTER TABLE deck_layout.equipment_library ADD COLUMN IF NOT EXISTS cd_override_y      numeric;
ALTER TABLE deck_layout.equipment_library ADD COLUMN IF NOT EXISTS cd_override_z      numeric;
ALTER TABLE deck_layout.equipment_library ADD COLUMN IF NOT EXISTS ca_override        numeric;
ALTER TABLE deck_layout.equipment_library ADD COLUMN IF NOT EXISTS cs_override        numeric;
ALTER TABLE deck_layout.equipment_library ADD COLUMN IF NOT EXISTS geometry_notes     text;
