/**
 * Trim and list angle calculation from cargo distribution.
 *
 * trim_moment = Σ(weight × (pos_x - LBP/2))
 * trim_angle  = atan(trim_moment / (displacement × LBP))  [degrees]
 *
 * list_moment = Σ(weight × (pos_y - beam/2))
 * list_angle  = atan(list_moment / (displacement × GM))    [degrees]
 */

export type TrimAndListInput = {
  displacement_loaded_t: number
  lbp_m: number
  beam_m: number
  gm_loaded_m: number
  cargo: ReadonlyArray<{ weight_t: number; deck_pos_x: number; deck_pos_y: number }>
}

export type TrimAndListResult = {
  trim_moment_tm: number
  trim_angle_deg: number
  trim_ok: boolean
  list_moment_tm: number
  list_angle_deg: number
  list_ok: boolean
}

const RAD_TO_DEG = 180 / Math.PI

/**
 * Calculate trim and list angles from cargo positions.
 *
 * Reference points:
 *   - Longitudinal: midship = LBP / 2
 *   - Transversal:  centreline = beam / 2
 */
export function calculateTrimAndList(input: TrimAndListInput): TrimAndListResult {
  const { displacement_loaded_t, lbp_m, beam_m, gm_loaded_m, cargo } = input

  const midship_x = lbp_m / 2
  const centreline_y = beam_m / 2

  let trim_moment_tm = 0
  let list_moment_tm = 0

  for (const item of cargo) {
    trim_moment_tm += item.weight_t * (item.deck_pos_x - midship_x)
    list_moment_tm += item.weight_t * (item.deck_pos_y - centreline_y)
  }

  const trim_angle_deg =
    displacement_loaded_t > 0 && lbp_m > 0
      ? Math.atan(trim_moment_tm / (displacement_loaded_t * lbp_m)) * RAD_TO_DEG
      : 0

  const list_angle_deg =
    displacement_loaded_t > 0 && gm_loaded_m > 0
      ? Math.atan(list_moment_tm / (displacement_loaded_t * gm_loaded_m)) * RAD_TO_DEG
      : 0

  return {
    trim_moment_tm,
    trim_angle_deg,
    trim_ok: Math.abs(trim_angle_deg) <= 0.5,
    list_moment_tm,
    list_angle_deg,
    list_ok: Math.abs(list_angle_deg) <= 1.0,
  }
}
