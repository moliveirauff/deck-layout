/**
 * Hook load calculation for lifting operations per DNV-ST-0378.
 *
 * Hook load = dry_weight + rigging_weight + contingency
 * where contingency = dry_weight × contingency_pct / 100
 */

/**
 * Calculate the total hook load in tonnes.
 *
 * @param dry_weight_t - Equipment dry weight (tonnes)
 * @param rigging_weight_t - Sum of all rigging item weights (tonnes)
 * @param contingency_pct - Contingency percentage (e.g. 5 means 5%)
 * @returns Hook load in tonnes
 */
export function calculateHookLoad(
  dry_weight_t: number,
  rigging_weight_t: number,
  contingency_pct: number,
): number {
  const contingency_t = dry_weight_t * (contingency_pct / 100)
  return dry_weight_t + rigging_weight_t + contingency_t
}
