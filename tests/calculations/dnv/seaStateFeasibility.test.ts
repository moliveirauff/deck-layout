import { describe, it, expect } from 'vitest'
import { seaStateFeasibility } from '../../../src/lib/calculations/dnv/seaStateFeasibility'
import { GRAVITY } from '../../../src/lib/calculations/hydro/constants'

// Seed data: Manifold M1 — 25t, crane capacity 245t overboard, Tp=10s
const CRANE_CAP_T = 245
const DRY_WEIGHT_T = 25
const OMEGA_10S = (2 * Math.PI) / 10
const HEAVE_M = 1.25
const A_CT = HEAVE_M * OMEGA_10S * OMEGA_10S  // ≈ 0.494 m/s²

// Pre-computed forces for a moderate sea state
const BASE_INPUT = {
  dry_weight_t: DRY_WEIGHT_T,
  crane_capacity_overboard_t: CRANE_CAP_T,
  f_drag_N: 80_000,
  f_inertia_N: 40_000,
  f_slam_N: 285_000,
  a_ct: A_CT,
}

describe('seaStateFeasibility', () => {
  it('computes DAF = 1 + a_ct / g', () => {
    const { daf } = seaStateFeasibility(BASE_INPUT)
    expect(daf).toBeCloseTo(1 + A_CT / GRAVITY, 5)
    // 1 + 0.494/9.81 ≈ 1.050
    expect(daf).toBeCloseTo(1.050, 2)
  })

  it('computes static hook load = weight × g in Newtons', () => {
    const { force_breakdown } = seaStateFeasibility(BASE_INPUT)
    expect(force_breakdown.f_static_N).toBeCloseTo(DRY_WEIGHT_T * 1000 * GRAVITY)
    // 25 × 1000 × 9.81 = 245,250 N
    expect(force_breakdown.f_static_N).toBeCloseTo(245_250, 0)
  })

  it('total force = static×DAF + drag + inertia + slam', () => {
    const { daf, force_breakdown } = seaStateFeasibility(BASE_INPUT)
    const expected =
      DRY_WEIGHT_T * 1000 * GRAVITY * daf +
      BASE_INPUT.f_drag_N +
      BASE_INPUT.f_inertia_N +
      BASE_INPUT.f_slam_N
    expect(force_breakdown.f_total_N).toBeCloseTo(expected, 0)
  })

  it('is_feasible when total force ≤ crane capacity', () => {
    // Crane capacity = 245t × 1000 × 9.81 ≈ 2,403,450 N >> forces above
    const { is_feasible, utilization_pct } = seaStateFeasibility(BASE_INPUT)
    expect(is_feasible).toBe(true)
    expect(utilization_pct).toBeGreaterThan(0)
    expect(utilization_pct).toBeLessThan(100)
  })

  it('is_feasible = false when total force exceeds crane capacity', () => {
    const { is_feasible } = seaStateFeasibility({
      ...BASE_INPUT,
      crane_capacity_overboard_t: 0.001, // effectively zero capacity
    })
    expect(is_feasible).toBe(false)
  })

  it('utilization_pct = 100 when F_total exactly equals crane capacity', () => {
    // Build inputs so total ≈ crane capacity
    const craneCapN = DRY_WEIGHT_T * 1000 * GRAVITY  // exactly equal to static weight
    const dafActual = 1 + A_CT / GRAVITY
    // Make hydrodynamic forces zero so F_total = f_static × DAF
    const fTotal = craneCapN * dafActual
    const craneCapT = (craneCapN * dafActual) / (1000 * GRAVITY)
    const { utilization_pct, is_feasible } = seaStateFeasibility({
      dry_weight_t: DRY_WEIGHT_T,
      crane_capacity_overboard_t: craneCapT,
      f_drag_N: 0,
      f_inertia_N: 0,
      f_slam_N: 0,
      a_ct: A_CT,
    })
    expect(fTotal).toBeGreaterThan(0)  // sanity check
    expect(utilization_pct).toBeCloseTo(100, 1)
    expect(is_feasible).toBe(true)
  })

  it('utilization_pct increases with larger forces (higher Hs)', () => {
    const light = seaStateFeasibility({ ...BASE_INPUT, f_drag_N: 10_000, f_inertia_N: 5_000, f_slam_N: 35_000 })
    const heavy = seaStateFeasibility({ ...BASE_INPUT, f_drag_N: 500_000, f_inertia_N: 200_000, f_slam_N: 1_750_000 })
    expect(heavy.utilization_pct).toBeGreaterThan(light.utilization_pct)
  })
})
