import { describe, it, expect } from 'vitest'
import { waveNumber } from '../../../src/lib/calculations/lowering/waveNumber'
import { GRAVITY } from '../../../src/lib/calculations/hydro/constants'

describe('waveNumber', () => {
  it('deep water (depth > 100m): k ≈ ω²/g', () => {
    const omega = (2 * Math.PI) / 10 // Tp = 10s → ω ≈ 0.6283
    const k = waveNumber(omega, 500) // very deep
    const k_deep = (omega * omega) / GRAVITY
    expect(k).toBeCloseTo(k_deep, 6)
    expect(k).toBeCloseTo(0.04024, 3) // ω²/g ≈ 0.6283²/9.81 ≈ 0.04024
  })

  it('Tp=10s deep water: k ≈ 0.04024', () => {
    const omega = (2 * Math.PI) / 10
    const k = waveNumber(omega, 200)
    expect(k).toBeCloseTo(0.04024, 3)
  })

  it('finite depth produces larger k than deep water', () => {
    const omega = (2 * Math.PI) / 10
    const k_deep = waveNumber(omega, 500)
    const k_finite = waveNumber(omega, 20) // shallow-ish
    expect(k_finite).toBeGreaterThan(k_deep)
  })

  it('very shallow depth produces significantly larger k', () => {
    const omega = (2 * Math.PI) / 10
    const k_deep = waveNumber(omega, 500)
    const k_shallow = waveNumber(omega, 5)
    // In shallow water, wavelength shortens → k increases
    expect(k_shallow).toBeGreaterThan(k_deep * 1.5)
  })

  it('satisfies dispersion relation ω² = g·k·tanh(k·d) for finite depth', () => {
    const omega = (2 * Math.PI) / 8
    const depth = 30
    const k = waveNumber(omega, depth)
    const lhs = omega * omega
    const rhs = GRAVITY * k * Math.tanh(k * depth)
    expect(rhs).toBeCloseTo(lhs, 4)
  })

  it('depth <= 0 returns deep water value', () => {
    const omega = (2 * Math.PI) / 10
    const k = waveNumber(omega, -1)
    const k_deep = (omega * omega) / GRAVITY
    expect(k).toBeCloseTo(k_deep, 6)
  })
})
