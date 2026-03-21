import { describe, it, expect } from 'vitest'
import { buoyancyForce, buoyancyTonnes } from '../../../src/lib/calculations/lowering/buoyancy'

describe('buoyancyForce', () => {
  it('calculates buoyancy force in kN for 37.5 m³', () => {
    // F = ρ × g × V / 1000 = 1025 × 9.81 × 37.5 / 1000 ≈ 377.1 kN
    const f = buoyancyForce(37.5)
    expect(f).toBeCloseTo(1025 * 9.81 * 37.5 / 1000, 1)
    expect(f).toBeCloseTo(377.1, 0)
  })

  it('returns 0 for zero volume', () => {
    expect(buoyancyForce(0)).toBe(0)
  })
})

describe('buoyancyTonnes', () => {
  it('calculates buoyancy in tonnes for 37.5 m³', () => {
    // T = ρ × V / 1000 = 1025 × 37.5 / 1000 = 38.4375t
    const t = buoyancyTonnes(37.5)
    expect(t).toBeCloseTo(38.4375, 4)
  })

  it('returns 0 for zero volume', () => {
    expect(buoyancyTonnes(0)).toBe(0)
  })
})
