/**
 * Sling force calculations per DNV-ST-0378.
 *
 * Force per sling = hook_load / (n_slings × cos(angle_from_vertical))
 * Design force = sling_force × DAF_offshore
 */

/**
 * Calculate the force in each sling (tonnes).
 *
 * @param hook_load_t - Total hook load (tonnes)
 * @param n_slings - Number of slings in the arrangement
 * @param angle_from_vertical_deg - Angle between sling and vertical (degrees)
 * @returns Force per sling in tonnes
 */
export function calculateSlingForce(
  hook_load_t: number,
  n_slings: number,
  angle_from_vertical_deg: number,
): number {
  if (n_slings <= 0) return Infinity
  const angle_rad = (angle_from_vertical_deg * Math.PI) / 180
  const cos_angle = Math.cos(angle_rad)
  if (cos_angle <= 0) return Infinity
  return hook_load_t / (n_slings * cos_angle)
}

/**
 * Calculate the design sling force with offshore DAF.
 *
 * @param sling_force_t - Sling force from calculateSlingForce (tonnes)
 * @param daf_offshore - Dynamic Amplification Factor for offshore lifts (default 1.3 per DNV)
 * @returns Design force per sling in tonnes
 */
export function calculateSlingForceDesign(
  sling_force_t: number,
  daf_offshore: number = 1.3,
): number {
  return sling_force_t * daf_offshore
}
