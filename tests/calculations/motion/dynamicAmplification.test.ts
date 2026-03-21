import { describe, it, expect } from 'vitest'
import {
  dynamicAmplificationFactor,
  craneTipAcceleration,
  craneTipVelocity,
} from '../../../src/lib/calculations/motion/dynamicAmplification'
import { GRAVITY } from '../../../src/lib/calculations/hydro/constants'

// Seed data: typical beam seas Tp=10s, crane tip heave = 1.25m
const TP = 10
const OMEGA = (2 * Math.PI) / TP  // ≈ 0.6283 rad/s
const HEAVE = 1.25  // m

describe('craneTipVelocity', () => {
  it('returns v_ct = heave × ω', () => {
    expect(craneTipVelocity(HEAVE, OMEGA)).toBeCloseTo(HEAVE * OMEGA, 5)
    // 1.25 × 0.6283 ≈ 0.785 m/s
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
    // 1.25 × (0.6283)² ≈ 0.494 m/s²
    expect(craneTipAcceleration(HEAVE, OMEGA)).toBeCloseTo(0.494, 2)
  })

  it('returns zero for zero heave', () => {
    expect(craneTipAcceleration(0, OMEGA)).toBe(0)
  })
})

describe('dynamicAmplificationFactor', () => {
  it('returns 1.0 when crane tip heave is zero (no dynamic effect)', () => {
    expect(dynamicAmplificationFactor(0, OMEGA)).toBeCloseTo(1.0)
  })

  it('returns DAF = 1 + (heave × ω²) / g for Tp=10s, heave=1.25m', () => {
    const a_ct = HEAVE * OMEGA * OMEGA
    const expected = 1 + a_ct / GRAVITY
    expect(dynamicAmplificationFactor(HEAVE, OMEGA)).toBeCloseTo(expected, 6)
    // DAF ≈ 1 + 0.494 / 9.81 ≈ 1.050
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
})
