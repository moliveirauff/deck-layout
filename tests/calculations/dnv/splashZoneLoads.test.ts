import { describe, it, expect } from 'vitest'
import { waveKinematics, splashZoneLoads } from '../../../src/lib/calculations/dnv/splashZoneLoads'
import { SEAWATER_DENSITY, GRAVITY } from '../../../src/lib/calculations/hydro/constants'

// Seed data: Manifold M1 overboard Tp=10s, Hs=2.0m
const BASE_INPUT = {
  hs_m: 2.0,
  tp_s: 10,
  cd_z: 1.4,     // box flat-bottom
  ca: 0.9,       // box L/W≈1.67
  cs: 5.0,       // flat-bottom box
  area_z_m2: 15.0,       // 5×3m base
  volume_m3: 37.5,       // 5×3×2.5m
  crane_tip_heave_m: 1.25,
}

describe('waveKinematics', () => {
  it('computes ω = 2π/Tp for Tp=10s', () => {
    const { omega } = waveKinematics(2.0, 10)
    expect(omega).toBeCloseTo((2 * Math.PI) / 10, 8)
  })

  it('computes deep-water wave number k = ω²/g', () => {
    const { omega, k } = waveKinematics(2.0, 10)
    expect(k).toBeCloseTo(omega * omega / GRAVITY, 8)
  })

  it('wave amplitude = Hs/2', () => {
    const { amplitude } = waveKinematics(2.0, 10)
    expect(amplitude).toBeCloseTo(1.0)
  })

  it('surface velocity v_water = A × ω', () => {
    const hs = 2.0, tp = 10
    const { amplitude, omega, v_water } = waveKinematics(hs, tp)
    expect(v_water).toBeCloseTo(amplitude * omega, 8)
    // 1.0 × 0.6283 ≈ 0.628 m/s
    expect(v_water).toBeCloseTo(0.628, 2)
  })

  it('surface acceleration a_water = A × ω²', () => {
    const { amplitude, omega, a_water } = waveKinematics(2.0, 10)
    expect(a_water).toBeCloseTo(amplitude * omega * omega, 8)
  })

  it('higher Hs → higher velocity', () => {
    const low = waveKinematics(1.0, 10)
    const high = waveKinematics(3.0, 10)
    expect(high.v_water).toBeGreaterThan(low.v_water)
  })

  it('shorter period → higher velocity for same Hs', () => {
    const long = waveKinematics(2.0, 14)
    const short = waveKinematics(2.0, 6)
    expect(short.v_water).toBeGreaterThan(long.v_water)
  })
})

describe('splashZoneLoads', () => {
  it('returns positive forces for typical Manifold M1 input', () => {
    const { f_drag_N, f_inertia_N, f_slam_N } = splashZoneLoads(BASE_INPUT)
    expect(f_drag_N).toBeGreaterThan(0)
    expect(f_inertia_N).toBeGreaterThan(0)
    expect(f_slam_N).toBeGreaterThan(0)
  })

  it('drag force formula: 0.5 × ρ × Cd_z × A_z × v_rel²', () => {
    const { f_drag_N, v_ct } = splashZoneLoads(BASE_INPUT)
    const { v_water, omega } = waveKinematics(BASE_INPUT.hs_m, BASE_INPUT.tp_s)
    // v_ct = 1.25 × omega
    const v_ct_expected = 1.25 * omega
    expect(v_ct).toBeCloseTo(v_ct_expected, 5)

    const v_rel = v_ct_expected + v_water
    const expected = 0.5 * SEAWATER_DENSITY * BASE_INPUT.cd_z * BASE_INPUT.area_z_m2 * v_rel * v_rel
    expect(f_drag_N).toBeCloseTo(expected, 0)
  })

  it('slamming force uses same v_rel as drag', () => {
    const { f_drag_N, f_slam_N } = splashZoneLoads(BASE_INPUT)
    // ratio should be cs / cd_z = 5.0 / 1.4 ≈ 3.571
    expect(f_slam_N / f_drag_N).toBeCloseTo(BASE_INPUT.cs / BASE_INPUT.cd_z, 3)
  })

  it('inertia force formula: ρ × Ca × V × a_rel', () => {
    const { f_inertia_N, a_ct } = splashZoneLoads(BASE_INPUT)
    const { a_water } = waveKinematics(BASE_INPUT.hs_m, BASE_INPUT.tp_s)
    const a_rel = a_ct + a_water
    const expected = SEAWATER_DENSITY * BASE_INPUT.ca * BASE_INPUT.volume_m3 * a_rel
    expect(f_inertia_N).toBeCloseTo(expected, 0)
  })

  it('forces scale with Hs (larger wave → larger forces)', () => {
    const low = splashZoneLoads({ ...BASE_INPUT, hs_m: 1.0 })
    const high = splashZoneLoads({ ...BASE_INPUT, hs_m: 3.0 })
    expect(high.f_drag_N).toBeGreaterThan(low.f_drag_N)
    expect(high.f_inertia_N).toBeGreaterThan(low.f_inertia_N)
  })

  it('forces are zero when both Hs and crane_tip_heave are zero', () => {
    const { f_drag_N, f_inertia_N, f_slam_N } = splashZoneLoads({
      ...BASE_INPUT,
      hs_m: 0,
      crane_tip_heave_m: 0,
    })
    expect(f_drag_N).toBeCloseTo(0)
    expect(f_inertia_N).toBeCloseTo(0)
    expect(f_slam_N).toBeCloseTo(0)
  })
})
