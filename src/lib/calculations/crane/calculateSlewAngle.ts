/**
 * Calculate slew angle (degrees) from crane pedestal to a target point.
 *
 * Uses atan2 to determine the angle from the positive X-axis (bow direction).
 * Result is normalized to the 0–360° range.
 *
 * @returns slew angle in degrees [0, 360)
 */
export function calculateSlewAngle(
  pedestalX: number,
  pedestalY: number,
  targetX: number,
  targetY: number,
): number {
  const dx = targetX - pedestalX
  const dy = targetY - pedestalY
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
  return ((angleDeg % 360) + 360) % 360
}

/**
 * Check whether a slew angle falls within the crane's slew limits.
 *
 * If slewMin and slewMax are null (or span 360°+), all angles are valid.
 * The range is interpreted as sweeping from slewMin to slewMax in the
 * positive (counter-clockwise) direction.
 */
export function isSlewInRange(
  slewDeg: number,
  slewMinDeg: number | null,
  slewMaxDeg: number | null,
): boolean {
  if (slewMinDeg == null || slewMaxDeg == null) return true
  const range = ((slewMaxDeg - slewMinDeg) % 360 + 360) % 360
  if (range === 0) return true // 0 range means full 360°
  const offset = ((slewDeg - slewMinDeg) % 360 + 360) % 360
  return offset <= range
}
