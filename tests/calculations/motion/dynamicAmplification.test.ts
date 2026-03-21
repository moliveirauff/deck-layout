import { describe, it, expect } from 'vitest'
import {
  dynamicAmplificationFactor,
  craneTipAcceleration,
  craneTipVelocity,
  DAF_MAX,
} from '../../../src/lib/calculations/motion/dynamicAmplification'
import { GRAVITY } from '../../../src/lib/calculations/hydro/constants'

// Seed data: typical beam seas Tp=10s, crane tip heave = 1.25m
const TP = 10
const OMEGA = (2 * Math.PI) / TP  // ≈ 0.6283 rad/s
const HEAVE = 1.25  // m

describe('craneTipVelocity', () => {
  it('returns v_ct = heave × ω', () => {
    expect(craneTipVelocity(HEAVE, OMEGA)).toBeCloseTo(HEAVE * OMEGA, 5)
    expect(craneTipVelocity(HEAVE, OMEGA)).toBeCloseTo(0.785, 2)
  })

  it('returns zero for zero heave', () => {
    expect(craneTipVelocity(0, OMEGA)).toBe(0)
  })

  it('scales linearly with heave', () => {
    expect(craneTipVelocity(2 * HEAVE, OMEGA)).toBeCloseTo(2 * craneTipVelocity(HEAVE, OMEGA), 10)
  })
})

describe('craneTipAcceleration', () => {
  it('returns a_ct = heave × ω²', () => {
    expect(craneTipAcceleration(HEAVE, OMEGA)).toBeCloseTo(HEAVE * OMEGA * OMEGA, 5)
    expect(craneTipAcceleration(HEAVE, OMEGA)).toBeCloseTo(0.494, 2)
  })

  it('returns zero for zero heave', () => {
    expect(craneTipAcceleration(0, OMEGA)).toBe(0)
  })
})

describe('dynamicAmplificationFactor — v2 with cap', () => {
  it('returns 1.0 when crane tip heave is zero (no dynamic effect)', () => {
    expect(dynamicAmplificationFactor(0, OMEGA)).toBeCloseTo(1.0)
  })

  it('returns DAF = 1 + (heave × ω²) / g for Tp=10s, heave=1.25m (below cap)', () => {
    const a_ct = HEAVE * OMEGA * OMEGA
    const expected = 1 + a_ct / GRAVITY
    // 1 + 0.494/9.81 ≈ 1.050 — well below cap of 2.0
    expect(dynamicAmplificationFactor(HEAVE, OMEGA)).toBeCloseTo(expected, 6)
    expect(dynamicAmplificationFactor(HEAVE, OMEGA)).toBeCloseTo(1.050, 2)
  })

  it('DAF increases with higher frequency (shorter period)', () => {
    const omega4s = (2 * Math.PI) / 4
    const omega12s = (2 * Math.PI) / 12
    expect(dynamicAmplificationFactor(HEAVE, omega4s)).toBeGreaterThan(
      dynamicAmplificationFactor(HEAVE, omega12s),
    )
  })

  it('DAF is always ≥ 1', () => {
    expect(dynamicAmplificationFactor(0.5, OMEGA)).toBeGreaterThanOrEqual(1)
    expect(dynamicAmplificationFactor(0, 0)).toBeGreaterThanOrEqual(1)
  })

  it('DAF is always ≤ DAF_MAX (2.0)', () => {
    // Extremely high heave that would produce DAF >> 2 without cap
    expect(dynamicAmplificationFactor(100, OMEGA)).toBeLessThanOrEqual(DAF_MAX)
    expect(dynamicAmplificationFactor(100, (2 * Math.PI) / 3)).toBeLessThanOrEqual(DAF_MAX)
    expect(dynamicAmplificationFactor(50, (2 * Math.PI) / 2)).toBeLessThanOrEqual(DAF_MAX)
  })

  it('DAF_MAX equals 2.0', () => {
    expect(DAF_MAX).toBe(2.0)
  })

  it('returns exactly DAF_MAX when computed value exceeds cap', () => {
    // Tp=4s, heave=10m → a_ct = 10 × (2π/4)² ≈ 24.67 → DAF ≈ 3.51 → capped to 2.0
    const omega4 = (2 * Math.PI) / 4
    expect(dynamicAmplificationFactor(10, omega4)).toBe(DAF_MAX)
  })
})
