import { describe, it, expect } from 'vitest'
import { calculateTrimAndList, TrimAndListInput } from '../../../src/lib/calculations/stability/trimAndList'

describe('calculateTrimAndList', () => {
  it('calculates trim and list with offset cargo', () => {
    const input: TrimAndListInput = {
      displacement_loaded_t: 12533,
      lbp_m: 120,
      beam_m: 25,
      gm_loaded_m: 1.5,
      cargo: [
        { weight_t: 25, deck_pos_x: 80, deck_pos_y: 15 }, // forward of midship, starboard of CL
        { weight_t: 8, deck_pos_x: 40, deck_pos_y: 10 },  // aft of midship, port of CL
      ],
    }

    const result = calculateTrimAndList(input)

    // trim_moment = 25×(80-60) + 8×(40-60) = 500 + (-160) = 340 t·m
    expect(result.trim_moment_tm).toBeCloseTo(340, 6)

    // trim_angle = atan(340 / (12533 × 120)) × 180/π
    const expectedTrim = Math.atan(340 / (12533 * 120)) * 180 / Math.PI
    expect(result.trim_angle_deg).toBeCloseTo(expectedTrim, 6)
    expect(result.trim_ok).toBe(true) // very small angle

    // list_moment = 25×(15-12.5) + 8×(10-12.5) = 62.5 + (-20) = 42.5 t·m
    expect(result.list_moment_tm).toBeCloseTo(42.5, 6)

    // list_angle = atan(42.5 / (12533 × 1.5)) × 180/π
    const expectedList = Math.atan(42.5 / (12533 * 1.5)) * 180 / Math.PI
    expect(result.list_angle_deg).toBeCloseTo(expectedList, 6)
    expect(result.list_ok).toBe(true) // small angle
  })

  it('returns zero angles with symmetric cargo', () => {
    const input: TrimAndListInput = {
      displacement_loaded_t: 12520,
      lbp_m: 120,
      beam_m: 25,
      gm_loaded_m: 1.5,
      cargo: [
        { weight_t: 10, deck_pos_x: 70, deck_pos_y: 15 },
        { weight_t: 10, deck_pos_x: 50, deck_pos_y: 10 }, // symmetric about midship and CL
      ],
    }

    const result = calculateTrimAndList(input)

    // trim: 10×(70-60) + 10×(50-60) = 100 + (-100) = 0
    expect(result.trim_moment_tm).toBeCloseTo(0, 6)
    expect(result.trim_angle_deg).toBeCloseTo(0, 6)
    expect(result.trim_ok).toBe(true)

    // list: 10×(15-12.5) + 10×(10-12.5) = 25 + (-25) = 0
    expect(result.list_moment_tm).toBeCloseTo(0, 6)
    expect(result.list_angle_deg).toBeCloseTo(0, 6)
    expect(result.list_ok).toBe(true)
  })

  it('returns zero with no cargo', () => {
    const input: TrimAndListInput = {
      displacement_loaded_t: 12500,
      lbp_m: 120,
      beam_m: 25,
      gm_loaded_m: 1.5,
      cargo: [],
    }

    const result = calculateTrimAndList(input)

    expect(result.trim_moment_tm).toBe(0)
    expect(result.trim_angle_deg).toBe(0)
    expect(result.list_moment_tm).toBe(0)
    expect(result.list_angle_deg).toBe(0)
    expect(result.trim_ok).toBe(true)
    expect(result.list_ok).toBe(true)
  })

  it('flags excessive list angle', () => {
    // Extreme case: heavy cargo far to one side on a small vessel
    const input: TrimAndListInput = {
      displacement_loaded_t: 500,
      lbp_m: 50,
      beam_m: 15,
      gm_loaded_m: 0.8,
      cargo: [
        { weight_t: 50, deck_pos_x: 25, deck_pos_y: 14.5 }, // far starboard
      ],
    }

    const result = calculateTrimAndList(input)

    // list_moment = 50 × (14.5 - 7.5) = 350 t·m
    expect(result.list_moment_tm).toBeCloseTo(350, 6)

    // list_angle = atan(350 / (500 × 0.8)) × 180/π ≈ 41.2°
    expect(Math.abs(result.list_angle_deg)).toBeGreaterThan(1.0)
    expect(result.list_ok).toBe(false)
  })
})
