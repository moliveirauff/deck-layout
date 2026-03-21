import { describe, it, expect } from 'vitest'
import {
  slammingCoefficientBox,
  slammingCoefficientCylinder,
  slammingCoefficient,
} from '../../../src/lib/calculations/hydro/slammingCoefficient'

describe('slammingCoefficientBox', () => {
  it('returns Cs = 5.0 for flat-bottomed box (DNV-RP-N103 Sec. 4.5)', () => {
    expect(slammingCoefficientBox()).toBe(5.0)
  })
})

describe('slammingCoefficientCylinder', () => {
  it('returns Cs = π for circular cross-section (Wagner theory)', () => {
    expect(slammingCoefficientCylinder()).toBeCloseTo(Math.PI, 10)
  })

  it('Cs for cylinder is less than Cs for box (π < 5)', () => {
    expect(slammingCoefficientCylinder()).toBeLessThan(slammingCoefficientBox())
  })
})

describe('slammingCoefficient (unified)', () => {
  it('returns 5.0 for box geometry', () => {
    expect(slammingCoefficient('box')).toBe(5.0)
  })

  it('returns π for cylinder geometry', () => {
    expect(slammingCoefficient('cylinder')).toBeCloseTo(Math.PI, 10)
  })
})
