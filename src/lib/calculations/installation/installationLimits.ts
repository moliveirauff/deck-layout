/**
 * Simplified DNV installation analysis — combines splash-zone, on-bottom landing
 * and slack-wire criteria into a single Hs limit per equipment.
 *
 * This is a prototype-grade simplification:
 *  - Splash zone reuses the existing DNV-ST-N001 / RP-N103 splash zone loads
 *    and feasibility check, sweeping Hs from HS_MIN to HS_CAP.
 *  - On-bottom landing checks the peak vertical velocity at the crane tip
 *    against a fixed allowable landing velocity (1.5 m/s typical for steel
 *    structures without dedicated impact absorption).
 *  - Slack wire reuses the existing residual-tension check; not Hs-dependent
 *    in this model (driven by buoyancy and current drag), so it acts as a
 *    binary gate: if the residual goes ≤ 0 the whole envelope drops to 0.
 *
 * Out of scope for this prototype:
 *  - Per-Tp Hs limit refinement (we report the worst-Tp Hs limit).
 *  - DAF on landing as a separate hook-load check (treated via velocity only).
 *  - On-bottom soil bearing capacity.
 *  - Wave directionality and short-crested seas.
 */

import { splashZoneLoads } from '../dnv/splashZoneLoads'
import { seaStateFeasibility } from '../dnv/seaStateFeasibility'
import { craneTipHeaveAtPeriod, type CraneTipMotionResult } from '../motion/craneTipMotion'
import { craneTipVelocity } from '../motion/dynamicAmplification'

/** Hs sweep cap for installation analysis (m). */
export const HS_CAP = 3.5
/** Hs sweep start (m). */
export const HS_MIN = 0.5
/** Hs sweep step (m). */
export const HS_STEP = 0.25

/** Tp values (s) — same range as the DNV sea-state grid. */
export const TP_VALUES: ReadonlyArray<number> = Array.from({ length: 15 }, (_, i) => 4 + i)

/** Allowable peak vertical landing velocity at the structure (m/s) — DNV typical. */
export const V_LANDING_LIMIT_MS = 1.5

export type InstallationLimitsInput = {
  /** Equipment dry weight (tonnes). */
  dry_weight_t: number
  /** Crane overboard capacity (tonnes). */
  crane_capacity_overboard_t: number
  /** Hydrodynamic coefficients (vertical). */
  cd_z: number
  ca: number
  cs: number
  /** Projected slamming area (m²). */
  area_z_m2: number
  /** Submerged volume (m³). */
  volume_m3: number
  /** Per-period crane tip motion (RAO-based). */
  craneTipMotionResult: CraneTipMotionResult
  /** Residual hook tension after buoyancy + current drag (tonnes). */
  residual_tension_t: number
}

export type InstallationLimits = {
  /** Hs limit (m) by splash-zone hook load vs crane capacity. */
  hs_limit_splash_m: number
  /** Hs limit (m) by on-bottom landing velocity. */
  hs_limit_landing_m: number
  /** Whether the slack-wire (residual tension) check passes. */
  slack_ok: boolean
  /** Consolidated Hs limit (m) — min of the above, 0 if slack fails. */
  hs_limit_m: number
  /** Per-Hs row used for the sweep, with worst-Tp feasibility flags. */
  rows: Array<{ hs_m: number; splash_ok: boolean; landing_ok: boolean }>
}

function hsRange(): number[] {
  const steps = Math.round((HS_CAP - HS_MIN) / HS_STEP) + 1
  return Array.from({ length: steps }, (_, i) => Math.round((HS_MIN + i * HS_STEP) * 100) / 100)
}

/** Max Hs across the sweep where the predicate holds at *every* Tp tested. */
function maxFeasibleHs(
  hsValues: ReadonlyArray<number>,
  predicate: (hs: number, tp: number) => boolean,
): { limit: number; rows: Array<{ hs_m: number; ok: boolean }> } {
  const rows = hsValues.map((hs_m) => ({
    hs_m,
    ok: TP_VALUES.every((tp) => predicate(hs_m, tp)),
  }))
  let limit = 0
  for (const r of rows) {
    if (r.ok) limit = Math.max(limit, r.hs_m)
  }
  return { limit, rows }
}

/**
 * Compute Hs limits for splash zone, on-bottom landing and slack-wire.
 */
export function calculateInstallationLimits(input: InstallationLimitsInput): InstallationLimits {
  const {
    dry_weight_t,
    crane_capacity_overboard_t,
    cd_z,
    ca,
    cs,
    area_z_m2,
    volume_m3,
    craneTipMotionResult,
    residual_tension_t,
  } = input

  const hsValues = hsRange()

  const splash = maxFeasibleHs(hsValues, (hs_m, tp_s) => {
    const heave = craneTipHeaveAtPeriod(craneTipMotionResult, tp_s, hs_m)
    const forces = splashZoneLoads({
      hs_m,
      tp_s,
      cd_z,
      ca,
      cs,
      area_z_m2,
      volume_m3,
      crane_tip_heave_m: heave,
    })
    const fea = seaStateFeasibility({
      dry_weight_t,
      crane_capacity_overboard_t,
      f_drag_N: forces.f_drag_N,
      f_inertia_N: forces.f_inertia_N,
      f_slam_N: forces.f_slam_N,
      a_ct: forces.a_ct,
    })
    return fea.is_feasible
  })

  const landing = maxFeasibleHs(hsValues, (hs_m, tp_s) => {
    const heave = craneTipHeaveAtPeriod(craneTipMotionResult, tp_s, hs_m)
    const omega = (2 * Math.PI) / tp_s
    const v_ct = craneTipVelocity(heave, omega)
    return v_ct <= V_LANDING_LIMIT_MS
  })

  const slack_ok = residual_tension_t > 0
  const consolidated = slack_ok ? Math.min(splash.limit, landing.limit) : 0

  const rows = hsValues.map((hs_m, idx) => ({
    hs_m,
    splash_ok: splash.rows[idx].ok,
    landing_ok: landing.rows[idx].ok,
  }))

  return {
    hs_limit_splash_m: splash.limit,
    hs_limit_landing_m: landing.limit,
    slack_ok,
    hs_limit_m: consolidated,
    rows,
  }
}

/** Traffic-light status for an Hs limit per Mauricio's spec. */
export type HsLightStatus = 'green' | 'amber' | 'red'

export function hsLightStatus(hs_limit_m: number): HsLightStatus {
  if (hs_limit_m >= 2.0) return 'green'
  if (hs_limit_m >= 1.0) return 'amber'
  return 'red'
}
