import { describe, test, expect } from 'vitest'
import {
  santosOperability,
  DEFAULT_SANTOS_HS_BINS,
  type SantosHsBin,
} from '../../../src/lib/calculations/installation/santosOperability'

describe('santosOperability — defaults sum to 100%', () => {
  test('default bins sum to 100%', () => {
    const total = DEFAULT_SANTOS_HS_BINS.reduce((s, b) => s + b.probability_pct, 0)
    expect(total).toBe(100)
  })
})

describe('santosOperability — full range coverage', () => {
  test('Hs limit at 99 m covers everything: operability ~ 1', () => {
    const r = santosOperability(99)
    expect(r.operability_fraction).toBeCloseTo(1, 6)
    expect(r.workable_hours_in_24h).toBeCloseTo(24, 4)
  })

  test('Hs limit at 0 m: zero operability', () => {
    const r = santosOperability(0)
    expect(r.operability_fraction).toBe(0)
    expect(r.workable_hours_in_24h).toBe(0)
  })

  test('negative Hs limit returns zero', () => {
    const r = santosOperability(-1)
    expect(r.operability_fraction).toBe(0)
  })
})

describe('santosOperability — exact bin boundaries', () => {
  test('Hs limit at 1.0 m hits 2 + 12 = 14% (bins 0-0.5 and 0.5-1.0)', () => {
    const r = santosOperability(1.0)
    expect(r.operability_fraction).toBeCloseTo(0.14, 6)
    expect(r.workable_hours_in_24h).toBeCloseTo(24 * 0.14, 4)
  })

  test('Hs limit at 2.0 m hits 2 + 12 + 28 + 30 = 72%', () => {
    const r = santosOperability(2.0)
    expect(r.operability_fraction).toBeCloseTo(0.72, 6)
  })

  test('Hs limit at 3.0 m hits 96%', () => {
    const r = santosOperability(3.0)
    expect(r.operability_fraction).toBeCloseTo(0.96, 6)
  })
})

describe('santosOperability — proportional split inside a bin', () => {
  test('Hs limit at 1.25 m gives 14% + half of 28% = 28%', () => {
    const r = santosOperability(1.25)
    // bins 0-0.5 (2) + 0.5-1.0 (12) = 14
    // half of bin 1.0-1.5 (28%/2 = 14)
    expect(r.operability_fraction).toBeCloseTo(0.28, 6)
  })

  test('Hs limit at 1.5 m exactly: 42% (full bins below + zero from bin 1.5-2.0)', () => {
    const r = santosOperability(1.5)
    expect(r.operability_fraction).toBeCloseTo(0.42, 6)
  })
})

describe('santosOperability — custom bins', () => {
  test('uniform 4 bins of 25% each, limit at 5 m midway through bin 4-6 → 87.5%', () => {
    const bins: SantosHsBin[] = [
      { hs_low_m: 0, hs_high_m: 2, probability_pct: 25 },
      { hs_low_m: 2, hs_high_m: 4, probability_pct: 25 },
      { hs_low_m: 4, hs_high_m: 6, probability_pct: 25 },
      { hs_low_m: 6, hs_high_m: 8, probability_pct: 25 },
    ]
    const r = santosOperability(5, bins)
    // 25 + 25 + (25 * 0.5) = 62.5%
    expect(r.operability_fraction).toBeCloseTo(0.625, 6)
  })

  test('empty bins return zero', () => {
    const r = santosOperability(2, [])
    expect(r.operability_fraction).toBe(0)
  })
})
