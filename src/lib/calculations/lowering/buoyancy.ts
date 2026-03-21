/**
 * Buoyancy force calculation for submerged equipment.
 *
 * F_buoyancy = ρ_seawater × g × V_submerged (Archimedes' principle)
 */

import { SEAWATER_DENSITY, GRAVITY } from '../hydro/constants'

/**
 * Calculate buoyancy force in kN.
 *
 * @param submerged_volume_m3 - Submerged volume of the equipment (m³)
 * @returns Buoyancy force in kN
 */
export function buoyancyForce(submerged_volume_m3: number): number {
  return (SEAWATER_DENSITY * GRAVITY * submerged_volume_m3) / 1000
}

/**
 * Calculate buoyancy in equivalent tonnes.
 *
 * @param submerged_volume_m3 - Submerged volume of the equipment (m³)
 * @returns Buoyancy in tonnes
 */
export function buoyancyTonnes(submerged_volume_m3: number): number {
  return (SEAWATER_DENSITY * submerged_volume_m3) / 1000
}
