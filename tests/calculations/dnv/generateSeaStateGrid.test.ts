import { describe, it, expect } from 'vitest'
import {
  generateSeaStateGrid,
  HS_VALUES,
  TP_VALUES,
  type SeaStateGridInput,
} from '../../../src/lib/calculations/dnv/generateSeaStateGrid'

// Seed data: Manifold M1 box 5×3×2.5m, 25t dry, crane 245t @overboard, heave 1.25m
const BASE_INPUT: SeaStateGridInput = {
  hs_m: 0,           // overridden per cell
  tp_s: 0,           // overridden per cell
  cd_z: 1.4,
  ca: 0.9,
  cs: 5.0,
  area_z_m2: 15.0,
  volume_m3: 37.5,
  crane_tip_heave_m: 1.25,
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

describe('generateSeaStateGrid', () => {
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
    if (result.max_hs_m === 0) return // no feasible row
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
})
