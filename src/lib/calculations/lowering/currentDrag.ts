/**
 * Current drag force calculation during lowering.
 *
 * F_drag = 0.5 × ρ × Cd × A × v²  (N)
 *        = F_drag / 1000            (kN)
 *
 * ρ = seawater density (1025 kg/m³)
 */

import { SEAWATER_DENSITY } from '../hydro/constants'

export type CurrentProfilePoint = {
  depth_m: number
  current_speed_ms: number
}

export type CurrentDragInput = {
  currentProfile: CurrentProfilePoint[]
  cd_x: number
  projected_area_x_m2: number
}

export type CurrentDragResult = {
  max_drag_kn: number
  max_drag_depth_m: number
  drag_by_depth: ReadonlyArray<{ depth_m: number; drag_kn: number }>
}

/**
 * Calculate drag force in kN at a single point.
 */
function dragForceKn(
  current_speed_ms: number,
  cd_x: number,
  projected_area_x_m2: number,
): number {
  return (0.5 * SEAWATER_DENSITY * cd_x * projected_area_x_m2 * current_speed_ms ** 2) / 1000
}

/**
 * Calculate current drag at each depth in the profile and find the maximum.
 */
export function calculateCurrentDrag(input: CurrentDragInput): CurrentDragResult {
  const { currentProfile, cd_x, projected_area_x_m2 } = input

  if (currentProfile.length === 0) {
    return { max_drag_kn: 0, max_drag_depth_m: 0, drag_by_depth: [] }
  }

  const drag_by_depth = currentProfile.map((point) => ({
    depth_m: point.depth_m,
    drag_kn: dragForceKn(point.current_speed_ms, cd_x, projected_area_x_m2),
  }))

  let max_drag_kn = 0
  let max_drag_depth_m = 0

  for (const entry of drag_by_depth) {
    if (entry.drag_kn > max_drag_kn) {
      max_drag_kn = entry.drag_kn
      max_drag_depth_m = entry.depth_m
    }
  }

  return { max_drag_kn, max_drag_depth_m, drag_by_depth }
}
