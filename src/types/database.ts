// Auto-mirrored from supabase/migrations/001_initial_schema.sql + v2 deltas
// Keep in sync with DATA_MODEL.md and DATA_MODEL_DELTA.md

export type VesselType = 'PLSV' | 'LCV' | 'HLV'
export type CraneType = 'OMC' | 'knuckle_boom'
export type GeometryType = 'box' | 'cylinder'
export type ProjectStatus = 'draft' | 'analyzed' | 'complete'
export type DpClass = 'DP1' | 'DP2' | 'DP3' | 'none'
export type RiggingType = 'sling' | 'shackle' | 'spreader_bar' | 'lifting_frame' | 'other'

// ─── Vessel ───────────────────────────────────────────────────────────────────

export interface Vessel {
  id: string
  name: string
  vessel_type: VesselType
  description: string | null
  deck_length_m: number
  deck_width_m: number
  deck_origin_x: number
  deck_origin_y: number
  crane_type: CraneType
  crane_pedestal_x: number
  crane_pedestal_y: number
  crane_pedestal_height_m: number
  crane_boom_length_m: number
  crane_jib_length_m: number | null
  crane_slew_min_deg: number | null
  crane_slew_max_deg: number | null
  // v2 fields
  draft_operating_m: number | null
  lbp_m: number | null
  beam_m: number | null
  displacement_t: number | null
  crane_min_radius_m: number | null
  crane_max_hook_height_m: number | null
  dp_class: DpClass | null
  kg_lightship_m: number | null
  gm_min_m: number | null
  roll_natural_period_s: number | null
  pitch_natural_period_s: number | null
  deck_elevation_m: number | null
  created_at: string
  updated_at: string
}

/** v2 optional fields for vessel insert */
type VesselV2Fields = 'draft_operating_m' | 'lbp_m' | 'beam_m' | 'displacement_t' | 'crane_min_radius_m' | 'crane_max_hook_height_m' | 'dp_class' | 'kg_lightship_m' | 'gm_min_m' | 'roll_natural_period_s' | 'pitch_natural_period_s' | 'deck_elevation_m'
export type VesselInsert = Omit<Vessel, 'id' | 'created_at' | 'updated_at' | VesselV2Fields> & Partial<Pick<Vessel, VesselV2Fields>>
export type VesselUpdate = Partial<VesselInsert>

// ─── Vessel Barrier ───────────────────────────────────────────────────────────

export interface VesselBarrier {
  id: string
  vessel_id: string
  name: string
  x_m: number
  y_m: number
  length_m: number
  width_m: number
  height_m: number | null
  created_at: string
}

export type VesselBarrierInsert = Omit<VesselBarrier, 'id' | 'created_at'>
export type VesselBarrierUpdate = Partial<VesselBarrierInsert>

// ─── Deck Load Zone ───────────────────────────────────────────────────────────

export interface DeckLoadZone {
  id: string
  vessel_id: string
  name: string
  x_m: number
  y_m: number
  length_m: number
  width_m: number
  capacity_t_per_m2: number
  created_at: string
}

export type DeckLoadZoneInsert = Omit<DeckLoadZone, 'id' | 'created_at'>
export type DeckLoadZoneUpdate = Partial<DeckLoadZoneInsert>

// ─── Crane Curve Point ────────────────────────────────────────────────────────

export interface CraneCurvePoint {
  id: string
  vessel_id: string
  radius_m: number
  capacity_t: number
  boom_angle_deg: number | null
  created_at: string
}

export type CraneCurvePointInsert = Omit<CraneCurvePoint, 'id' | 'created_at'>
export type CraneCurvePointUpdate = Partial<CraneCurvePointInsert>

// ─── Equipment Library ────────────────────────────────────────────────────────

export interface EquipmentLibrary {
  id: string
  name: string
  description: string | null
  length_m: number
  width_m: number
  height_m: number
  dry_weight_t: number
  geometry_type: GeometryType
  submerged_volume_m3: number | null
  // v2 fields
  cog_x_m: number
  cog_y_m: number
  cog_z_m: number | null
  rigging_weight_t: number | null
  contingency_pct: number
  cd_override_x: number | null
  cd_override_y: number | null
  cd_override_z: number | null
  ca_override: number | null
  cs_override: number | null
  geometry_notes: string | null
  created_at: string
  updated_at: string
}

type EquipmentV2Fields = 'cog_x_m' | 'cog_y_m' | 'cog_z_m' | 'rigging_weight_t' | 'contingency_pct' | 'cd_override_x' | 'cd_override_y' | 'cd_override_z' | 'ca_override' | 'cs_override' | 'geometry_notes'
export type EquipmentLibraryInsert = Omit<EquipmentLibrary, 'id' | 'created_at' | 'updated_at' | EquipmentV2Fields> & Partial<Pick<EquipmentLibrary, EquipmentV2Fields>>
export type EquipmentLibraryUpdate = Partial<EquipmentLibraryInsert>

// ─── Project ──────────────────────────────────────────────────────────────────

export interface Project {
  id: string
  name: string
  description: string | null
  field_name: string | null
  water_depth_m: number | null
  vessel_id: string
  vessel_snapshot: VesselSnapshot | null
  status: ProjectStatus
  // v2 fields
  transit_hs_m: number | null
  transit_tp_s: number | null
  transit_heading_deg: number | null
  transit_duration_h: number | null
  created_at: string
  updated_at: string
}

type ProjectV2Fields = 'transit_hs_m' | 'transit_tp_s' | 'transit_heading_deg' | 'transit_duration_h'
export type ProjectInsert = Omit<Project, 'id' | 'created_at' | 'updated_at' | ProjectV2Fields> & Partial<Pick<Project, ProjectV2Fields>>
export type ProjectUpdate = Partial<ProjectInsert>

/** JSON snapshot of vessel + crane curve + barriers + deck zones at project creation */
export interface VesselSnapshot {
  vessel: Vessel
  barriers: VesselBarrier[]
  deck_load_zones: DeckLoadZone[]
  crane_curve_points: CraneCurvePoint[]
}

// ─── Project Equipment ────────────────────────────────────────────────────────

export interface ProjectEquipment {
  id: string
  project_id: string
  equipment_id: string
  label: string | null
  deck_pos_x: number
  deck_pos_y: number
  deck_rotation_deg: number
  overboard_pos_x: number | null
  overboard_pos_y: number | null
  crane_slew_deck_deg: number | null
  crane_boom_angle_deck_deg: number | null
  crane_radius_deck_m: number | null
  crane_capacity_deck_t: number | null
  crane_slew_overboard_deg: number | null
  crane_boom_angle_overboard_deg: number | null
  crane_radius_overboard_m: number | null
  crane_capacity_overboard_t: number | null
  deck_load_ok: boolean | null
  capacity_check_deck_ok: boolean | null
  capacity_check_overboard_ok: boolean | null
  // v2 fields
  installation_sequence: number | null
  hook_load_t: number | null
  created_at: string
  updated_at: string
}

type PEV2Fields = 'installation_sequence' | 'hook_load_t'
export type ProjectEquipmentInsert = Omit<ProjectEquipment, 'id' | 'created_at' | 'updated_at' | PEV2Fields> & Partial<Pick<ProjectEquipment, PEV2Fields>>
export type ProjectEquipmentUpdate = Partial<ProjectEquipmentInsert>

// ─── Vessel RAO Entry ─────────────────────────────────────────────────────────

export interface VesselRaoEntry {
  id: string
  vessel_id: string
  wave_direction_deg: number
  wave_period_s: number
  heave_amplitude_m_per_m: number
  heave_phase_deg: number
  roll_amplitude_deg_per_m: number
  roll_phase_deg: number
  pitch_amplitude_deg_per_m: number
  pitch_phase_deg: number
  created_at: string
}

export type VesselRaoEntryInsert = Omit<VesselRaoEntry, 'id' | 'created_at'>

// ─── RAO Entry ────────────────────────────────────────────────────────────────

export interface RaoEntry {
  id: string
  project_id: string
  wave_direction_deg: number
  wave_period_s: number
  heave_amplitude_m_per_m: number
  heave_phase_deg: number
  roll_amplitude_deg_per_m: number
  roll_phase_deg: number
  pitch_amplitude_deg_per_m: number
  pitch_phase_deg: number
  created_at: string
}

export type RaoEntryInsert = Omit<RaoEntry, 'id' | 'created_at'>
export type RaoEntryUpdate = Partial<RaoEntryInsert>

// ─── Splash Zone Result ───────────────────────────────────────────────────────

export interface SplashZoneResult {
  id: string
  project_equipment_id: string
  cd_x: number
  cd_y: number
  cd_z: number
  ca: number
  cs: number
  projected_area_x_m2: number
  projected_area_y_m2: number
  projected_area_z_m2: number
  submerged_volume_m3: number
  crane_tip_heave_m: number
  crane_tip_lateral_m: number
  daf: number
  max_hs_m: number
  // v2 fields
  snap_load_risk: boolean | null
  hook_load_t: number | null
  buoyancy_t: number | null
  calculated_at: string
  created_at: string
}

type SZV2Fields = 'snap_load_risk' | 'hook_load_t' | 'buoyancy_t'
export type SplashZoneResultInsert = Omit<SplashZoneResult, 'id' | 'created_at' | SZV2Fields> & Partial<Pick<SplashZoneResult, SZV2Fields>>

// ─── Sea State Limit ──────────────────────────────────────────────────────────

export interface SeaStateLimit {
  id: string
  splash_zone_result_id: string
  hs_m: number
  tp_s: number
  is_feasible: boolean
  utilization_pct: number
  created_at: string
}

export type SeaStateLimitInsert = Omit<SeaStateLimit, 'id' | 'created_at'>

// ─── Scatter Diagram Entry ────────────────────────────────────────────────────

export interface ScatterDiagramEntry {
  id: string
  project_id: string
  hs_m: number
  tp_s: number
  occurrence_pct: number
  created_at: string
}

export type ScatterDiagramEntryInsert = Omit<ScatterDiagramEntry, 'id' | 'created_at'>

// ─── Weather Window Result ────────────────────────────────────────────────────

export interface WeatherWindowResult {
  id: string
  project_equipment_id: string
  operability_pct: number
  max_hs_limit_m: number
  calculated_at: string
  created_at: string
}

export type WeatherWindowResultInsert = Omit<WeatherWindowResult, 'id' | 'created_at'>

// ─── Rigging Item (v2) ───────────────────────────────────────────────────────

export interface RiggingItem {
  id: string
  name: string
  rigging_type: RiggingType
  weight_kg: number
  wll_t: number
  mbl_t: number | null
  length_m: number | null
  standard_ref: string | null
  created_at: string
  updated_at: string
}

export type RiggingItemInsert = Omit<RiggingItem, 'id' | 'created_at' | 'updated_at'>
export type RiggingItemUpdate = Partial<RiggingItemInsert>

// ─── Project Equipment Rigging (v2) ──────────────────────────────────────────

export interface ProjectEquipmentRigging {
  id: string
  project_equipment_id: string
  rigging_item_id: string
  quantity: number
  angle_from_vertical_deg: number
  sling_force_t: number | null
  sling_force_design_t: number | null
  wll_ok: boolean | null
  created_at: string
}

export type ProjectEquipmentRiggingInsert = Omit<ProjectEquipmentRigging, 'id' | 'created_at'>

// ─── Sea Fastening Result (v2) ───────────────────────────────────────────────

export interface SeaFasteningResult {
  id: string
  project_equipment_id: string
  acc_transversal_ms2: number
  acc_longitudinal_ms2: number
  acc_vertical_ms2: number
  force_transversal_kn: number
  force_longitudinal_kn: number
  force_vertical_kn: number
  force_uplift_kn: number
  force_horizontal_resultant_kn: number
  n_tiedowns: number
  mbl_required_per_tiedown_kn: number
  tiedown_type: string | null
  tiedown_mbl_kn: number | null
  tiedown_ok: boolean
  grillage_area_m2: number | null
  grillage_pressure_t_m2: number | null
  deck_load_grillage_ok: boolean | null
  daf_transit: number
  calculated_at: string
  created_at: string
}

export type SeaFasteningResultInsert = Omit<SeaFasteningResult, 'id' | 'created_at'>

// ─── Stability Result (v2) ───────────────────────────────────────────────────

export interface StabilityResult {
  id: string
  project_id: string
  total_deck_load_t: number
  displacement_loaded_t: number
  kg_loaded_m: number
  gm_loaded_m: number
  gm_ok: boolean
  trim_moment_tm: number
  trim_angle_deg: number
  trim_ok: boolean
  list_moment_tm: number
  list_angle_deg: number
  list_ok: boolean
  all_ok: boolean
  calculated_at: string
  created_at: string
}

export type StabilityResultInsert = Omit<StabilityResult, 'id' | 'created_at'>

// ─── Lowering Result (v2) ────────────────────────────────────────────────────

export interface LoweringResult {
  id: string
  project_equipment_id: string
  hook_load_submerged_t: number
  buoyancy_force_kn: number
  max_current_drag_kn: number
  max_current_depth_m: number | null
  residual_hook_tension_t: number
  residual_ok: boolean
  landing_load_t: number | null
  calculated_at: string
  created_at: string
}

export type LoweringResultInsert = Omit<LoweringResult, 'id' | 'created_at'>

// ─── Current Profile Entry (v2) ──────────────────────────────────────────────

export interface CurrentProfileEntry {
  id: string
  project_id: string
  depth_m: number
  current_speed_ms: number
  current_direction_deg: number | null
  created_at: string
}

export type CurrentProfileEntryInsert = Omit<CurrentProfileEntry, 'id' | 'created_at'>
