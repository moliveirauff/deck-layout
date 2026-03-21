import { describe, it, expect } from 'vitest'
import {
  findNearestLimit,
  isScatterCellFeasible,
  calculateOperability,
  classifyScatterCell,
} from '../../../src/lib/calculations/weather/operabilityAnalysis'
import type { SeaStateLimit } from '../../../src/types/database'

// Seed sea state limit grid (subset of the real 225-cell grid)
function makeLimit(hs: number, tp: number, feasible: boolean): SeaStateLimit {
  return {
    id: `${hs}-${tp}`,
    splash_zone_result_id: 'r1',
    hs_m: hs,
    tp_s: tp,
    is_feasible: feasible,
    utilization_pct: feasible ? 60 : 120,
    created_at: '',
  }
}

// Grid: Hs 0.5..2.0 (step 0.25), Tp 4..10 (step 1)
// Feasible below Hs=1.5 (exclusive), infeasible at and above
const LIMITS: SeaStateLimit[] = [
  makeLimit(0.50, 4, true), makeLimit(0.50, 6, true), makeLimit(0.50, 8, true), makeLimit(0.50, 10, true),
  makeLimit(0.75, 4, true), makeLimit(0.75, 6, true), makeLimit(0.75, 8, true), makeLimit(0.75, 10, true),
  makeLimit(1.00, 4, true), makeLimit(1.00, 6, true), makeLimit(1.00, 8, true), makeLimit(1.00, 10, true),
  makeLimit(1.25, 4, true), makeLimit(1.25, 6, true), makeLimit(1.25, 8, true), makeLimit(1.25, 10, true),
  makeLimit(1.50, 4, false), makeLimit(1.50, 6, false), makeLimit(1.50, 8, false), makeLimit(1.50, 10, false),
  makeLimit(1.75, 4, false), makeLimit(1.75, 6, false), makeLimit(1.75, 8, false), makeLimit(1.75, 10, false),
  makeLimit(2.00, 4, false), makeLimit(2.00, 6, false), makeLimit(2.00, 8, false), makeLimit(2.00, 10, false),
]

describe('findNearestLimit', () => {
  it('finds exact match', () => {
    const nearest = findNearestLimit(1.0, 8, LIMITS)
    expect(nearest?.hs_m).toBe(1.0)
    expect(nearest?.tp_s).toBe(8)
  })

  it('finds nearest when Hs is between grid points', () => {
    // Hs=1.1 is closest to 1.0 (dist 0.1) vs 1.25 (dist 0.15)
    const nearest = findNearestLimit(1.1, 8, LIMITS)
    expect(nearest?.hs_m).toBe(1.00)
  })

  it('finds nearest when Tp is between grid points', () => {
    // Tp=7 is equidistant from 6 and 8; whichever comes first in the array wins
    const nearest = findNearestLimit(1.0, 7, LIMITS)
    expect(nearest?.tp_s === 6 || nearest?.tp_s === 8).toBe(true)
  })

  it('returns null for Hs far above the grid (outside tolerance)', () => {
    // Hs=6.0 is 4.0m above the max grid value (2.0m) → > 0.5m tolerance
    expect(findNearestLimit(6.0, 8, LIMITS)).toBeNull()
  })

  it('returns null for Tp far above the grid (outside tolerance)', () => {
    // Tp=20 is 10s above max grid value (10s) → > 2s tolerance
    expect(findNearestLimit(1.0, 20, LIMITS)).toBeNull()
  })

  it('returns null for empty limits array', () => {
    expect(findNearestLimit(1.0, 8, [])).toBeNull()
  })
})

describe('isScatterCellFeasible', () => {
  it('returns true for scatter point in feasible zone', () => {
    expect(isScatterCellFeasible(1.0, 8, LIMITS)).toBe(true)
  })

  it('returns false for scatter point in infeasible zone', () => {
    expect(isScatterCellFeasible(2.0, 8, LIMITS)).toBe(false)
  })

  it('returns false when no nearby limits (outside grid)', () => {
    expect(isScatterCellFeasible(10.0, 30, LIMITS)).toBe(false)
  })

  it('matches nearest grid point for off-grid scatter bin', () => {
    // Hs=1.3 → nearest is 1.25 (feasible)
    expect(isScatterCellFeasible(1.3, 8, LIMITS)).toBe(true)
    // Hs=1.4 → nearest is 1.50 (infeasible)
    expect(isScatterCellFeasible(1.4, 8, LIMITS)).toBe(false)
  })
})

describe('calculateOperability', () => {
  const scatter = [
    { hs_m: 0.5, tp_s: 4, occurrence_pct: 5.0 },   // feasible
    { hs_m: 0.5, tp_s: 8, occurrence_pct: 10.0 },  // feasible
    { hs_m: 1.0, tp_s: 6, occurrence_pct: 20.0 },  // feasible
    { hs_m: 1.5, tp_s: 8, occurrence_pct: 30.0 },  // infeasible
    { hs_m: 2.0, tp_s: 10, occurrence_pct: 35.0 }, // infeasible
  ] // total = 100%

  it('sums occurrence_pct only for feasible cells', () => {
    const op = calculateOperability(scatter, LIMITS)
    expect(op).toBeCloseTo(35.0) // 5 + 10 + 20
  })

  it('returns 0 for empty scatter', () => {
    expect(calculateOperability([], LIMITS)).toBe(0)
  })

  it('returns 0 for empty limits', () => {
    expect(calculateOperability(scatter, [])).toBe(0)
  })

  it('is capped at 100', () => {
    const largeScatter = [{ hs_m: 0.5, tp_s: 4, occurrence_pct: 150 }]
    expect(calculateOperability(largeScatter, LIMITS)).toBe(100)
  })

  it('returns 100 when all scatter cells are feasible', () => {
    const allFeasible = [
      { hs_m: 0.5, tp_s: 4, occurrence_pct: 40 },
      { hs_m: 1.0, tp_s: 6, occurrence_pct: 60 },
    ]
    expect(calculateOperability(allFeasible, LIMITS)).toBeCloseTo(100)
  })

  it('returns 0 when all scatter cells are infeasible', () => {
    const allInfeasible = [
      { hs_m: 1.5, tp_s: 4, occurrence_pct: 60 },
      { hs_m: 2.0, tp_s: 8, occurrence_pct: 40 },
    ]
    expect(calculateOperability(allInfeasible, LIMITS)).toBe(0)
  })
})

describe('classifyScatterCell', () => {
  it('returns "no-data" for zero occurrence', () => {
    expect(classifyScatterCell(0, 1.0, 8, LIMITS)).toBe('no-data')
  })

  it('returns "feasible" for occurrence > 0 in feasible zone', () => {
    expect(classifyScatterCell(5.0, 1.0, 8, LIMITS)).toBe('feasible')
  })

  it('returns "infeasible" for occurrence > 0 in infeasible zone', () => {
    expect(classifyScatterCell(5.0, 2.0, 8, LIMITS)).toBe('infeasible')
  })

  it('returns "infeasible" for occurrence > 0 outside grid (no nearby limit)', () => {
    expect(classifyScatterCell(5.0, 10.0, 30, LIMITS)).toBe('infeasible')
  })
})
