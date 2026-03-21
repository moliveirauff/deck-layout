/**
 * Wave number calculation using the linear dispersion relation.
 *
 * Dispersion relation for finite depth: ω² = g·k·tanh(k·d)
 * Deep water approximation (d → ∞): k = ω²/g
 *
 * For finite depths (d ≤ 100m), solved numerically using Newton-Raphson.
 */

import { GRAVITY } from '../hydro/constants'

/**
 * Calculate the wave number k (rad/m) for given angular frequency and water depth.
 *
 * @param omega_rad_s - Angular frequency (rad/s), ω = 2π/Tp
 * @param depth_m - Water depth (m). If > 100m or ≤ 0, deep water is assumed.
 * @returns Wave number k in rad/m
 */
export function waveNumber(
  omega_rad_s: number,
  depth_m: number,
): number {
  // Deep water initial guess: k₀ = ω²/g
  const k_deep = (omega_rad_s * omega_rad_s) / GRAVITY

  // Use deep water approximation if depth is very large or non-positive
  if (depth_m <= 0 || depth_m > 100) return k_deep

  // Newton-Raphson iteration for finite depth
  // f(k) = g·k·tanh(k·d) − ω²
  // f'(k) = g·[tanh(k·d) + k·d/cosh²(k·d)]
  let k = k_deep
  for (let i = 0; i < 50; i++) {
    const kd = k * depth_m
    const tanh_kd = Math.tanh(kd)
    const cosh_kd = Math.cosh(kd)
    const f = GRAVITY * k * tanh_kd - omega_rad_s * omega_rad_s
    const df = GRAVITY * (tanh_kd + kd / (cosh_kd * cosh_kd))
    const dk = -f / df
    k += dk
    if (Math.abs(dk) < 1e-8) break
  }

  return Math.max(k, 1e-10)
}
