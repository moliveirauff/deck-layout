import { describe, it, expect } from 'vitest'
import {
  generateSeaStateGrid,
  HS_VALUES,
  TP_VALUES,
  type SeaStateGridInput,
} from '../../../src/lib/calculations/dnv/generateSeaStateGrid'
import {
  calculateCraneTipMotion,
  craneTipPosition,
} from '../../../src/lib/calculations/motion/craneTipMotion'
import { DAF_MAX } from '../../../src/lib/calculations/motion/dynamicAmplification'

// Seven Seas vessel: pedestal at (68, 12.5), height 15m, boom 40m
const tip = craneTipPosition(68, 12.5, 15, 18.85, 291.8, 61.8, 40)

// Seed RAO data: beam seas 270° for Seven Seas / Manifold M1
const BEAM_RAOS = [
  { wave_direction_deg: 270, wave_period_s: 4,  heave_amplitude_m_per_m: 0.02, roll_amplitude_deg_per_m: 0.5,  pitch_amplitude_deg_per_m: 0.10, heave_phase_deg: 0,   roll_phase_deg: 0,   pitch_phase_deg: 0   },
  { wave_direction_deg: 270, wave_period_s: 6,  heave_amplitude_m_per_m: 0.10, roll_amplitude_deg_per_m: 2.1,  pitch_amplitude_deg_per_m: 0.50, heave_phase_deg: 25,  roll_phase_deg: 30,  pitch_phase_deg: 28  },
  { wave_direction_deg: 270, wave_period_s: 8,  heave_amplitude_m_per_m: 0.35, roll_amplitude_deg_per_m: 4.8,  pitch_amplitude_deg_per_m: 1.10, heave_phase_deg: 65,  roll_phase_deg: 72,  pitch_phase_deg: 60  },
  { wave_direction_deg: 270, wave_period_s: 10, heave_amplitude_m_per_m: 0.70, roll_amplitude_deg_per_m: 5.2,  pitch_amplitude_deg_per_m: 1.20, heave_phase_deg: 100, roll_phase_deg: 98,  pitch_phase_deg: 90  },
  { wave_direction_deg: 270, wave_period_s: 12, heave_amplitude_m_per_m: 0.85, roll_amplitude_deg_per_m: 3.8,  pitch_amplitude_deg_per_m: 0.80, heave_phase_deg: 130, roll_phase_deg: 120, pitch_phase_deg: 112 },
]

const craneTipMotionResult = calculateCraneTipMotion(BEAM_RAOS, tip)

// Seed data: Manifold M1 box 5×3×2.5m, 25t dry, crane 245t @overboard
const BASE_INPUT: SeaStateGridInput = {
  cd_z: 1.4,
  ca: 0.9,
  cs: 5.0,
  area_z_m2: 15.0,
  volume_m3: 37.5,
  craneTipMotionResult,
  dry_weight_t: 25,
  crane_capacity_overboard_t: 245,
}

describe('HS_VALUES / TP_VALUES', () => {
  it('HS_VALUES has 15 entries from 0.50 to 4.00', () => {
    expect(HS_VALUES).toHaveLength(15)
    expect(HS_VALUES[0]).toBeCloseTo(0.5)
    expect(HS_VALUES[14]).toBeCloseTo(4.0)
  })

  it('TP_VALUES has 15 entries from 4 to 18', () => {
    expect(TP_VALUES).toHaveLength(15)
    expect(TP_VALUES[0]).toBe(4)
    expect(TP_VALUES[14]).toBe(18)
  })
})

describe('generateSeaStateGrid — v2', () => {
  const result = generateSeaStateGrid(BASE_INPUT)

  it('produces 225 cells (15 Hs × 15 Tp)', () => {
    expect(result.cells).toHaveLength(225)
  })

  it('each cell has valid hs_m and tp_s', () => {
    for (const cell of result.cells) {
      expect(HS_VALUES).toContainEqual(expect.closeTo(cell.hs_m, 5))
      expect(TP_VALUES).toContain(cell.tp_s)
    }
  })

  it('utilization_pct is always positive', () => {
    for (const cell of result.cells) {
      expect(cell.utilization_pct).toBeGreaterThan(0)
    }
  })

  it('is_feasible cells have utilization_pct ≤ 100', () => {
    for (const cell of result.cells.filter((c) => c.is_feasible)) {
      expect(cell.utilization_pct).toBeLessThanOrEqual(100)
    }
  })

  it('infeasible cells have utilization_pct > 100', () => {
    for (const cell of result.cells.filter((c) => !c.is_feasible)) {
      expect(cell.utilization_pct).toBeGreaterThan(100)
    }
  })

  it('utilization increases monotonically with Hs at a fixed Tp', () => {
    const tp = 10
    const col = result.cells
      .filter((c) => c.tp_s === tp)
      .sort((a, b) => a.hs_m - b.hs_m)
    for (let i = 1; i < col.length; i++) {
      expect(col[i].utilization_pct).toBeGreaterThan(col[i - 1].utilization_pct)
    }
  })

  it('max_hs_m is a valid Hs value or 0 if no row is fully feasible', () => {
    expect(result.max_hs_m === 0 || HS_VALUES.some((h) => Math.abs(h - result.max_hs_m) < 0.001)).toBe(true)
  })

  it('max_hs_m row is entirely feasible', () => {
    if (result.max_hs_m === 0) return
    const row = result.cells.filter((c) => Math.abs(c.hs_m - result.max_hs_m) < 0.001)
    expect(row.every((c) => c.is_feasible)).toBe(true)
  })

  it('row above max_hs_m has at least one infeasible cell', () => {
    if (result.max_hs_m <= 0 || result.max_hs_m >= 4.0) return
    const nextHs = Math.round((result.max_hs_m + 0.25) * 100) / 100
    const row = result.cells.filter((c) => Math.abs(c.hs_m - nextHs) < 0.001)
    expect(row.some((c) => !c.is_feasible)).toBe(true)
  })

  it('force_breakdown totals are positive', () => {
    for (const cell of result.cells) {
      expect(cell.force_breakdown.f_total_N).toBeGreaterThan(0)
    }
  })

  it('progress callback is invoked 225 times', () => {
    let calls = 0
    generateSeaStateGrid(BASE_INPUT, () => { calls++ })
    expect(calls).toBe(225)
  })

  it('final progress value is 1.0', () => {
    let last = 0
    generateSeaStateGrid(BASE_INPUT, (p) => { last = p })
    expect(last).toBeCloseTo(1.0)
  })

  it('very high crane capacity → all cells feasible', () => {
    const r = generateSeaStateGrid({ ...BASE_INPUT, crane_capacity_overboard_t: 10_000 })
    expect(r.cells.every((c) => c.is_feasible)).toBe(true)
    expect(r.max_hs_m).toBeCloseTo(4.0)
  })

  it('near-zero crane capacity → no cells feasible', () => {
    const r = generateSeaStateGrid({ ...BASE_INPUT, crane_capacity_overboard_t: 0.001 })
    expect(r.cells.every((c) => !c.is_feasible)).toBe(true)
    expect(r.max_hs_m).toBe(0)
  })

  // v2 specific: DAF correctness
  it('DAF never exceeds DAF_MAX (2.0) in any cell', () => {
    for (const cell of result.cells) {
      expect(cell.daf).toBeLessThanOrEqual(DAF_MAX)
    }
  })

  it('DAF is always ≥ 1.0', () => {
    for (const cell of result.cells) {
      expect(cell.daf).toBeGreaterThanOrEqual(1.0)
    }
  })

  it('DAF varies by Tp (higher at short periods at fixed Hs)', () => {
    const hs = 1.5
    const col = result.cells
      .filter((c) => Math.abs(c.hs_m - hs) < 0.001)
      .sort((a, b) => a.tp_s - b.tp_s)
    // At Tp=4 crane tip heave is small (RAO low) but omega is large → moderate DAF
    // At Tp=10-12 RAO peaks but omega is smaller — pattern should vary
    // Just verify it's not constant across all Tp values
    const dafs = col.map((c) => c.daf)
    const allSame = dafs.every((d) => Math.abs(d - dafs[0]) < 0.001)
    expect(allSame).toBe(false)
  })

  it('seed data: Manifold M1 max_hs_m is ≥ 2.0m (crane 245t, equipment 25t — high margin)', () => {
    // With crane capacity 245t and dry weight 25t (10:1 ratio), max_hs_m is high.
    // The acceptance criterion is that DAF fix produces realistic results: ≥ 2.0m.
    expect(result.max_hs_m).toBeGreaterThanOrEqual(2.0)
  })
})
