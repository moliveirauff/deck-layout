import { describe, test, expect } from 'vitest'
import {
  calculateInstallationLimits,
  hsLightStatus,
  HS_CAP,
  HS_MIN,
  HS_STEP,
} from '../../../src/lib/calculations/installation/installationLimits'
import type { CraneTipMotionResult } from '../../../src/lib/calculations/motion/craneTipMotion'

/** Build a CraneTipMotionResult with a flat RAO across periods (m/m). */
function flatMotion(verticalRao: number): CraneTipMotionResult {
  const raoByPeriod = new Map<number, { verticalRaoMperM: number; lateralRaoMperM: number }>()
  for (let tp = 4; tp <= 18; tp++) {
    raoByPeriod.set(tp, { verticalRaoMperM: verticalRao, lateralRaoMperM: 0 })
  }
  return {
    raoByPeriod,
    worstDirection: 0,
    craneTipHeaveM: verticalRao * 2,
    craneTipLateralM: 0,
  }
}

describe('hsLightStatus — semaforo de Hs limite', () => {
  test('Hs >= 2.0 → verde', () => {
    expect(hsLightStatus(2.0)).toBe('green')
    expect(hsLightStatus(3.5)).toBe('green')
  })
  test('1.0 <= Hs < 2.0 → ambar', () => {
    expect(hsLightStatus(1.0)).toBe('amber')
    expect(hsLightStatus(1.5)).toBe('amber')
    expect(hsLightStatus(1.99)).toBe('amber')
  })
  test('Hs < 1.0 → vermelho', () => {
    expect(hsLightStatus(0)).toBe('red')
    expect(hsLightStatus(0.5)).toBe('red')
    expect(hsLightStatus(0.99)).toBe('red')
  })
})

describe('calculateInstallationLimits — sweep cap & step', () => {
  test('HS_CAP is 3.5 m and step 0.25', () => {
    expect(HS_CAP).toBe(3.5)
    expect(HS_MIN).toBe(0.5)
    expect(HS_STEP).toBe(0.25)
  })

  test('benign case: large crane capacity, calm motion → Hs limit clamps at cap', () => {
    const r = calculateInstallationLimits({
      dry_weight_t: 20,
      crane_capacity_overboard_t: 500,
      cd_z: 1.0,
      ca: 1.0,
      cs: 3.0,
      area_z_m2: 5,
      volume_m3: 5,
      craneTipMotionResult: flatMotion(0.05), // very calm vessel
      residual_tension_t: 10,
    })
    expect(r.slack_ok).toBe(true)
    expect(r.hs_limit_splash_m).toBe(HS_CAP)
    expect(r.hs_limit_landing_m).toBe(HS_CAP)
    expect(r.hs_limit_m).toBe(HS_CAP)
  })

  test('slack failure forces consolidated Hs limit to zero', () => {
    const r = calculateInstallationLimits({
      dry_weight_t: 20,
      crane_capacity_overboard_t: 500,
      cd_z: 1.0,
      ca: 1.0,
      cs: 3.0,
      area_z_m2: 5,
      volume_m3: 5,
      craneTipMotionResult: flatMotion(0.05),
      residual_tension_t: -1,
    })
    expect(r.slack_ok).toBe(false)
    expect(r.hs_limit_m).toBe(0)
  })

  test('rough motion drives splash zone Hs limit below cap', () => {
    const r = calculateInstallationLimits({
      dry_weight_t: 100,
      crane_capacity_overboard_t: 150,
      cd_z: 1.5,
      ca: 1.5,
      cs: 5.0,
      area_z_m2: 25,
      volume_m3: 20,
      craneTipMotionResult: flatMotion(0.8), // aggressive vessel motion
      residual_tension_t: 20,
    })
    expect(r.slack_ok).toBe(true)
    expect(r.hs_limit_splash_m).toBeLessThan(HS_CAP)
    expect(r.hs_limit_m).toBe(Math.min(r.hs_limit_splash_m, r.hs_limit_landing_m))
  })

  test('rows array covers the full sweep range', () => {
    const r = calculateInstallationLimits({
      dry_weight_t: 20,
      crane_capacity_overboard_t: 500,
      cd_z: 1.0,
      ca: 1.0,
      cs: 3.0,
      area_z_m2: 5,
      volume_m3: 5,
      craneTipMotionResult: flatMotion(0.05),
      residual_tension_t: 10,
    })
    const expectedSteps = Math.round((HS_CAP - HS_MIN) / HS_STEP) + 1
    expect(r.rows).toHaveLength(expectedSteps)
    expect(r.rows[0].hs_m).toBe(HS_MIN)
    expect(r.rows[r.rows.length - 1].hs_m).toBe(HS_CAP)
  })
})
