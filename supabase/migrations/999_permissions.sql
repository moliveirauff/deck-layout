
-- ============================================================
-- PERMISSIONS: Allow API access to the deck_layout schema
-- ============================================================
GRANT USAGE ON SCHEMA deck_layout TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA deck_layout TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA deck_layout TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA deck_layout TO anon, authenticated, service_role;
