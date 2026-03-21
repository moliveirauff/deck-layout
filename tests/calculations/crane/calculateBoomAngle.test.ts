import { describe, it, expect } from 'vitest'
import { calculateBoomAngle } from '../../../src/lib/calculations/crane/calculateBoomAngle'

// Seven Seas: boom_length = 40m
const BOOM = 40.0

describe('calculateBoomAngle', () => {
  it('returns 90° when radius is 0 (boom straight up)', () => {
    expect(calculateBoomAngle(0, BOOM)).toBe(90)
  })

  it('returns 0° when radius equals boom length (boom horizontal)', () => {
    expect(calculateBoomAngle(BOOM, BOOM)).toBeCloseTo(0, 5)
  })

  it('returns null when radius exceeds boom length', () => {
    expect(calculateBoomAngle(41, BOOM)).toBeNull()
  })

  it('returns null for zero boom length', () => {
    expect(calculateBoomAngle(10, 0)).toBeNull()
  })

  it('calculates correctly at radius = 20m (acos(0.5) = 60°)', () => {
    expect(calculateBoomAngle(20, BOOM)).toBeCloseTo(60, 5)
  })

  it('matches seed data: radius 10m → ~75.5° for 40m boom', () => {
    // acos(10/40) = acos(0.25) ≈ 75.52°
    expect(calculateBoomAngle(10, BOOM)).toBeCloseTo(75.52, 1)
  })

  it('matches seed data: radius 30m → ~41.4° for 40m boom', () => {
    // acos(30/40) = acos(0.75) ≈ 41.41°
    expect(calculateBoomAngle(30, BOOM)).toBeCloseTo(41.41, 1)
  })
})
