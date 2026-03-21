/**
 * Projected area calculations for hydrodynamic force computation.
 *
 * Projected areas are the cross-sectional areas seen by flow in each direction.
 * Used in the Morison drag equation and slamming force calculation.
 */

export type ProjectedAreas = {
  area_x_m2: number // Area of face perpendicular to X-axis (width × height for box)
  area_y_m2: number // Area of face perpendicular to Y-axis (length × height for box)
  area_z_m2: number // Area of horizontal face (slamming face, length × width for box)
}

/**
 * Projected areas for a box (rectangular prism).
 *
 * Convention (DNV-RP-N103):
 *   A_x = width × height   (transverse face, flow from X)
 *   A_y = length × height  (longitudinal face, flow from Y)
 *   A_z = length × width   (bottom face, for vertical / slamming flow)
 *
 * @param length_m  Length of box along Y-axis (m)
 * @param width_m   Width of box along X-axis (m)
 * @param height_m  Height of box along Z-axis (m)
 */
export function projectedAreasBox(length_m: number, width_m: number, height_m: number): ProjectedAreas {
  return {
    area_x_m2: width_m * height_m,
    area_y_m2: length_m * height_m,
    area_z_m2: length_m * width_m,
  }
}

/**
 * Projected areas for a cylinder (axis aligned vertically by default).
 *
 * Convention:
 *   A_x = diameter × length  (side face perpendicular to X-axis)
 *   A_y = diameter × length  (same, axisymmetric)
 *   A_z = π × (diameter/2)²  (circular end face, for vertical flow / slamming)
 *
 * @param diameter_m  Outer diameter of cylinder (m)
 * @param length_m    Length / height of cylinder (m)
 */
export function projectedAreasCylinder(diameter_m: number, length_m: number): ProjectedAreas {
  const radius = diameter_m / 2
  return {
    area_x_m2: diameter_m * length_m,
    area_y_m2: diameter_m * length_m,
    area_z_m2: Math.PI * radius * radius,
  }
}

/**
 * Submerged volume for a box (rectangular prism).
 */
export function submergedVolumeBox(length_m: number, width_m: number, height_m: number): number {
  return length_m * width_m * height_m
}

/**
 * Submerged volume for a cylinder.
 */
export function submergedVolumeCylinder(diameter_m: number, length_m: number): number {
  const radius = diameter_m / 2
  return Math.PI * radius * radius * length_m
}

/**
 * Unified entry point: compute projected areas from geometry type and dimensions.
 */
export function projectedAreas(
  geometryType: 'box' | 'cylinder',
  length_m: number,
  width_m: number,
  height_m: number,
): ProjectedAreas {
  if (geometryType === 'cylinder') {
    // For cylinder: width_m is treated as diameter, length_m as length
    return projectedAreasCylinder(width_m, length_m)
  }
  return projectedAreasBox(length_m, width_m, height_m)
}

/**
 * Unified entry point: compute submerged volume from geometry type and dimensions.
 */
export function submergedVolume(
  geometryType: 'box' | 'cylinder',
  length_m: number,
  width_m: number,
  height_m: number,
): number {
  if (geometryType === 'cylinder') {
    return submergedVolumeCylinder(width_m, length_m)
  }
  return submergedVolumeBox(length_m, width_m, height_m)
}
