import { describe, it, expect } from 'vitest'
import { calculateCurrentDrag, CurrentDragInput } from '../../../src/lib/calculations/lowering/currentDrag'

describe('calculateCurrentDrag', () => {
  it('calculates drag at each depth and finds maximum', () => {
    const input: CurrentDragInput = {
      currentProfile: [
        { depth_m: 0, current_speed_ms: 1.2 },
        { depth_m: 500, current_speed_ms: 0.8 },
        { depth_m: 1000, current_speed_ms: 0.4 },
        { depth_m: 2100, current_speed_ms: 0.15 },
      ],
      cd_x: 1.2,
      projected_area_x_m2: 50,
    }

    const result = calculateCurrentDrag(input)

    // F = 0.5 × 1025 × 1.2 × 50 × v² / 1000
    // At 0m: 0.5 × 1025 × 1.2 × 50 × 1.44 / 1000 = 44.28 kN
    const expected_0m = (0.5 * 1025 * 1.2 * 50 * 1.2 ** 2) / 1000
    expect(result.drag_by_depth).toHaveLength(4)
    expect(result.drag_by_depth[0].drag_kn).toBeCloseTo(expected_0m, 2)

    // Maximum should be at surface (highest current)
    expect(result.max_drag_depth_m).toBe(0)
    expect(result.max_drag_kn).toBeCloseTo(expected_0m, 2)
  })

  it('returns zeros for empty profile', () => {
    const input: CurrentDragInput = {
      currentProfile: [],
      cd_x: 1.2,
      projected_area_x_m2: 50,
    }

    const result = calculateCurrentDrag(input)

    expect(result.max_drag_kn).toBe(0)
    expect(result.max_drag_depth_m).toBe(0)
    expect(result.drag_by_depth).toHaveLength(0)
  })

  it('handles zero current speed', () => {
    const input: CurrentDragInput = {
      currentProfile: [
        { depth_m: 100, current_speed_ms: 0 },
      ],
      cd_x: 1.2,
      projected_area_x_m2: 50,
    }

    const result = calculateCurrentDrag(input)

    expect(result.max_drag_kn).toBe(0)
    expect(result.drag_by_depth[0].drag_kn).toBe(0)
  })
})
