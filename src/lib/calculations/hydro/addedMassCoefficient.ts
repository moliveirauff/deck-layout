/**
 * Added mass coefficient (Ca) per DNV-RP-N103 Table A-1.
 *
 * Ca represents the ratio of the hydrodynamic added mass to the mass of
 * displaced fluid. It is used in the Morison inertia force term.
 */

import type { BoxDimensions, CylinderDimensions } from './dragCoefficient'

/**
 * Calculate added mass coefficient for a box (rectangular prism).
 *
 * Per DNV-RP-N103 Table A-1, Ca depends on the aspect ratios L/W and W/H:
 *
 * | L/W   | Ca (approx) |
 * |-------|-------------|
 * | 1     | 1.00        |
 * | 2     | 0.85        |
 * | 3+    | 0.76        |
 *
 * For MVP, a simplified piecewise interpolation is used.
 * The governing axis is the dimension that faces vertical flow (Z-direction),
 * so W/H is used as the primary ratio for the slamming face.
 *
 * Clamped to [0.76, 1.0] for realistic equipment proportions.
 */
export function addedMassCoefficientBox(dims: BoxDimensions): number {
  const { length_m: L, width_m: W } = dims
  const ratio = W > 0 ? L / W : 1

  if (ratio <= 1) return 1.0
  if (ratio <= 2) {
    // Linear interpolation: 1.0 at ratio=1, 0.85 at ratio=2
    return 1.0 - (ratio - 1) * 0.15
  }
  if (ratio <= 3) {
    // Linear interpolation: 0.85 at ratio=2, 0.76 at ratio=3
    return 0.85 - (ratio - 2) * 0.09
  }
  return 0.76
}

/**
 * Calculate added mass coefficient for a cylinder.
 *
 * Per DNV-RP-N103 Table A-1:
 * - Ca = 1.0 for circular cross-section (perpendicular flow)
 * This is an exact theoretical result for potential flow around a cylinder.
 */
export function addedMassCoefficientCylinder(_dims: CylinderDimensions): number {
  return 1.0
}

/**
 * Unified entry point: compute added mass coefficient from geometry type.
 */
export function addedMassCoefficient(
  geometryType: 'box' | 'cylinder',
  dims: BoxDimensions | CylinderDimensions,
): number {
  if (geometryType === 'cylinder') {
    return addedMassCoefficientCylinder(dims as CylinderDimensions)
  }
  return addedMassCoefficientBox(dims as BoxDimensions)
}
