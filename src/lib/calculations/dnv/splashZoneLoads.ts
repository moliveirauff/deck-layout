/**
 * Hydrodynamic force calculation for splash zone passage per DNV-ST-N001 / DNV-RP-N103.
 *
 * Calculates drag, inertia, and slamming forces on equipment entering the water
 * for a single (Hs, Tp) combination using simplified linear wave theory at
 * z = 0 (free surface), deep water assumption (ω² ≈ g·k).
 */

import { SEAWATER_DENSITY, GRAVITY } from '../hydro/constants'
import { craneTipVelocity, craneTipAcceleration } from '../motion/dynamicAmplification'

export type WaveKinematics = {
  omega: number    // angular frequency (rad/s)
  k: number        // wave number (rad/m), deep water approx
  amplitude: number // wave amplitude A = Hs/2 (m)
  v_water: number  // vertical water velocity at surface (m/s)
  a_water: number  // vertical water acceleration at surface (m/s²)
}

export type HydroForces = {
  f_drag_N: number     // Drag force (N)
  f_inertia_N: number  // Inertia / added mass force (N)
  f_slam_N: number     // Slamming force (N)
  v_ct: number         // Crane tip vertical velocity (m/s)
  a_ct: number         // Crane tip vertical acceleration (m/s²)
}

export type SplashZoneLoadsInput = {
  hs_m: number              // Significant wave height (m)
  tp_s: number              // Peak period (s)
  cd_z: number              // Vertical drag coefficient (–)
  ca: number                // Added mass coefficient (–)
  cs: number                // Slamming coefficient (–)
  area_z_m2: number         // Projected area of slamming face (m²)
  volume_m3: number         // Submerged volume (m³)
  crane_tip_heave_m: number // Significant crane tip vertical heave (m)
}

/**
 * Compute wave kinematics at z = 0 (water surface), deep water.
 *
 * Deep water dispersion relation: ω² = g·k → k = ω²/g
 * At z = 0: v_z = A·ω, a_z = A·ω²
 */
export function waveKinematics(hs_m: number, tp_s: number): WaveKinematics {
  const omega = (2 * Math.PI) / tp_s
  const k = (omega * omega) / GRAVITY  // deep water approximation
  const amplitude = hs_m / 2
  const v_water = amplitude * omega
  const a_water = amplitude * omega * omega
  return { omega, k, amplitude, v_water, a_water }
}

/**
 * Calculate hydrodynamic forces at the splash zone for a given sea state.
 *
 * Force formulations (DNV-RP-N103):
 *   F_drag     = 0.5 × ρ × Cd_z × A_z × (v_ct + v_water)²
 *   F_inertia  = ρ × Ca × V_sub × (a_ct + a_water)
 *   F_slam     = 0.5 × ρ × Cs × A_z × (v_ct + v_water)²
 *
 * Note: v_slam = v_ct + v_water (relative velocity between structure and water
 * at impact, using worst-case additive assumption).
 */
export function splashZoneLoads(input: SplashZoneLoadsInput): HydroForces {
  const { hs_m, tp_s, cd_z, ca, cs, area_z_m2, volume_m3, crane_tip_heave_m } = input

  const { omega, v_water, a_water } = waveKinematics(hs_m, tp_s)

  const v_ct = craneTipVelocity(crane_tip_heave_m, omega)
  const a_ct = craneTipAcceleration(crane_tip_heave_m, omega)

  // Combined relative velocity (additive worst-case)
  const v_rel = v_ct + v_water
  const a_rel = a_ct + a_water

  const f_drag_N = 0.5 * SEAWATER_DENSITY * cd_z * area_z_m2 * v_rel * v_rel
  const f_inertia_N = SEAWATER_DENSITY * ca * volume_m3 * a_rel
  const f_slam_N = 0.5 * SEAWATER_DENSITY * cs * area_z_m2 * v_rel * v_rel

  return { f_drag_N, f_inertia_N, f_slam_N, v_ct, a_ct }
}
