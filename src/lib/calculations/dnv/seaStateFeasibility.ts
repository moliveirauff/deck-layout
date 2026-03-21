/**
 * Feasibility check for a single (Hs, Tp) sea state combination per DNV-ST-N001.
 *
 * Combines static hook load + DAF + hydrodynamic forces and compares against
 * crane capacity at overboard position.
 */

import { GRAVITY } from '../hydro/constants'

export type ForceBreakdown = {
  f_static_N: number    // Static hook load W = m × g (N)
  f_drag_N: number      // Drag force component (N)
  f_inertia_N: number   // Inertia / added mass force component (N)
  f_slam_N: number      // Slamming force component (N)
  f_total_N: number     // Total dynamic hook load (N)
}

export type FeasibilityResult = {
  is_feasible: boolean
  utilization_pct: number    // F_total / crane_capacity × 100
  daf: number                // Dynamic amplification factor used
  force_breakdown: ForceBreakdown
}

export type FeasibilityInput = {
  dry_weight_t: number             // Equipment dry weight (tonnes)
  crane_capacity_overboard_t: number // Crane capacity at overboard position (tonnes)
  f_drag_N: number
  f_inertia_N: number
  f_slam_N: number
  a_ct: number                     // Crane tip vertical acceleration (m/s²)
}

/**
 * Check feasibility of a lift operation at a given sea state.
 *
 * Total dynamic hook load (DNV-ST-N001):
 *   F_total = W_static × DAF + F_drag + F_inertia + F_slam
 *
 * Feasibility condition:
 *   F_total ≤ crane_capacity_N
 *   utilization = F_total / crane_capacity_N × 100 [%]
 */
export function seaStateFeasibility(input: FeasibilityInput): FeasibilityResult {
  const { dry_weight_t, crane_capacity_overboard_t, f_drag_N, f_inertia_N, f_slam_N, a_ct } =
    input

  const dafActual = 1 + a_ct / GRAVITY

  const f_static_N = dry_weight_t * 1000 * GRAVITY
  const crane_capacity_N = crane_capacity_overboard_t * 1000 * GRAVITY

  const f_total_N = f_static_N * dafActual + f_drag_N + f_inertia_N + f_slam_N
  const utilization_pct = crane_capacity_N > 0 ? (f_total_N / crane_capacity_N) * 100 : Infinity

  return {
    is_feasible: f_total_N <= crane_capacity_N,
    utilization_pct,
    daf: dafActual,
    force_breakdown: {
      f_static_N,
      f_drag_N,
      f_inertia_N,
      f_slam_N,
      f_total_N,
    },
  }
}
