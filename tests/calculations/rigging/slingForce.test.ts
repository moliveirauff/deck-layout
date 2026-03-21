import { describe, it, expect } from 'vitest'
import { calculateSlingForce, calculateSlingForceDesign } from '../../../src/lib/calculations/rigging/slingForce'

describe('calculateSlingForce', () => {
  it('calculates force for 4 slings at 30° from vertical', () => {
    // hook_load / (4 × cos(30°)) = 26.42 / (4 × 0.8660) = 7.63t
    const force = calculateSlingForce(26.42, 4, 30)
    const expected = 26.42 / (4 * Math.cos(30 * Math.PI / 180))
    expect(force).toBeCloseTo(expected, 4)
    expect(force).toBeCloseTo(7.63, 1)
  })

  it('calculates force for vertical slings (0°)', () => {
    // hook_load / (4 × cos(0°)) = 26.42 / 4 = 6.605t
    const force = calculateSlingForce(26.42, 4, 0)
    expect(force).toBeCloseTo(26.42 / 4, 4)
  })

  it('returns Infinity for zero slings', () => {
    expect(calculateSlingForce(26.42, 0, 30)).toBe(Infinity)
  })

  it('returns extremely large value for 90° angle (cos ≈ 0)', () => {
    // cos(90°) is ~6.12e-17 due to floating point, not exactly 0
    const force = calculateSlingForce(26.42, 4, 90)
    expect(force).toBeGreaterThan(1e10)
  })
})

describe('calculateSlingForceDesign', () => {
  it('applies default DAF of 1.3', () => {
    const design = calculateSlingForceDesign(7.63)
    expect(design).toBeCloseTo(7.63 * 1.3, 4)
    expect(design).toBeCloseTo(9.919, 2)
  })

  it('applies custom DAF', () => {
    const design = calculateSlingForceDesign(7.63, 1.5)
    expect(design).toBeCloseTo(7.63 * 1.5, 4)
  })
})
