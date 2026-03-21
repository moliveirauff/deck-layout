/**
 * KG (vertical centre of gravity) calculation for loaded vessel.
 *
 * KG_loaded = (displacement × KG_lightship + Σ(cargo_weight × cargo_KG)) / total_weight
 * where cargo_KG = deck_elevation + cargo_height / 2
 */

export type CargoItem = {
  weight_t: number
  deck_pos_x: number
  deck_pos_y: number
  height_m: number
}

export type KGCalculationInput = {
  displacement_t: number
  kg_lightship_m: number
  deck_elevation_m: number
  cargo: CargoItem[]
}

export type KGCalculationResult = {
  total_weight_t: number
  kg_loaded_m: number
  total_deck_load_t: number
}

/**
 * Calculate the combined KG of vessel + deck cargo.
 */
export function calculateKG(input: KGCalculationInput): KGCalculationResult {
  const { displacement_t, kg_lightship_m, deck_elevation_m, cargo } = input

  const total_deck_load_t = cargo.reduce((sum, item) => sum + item.weight_t, 0)
  const total_weight_t = displacement_t + total_deck_load_t

  if (total_weight_t <= 0) {
    return { total_weight_t: 0, kg_loaded_m: 0, total_deck_load_t: 0 }
  }

  let moment_sum = displacement_t * kg_lightship_m
  for (const item of cargo) {
    const item_kg = deck_elevation_m + item.height_m / 2
    moment_sum += item.weight_t * item_kg
  }

  const kg_loaded_m = moment_sum / total_weight_t

  return { total_weight_t, kg_loaded_m, total_deck_load_t }
}
