import { describe, it, expect } from 'vitest'
import { calculateTransitAccelerations } from '../../../src/lib/calculations/seafastening/transitAccelerations'

const G = 9.80665

// Seed RAO data: beam seas 270° (same as craneTipMotion tests)
const BEAM_RAOS = [
  { wave_direction_deg: 270, wave_period_s: 4,  heave_amplitude_m_per_m: 0.02, roll_amplitude_deg_per_m: 0.5,  pitch_amplitude_deg_per_m: 0.10 },
  { wave_direction_deg: 270, wave_period_s: 6,  heave_amplitude_m_per_m: 0.10, roll_amplitude_deg_per_m: 2.1,  pitch_amplitude_deg_per_m: 0.50 },
  { wave_direction_deg: 270, wave_period_s: 8,  heave_amplitude_m_per_m: 0.35, roll_amplitude_deg_per_m: 4.8,  pitch_amplitude_deg_per_m: 1.10 },
  { wave_direction_deg: 270, wave_period_s: 10, heave_amplitude_m_per_m: 0.70, roll_amplitude_deg_per_m: 5.2,  pitch_amplitude_deg_per_m: 1.20 },
  { wave_direction_deg: 270, wave_period_s: 12, heave_amplitude_m_per_m: 0.85, roll_amplitude_deg_per_m: 3.8,  pitch_amplitude_deg_per_m: 0.80 },
]

// Head seas RAOs (0°)
const HEAD_RAOS = [
  { wave_direction_deg: 0, wave_period_s: 6,  heave_amplitude_m_per_m: 0.30, roll_amplitude_deg_per_m: 0.1,  pitch_amplitude_deg_per_m: 1.5 },
  { wave_direction_deg: 0, wave_period_s: 10, heave_amplitude_m_per_m: 0.80, roll_amplitude_deg_per_m: 0.2,  pitch_amplitude_deg_per_m: 2.0 },
]

describe('calculateTransitAccelerations', () => {
  it('returns DNV defaults when no RAOs provided', () => {
    const result = calculateTransitAccelerations({
      raoEntries: [],
      hs_transit_m: 2.5,
      tp_transit_s: 8,
      heading_deg: 270,
      deck_pos_x: 50,
      deck_pos_y: 5,
      lbp_m: 120,
      beam_m: 25,
    })

    expect(result.a_transversal_ms2).toBeCloseTo(0.5 * G, 2)
    expect(result.a_longitudinal_ms2).toBeCloseTo(0.3 * G, 2)
    expect(result.a_vertical_ms2).toBeCloseTo(1.2 * G, 2)
    expect(result.tp_used_s).toBe(8)
  })

  it('produces plausible accelerations for beam seas with RAOs', () => {
    const result = calculateTransitAccelerations({
      raoEntries: BEAM_RAOS,
      hs_transit_m: 2.5,
      tp_transit_s: 8,
      heading_deg: 270,
      deck_pos_x: 50,
      deck_pos_y: 5,
      lbp_m: 120,
      beam_m: 25,
    })

    // Transversal: should be ≥ 0.3g for beam seas
    expect(result.a_transversal_ms2).toBeGreaterThanOrEqual(0.3 * G)
    // Should be in plausible range (0.1g to 1.0g)
    expect(result.a_transversal_ms2).toBeGreaterThan(0.1 * G)
    expect(result.a_transversal_ms2).toBeLessThan(1.0 * G)

    // Longitudinal: plausible range
    expect(result.a_longitudinal_ms2).toBeGreaterThan(0)
    expect(result.a_longitudinal_ms2).toBeLessThan(1.0 * G)

    // Vertical: must include gravity
    expect(result.a_vertical_ms2).toBeGreaterThan(G)

    expect(result.tp_used_s).toBe(8)
  })

  it('vertical acceleration includes gravity plus heave', () => {
    const result = calculateTransitAccelerations({
      raoEntries: BEAM_RAOS,
      hs_transit_m: 2.5,
      tp_transit_s: 10,
      heading_deg: 270,
      deck_pos_x: 60,
      deck_pos_y: 12.5, // centerline
      lbp_m: 120,
      beam_m: 25,
    })

    // a_v = g + heave_RAO × Hs/2 × ω²
    // At Tp=10, heave_RAO = 0.70, ω = 2π/10 ≈ 0.6283
    // heave_acc = 0.70 × 1.25 × 0.3948 ≈ 0.345 m/s²
    // a_v ≈ 9.81 + 0.345 ≈ 10.15
    expect(result.a_vertical_ms2).toBeGreaterThan(G)
    expect(result.a_vertical_ms2).toBeLessThan(G + 2) // reasonable range
  })

  it('selects closest direction to heading', () => {
    const allRaos = [...BEAM_RAOS, ...HEAD_RAOS]

    // Heading 270 → should use beam RAOs (270°)
    const beamResult = calculateTransitAccelerations({
      raoEntries: allRaos,
      hs_transit_m: 2.5,
      tp_transit_s: 8,
      heading_deg: 270,
      deck_pos_x: 50,
      deck_pos_y: 5,
      lbp_m: 120,
      beam_m: 25,
    })

    // Heading 0 → should use head RAOs (0°)
    const headResult = calculateTransitAccelerations({
      raoEntries: allRaos,
      hs_transit_m: 2.5,
      tp_transit_s: 8,
      heading_deg: 0,
      deck_pos_x: 50,
      deck_pos_y: 5,
      lbp_m: 120,
      beam_m: 25,
    })

    // Beam seas should have higher transversal than head seas
    // (beam seas have much higher roll RAOs)
    expect(beamResult.a_transversal_ms2).toBeGreaterThan(headResult.a_transversal_ms2)
  })

  it('interpolates RAOs between available periods', () => {
    // Tp=7 is between 6 and 8
    const result = calculateTransitAccelerations({
      raoEntries: BEAM_RAOS,
      hs_transit_m: 2.0,
      tp_transit_s: 7,
      heading_deg: 270,
      deck_pos_x: 50,
      deck_pos_y: 5,
      lbp_m: 120,
      beam_m: 25,
    })

    // Should produce valid results
    expect(result.a_transversal_ms2).toBeGreaterThan(0)
    expect(result.a_longitudinal_ms2).toBeGreaterThan(0)
    expect(result.a_vertical_ms2).toBeGreaterThan(G)
  })
})
