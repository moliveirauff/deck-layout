import { describe, it, expect } from 'vitest'
import { verifyGM } from '../../../src/lib/calculations/stability/gmVerification'

describe('verifyGM', () => {
  it('passes when GM loaded >= GM min', () => {
    // KM = 10.0, KG_loaded = 8.2 → GM = 1.8
    const result = verifyGM(1.5, 8.0, 8.2, 10.0)

    expect(result.gm_loaded_m).toBeCloseTo(1.8, 6)
    expect(result.gm_ok).toBe(true)
  })

  it('fails when GM loaded < GM min', () => {
    // KM = 10.0, KG_loaded = 9.0 → GM = 1.0 < 1.5
    const result = verifyGM(1.5, 8.0, 9.0, 10.0)

    expect(result.gm_loaded_m).toBeCloseTo(1.0, 6)
    expect(result.gm_ok).toBe(false)
  })

  it('returns exactly GM min at boundary', () => {
    // KM = 10.0, KG_loaded = 8.5 → GM = 1.5 = min
    const result = verifyGM(1.5, 8.0, 8.5, 10.0)

    expect(result.gm_loaded_m).toBeCloseTo(1.5, 6)
    expect(result.gm_ok).toBe(true) // >= is pass
  })

  it('handles negative GM (capsized condition)', () => {
    // KM = 10.0, KG_loaded = 11.0 → GM = -1.0
    const result = verifyGM(1.5, 8.0, 11.0, 10.0)

    expect(result.gm_loaded_m).toBeCloseTo(-1.0, 6)
    expect(result.gm_ok).toBe(false)
  })
})
