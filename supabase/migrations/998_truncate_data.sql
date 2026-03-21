
-- ============================================================
-- TRUNCATE ALL DATA IN deck_layout SCHEMA
-- ============================================================
TRUNCATE 
  deck_layout.vessel, 
  deck_layout.equipment_library, 
  deck_layout.project, 
  deck_layout.rigging_item 
CASCADE;
