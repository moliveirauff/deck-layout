import { describe, it, expect } from 'vitest'
import {
  dragCoefficientBox,
  dragCoefficientCylinder,
  dragCoefficient,
} from '../../../src/lib/calculations/hydro/dragCoefficient'

// Seed data: Manifold M1 — box 5×3×2.5m
const MANIFOLD_BOX = { length_m: 5.0, width_m: 3.0, height_m: 2.5 }
// Seed data: Christmas Tree — cylinder D=1.2m, L=2.5m
const XMAS_TREE_CYL = { diameter_m: 1.2, length_m: 2.5 }

describe('dragCoefficientBox', () => {
  it('returns Cd = 1.2 for all horizontal directions (DNV-RP-N103 Table B-2)', () => {
    const result = dragCoefficientBox(MANIFOLD_BOX)
    expect(result.cd_x).toBe(1.2)
    expect(result.cd_y).toBe(1.2)
  })

  it('returns Cd_z = 1.4 for vertical direction (flat-bottom conservative)', () => {
    const result = dragCoefficientBox(MANIFOLD_BOX)
    expect(result.cd_z).toBe(1.4)
  })

  it('is independent of box dimensions', () => {
    const small = dragCoefficientBox({ length_m: 1, width_m: 1, height_m: 1 })
    const large = dragCoefficientBox({ length_m: 10, width_m: 8, height_m: 6 })
    expect(small.cd_x).toBe(large.cd_x)
    expect(small.cd_y).toBe(large.cd_y)
    expect(small.cd_z).toBe(large.cd_z)
  })
})

describe('dragCoefficientCylinder', () => {
  it('returns Cd = 1.0 for perpendicular flow (rough cylinder, DNV-RP-N103 Table B-1)', () => {
    const result = dragCoefficientCylinder(XMAS_TREE_CYL)
    expect(result.cd_x).toBe(1.0)
    expect(result.cd_y).toBe(1.0)
  })

  it('returns Cd_z = 0.0 for axial flow (negligible end resistance)', () => {
    const result = dragCoefficientCylinder(XMAS_TREE_CYL)
    expect(result.cd_z).toBe(0.0)
  })

  it('is independent of cylinder dimensions', () => {
    const thin = dragCoefficientCylinder({ diameter_m: 0.3, length_m: 1.0 })
    const wide = dragCoefficientCylinder({ diameter_m: 3.0, length_m: 10.0 })
    expect(thin.cd_x).toBe(wide.cd_x)
    expect(thin.cd_z).toBe(wide.cd_z)
  })
})

describe('dragCoefficient (unified)', () => {
  it('dispatches to box handler for "box" geometry', () => {
    const result = dragCoefficient('box', MANIFOLD_BOX)
    expect(result.cd_x).toBe(1.2)
    expect(result.cd_z).toBe(1.4)
  })

  it('dispatches to cylinder handler for "cylinder" geometry', () => {
    const result = dragCoefficient('cylinder', XMAS_TREE_CYL)
    expect(result.cd_x).toBe(1.0)
    expect(result.cd_z).toBe(0.0)
  })
})
