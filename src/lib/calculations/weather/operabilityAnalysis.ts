/**
 * Operability analysis: cross-reference scatter diagram with sea state limits
 * to calculate what fraction of time a lift operation is feasible.
 *
 * Uses nearest-neighbour matching so that scatter bins do not need to align
 * exactly with the DNV analysis grid (Hs step 0.25 m, Tp step 1 s).
 */

import type { ScatterDiagramEntry, SeaStateLimit } from '../../../types/database'

/** Maximum Hs distance from the nearest analysis grid point before treating as infeasible. */
const MAX_HS_TOLERANCE_M = 0.5
/** Maximum Tp distance from the nearest analysis grid point before treating as infeasible. */
const MAX_TP_TOLERANCE_S = 2.0

/**
 * Find the nearest sea state limit to (hs, tp) using L1 distance.
 * Returns null if the scatter bin is too far outside the analysis grid.
 */
export function findNearestLimit(
  hs: number,
  tp: number,
  limits: SeaStateLimit[],
): SeaStateLimit | null {
  if (limits.length === 0) return null

  let nearest = limits[0]
  let minDist = Math.abs(limits[0].hs_m - hs) + Math.abs(limits[0].tp_s - tp)

  for (let i = 1; i < limits.length; i++) {
    const dist = Math.abs(limits[i].hs_m - hs) + Math.abs(limits[i].tp_s - tp)
    if (dist < minDist) {
      minDist = dist
      nearest = limits[i]
    }
  }

  // If the scatter bin falls outside the analysis grid range, treat as infeasible
  if (
    Math.abs(nearest.hs_m - hs) > MAX_HS_TOLERANCE_M ||
    Math.abs(nearest.tp_s - tp) > MAX_TP_TOLERANCE_S
  ) {
    return null
  }

  return nearest
}

/**
 * Determine feasibility for a single scatter (Hs, Tp) point.
 *
 * Returns true only if a nearby sea state limit exists and it is feasible.
 */
export function isScatterCellFeasible(
  hs: number,
  tp: number,
  limits: SeaStateLimit[],
): boolean {
  const nearest = findNearestLimit(hs, tp, limits)
  return nearest?.is_feasible ?? false
}

/**
 * Calculate operability percentage for one equipment item.
 *
 *   operability_pct = Σ occurrence_pct  for all scatter cells where is_feasible = true
 *
 * Capped at 100 % (cannot exceed full probability mass).
 *
 * @param scatterEntries  Scatter diagram cells from Supabase / user input
 * @param seaStateLimits  DNV analysis feasibility grid for this equipment item
 */
export function calculateOperability(
  scatterEntries: ReadonlyArray<Pick<ScatterDiagramEntry, 'hs_m' | 'tp_s' | 'occurrence_pct'>>,
  seaStateLimits: SeaStateLimit[],
): number {
  if (scatterEntries.length === 0 || seaStateLimits.length === 0) return 0

  let total = 0
  for (const entry of scatterEntries) {
    if (isScatterCellFeasible(entry.hs_m, entry.tp_s, seaStateLimits)) {
      total += entry.occurrence_pct
    }
  }

  return Math.min(total, 100)
}

/**
 * Scatter cell classification for the overlay view.
 */
export type CellClass = 'feasible' | 'infeasible' | 'no-data'

/**
 * Classify each scatter cell for the overlay view.
 *
 * - 'feasible'   → occurrence > 0 AND sea state is feasible
 * - 'infeasible' → occurrence > 0 AND sea state is NOT feasible
 * - 'no-data'    → occurrence = 0 (or not in scatter diagram)
 */
export function classifyScatterCell(
  occurrence_pct: number,
  hs: number,
  tp: number,
  limits: SeaStateLimit[],
): CellClass {
  if (occurrence_pct <= 0) return 'no-data'
  return isScatterCellFeasible(hs, tp, limits) ? 'feasible' : 'infeasible'
}
