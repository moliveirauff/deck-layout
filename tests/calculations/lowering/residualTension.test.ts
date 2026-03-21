import { describe, it, expect } from 'vitest'
import { calculateResidualTension } from '../../../src/lib/calculations/lowering/residualTension'

describe('calculateResidualTension', () => {
  it('positive residual when hook load exceeds buoyancy and drag', () => {
    const result = calculateResidualTension({
      hook_load_t: 50,
      buoyancy_t: 20,
      max_current_drag_kn: 30, // 30 / 9.81 ≈ 3.058 t
    })

    expect(result.hook_load_submerged_t).toBeCloseTo(30, 6)
    // residual = 30 - 30/9.81 ≈ 26.94
    expect(result.residual_tension_t).toBeCloseTo(30 - 30 / 9.81, 2)
    expect(result.residual_ok).toBe(true)
    expect(result.warning).toBeNull()
  })

  it('negative residual when equipment is buoyant', () => {
    // Classic buoyant equipment: buoyancy exceeds weight
    const result = calculateResidualTension({
      hook_load_t: 26.42,
      buoyancy_t: 38.44,
      max_current_drag_kn: 15.3,
    })

    expect(result.hook_load_submerged_t).toBeCloseTo(-12.02, 2)
    expect(result.residual_tension_t).toBeLessThan(0)
    expect(result.residual_ok).toBe(false)
    expect(result.warning).not.toBeNull()
  })

  it('negative residual from excessive current drag', () => {
    const result = calculateResidualTension({
      hook_load_t: 50,
      buoyancy_t: 45,
      max_current_drag_kn: 100, // 100/9.81 ≈ 10.19 t, submerged = 5 t
    })

    expect(result.hook_load_submerged_t).toBeCloseTo(5, 6)
    expect(result.residual_tension_t).toBeLessThan(0)
    expect(result.residual_ok).toBe(false)
    expect(result.warning).toContain('slack wire')
  })

  it('handles zero drag', () => {
    const result = calculateResidualTension({
      hook_load_t: 50,
      buoyancy_t: 20,
      max_current_drag_kn: 0,
    })

    expect(result.hook_load_submerged_t).toBeCloseTo(30, 6)
    expect(result.residual_tension_t).toBeCloseTo(30, 6)
    expect(result.residual_ok).toBe(true)
    expect(result.warning).toBeNull()
  })
})
