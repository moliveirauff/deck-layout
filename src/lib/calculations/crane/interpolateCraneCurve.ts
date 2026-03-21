import type { CraneCurvePoint } from '../../../types/database'

/**
 * Linear interpolation of crane capacity at a given radius.
 *
 * The crane curve is a sorted list of (radius_m, capacity_t) points.
 * For a radius between two points, capacity is linearly interpolated.
 *
 * Returns 0 if:
 * - The curve is empty
 * - The radius exceeds the maximum curve radius (out of reach)
 *
 * Returns the first point's capacity if radius <= minimum curve radius.
 */
export function interpolateCraneCurve(
  curve: ReadonlyArray<Pick<CraneCurvePoint, 'radius_m' | 'capacity_t'>>,
  radiusM: number,
): number {
  if (curve.length === 0) return 0
  if (radiusM <= curve[0].radius_m) return curve[0].capacity_t
  if (radiusM >= curve[curve.length - 1].radius_m) return 0

  for (let i = 0; i < curve.length - 1; i++) {
    const lo = curve[i]
    const hi = curve[i + 1]
    if (radiusM >= lo.radius_m && radiusM <= hi.radius_m) {
      const t = (radiusM - lo.radius_m) / (hi.radius_m - lo.radius_m)
      return lo.capacity_t + t * (hi.capacity_t - lo.capacity_t)
    }
  }
  return 0
}
