import { describe, it, expect } from 'vitest'
import { checkWLL, checkMBL } from '../../../src/lib/calculations/rigging/wllCheck'

describe('checkWLL', () => {
  it('passes when design force ≤ WLL', () => {
    const result = checkWLL(9.92, 25.0)
    expect(result.ok).toBe(true)
    expect(result.utilization_pct).toBeCloseTo((9.92 / 25.0) * 100, 2)
    expect(result.utilization_pct).toBeCloseTo(39.68, 1)
  })

  it('fails when design force > WLL', () => {
    const result = checkWLL(30.0, 25.0)
    expect(result.ok).toBe(false)
    expect(result.utilization_pct).toBeCloseTo(120, 1)
  })

  it('passes at boundary (force == WLL)', () => {
    const result = checkWLL(25.0, 25.0)
    expect(result.ok).toBe(true)
    expect(result.utilization_pct).toBeCloseTo(100, 4)
  })
})

describe('checkMBL', () => {
  it('calculates MBL as WLL × 5 when mbl_t is null', () => {
    // MBL = 25 × 5 = 125t; SF = 125 / 9.92 = 12.6
    const result = checkMBL(9.92, 25.0, null)
    expect(result.ok).toBe(true)
    expect(result.sf).toBeCloseTo(125 / 9.92, 2)
  })

  it('uses provided MBL when not null', () => {
    // MBL = 60t; SF = 60 / 9.92 = 6.05
    const result = checkMBL(9.92, 25.0, 60)
    expect(result.ok).toBe(true)
    expect(result.sf).toBeCloseTo(60 / 9.92, 2)
  })

  it('fails when safety factor < 5', () => {
    // MBL = 40t; SF = 40 / 9.92 = 4.03 < 5
    const result = checkMBL(9.92, 25.0, 40)
    expect(result.ok).toBe(false)
    expect(result.sf).toBeCloseTo(40 / 9.92, 2)
    expect(result.sf).toBeLessThan(5)
  })

  it('returns Infinity sf when design force is 0', () => {
    const result = checkMBL(0, 25.0, 125)
    expect(result.sf).toBe(Infinity)
    expect(result.ok).toBe(true)
  })
})
