/**
 * Drag coefficient (Cd) calculation per DNV-RP-N103 Table B-1/B-2.
 *
 * Returns directional drag coefficients:
 *   Cd_x — drag in X-direction (transverse)
 *   Cd_y — drag in Y-direction (longitudinal)
 *   Cd_z — drag in Z-direction (vertical / slamming face)
 */

export type DragCoefficients = {
  cd_x: number
  cd_y: number
  cd_z: number
}

/**
 * Box dimensions required for drag calculation.
 */
export type BoxDimensions = {
  length_m: number
  width_m: number
  height_m: number
}

/**
 * Cylinder dimensions required for drag calculation.
 */
export type CylinderDimensions = {
  diameter_m: number
  length_m: number
}

/**
 * Calculate drag coefficients for a box (rectangular prism).
 *
 * Per DNV-RP-N103 Table B-2:
 * - Cd = 1.2 for all three directions (rectangular prism, sharp edges).
 *
 * The vertical component Cd_z uses 1.4 for a flat-bottomed box at the
 * water surface during slamming entry (conservative per DNV guidance).
 */
export function dragCoefficientBox(_dims: BoxDimensions): DragCoefficients {
  return { cd_x: 1.2, cd_y: 1.2, cd_z: 1.4 }
}

/**
 * Calculate drag coefficients for a vertical cylinder.
 *
 * Per DNV-RP-N103 Table B-1:
 * - Perpendicular flow (across axis): Cd = 1.0 (rough surface / marine growth)
 * - Axial flow (along axis, Z-direction): Cd = 0.0 (negligible end resistance)
 *
 * Cd_x and Cd_y are equal (axisymmetric cross-section).
 */
export function dragCoefficientCylinder(_dims: CylinderDimensions): DragCoefficients {
  return { cd_x: 1.0, cd_y: 1.0, cd_z: 0.0 }
}

/**
 * Unified entry point: compute drag coefficients from geometry type and dimensions.
 */
export function dragCoefficient(
  geometryType: 'box' | 'cylinder',
  dims: BoxDimensions | CylinderDimensions,
): DragCoefficients {
  if (geometryType === 'cylinder') {
    return dragCoefficientCylinder(dims as CylinderDimensions)
  }
  return dragCoefficientBox(dims as BoxDimensions)
}
