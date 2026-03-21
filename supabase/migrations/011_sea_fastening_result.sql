-- DeckLayout v2 — Sea-fastening result per equipment
CREATE TABLE deck_layout.sea_fastening_result (
  id                             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_equipment_id           uuid NOT NULL REFERENCES deck_layout.project_equipment(id) ON DELETE CASCADE,
  acc_transversal_ms2            numeric NOT NULL,
  acc_longitudinal_ms2           numeric NOT NULL,
  acc_vertical_ms2               numeric NOT NULL,
  force_transversal_kn           numeric NOT NULL,
  force_longitudinal_kn          numeric NOT NULL,
  force_vertical_kn              numeric NOT NULL,
  force_uplift_kn                numeric NOT NULL,
  force_horizontal_resultant_kn  numeric NOT NULL,
  n_tiedowns                     integer NOT NULL,
  mbl_required_per_tiedown_kn    numeric NOT NULL,
  tiedown_type                   text,
  tiedown_mbl_kn                 numeric,
  tiedown_ok                     boolean NOT NULL,
  grillage_area_m2               numeric,
  grillage_pressure_t_m2         numeric,
  deck_load_grillage_ok          boolean,
  daf_transit                    numeric NOT NULL,
  calculated_at                  timestamptz NOT NULL,
  created_at                     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE deck_layout.sea_fastening_result ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON deck_layout.sea_fastening_result FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_sf_result_pe ON deck_layout.sea_fastening_result(project_equipment_id);
