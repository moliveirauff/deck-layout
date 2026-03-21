import { describe, it, expect } from 'vitest'
import { calculateHookLoad } from '../../../src/lib/calculations/rigging/hookLoad'

describe('calculateHookLoad', () => {
  it('calculates hook load with rigging weight and contingency', () => {
    // 25t dry + 0.5t rigging + 5% contingency (1.25t) = 26.75t
    const result = calculateHookLoad(25, 0.5, 5)
    expect(result).toBeCloseTo(26.75, 4)
  })

  it('calculates hook load with zero rigging weight', () => {
    // 25t dry + 0t rigging + 5% contingency (1.25t) = 26.25t
    const result = calculateHookLoad(25, 0, 5)
    expect(result).toBeCloseTo(26.25, 4)
  })

  it('calculates hook load with zero contingency', () => {
    // 25t dry + 0.5t rigging + 0% contingency = 25.5t
    const result = calculateHookLoad(25, 0.5, 0)
    expect(result).toBeCloseTo(25.5, 4)
  })

  it('calculates hook load with zero rigging and zero contingency', () => {
    const result = calculateHookLoad(25, 0, 0)
    expect(result).toBeCloseTo(25, 4)
  })
})
