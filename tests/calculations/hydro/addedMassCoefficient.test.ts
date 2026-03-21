import { describe, it, expect } from 'vitest'
import {
  addedMassCoefficientBox,
  addedMassCoefficientCylinder,
  addedMassCoefficient,
} from '../../../src/lib/calculations/hydro/addedMassCoefficient'

// Seed data geometries
const MANIFOLD_BOX    = { length_m: 5.0, width_m: 3.0, height_m: 2.5 }  // L/W = 1.67
const SQUARE_BOX      = { length_m: 3.0, width_m: 3.0, height_m: 3.0 }  // L/W = 1.00
const ELONGATED_BOX   = { length_m: 9.0, width_m: 3.0, height_m: 2.0 }  // L/W = 3.00
const XMAS_TREE_CYL   = { diameter_m: 1.2, length_m: 2.5 }

describe('addedMassCoefficientBox', () => {
  it('returns Ca = 1.0 for square plan (L/W = 1)', () => {
    expect(addedMassCoefficientBox(SQUARE_BOX)).toBeCloseTo(1.0)
  })

  it('returns Ca = 0.9 for Manifold M1 (L/W = 5/3 ≈ 1.6667)', () => {
    // Interpolated: 1.0 - (5/3 - 1) * 0.15 = 1.0 - (2/3) * 0.15 = 0.9
    const ca = addedMassCoefficientBox(MANIFOLD_BOX)
    expect(ca).toBeCloseTo(0.9, 5)
    expect(ca).toBeGreaterThan(0.76)
    expect(ca).toBeLessThan(1.0)
  })

  it('returns Ca between 0.85 and 1.0 for L/W = 1.5', () => {
    const ca = addedMassCoefficientBox({ length_m: 6, width_m: 4, height_m: 2 })
    expect(ca).toBeGreaterThan(0.85)
    expect(ca).toBeLessThanOrEqual(1.0)
  })

  it('returns Ca = 0.85 for L/W = 2 (boundary)', () => {
    const ca = addedMassCoefficientBox({ length_m: 6, width_m: 3, height_m: 2 })
    expect(ca).toBeCloseTo(0.85)
  })

  it('returns Ca = 0.76 for very elongated box (L/W ≥ 3)', () => {
    expect(addedMassCoefficientBox(ELONGATED_BOX)).toBeCloseTo(0.76)
    // Even more elongated — clamped at 0.76
    expect(addedMassCoefficientBox({ length_m: 15, width_m: 3, height_m: 2 })).toBeCloseTo(0.76)
  })

  it('handles zero width gracefully (defaults to Ca = 1.0)', () => {
    const ca = addedMassCoefficientBox({ length_m: 5, width_m: 0, height_m: 2 })
    expect(ca).toBeCloseTo(1.0)
  })
})

describe('addedMassCoefficientCylinder', () => {
  it('returns Ca = 1.0 (exact theoretical value for circular cross-section)', () => {
    expect(addedMassCoefficientCylinder(XMAS_TREE_CYL)).toBe(1.0)
  })

  it('is independent of cylinder dimensions', () => {
    expect(addedMassCoefficientCylinder({ diameter_m: 0.5, length_m: 1.0 })).toBe(1.0)
    expect(addedMassCoefficientCylinder({ diameter_m: 5.0, length_m: 15.0 })).toBe(1.0)
  })
})

describe('addedMassCoefficient (unified)', () => {
  it('dispatches to box handler', () => {
    expect(addedMassCoefficient('box', MANIFOLD_BOX)).toBeCloseTo(0.9, 5)
  })

  it('dispatches to cylinder handler', () => {
    expect(addedMassCoefficient('cylinder', XMAS_TREE_CYL)).toBe(1.0)
  })
})
