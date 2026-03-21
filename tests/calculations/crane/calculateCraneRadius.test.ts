import { describe, it, expect } from 'vitest'
import { calculateCraneRadius } from '../../../src/lib/calculations/crane/calculateCraneRadius'

// Seven Seas: pedestal at (68, 12.5)
const PX = 68.0
const PY = 12.5

describe('calculateCraneRadius', () => {
  it('returns 0 when target is at pedestal', () => {
    expect(calculateCraneRadius(PX, PY, PX, PY)).toBe(0)
  })

  it('calculates radius for Manifold M1 at deck pos (20, 12.5)', () => {
    // dx = 20 - 68 = -48, dy = 0 → radius = 48
    expect(calculateCraneRadius(PX, PY, 20, 12.5)).toBeCloseTo(48.0, 5)
  })

  it('calculates radius for PLET-A at deck pos (12, 8)', () => {
    // dx = 12 - 68 = -56, dy = 8 - 12.5 = -4.5 → sqrt(56² + 4.5²) = sqrt(3136 + 20.25) = sqrt(3156.25) ≈ 56.18
    expect(calculateCraneRadius(PX, PY, 12, 8)).toBeCloseTo(56.1803, 3)
  })

  it('calculates radius for overboard position (75, -5)', () => {
    // dx = 75 - 68 = 7, dy = -5 - 12.5 = -17.5 → sqrt(49 + 306.25) = sqrt(355.25) ≈ 18.85
    expect(calculateCraneRadius(PX, PY, 75, -5)).toBeCloseTo(18.8481, 3)
  })

  it('handles pure X offset', () => {
    expect(calculateCraneRadius(0, 0, 10, 0)).toBe(10)
  })

  it('handles pure Y offset', () => {
    expect(calculateCraneRadius(0, 0, 0, 7)).toBe(7)
  })
})
