import { z } from 'zod'

// ─── Shared primitives ────────────────────────────────────────────────────────

const positiveNumber = z.number().positive()
const nonNegativeNumber = z.number().min(0)
const uuid = z.string().uuid()

// ─── Vessel ───────────────────────────────────────────────────────────────────

export const vesselSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  vessel_type: z.enum(['PLSV', 'LCV', 'HLV']),
  description: z.string().max(1000).optional().nullable(),
  deck_length_m: positiveNumber,
  deck_width_m: positiveNumber,
  deck_origin_x: z.number().default(0),
  deck_origin_y: z.number().default(0),
  crane_type: z.enum(['OMC', 'knuckle_boom']),
  crane_pedestal_x: z.number(),
  crane_pedestal_y: z.number(),
  crane_pedestal_height_m: positiveNumber,
  crane_boom_length_m: positiveNumber,
  crane_jib_length_m: positiveNumber.optional().nullable(),
  crane_slew_min_deg: z.number().min(-360).max(360).default(0),
  crane_slew_max_deg: z.number().min(-360).max(360).default(360),
})

export type VesselFormValues = z.infer<typeof vesselSchema>

// ─── Vessel Barrier ───────────────────────────────────────────────────────────

export const vesselBarrierSchema = z.object({
  vessel_id: uuid,
  name: z.string().min(1, 'Name is required').max(200),
  x_m: z.number(),
  y_m: z.number(),
  length_m: positiveNumber,
  width_m: positiveNumber,
  height_m: positiveNumber.default(1.0).optional().nullable(),
})

export type VesselBarrierFormValues = z.infer<typeof vesselBarrierSchema>

// ─── Deck Load Zone ───────────────────────────────────────────────────────────

export const deckLoadZoneSchema = z.object({
  vessel_id: uuid,
  name: z.string().min(1, 'Name is required').max(200),
  x_m: z.number(),
  y_m: z.number(),
  length_m: positiveNumber,
  width_m: positiveNumber,
  capacity_t_per_m2: positiveNumber,
})

export type DeckLoadZoneFormValues = z.infer<typeof deckLoadZoneSchema>

// ─── Crane Curve Point ────────────────────────────────────────────────────────

export const craneCurvePointSchema = z.object({
  vessel_id: uuid,
  radius_m: positiveNumber,
  capacity_t: positiveNumber,
  boom_angle_deg: z.number().min(0).max(90).optional().nullable(),
})

export type CraneCurvePointFormValues = z.infer<typeof craneCurvePointSchema>

// ─── Equipment Library ────────────────────────────────────────────────────────

export const equipmentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional().nullable(),
  length_m: positiveNumber,
  width_m: positiveNumber,
  height_m: positiveNumber,
  dry_weight_t: positiveNumber,
  geometry_type: z.enum(['box', 'cylinder']),
  submerged_volume_m3: positiveNumber.optional().nullable(),
})

export type EquipmentFormValues = z.infer<typeof equipmentSchema>

// ─── Project ──────────────────────────────────────────────────────────────────

export const projectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional().nullable(),
  field_name: z.string().max(200).optional().nullable(),
  water_depth_m: positiveNumber.optional().nullable(),
  vessel_id: uuid,
  status: z.enum(['draft', 'analyzed', 'complete']).default('draft'),
})

export type ProjectFormValues = z.infer<typeof projectSchema>

// ─── Project Equipment (placement) ────────────────────────────────────────────

export const projectEquipmentSchema = z.object({
  project_id: uuid,
  equipment_id: uuid,
  label: z.string().max(200).optional().nullable(),
  deck_pos_x: z.number(),
  deck_pos_y: z.number(),
  deck_rotation_deg: z.number().min(0).max(360).default(0),
  overboard_pos_x: z.number().optional().nullable(),
  overboard_pos_y: z.number().optional().nullable(),
})

export type ProjectEquipmentFormValues = z.infer<typeof projectEquipmentSchema>

// ─── RAO Entry ────────────────────────────────────────────────────────────────

export const raoEntrySchema = z.object({
  project_id: uuid,
  wave_direction_deg: z.number().min(0).max(360),
  wave_period_s: positiveNumber,
  heave_amplitude_m_per_m: nonNegativeNumber,
  heave_phase_deg: z.number().min(-360).max(360),
  roll_amplitude_deg_per_m: nonNegativeNumber,
  roll_phase_deg: z.number().min(-360).max(360),
  pitch_amplitude_deg_per_m: nonNegativeNumber,
  pitch_phase_deg: z.number().min(-360).max(360),
})

export type RaoEntryFormValues = z.infer<typeof raoEntrySchema>

// ─── Scatter Diagram Entry ────────────────────────────────────────────────────

export const scatterDiagramEntrySchema = z.object({
  project_id: uuid,
  hs_m: nonNegativeNumber,
  tp_s: positiveNumber,
  occurrence_pct: z.number().min(0).max(100),
})

export type ScatterDiagramEntryFormValues = z.infer<typeof scatterDiagramEntrySchema>
