import { describe, it, expect } from 'vitest'
import {
  projectedAreasBox,
  projectedAreasCylinder,
  projectedAreas,
  submergedVolumeBox,
  submergedVolumeCylinder,
  submergedVolume,
} from '../../../src/lib/calculations/hydro/projectedAreas'

// Seed data: Manifold M1 — box 5×3×2.5m (L×W×H)
const L = 5.0
const W = 3.0
const H = 2.5

// Seed data: Christmas Tree — cylinder D=1.2m, length=2.5m
const D = 1.2
const CYL_L = 2.5

describe('projectedAreasBox', () => {
  it('calculates A_x = width × height', () => {
    const result = projectedAreasBox(L, W, H)
    expect(result.area_x_m2).toBeCloseTo(W * H) // 3.0 × 2.5 = 7.5
    expect(result.area_x_m2).toBeCloseTo(7.5)
  })

  it('calculates A_y = length × height', () => {
    const result = projectedAreasBox(L, W, H)
    expect(result.area_y_m2).toBeCloseTo(L * H) // 5.0 × 2.5 = 12.5
    expect(result.area_y_m2).toBeCloseTo(12.5)
  })

  it('calculates A_z = length × width (slamming / bottom face)', () => {
    const result = projectedAreasBox(L, W, H)
    expect(result.area_z_m2).toBeCloseTo(L * W) // 5.0 × 3.0 = 15.0
    expect(result.area_z_m2).toBeCloseTo(15.0)
  })

  it('returns all positive areas for any positive dimensions', () => {
    const result = projectedAreasBox(8, 4, 3)
    expect(result.area_x_m2).toBeGreaterThan(0)
    expect(result.area_y_m2).toBeGreaterThan(0)
    expect(result.area_z_m2).toBeGreaterThan(0)
  })
})

describe('projectedAreasCylinder', () => {
  it('calculates A_x = diameter × length (side face)', () => {
    const result = projectedAreasCylinder(D, CYL_L)
    expect(result.area_x_m2).toBeCloseTo(D * CYL_L) // 1.2 × 2.5 = 3.0
    expect(result.area_x_m2).toBeCloseTo(3.0)
  })

  it('A_y equals A_x (axisymmetric)', () => {
    const result = projectedAreasCylinder(D, CYL_L)
    expect(result.area_y_m2).toBeCloseTo(result.area_x_m2)
  })

  it('calculates A_z = π × r² (circular end face)', () => {
    const result = projectedAreasCylinder(D, CYL_L)
    expect(result.area_z_m2).toBeCloseTo(Math.PI * (D / 2) ** 2) // π × 0.36 ≈ 1.131
    expect(result.area_z_m2).toBeCloseTo(1.131, 2)
  })

  it('end face area is smaller than side area for slender cylinder', () => {
    const result = projectedAreasCylinder(D, CYL_L)
    expect(result.area_z_m2).toBeLessThan(result.area_x_m2)
  })
})

describe('projectedAreas (unified)', () => {
  it('dispatches to box handler for "box" geometry type', () => {
    const result = projectedAreas('box', L, W, H)
    expect(result.area_x_m2).toBeCloseTo(7.5)
    expect(result.area_y_m2).toBeCloseTo(12.5)
    expect(result.area_z_m2).toBeCloseTo(15.0)
  })

  it('dispatches to cylinder handler for "cylinder" geometry type (width=diameter, length=length)', () => {
    const result = projectedAreas('cylinder', CYL_L, D, 0)
    expect(result.area_x_m2).toBeCloseTo(D * CYL_L)
    expect(result.area_z_m2).toBeCloseTo(Math.PI * (D / 2) ** 2, 3)
  })
})

describe('submergedVolumeBox', () => {
  it('returns L × W × H for Manifold M1', () => {
    expect(submergedVolumeBox(L, W, H)).toBeCloseTo(L * W * H) // 37.5 m³
    expect(submergedVolumeBox(L, W, H)).toBeCloseTo(37.5)
  })
})

describe('submergedVolumeCylinder', () => {
  it('returns π × r² × length for Christmas Tree', () => {
    const expected = Math.PI * (D / 2) ** 2 * CYL_L // ≈ 2.827 m³
    expect(submergedVolumeCylinder(D, CYL_L)).toBeCloseTo(expected, 3)
    expect(submergedVolumeCylinder(D, CYL_L)).toBeCloseTo(2.827, 2)
  })
})

describe('submergedVolume (unified)', () => {
  it('returns box volume for "box" geometry', () => {
    expect(submergedVolume('box', L, W, H)).toBeCloseTo(37.5)
  })

  it('returns cylinder volume for "cylinder" geometry (width=diameter)', () => {
    expect(submergedVolume('cylinder', CYL_L, D, 0)).toBeCloseTo(2.827, 2)
  })
})
