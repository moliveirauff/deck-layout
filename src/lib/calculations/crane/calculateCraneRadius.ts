/**
 * Calculate horizontal distance from crane pedestal to a target point on deck or overboard.
 * All coordinates in meters, using the deck coordinate system (X toward bow, Y toward port).
 */
export function calculateCraneRadius(
  pedestalX: number,
  pedestalY: number,
  targetX: number,
  targetY: number,
): number {
  const dx = targetX - pedestalX
  const dy = targetY - pedestalY
  return Math.sqrt(dx * dx + dy * dy)
}
