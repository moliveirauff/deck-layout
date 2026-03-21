-- DeckLayout v2 — Rigging item global library
CREATE TABLE IF NOT EXISTS deck_layout.rigging_item (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  rigging_type  text NOT NULL CHECK (rigging_type IN ('sling','shackle','spreader_bar','lifting_frame','other')),
  weight_kg     numeric NOT NULL,
  wll_t         numeric NOT NULL,
  mbl_t         numeric,
  length_m      numeric,
  standard_ref  text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE deck_layout.rigging_item ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access' AND tablename = 'rigging_item' AND schemaname = 'deck_layout') THEN
    CREATE POLICY "Allow all access" ON deck_layout.rigging_item FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DROP TRIGGER IF EXISTS rigging_item_updated_at ON deck_layout.rigging_item;
CREATE TRIGGER rigging_item_updated_at BEFORE UPDATE ON deck_layout.rigging_item
  FOR EACH ROW EXECUTE FUNCTION deck_layout.set_updated_at();
