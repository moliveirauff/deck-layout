/**
 * Calculate boom angle (degrees from horizontal) for an OMC (single-boom) crane.
 *
 * Uses right-triangle geometry: boom_angle = acos(radius / boom_length).
 * For knuckle-boom cranes, the relationship is more complex; use the crane curve
 * boom_angle_deg field directly instead.
 *
 * Returns null if the radius exceeds the boom length (out of reach).
 */
export function calculateBoomAngle(
  radiusM: number,
  boomLengthM: number,
): number | null {
  if (boomLengthM <= 0) return null
  if (radiusM > boomLengthM) return null
  if (radiusM <= 0) return 90 // boom straight up when directly above pedestal
  return (Math.acos(radiusM / boomLengthM) * 180) / Math.PI
}
