/**
 * Calculate grillage pressure under equipment.
 *
 * @param dry_weight_t - Equipment dry weight (tonnes)
 * @param grillage_area_m2 - Grillage contact area (m²)
 * @returns Pressure in t/m²
 */
export function calculateGrillagePressure(
  dry_weight_t: number,
  grillage_area_m2: number,
): number {
  if (grillage_area_m2 <= 0) return Infinity
  return dry_weight_t / grillage_area_m2
}

/**
 * Check whether grillage pressure is within deck load capacity.
 *
 * @param pressure_t_m2 - Calculated grillage pressure (t/m²)
 * @param deck_capacity_t_m2 - Deck zone load capacity (t/m²)
 * @returns true if pressure ≤ capacity
 */
export function checkGrillageCapacity(
  pressure_t_m2: number,
  deck_capacity_t_m2: number,
): boolean {
  return pressure_t_m2 <= deck_capacity_t_m2
}
