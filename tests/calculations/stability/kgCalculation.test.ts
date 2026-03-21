import { describe, it, expect } from 'vitest'
import { calculateKG, KGCalculationInput } from '../../../src/lib/calculations/stability/kgCalculation'

describe('calculateKG', () => {
  it('calculates KG with 2 cargo items', () => {
    const input: KGCalculationInput = {
      displacement_t: 12500,
      kg_lightship_m: 8.2,
      deck_elevation_m: 12.5,
      cargo: [
        { weight_t: 25, deck_pos_x: 20, deck_pos_y: 12.5, height_m: 2.6 },
        { weight_t: 8, deck_pos_x: 12, deck_pos_y: 8, height_m: 1.6 },
      ],
    }

    const result = calculateKG(input)

    expect(result.total_deck_load_t).toBe(33)
    expect(result.total_weight_t).toBe(12533)

    // Manual: moment_lightship = 12500 × 8.2 = 102500
    // item1 KG = 12.5 + 2.6/2 = 13.8 → moment = 25 × 13.8 = 345
    // item2 KG = 12.5 + 1.6/2 = 13.3 → moment = 8 × 13.3 = 106.4
    // total_moment = 102500 + 345 + 106.4 = 102951.4
    // kg_loaded = 102951.4 / 12533 ≈ 8.2148
    expect(result.kg_loaded_m).toBeCloseTo(8.2148, 3)
  })

  it('returns unchanged KG with no cargo', () => {
    const input: KGCalculationInput = {
      displacement_t: 12500,
      kg_lightship_m: 8.2,
      deck_elevation_m: 12.5,
      cargo: [],
    }

    const result = calculateKG(input)

    expect(result.total_deck_load_t).toBe(0)
    expect(result.total_weight_t).toBe(12500)
    expect(result.kg_loaded_m).toBeCloseTo(8.2, 6)
  })

  it('handles zero displacement gracefully', () => {
    const input: KGCalculationInput = {
      displacement_t: 0,
      kg_lightship_m: 0,
      deck_elevation_m: 12.5,
      cargo: [],
    }

    const result = calculateKG(input)
    expect(result.total_weight_t).toBe(0)
    expect(result.kg_loaded_m).toBe(0)
  })
})
