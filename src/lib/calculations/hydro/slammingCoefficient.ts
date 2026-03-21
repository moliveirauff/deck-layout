/**
 * Slamming coefficient (Cs) per DNV-RP-N103 Section 4.5.
 *
 * The slamming coefficient is used to calculate impulsive loads during
 * water entry of the object through the free surface.
 *
 *   F_slam = 0.5 × ρ_water × Cs × A_z × v_slam²
 */

/**
 * Slamming coefficient for a box with a flat bottom.
 *
 * Per DNV-RP-N103 Sec. 4.5: Cs = 5.0 for flat plate / flat-bottomed structures.
 */
export function slammingCoefficientBox(): number {
  return 5.0
}

/**
 * Slamming coefficient for a cylinder with circular cross-section.
 *
 * Per DNV-RP-N103 Sec. 4.5: Cs = π for circular cross-sections.
 * Theoretical result from Wagner's water-entry theory.
 */
export function slammingCoefficientCylinder(): number {
  return Math.PI
}

/**
 * Unified entry point: compute slamming coefficient from geometry type.
 */
export function slammingCoefficient(geometryType: 'box' | 'cylinder'): number {
  if (geometryType === 'cylinder') {
    return slammingCoefficientCylinder()
  }
  return slammingCoefficientBox()
}
