import { describe, it, expect } from 'vitest'
import {
  craneTipPosition,
  craneTipRao,
  calculateCraneTipMotion,
} from '../../../src/lib/calculations/motion/craneTipMotion'

// Seven Seas vessel: pedestal at (68, 12.5), height 15m, boom 40m
const PEDESTAL_X = 68
const PEDESTAL_Y = 12.5
const PEDESTAL_H = 15
const BOOM_LENGTH = 40

// Manifold M1 overboard: pos (75, -5), radius ≈ 18.85m, slew ≈ 291.8°
const OB_RADIUS = 18.85
const OB_SLEW = 291.8
// boomAngle = acos(18.85/40) ≈ 61.8°
const OB_BOOM_ANGLE = 61.8

// Seed RAO data: beam seas 270°
const BEAM_RAOS = [
  { wave_direction_deg: 270, wave_period_s: 4, heave_amplitude_m_per_m: 0.02, roll_amplitude_deg_per_m: 0.5, pitch_amplitude_deg_per_m: 0.10, heave_phase_deg: 0, roll_phase_deg: 0, pitch_phase_deg: 0 },
  { wave_direction_deg: 270, wave_period_s: 6, heave_amplitude_m_per_m: 0.10, roll_amplitude_deg_per_m: 2.1, pitch_amplitude_deg_per_m: 0.50, heave_phase_deg: 25, roll_phase_deg: 30, pitch_phase_deg: 28 },
  { wave_direction_deg: 270, wave_period_s: 8, heave_amplitude_m_per_m: 0.35, roll_amplitude_deg_per_m: 4.8, pitch_amplitude_deg_per_m: 1.10, heave_phase_deg: 65, roll_phase_deg: 72, pitch_phase_deg: 60 },
  { wave_direction_deg: 270, wave_period_s: 10, heave_amplitude_m_per_m: 0.70, roll_amplitude_deg_per_m: 5.2, pitch_amplitude_deg_per_m: 1.20, heave_phase_deg: 100, roll_phase_deg: 98, pitch_phase_deg: 90 },
  { wave_direction_deg: 270, wave_period_s: 12, heave_amplitude_m_per_m: 0.85, roll_amplitude_deg_per_m: 3.8, pitch_amplitude_deg_per_m: 0.80, heave_phase_deg: 130, roll_phase_deg: 120, pitch_phase_deg: 112 },
]

describe('craneTipPosition', () => {
  it('calculates tip position for Manifold M1 overboard config', () => {
    const tip = craneTipPosition(PEDESTAL_X, PEDESTAL_Y, PEDESTAL_H, OB_RADIUS, OB_SLEW, OB_BOOM_ANGLE, BOOM_LENGTH)
    // xTip ≈ 68 + 18.85 * cos(291.8°) ≈ 68 + 18.85 * 0.3730 ≈ 75.03
    expect(tip.xTip).toBeCloseTo(75.03, 0)
    // yTip ≈ 12.5 + 18.85 * sin(291.8°) ≈ 12.5 + 18.85 * (-0.928) ≈ -4.99
    expect(tip.yTip).toBeCloseTo(-4.99, 0)
    // zTip ≈ 15 + 40 * sin(61.8°) ≈ 15 + 35.26 ≈ 50.26
    expect(tip.zTip).toBeCloseTo(50.26, 0)
  })

  it('returns pedestal position when radius is 0', () => {
    const tip = craneTipPosition(68, 12.5, 15, 0, 0, 90, 40)
    expect(tip.xTip).toBeCloseTo(68)
    expect(tip.yTip).toBeCloseTo(12.5)
    // zTip = 15 + 40 * sin(90°) = 55
    expect(tip.zTip).toBeCloseTo(55)
  })

  it('handles 0° boom angle (boom horizontal)', () => {
    const tip = craneTipPosition(0, 0, 10, 20, 0, 0, 40)
    // xTip = 0 + 20 * cos(0) = 20
    expect(tip.xTip).toBeCloseTo(20)
    expect(tip.yTip).toBeCloseTo(0)
    // zTip = 10 + 40 * sin(0) = 10
    expect(tip.zTip).toBeCloseTo(10)
  })
})

describe('craneTipRao', () => {
  const tip = craneTipPosition(PEDESTAL_X, PEDESTAL_Y, PEDESTAL_H, OB_RADIUS, OB_SLEW, OB_BOOM_ANGLE, BOOM_LENGTH)

  it('calculates vertical and lateral RAOs for a calm period (T=4s)', () => {
    const { verticalRaoMperM, lateralRaoMperM } = craneTipRao(BEAM_RAOS[0], tip)
    // Small RAO values → small motions
    expect(verticalRaoMperM).toBeGreaterThan(0)
    expect(lateralRaoMperM).toBeGreaterThan(0)
  })

  it('produces larger RAOs at resonance period (T=10s)', () => {
    const calm = craneTipRao(BEAM_RAOS[0], tip) // T=4s
    const resonance = craneTipRao(BEAM_RAOS[3], tip) // T=10s
    expect(resonance.verticalRaoMperM).toBeGreaterThan(calm.verticalRaoMperM)
    expect(resonance.lateralRaoMperM).toBeGreaterThan(calm.lateralRaoMperM)
  })

  it('lateral RAO scales with zTip and roll', () => {
    const rao = BEAM_RAOS[3] // T=10s, roll_amp = 5.2 deg/m
    const { lateralRaoMperM } = craneTipRao(rao, tip)
    // lateral = |roll_rad * zTip| = |(5.2 * π/180) * 50.26| ≈ 4.56
    expect(lateralRaoMperM).toBeCloseTo(4.56, 0)
  })
})

describe('calculateCraneTipMotion', () => {
  const tip = craneTipPosition(PEDESTAL_X, PEDESTAL_Y, PEDESTAL_H, OB_RADIUS, OB_SLEW, OB_BOOM_ANGLE, BOOM_LENGTH)

  it('returns zeros for empty RAO entries', () => {
    const result = calculateCraneTipMotion([], tip)
    expect(result.craneTipHeaveM).toBe(0)
    expect(result.craneTipLateralM).toBe(0)
  })

  it('calculates significant motions for beam seas RAOs', () => {
    const result = calculateCraneTipMotion(BEAM_RAOS, tip)
    // Should produce positive heave and lateral values
    expect(result.craneTipHeaveM).toBeGreaterThan(0)
    expect(result.craneTipLateralM).toBeGreaterThan(0)
    expect(result.worstDirection).toBe(270)
  })

  it('lateral motion exceeds heave for beam seas at height', () => {
    // Beam seas cause large roll → large lateral at crane tip height
    const result = calculateCraneTipMotion(BEAM_RAOS, tip)
    expect(result.craneTipLateralM).toBeGreaterThan(result.craneTipHeaveM)
  })

  it('selects worst direction from multiple directions', () => {
    // Add head seas (0°) with lower roll → should still pick 270° as worst
    const headSeas = [
      { wave_direction_deg: 0, wave_period_s: 8, heave_amplitude_m_per_m: 0.5, roll_amplitude_deg_per_m: 0.1, pitch_amplitude_deg_per_m: 0.5, heave_phase_deg: 0, roll_phase_deg: 0, pitch_phase_deg: 0 },
    ]
    const result = calculateCraneTipMotion([...BEAM_RAOS, ...headSeas], tip)
    expect(result.worstDirection).toBe(270)
  })
})
