import { describe, it, expect } from 'vitest'
import {
  craneTipPosition,
  craneTipRao,
  calculateCraneTipMotion,
  craneTipHeaveAtPeriod,
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
  { wave_direction_deg: 270, wave_period_s: 4,  heave_amplitude_m_per_m: 0.02, roll_amplitude_deg_per_m: 0.5, pitch_amplitude_deg_per_m: 0.10, heave_phase_deg: 0,   roll_phase_deg: 0,   pitch_phase_deg: 0   },
  { wave_direction_deg: 270, wave_period_s: 6,  heave_amplitude_m_per_m: 0.10, roll_amplitude_deg_per_m: 2.1, pitch_amplitude_deg_per_m: 0.50, heave_phase_deg: 25,  roll_phase_deg: 30,  pitch_phase_deg: 28  },
  { wave_direction_deg: 270, wave_period_s: 8,  heave_amplitude_m_per_m: 0.35, roll_amplitude_deg_per_m: 4.8, pitch_amplitude_deg_per_m: 1.10, heave_phase_deg: 65,  roll_phase_deg: 72,  pitch_phase_deg: 60  },
  { wave_direction_deg: 270, wave_period_s: 10, heave_amplitude_m_per_m: 0.70, roll_amplitude_deg_per_m: 5.2, pitch_amplitude_deg_per_m: 1.20, heave_phase_deg: 100, roll_phase_deg: 98,  pitch_phase_deg: 90  },
  { wave_direction_deg: 270, wave_period_s: 12, heave_amplitude_m_per_m: 0.85, roll_amplitude_deg_per_m: 3.8, pitch_amplitude_deg_per_m: 0.80, heave_phase_deg: 130, roll_phase_deg: 120, pitch_phase_deg: 112 },
]

describe('craneTipPosition', () => {
  it('calculates tip position for Manifold M1 overboard config', () => {
    const tip = craneTipPosition(PEDESTAL_X, PEDESTAL_Y, PEDESTAL_H, OB_RADIUS, OB_SLEW, OB_BOOM_ANGLE, BOOM_LENGTH)
    expect(tip.xTip).toBeCloseTo(75.03, 0)
    expect(tip.yTip).toBeCloseTo(-4.99, 0)
    expect(tip.zTip).toBeCloseTo(50.26, 0)
  })

  it('returns pedestal position when radius is 0', () => {
    const tip = craneTipPosition(68, 12.5, 15, 0, 0, 90, 40)
    expect(tip.xTip).toBeCloseTo(68)
    expect(tip.yTip).toBeCloseTo(12.5)
    expect(tip.zTip).toBeCloseTo(55)
  })

  it('handles 0° boom angle (boom horizontal)', () => {
    const tip = craneTipPosition(0, 0, 10, 20, 0, 0, 40)
    expect(tip.xTip).toBeCloseTo(20)
    expect(tip.yTip).toBeCloseTo(0)
    expect(tip.zTip).toBeCloseTo(10)
  })
})

describe('craneTipRao', () => {
  const tip = craneTipPosition(PEDESTAL_X, PEDESTAL_Y, PEDESTAL_H, OB_RADIUS, OB_SLEW, OB_BOOM_ANGLE, BOOM_LENGTH)

  it('calculates vertical and lateral RAOs for a calm period (T=4s)', () => {
    const { verticalRaoMperM, lateralRaoMperM } = craneTipRao(BEAM_RAOS[0], tip)
    expect(verticalRaoMperM).toBeGreaterThan(0)
    expect(lateralRaoMperM).toBeGreaterThan(0)
  })

  it('produces larger RAOs at resonance period (T=10s)', () => {
    const calm = craneTipRao(BEAM_RAOS[0], tip)
    const resonance = craneTipRao(BEAM_RAOS[3], tip)
    expect(resonance.verticalRaoMperM).toBeGreaterThan(calm.verticalRaoMperM)
    expect(resonance.lateralRaoMperM).toBeGreaterThan(calm.lateralRaoMperM)
  })

  it('lateral RAO scales with zTip and roll', () => {
    const rao = BEAM_RAOS[3] // T=10s, roll_amp = 5.2 deg/m
    const { lateralRaoMperM } = craneTipRao(rao, tip)
    expect(lateralRaoMperM).toBeCloseTo(4.56, 0)
  })
})

describe('calculateCraneTipMotion — v2', () => {
  const tip = craneTipPosition(PEDESTAL_X, PEDESTAL_Y, PEDESTAL_H, OB_RADIUS, OB_SLEW, OB_BOOM_ANGLE, BOOM_LENGTH)

  it('returns empty raoByPeriod and zeros for empty RAO entries', () => {
    const result = calculateCraneTipMotion([], tip)
    expect(result.craneTipHeaveM).toBe(0)
    expect(result.craneTipLateralM).toBe(0)
    expect(result.raoByPeriod.size).toBe(0)
  })

  it('returns raoByPeriod map with one entry per unique period', () => {
    const result = calculateCraneTipMotion(BEAM_RAOS, tip)
    expect(result.raoByPeriod.size).toBe(5) // 4, 6, 8, 10, 12
    expect(result.raoByPeriod.has(10)).toBe(true)
  })

  it('each period in raoByPeriod has positive verticalRaoMperM', () => {
    const result = calculateCraneTipMotion(BEAM_RAOS, tip)
    for (const [, { verticalRaoMperM }] of result.raoByPeriod) {
      expect(verticalRaoMperM).toBeGreaterThan(0)
    }
  })

  it('verticalRaoMperM increases from Tp=4 to Tp=10 then decreases at Tp=12', () => {
    const result = calculateCraneTipMotion(BEAM_RAOS, tip)
    const r4  = result.raoByPeriod.get(4)!.verticalRaoMperM
    const r10 = result.raoByPeriod.get(10)!.verticalRaoMperM
    const r12 = result.raoByPeriod.get(12)!.verticalRaoMperM
    expect(r10).toBeGreaterThan(r4)
    expect(r10).toBeGreaterThan(r12)
  })

  it('legacy craneTipHeaveM = max verticalRaoMperM × 2', () => {
    const result = calculateCraneTipMotion(BEAM_RAOS, tip)
    const maxRao = Math.max(...[...result.raoByPeriod.values()].map((v) => v.verticalRaoMperM))
    expect(result.craneTipHeaveM).toBeCloseTo(maxRao * 2, 10)
  })

  it('worstDirection is 270 for beam seas data', () => {
    const result = calculateCraneTipMotion(BEAM_RAOS, tip)
    expect(result.worstDirection).toBe(270)
  })

  it('selects worst direction from multiple directions', () => {
    const headSeas = [
      { wave_direction_deg: 0, wave_period_s: 8, heave_amplitude_m_per_m: 0.5, roll_amplitude_deg_per_m: 0.1, pitch_amplitude_deg_per_m: 0.5, heave_phase_deg: 0, roll_phase_deg: 0, pitch_phase_deg: 0 },
    ]
    const result = calculateCraneTipMotion([...BEAM_RAOS, ...headSeas], tip)
    expect(result.worstDirection).toBe(270)
  })
})

describe('craneTipHeaveAtPeriod', () => {
  const tip = craneTipPosition(PEDESTAL_X, PEDESTAL_Y, PEDESTAL_H, OB_RADIUS, OB_SLEW, OB_BOOM_ANGLE, BOOM_LENGTH)
  const result = calculateCraneTipMotion(BEAM_RAOS, tip)

  it('returns 0 for empty raoByPeriod', () => {
    const empty = calculateCraneTipMotion([], tip)
    expect(craneTipHeaveAtPeriod(empty, 10, 2.0)).toBe(0)
  })

  it('returns exact value for a period that exists in the map', () => {
    const rao10 = result.raoByPeriod.get(10)!
    const expected = rao10.verticalRaoMperM * (2.0 / 2)
    expect(craneTipHeaveAtPeriod(result, 10, 2.0)).toBeCloseTo(expected, 10)
  })

  it('interpolates linearly between Tp=8 and Tp=10', () => {
    const rao8  = result.raoByPeriod.get(8)!.verticalRaoMperM
    const rao10 = result.raoByPeriod.get(10)!.verticalRaoMperM
    const midRao = rao8 + 0.5 * (rao10 - rao8) // at Tp=9
    const expected = midRao * (1.5 / 2)
    expect(craneTipHeaveAtPeriod(result, 9, 1.5)).toBeCloseTo(expected, 8)
  })

  it('clamps to first period when tp_s < min period', () => {
    const rao4 = result.raoByPeriod.get(4)!.verticalRaoMperM
    const expected = rao4 * (1.0 / 2)
    expect(craneTipHeaveAtPeriod(result, 2, 1.0)).toBeCloseTo(expected, 10)
  })

  it('clamps to last period when tp_s > max period', () => {
    const rao12 = result.raoByPeriod.get(12)!.verticalRaoMperM
    const expected = rao12 * (1.0 / 2)
    expect(craneTipHeaveAtPeriod(result, 20, 1.0)).toBeCloseTo(expected, 10)
  })

  it('scales linearly with hs_m', () => {
    const h1 = craneTipHeaveAtPeriod(result, 10, 1.0)
    const h2 = craneTipHeaveAtPeriod(result, 10, 2.0)
    expect(h2).toBeCloseTo(h1 * 2, 10)
  })
})
