import { describe, it, expect } from 'vitest'
import { interpolateCraneCurve } from '../../../src/lib/calculations/crane/interpolateCraneCurve'

// Seven Seas crane curve (subset)
const CURVE = [
  { radius_m: 10, capacity_t: 400 },
  { radius_m: 14, capacity_t: 340 },
  { radius_m: 18, capacity_t: 280 },
  { radius_m: 22, capacity_t: 220 },
  { radius_m: 30, capacity_t: 120 },
  { radius_m: 40, capacity_t: 30 },
]

describe('interpolateCraneCurve', () => {
  it('returns 0 for empty curve', () => {
    expect(interpolateCraneCurve([], 15)).toBe(0)
  })

  it('returns first capacity when radius is at or below minimum', () => {
    expect(interpolateCraneCurve(CURVE, 10)).toBe(400)
    expect(interpolateCraneCurve(CURVE, 5)).toBe(400)
  })

  it('returns 0 when radius exceeds maximum', () => {
    expect(interpolateCraneCurve(CURVE, 40)).toBe(0)
    expect(interpolateCraneCurve(CURVE, 45)).toBe(0)
  })

  it('returns exact capacity when radius matches a curve point', () => {
    expect(interpolateCraneCurve(CURVE, 18)).toBe(280)
    expect(interpolateCraneCurve(CURVE, 22)).toBe(220)
  })

  it('interpolates linearly between two points', () => {
    // Between 10m (400t) and 14m (340t), at 12m: 400 + (340-400) * (12-10)/(14-10) = 400 - 30 = 370
    expect(interpolateCraneCurve(CURVE, 12)).toBeCloseTo(370, 5)
  })

  it('interpolates at midpoint of wider span', () => {
    // Between 22m (220t) and 30m (120t), at 26m: 220 + (120-220) * (26-22)/(30-22) = 220 - 50 = 170
    expect(interpolateCraneCurve(CURVE, 26)).toBeCloseTo(170, 5)
  })

  it('handles single-point curve', () => {
    const single = [{ radius_m: 15, capacity_t: 200 }]
    expect(interpolateCraneCurve(single, 10)).toBe(200)  // below → first capacity
    expect(interpolateCraneCurve(single, 15)).toBe(200)  // at only point → still valid
    expect(interpolateCraneCurve(single, 20)).toBe(0)    // above → 0
  })
})
