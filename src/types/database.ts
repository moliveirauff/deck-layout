// Auto-mirrored from supabase/migrations/001_initial_schema.sql
// Keep in sync with DATA_MODEL.md

export type VesselType = 'PLSV' | 'LCV' | 'HLV'
export type CraneType = 'OMC' | 'knuckle_boom'
export type GeometryType = 'box' | 'cylinder'
export type ProjectStatus = 'draft' | 'analyzed' | 'complete'

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
  created_at: string
  updated_at: string
}

export type VesselInsert = Omit<Vessel, 'id' | 'created_at' | 'updated_at'>
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
  created_at: string
  updated_at: string
}

export type EquipmentLibraryInsert = Omit<EquipmentLibrary, 'id' | 'created_at' | 'updated_at'>
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
  created_at: string
  updated_at: string
}

export type ProjectInsert = Omit<Project, 'id' | 'created_at' | 'updated_at'>
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
  created_at: string
  updated_at: string
}

export type ProjectEquipmentInsert = Omit<ProjectEquipment, 'id' | 'created_at' | 'updated_at'>
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
  calculated_at: string
  created_at: string
}

export type SplashZoneResultInsert = Omit<SplashZoneResult, 'id' | 'created_at'>

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
