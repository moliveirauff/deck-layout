/**
 * Residual hook tension during lowering.
 *
 * submerged = hook_load - buoyancy
 * residual  = submerged - current_drag_t
 *
 * Positive residual → cable taut (OK)
 * Negative residual → slack wire / buoyant equipment (NOT OK)
 */

import { GRAVITY } from '../hydro/constants'

export type ResidualTensionInput = {
  hook_load_t: number
  buoyancy_t: number
  max_current_drag_kn: number
}

export type ResidualTensionResult = {
  hook_load_submerged_t: number
  residual_tension_t: number
  residual_ok: boolean
  warning: string | null
}

/**
 * Calculate residual hook tension considering buoyancy and current drag.
 */
export function calculateResidualTension(
  input: ResidualTensionInput,
): ResidualTensionResult {
  const { hook_load_t, buoyancy_t, max_current_drag_kn } = input

  const hook_load_submerged_t = hook_load_t - buoyancy_t

  // Convert drag from kN to tonnes-force: F(kN) / g(m/s²) = mass(t)
  const current_drag_t = max_current_drag_kn / GRAVITY

  const residual_tension_t = hook_load_submerged_t - current_drag_t
  const residual_ok = residual_tension_t > 0

  const warning = residual_ok
    ? null
    : 'Negative residual tension — risk of slack wire. Equipment may be buoyant or current drag too high. Consider adding ballast or flooding.'

  return {
    hook_load_submerged_t,
    residual_tension_t,
    residual_ok,
    warning,
  }
}
