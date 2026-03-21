/**
 * Snap load risk check per DNV-ST-N001.
 *
 * A snap load occurs when the crane tip heave is large enough that the
 * equipment may exit the water momentarily, causing a sudden re-tensioning
 * of the crane wire on re-entry.
 *
 * Simplified rule: risk = crane_tip_heave_m >= hs_m × 0.5
 */

export type SnapLoadInput = {
  hs_m: number
  crane_tip_heave_m: number
  dry_weight_t: number
}

export type SnapLoadResult = {
  risk: boolean
  reason: string
}

/**
 * Check for snap load risk during splash zone passage.
 *
 * @param input - Sea state and crane motion parameters
 * @returns risk flag and descriptive reason
 */
export function snapLoadCheck(input: SnapLoadInput): SnapLoadResult {
  const { hs_m, crane_tip_heave_m } = input
  const threshold = hs_m * 0.5
  const risk = crane_tip_heave_m >= threshold

  if (risk) {
    return {
      risk: true,
      reason: `Snap load risk: crane tip heave (${crane_tip_heave_m.toFixed(2)}m) ≥ 50% of Hs (${threshold.toFixed(2)}m)`,
    }
  }

  return {
    risk: false,
    reason: `No snap load risk: crane tip heave (${crane_tip_heave_m.toFixed(2)}m) < 50% of Hs (${threshold.toFixed(2)}m)`,
  }
}
