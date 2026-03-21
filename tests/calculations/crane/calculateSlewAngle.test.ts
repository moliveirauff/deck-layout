import { describe, it, expect } from 'vitest'
import { calculateSlewAngle, isSlewInRange } from '../../../src/lib/calculations/crane/calculateSlewAngle'

// Seven Seas: pedestal at (68, 12.5)
const PX = 68.0
const PY = 12.5

describe('calculateSlewAngle', () => {
  it('returns 0° for target directly to starboard (positive X)', () => {
    expect(calculateSlewAngle(PX, PY, PX + 10, PY)).toBeCloseTo(0, 5)
  })

  it('returns 90° for target directly to port (positive Y)', () => {
    expect(calculateSlewAngle(PX, PY, PX, PY + 10)).toBeCloseTo(90, 5)
  })

  it('returns 180° for target directly toward stern (negative X)', () => {
    expect(calculateSlewAngle(PX, PY, PX - 10, PY)).toBeCloseTo(180, 5)
  })

  it('returns 270° for target to starboard-below (negative Y)', () => {
    expect(calculateSlewAngle(PX, PY, PX, PY - 10)).toBeCloseTo(270, 5)
  })

  it('calculates angle for overboard position (75, -5) from pedestal', () => {
    // dx = 7, dy = -17.5 → atan2(-17.5, 7) ≈ -68.2° → normalized ≈ 291.8°
    expect(calculateSlewAngle(PX, PY, 75, -5)).toBeCloseTo(291.8, 0)
  })

  it('calculates angle for Manifold M1 at (20, 12.5)', () => {
    // dx = -48, dy = 0 → atan2(0, -48) = 180°
    expect(calculateSlewAngle(PX, PY, 20, 12.5)).toBeCloseTo(180, 5)
  })
})

describe('isSlewInRange', () => {
  it('returns true when limits are null', () => {
    expect(isSlewInRange(45, null, null)).toBe(true)
  })

  it('returns true for full 360° range', () => {
    expect(isSlewInRange(200, 0, 360)).toBe(true)
  })

  it('returns true when angle is within a partial range', () => {
    expect(isSlewInRange(90, 0, 180)).toBe(true)
  })

  it('returns false when angle is outside a partial range', () => {
    expect(isSlewInRange(270, 0, 180)).toBe(false)
  })

  it('handles wrap-around range (e.g., 270 → 90)', () => {
    // Range from 270° to 90° (sweeping through 0°)
    expect(isSlewInRange(0, 270, 90 + 360)).toBe(true)
    expect(isSlewInRange(350, 270, 90 + 360)).toBe(true)
    expect(isSlewInRange(180, 270, 90 + 360)).toBe(false)
  })
})
