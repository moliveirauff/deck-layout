import { create } from 'zustand'
import type {
  ProjectEquipment,
  Vessel,
  CraneCurvePoint,
} from '../types/database'
import { updateEquipmentOverboard } from '../lib/supabase/projectEquipmentService'

/** Which position the crane UI is currently showing: deck pick-up or overboard lowering. */
export type CraneToggle = 'deck' | 'overboard'

/** Computed crane geometry for the active toggle position. */
export type CraneData = {
  slew_deg: number
  boom_angle_deg: number
  radius_m: number
  capacity_t: number
  utilization_pct: number | null
}

type CraneState = {
  toggle: CraneToggle
  /** Computed geometry for the currently active toggle position. Null if not yet calculated. */
  craneData: CraneData | null
  isSaving: boolean
  error: string | null

  /** Switch between deck pick-up and overboard lowering views. */
  setToggle: (toggle: CraneToggle) => void
  /**
   * Persist the overboard position and associated crane geometry for a project equipment item.
   * Call after the user finalises the overboard position on the deck canvas.
   */
  updateOverboardPosition: (
    equipmentId: string,
    overboard: Partial<
      Pick<
        ProjectEquipment,
        | 'overboard_pos_x'
        | 'overboard_pos_y'
        | 'crane_slew_overboard_deg'
        | 'crane_boom_angle_overboard_deg'
        | 'crane_radius_overboard_m'
        | 'crane_capacity_overboard_t'
        | 'capacity_check_overboard_ok'
      >
    >,
  ) => Promise<ProjectEquipment | null>
  /**
   * Compute and cache crane geometry (slew, boom angle, radius, capacity, utilisation)
   * for the given equipment item and toggle position.
   *
   * This is a pure in-memory calculation — call it whenever equipment or crane data changes.
   * The caller must supply the full vessel and crane curve from useVesselStore.
   *
   * @param equipment - The project equipment item (must have deck/overboard positions set)
   * @param vessel    - The active vessel (provides pedestal position and boom length)
   * @param craneCurve - Sorted crane curve points (radius_m ascending)
   * @param toggle    - Which position to calculate for (defaults to current store toggle)
   */
  calculateCraneData: (
    equipment: ProjectEquipment,
    vessel: Vessel,
    craneCurve: CraneCurvePoint[],
    toggle?: CraneToggle,
  ) => void
}

export const useCraneStore = create<CraneState>((set, get) => ({
  toggle: 'deck',
  craneData: null,
  isSaving: false,
  error: null,

  setToggle: (toggle) => {
    set({ toggle })
  },

  updateOverboardPosition: async (equipmentId, overboard) => {
    set({ isSaving: true, error: null })
    const { data, error } = await updateEquipmentOverboard(equipmentId, overboard)
    if (error) {
      set({ isSaving: false, error })
      return null
    }
    set({ isSaving: false })
    return data
  },

  calculateCraneData: (equipment, vessel, craneCurve, toggle) => {
    const activeToggle = toggle ?? get().toggle

    // Determine target point (equipment center at the active position)
    const targetX =
      activeToggle === 'deck'
        ? equipment.deck_pos_x
        : (equipment.overboard_pos_x ?? equipment.deck_pos_x)
    const targetY =
      activeToggle === 'deck'
        ? equipment.deck_pos_y
        : (equipment.overboard_pos_y ?? equipment.deck_pos_y)

    // Crane radius: horizontal distance from pedestal to target point
    const dx = targetX - vessel.crane_pedestal_x
    const dy = targetY - vessel.crane_pedestal_y
    const radius_m = Math.sqrt(dx * dx + dy * dy)

    // Slew angle: angle from positive X-axis (clockwise from bow, degrees)
    const slew_deg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360

    // Boom angle: derived from radius and boom length (simple right-triangle geometry)
    const clampedRadius = Math.min(radius_m, vessel.crane_boom_length_m)
    const boom_angle_deg =
      (Math.acos(clampedRadius / vessel.crane_boom_length_m) * 180) / Math.PI

    // Capacity: linear interpolation from crane curve
    const capacity_t = interpolateCraneCurve(craneCurve, radius_m)

    // Utilisation relative to equipment dry weight (null if equipment library not joined)
    const utilization_pct = null

    set({
      craneData: { slew_deg, boom_angle_deg, radius_m, capacity_t, utilization_pct },
    })
  },
}))

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Linear interpolation of crane capacity at a given radius.
 * Returns 0 if the radius is outside the curve range.
 * (Full implementation lives in src/lib/calculations/crane/interpolateCraneCurve.ts)
 */
function interpolateCraneCurve(
  curve: CraneCurvePoint[],
  radius: number,
): number {
  if (curve.length === 0) return 0
  if (radius <= curve[0].radius_m) return curve[0].capacity_t
  if (radius >= curve[curve.length - 1].radius_m) return 0

  for (let i = 0; i < curve.length - 1; i++) {
    const lo = curve[i]
    const hi = curve[i + 1]
    if (radius >= lo.radius_m && radius <= hi.radius_m) {
      const t = (radius - lo.radius_m) / (hi.radius_m - lo.radius_m)
      return lo.capacity_t + t * (hi.capacity_t - lo.capacity_t)
    }
  }
  return 0
}
