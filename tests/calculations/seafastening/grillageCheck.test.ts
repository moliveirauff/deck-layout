import { describe, it, expect } from 'vitest'
import {
  calculateGrillagePressure,
  checkGrillageCapacity,
} from '../../../src/lib/calculations/seafastening/grillageCheck'

describe('calculateGrillagePressure', () => {
  it('calculates pressure as weight / area', () => {
    // 25t on 10 m² → 2.5 t/m²
    expect(calculateGrillagePressure(25, 10)).toBeCloseTo(2.5, 5)
  })

  it('returns Infinity for zero area', () => {
    expect(calculateGrillagePressure(25, 0)).toBe(Infinity)
  })

  it('returns Infinity for negative area', () => {
    expect(calculateGrillagePressure(25, -1)).toBe(Infinity)
  })

  it('handles small equipment on large grillage', () => {
    // 5t on 20 m² → 0.25 t/m²
    expect(calculateGrillagePressure(5, 20)).toBeCloseTo(0.25, 5)
  })
})

describe('checkGrillageCapacity', () => {
  it('returns true when pressure is within capacity', () => {
    expect(checkGrillageCapacity(2.5, 5.0)).toBe(true)
  })

  it('returns true when pressure equals capacity', () => {
    expect(checkGrillageCapacity(5.0, 5.0)).toBe(true)
  })

  it('returns false when pressure exceeds capacity', () => {
    expect(checkGrillageCapacity(6.0, 5.0)).toBe(false)
  })

  it('returns false for Infinity pressure', () => {
    expect(checkGrillageCapacity(Infinity, 10.0)).toBe(false)
  })
})
