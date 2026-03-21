import { describe, it, expect } from 'vitest'
import { snapLoadCheck } from '../../../src/lib/calculations/dnv/snapLoadCheck'

describe('snapLoadCheck', () => {
  it('detects risk when crane_tip_heave >= Hs/2', () => {
    const result = snapLoadCheck({
      hs_m: 2.0,
      crane_tip_heave_m: 1.0, // exactly Hs/2
      dry_weight_t: 25,
    })
    expect(result.risk).toBe(true)
    expect(result.reason).toContain('Snap load risk')
  })

  it('detects risk when crane_tip_heave > Hs/2', () => {
    const result = snapLoadCheck({
      hs_m: 2.0,
      crane_tip_heave_m: 1.5, // above Hs/2
      dry_weight_t: 25,
    })
    expect(result.risk).toBe(true)
  })

  it('no risk when crane_tip_heave < Hs/2', () => {
    const result = snapLoadCheck({
      hs_m: 2.0,
      crane_tip_heave_m: 0.8, // below Hs/2 = 1.0
      dry_weight_t: 25,
    })
    expect(result.risk).toBe(false)
    expect(result.reason).toContain('No snap load risk')
  })

  it('handles edge case of Hs = 0', () => {
    const result = snapLoadCheck({
      hs_m: 0,
      crane_tip_heave_m: 0,
      dry_weight_t: 25,
    })
    // 0 >= 0 → risk
    expect(result.risk).toBe(true)
  })
})
