import { describe, it, expect } from 'vitest'
import { calculateSeaFasteningForces } from '../../../src/lib/calculations/seafastening/seafasteningForces'

const G = 9.80665

describe('calculateSeaFasteningForces', () => {
  it('calculates forces for 25t equipment with known accelerations', () => {
    const result = calculateSeaFasteningForces({
      dry_weight_t: 25,
      a_transversal_ms2: 3.0,
      a_longitudinal_ms2: 1.5,
      a_vertical_ms2: 12.31, // g + 2.5
      n_tiedowns: 4,
      sf_tiedown: 3.0,
      daf_transit: 1.3,
    })

    // F = dry_weight_t × acceleration (kN)
    expect(result.force_transversal_kn).toBeCloseTo(25 * 3.0, 1) // 75 kN
    expect(result.force_longitudinal_kn).toBeCloseTo(25 * 1.5, 1) // 37.5 kN
    expect(result.force_vertical_kn).toBeCloseTo(25 * 12.31, 1) // 307.75 kN

    // Horizontal resultant = sqrt(75² + 37.5²) ≈ 83.85 kN
    const expectedHoriz = Math.sqrt(75 * 75 + 37.5 * 37.5)
    expect(result.force_horizontal_resultant_kn).toBeCloseTo(expectedHoriz, 1)

    // Uplift = F_v - weight = 25 × 12.31 - 25 × 9.80665 = 25 × (12.31 - 9.80665) ≈ 62.58 kN
    const expectedUplift = 25 * (12.31 - G)
    expect(result.force_uplift_kn).toBeCloseTo(expectedUplift, 1)
    expect(result.force_uplift_kn).toBeGreaterThan(0)

    // MBL required = horizontal × DAF × SF / n_tiedowns
    const expectedMbl = (expectedHoriz * 1.3 * 3.0) / 4
    expect(result.mbl_required_per_tiedown_kn).toBeCloseTo(expectedMbl, 1)

    expect(result.daf_transit).toBe(1.3)
    expect(result.tiedown_ok).toBe(false) // no MBL provided
  })

  it('uplift is zero when a_v < g (no uplift scenario)', () => {
    const result = calculateSeaFasteningForces({
      dry_weight_t: 10,
      a_transversal_ms2: 2.0,
      a_longitudinal_ms2: 1.0,
      a_vertical_ms2: 9.5, // less than g
      n_tiedowns: 4,
    })

    expect(result.force_uplift_kn).toBe(0)
  })

  it('uplift is zero when a_v equals g exactly', () => {
    const result = calculateSeaFasteningForces({
      dry_weight_t: 50,
      a_transversal_ms2: 2.0,
      a_longitudinal_ms2: 1.0,
      a_vertical_ms2: G,
      n_tiedowns: 6,
    })

    expect(result.force_uplift_kn).toBeCloseTo(0, 5)
  })

  it('uses default SF=3.0 and DAF=1.3 when not provided', () => {
    const result = calculateSeaFasteningForces({
      dry_weight_t: 25,
      a_transversal_ms2: 3.0,
      a_longitudinal_ms2: 1.5,
      a_vertical_ms2: 12.31,
      n_tiedowns: 4,
    })

    const expectedHoriz = Math.sqrt(75 * 75 + 37.5 * 37.5)
    const expectedMbl = (expectedHoriz * 1.3 * 3.0) / 4
    expect(result.mbl_required_per_tiedown_kn).toBeCloseTo(expectedMbl, 1)
    expect(result.daf_transit).toBe(1.3)
  })

  it('MBL scales inversely with number of tiedowns', () => {
    const base = calculateSeaFasteningForces({
      dry_weight_t: 25,
      a_transversal_ms2: 3.0,
      a_longitudinal_ms2: 1.5,
      a_vertical_ms2: 12.31,
      n_tiedowns: 4,
    })

    const doubled = calculateSeaFasteningForces({
      dry_weight_t: 25,
      a_transversal_ms2: 3.0,
      a_longitudinal_ms2: 1.5,
      a_vertical_ms2: 12.31,
      n_tiedowns: 8,
    })

    expect(doubled.mbl_required_per_tiedown_kn).toBeCloseTo(
      base.mbl_required_per_tiedown_kn / 2,
      1,
    )
  })
})
