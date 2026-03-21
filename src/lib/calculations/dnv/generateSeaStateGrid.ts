/**
 * Sea state operability grid generator per DNV-ST-N001.
 *
 * Evaluates feasibility across a full Hs × Tp matrix and determines
 * the maximum allowable significant wave height (max_hs_m).
 */

import { splashZoneLoads, type SplashZoneLoadsInput } from './splashZoneLoads'
import { seaStateFeasibility, type FeasibilityResult } from './seaStateFeasibility'

export type SeaStateGridInput = SplashZoneLoadsInput & {
  dry_weight_t: number
  crane_capacity_overboard_t: number
}

export type SeaStateCellResult = {
  hs_m: number
  tp_s: number
  is_feasible: boolean
  utilization_pct: number
  daf: number
  force_breakdown: FeasibilityResult['force_breakdown']
}

export type SeaStateGridResult = {
  cells: SeaStateCellResult[]
  max_hs_m: number   // Highest Hs where ALL Tp values are feasible
  worst_daf: number  // Highest DAF across the worst-case row (highest feasible Hs)
}

/** Hs values (m): 0.50 to 4.00 in 0.25m steps. */
export const HS_VALUES: number[] = Array.from(
  { length: 15 },
  (_, i) => Math.round((0.5 + i * 0.25) * 100) / 100,
)

/** Tp values (s): 4 to 18 in 1s steps. */
export const TP_VALUES: number[] = Array.from({ length: 15 }, (_, i) => 4 + i)

/**
 * Generate the full Hs × Tp operability grid.
 *
 * @param input       Equipment + hydro parameters (shared across all cells)
 * @param onProgress  Optional callback receiving progress 0–1 as cells are computed
 */
export function generateSeaStateGrid(
  input: SeaStateGridInput,
  onProgress?: (fraction: number) => void,
): SeaStateGridResult {
  const { dry_weight_t, crane_capacity_overboard_t } = input
  const cells: SeaStateCellResult[] = []
  const total = HS_VALUES.length * TP_VALUES.length
  let done = 0

  for (const hs_m of HS_VALUES) {
    for (const tp_s of TP_VALUES) {
      const forces = splashZoneLoads({ ...input, hs_m, tp_s })
      const feasibility = seaStateFeasibility({
        dry_weight_t,
        crane_capacity_overboard_t,
        f_drag_N: forces.f_drag_N,
        f_inertia_N: forces.f_inertia_N,
        f_slam_N: forces.f_slam_N,
        a_ct: forces.a_ct,
      })

      cells.push({
        hs_m,
        tp_s,
        is_feasible: feasibility.is_feasible,
        utilization_pct: feasibility.utilization_pct,
        daf: feasibility.daf,
        force_breakdown: feasibility.force_breakdown,
      })

      done++
      if (onProgress) onProgress(done / total)
    }
  }

  // Max Hs where every Tp combination is feasible
  let max_hs_m = 0
  for (const hs_m of [...HS_VALUES].reverse()) {
    const row = cells.filter((c) => c.hs_m === hs_m)
    if (row.every((c) => c.is_feasible)) {
      max_hs_m = hs_m
      break
    }
  }

  // Worst DAF at the max_hs_m row (or at highest computed Hs if nothing feasible)
  const refHs = max_hs_m > 0 ? max_hs_m : HS_VALUES[0]
  const worstRow = cells.filter((c) => c.hs_m === refHs)
  const worst_daf = worstRow.length > 0 ? Math.max(...worstRow.map((c) => c.daf)) : 1

  return { cells, max_hs_m, worst_daf }
}
