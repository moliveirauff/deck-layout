import type { RaoEntry } from '../../../types/database'

/**
 * Crane tip position relative to vessel origin, in meters.
 */
export type CraneTipPosition = {
  xTip: number // X offset from vessel origin (m)
  yTip: number // Y offset from vessel origin (m)
  zTip: number // Height above deck (m)
}

/**
 * Crane tip motion results for a single equipment item.
 * v2: raoByPeriod map replaces single aggregated value — fixes DAF bug.
 */
export type CraneTipMotionResult = {
  /** RAO per wave period: worst-case (max across all directions) for each Tp. */
  raoByPeriod: Map<number, { verticalRaoMperM: number; lateralRaoMperM: number }>
  /** Wave direction producing maximum combined motion (degrees). */
  worstDirection: number
  /** Legacy: max significant crane tip heave across all periods (m). Used for display/PDF. */
  craneTipHeaveM: number
  /** Legacy: max significant crane tip lateral motion across all periods (m). */
  craneTipLateralM: number
}

/**
 * Calculate the crane tip position relative to vessel origin.
 */
export function craneTipPosition(
  pedestalX: number,
  pedestalY: number,
  pedestalH: number,
  radiusM: number,
  slewDeg: number,
  boomAngleDeg: number,
  boomLengthM: number,
): CraneTipPosition {
  const slewRad = (slewDeg * Math.PI) / 180
  const xTip = pedestalX + radiusM * Math.cos(slewRad)
  const yTip = pedestalY + radiusM * Math.sin(slewRad)
  const boomRad = (boomAngleDeg * Math.PI) / 180
  const zTip = pedestalH + boomLengthM * Math.sin(boomRad)
  return { xTip, yTip, zTip }
}

/**
 * Calculate crane tip RAO values (m/m) for a single wave period.
 *
 * Vertical crane tip motion per unit wave amplitude:
 *   z_ct = heave_RAO + pitch_RAO(rad/m) × x_tip + roll_RAO(rad/m) × y_tip
 *
 * Lateral crane tip motion per unit wave amplitude:
 *   y_ct = roll_RAO(rad/m) × z_tip
 */
export function craneTipRao(
  rao: Pick<RaoEntry, 'heave_amplitude_m_per_m' | 'roll_amplitude_deg_per_m' | 'pitch_amplitude_deg_per_m'>,
  tip: CraneTipPosition,
): { verticalRaoMperM: number; lateralRaoMperM: number } {
  const rollRad = (rao.roll_amplitude_deg_per_m * Math.PI) / 180
  const pitchRad = (rao.pitch_amplitude_deg_per_m * Math.PI) / 180

  const verticalRaoMperM = Math.abs(
    rao.heave_amplitude_m_per_m + pitchRad * tip.xTip + rollRad * tip.yTip,
  )
  const lateralRaoMperM = Math.abs(rollRad * tip.zTip)

  return { verticalRaoMperM, lateralRaoMperM }
}

/**
 * Interpolated crane tip heave amplitude for a specific (Hs, Tp) cell.
 *
 * - Looks up the two nearest wave periods in raoByPeriod bracketing tp_s
 * - Linearly interpolates verticalRaoMperM between them
 * - Returns interpolatedRao × (hs_m / 2) — actual heave amplitude in meters
 * - If tp_s is outside all available periods, clamps to nearest endpoint
 *
 * @param result  CraneTipMotionResult from calculateCraneTipMotion()
 * @param tp_s    Peak wave period for this cell (s)
 * @param hs_m    Significant wave height for this cell (m)
 */
export function craneTipHeaveAtPeriod(
  result: CraneTipMotionResult,
  tp_s: number,
  hs_m: number,
): number {
  const periods = [...result.raoByPeriod.keys()].sort((a, b) => a - b)

  if (periods.length === 0) return 0

  // Clamp below
  if (tp_s <= periods[0]) {
    const rao = result.raoByPeriod.get(periods[0])!
    return rao.verticalRaoMperM * (hs_m / 2)
  }

  // Clamp above
  if (tp_s >= periods[periods.length - 1]) {
    const rao = result.raoByPeriod.get(periods[periods.length - 1])!
    return rao.verticalRaoMperM * (hs_m / 2)
  }

  // Find bracketing periods
  let lowerIdx = 0
  for (let i = 0; i < periods.length - 1; i++) {
    if (periods[i] <= tp_s && tp_s < periods[i + 1]) {
      lowerIdx = i
      break
    }
  }

  const t0 = periods[lowerIdx]
  const t1 = periods[lowerIdx + 1]
  const r0 = result.raoByPeriod.get(t0)!
  const r1 = result.raoByPeriod.get(t1)!

  // Linear interpolation
  const alpha = (tp_s - t0) / (t1 - t0)
  const interpolatedRao = r0.verticalRaoMperM + alpha * (r1.verticalRaoMperM - r0.verticalRaoMperM)

  return interpolatedRao * (hs_m / 2)
}

/**
 * Calculate significant crane tip heave and lateral motion from RAO entries.
 *
 * v2 algorithm:
 * - For each unique wave period across all entries:
 *   - Compute craneTipRao for every direction that has that period
 *   - Store worst-case (max verticalRaoMperM) in raoByPeriod
 * - craneTipHeaveM = max of all verticalRaoMperM × 2 (significant amplitude)
 * - craneTipLateralM = max of all lateralRaoMperM × 2
 * - worstDirection = direction producing highest combined motion (legacy)
 *
 * @param raoEntries  All RAO entries for this project (multiple directions)
 * @param tip         Crane tip position for this equipment's overboard config
 */
export function calculateCraneTipMotion(
  raoEntries: ReadonlyArray<Pick<
    RaoEntry,
    'wave_direction_deg' | 'wave_period_s' | 'heave_amplitude_m_per_m' | 'roll_amplitude_deg_per_m' | 'pitch_amplitude_deg_per_m'
  >>,
  tip: CraneTipPosition,
): CraneTipMotionResult {
  const empty: CraneTipMotionResult = {
    raoByPeriod: new Map(),
    worstDirection: 0,
    craneTipHeaveM: 0,
    craneTipLateralM: 0,
  }

  if (raoEntries.length === 0) return empty

  // Group by wave direction
  const byDir = new Map<number, typeof raoEntries[number][]>()
  for (const r of raoEntries) {
    const arr = byDir.get(r.wave_direction_deg) ?? []
    arr.push(r)
    byDir.set(r.wave_direction_deg, arr)
  }

  // Collect all unique periods
  const allPeriods = new Set<number>()
  for (const entries of byDir.values()) {
    for (const e of entries) allPeriods.add(e.wave_period_s)
  }

  // Build raoByPeriod: worst-case across all directions for each period
  const raoByPeriod = new Map<number, { verticalRaoMperM: number; lateralRaoMperM: number }>()
  for (const period of allPeriods) {
    let maxVert = 0
    let maxLat = 0
    for (const entries of byDir.values()) {
      const entry = entries.find((e) => e.wave_period_s === period)
      if (!entry) continue
      const { verticalRaoMperM, lateralRaoMperM } = craneTipRao(entry, tip)
      if (verticalRaoMperM > maxVert) maxVert = verticalRaoMperM
      if (lateralRaoMperM > maxLat) maxLat = lateralRaoMperM
    }
    raoByPeriod.set(period, { verticalRaoMperM: maxVert, lateralRaoMperM: maxLat })
  }

  // Legacy fields: max across all periods × 2 (significant amplitude)
  let maxVertAll = 0
  let maxLatAll = 0
  for (const { verticalRaoMperM, lateralRaoMperM } of raoByPeriod.values()) {
    if (verticalRaoMperM > maxVertAll) maxVertAll = verticalRaoMperM
    if (lateralRaoMperM > maxLatAll) maxLatAll = lateralRaoMperM
  }
  const craneTipHeaveM = maxVertAll * 2
  const craneTipLateralM = maxLatAll * 2

  // worstDirection: direction with highest combined significant motion (legacy)
  let worstDirection = 0
  let maxCombined = -Infinity
  for (const [dir, entries] of byDir) {
    let sumVertSq = 0
    let sumLatSq = 0
    for (const rao of entries) {
      const { verticalRaoMperM, lateralRaoMperM } = craneTipRao(rao, tip)
      sumVertSq += verticalRaoMperM * verticalRaoMperM
      sumLatSq += lateralRaoMperM * lateralRaoMperM
    }
    const sigHeave = 2 * Math.sqrt(sumVertSq / entries.length)
    const sigLateral = 2 * Math.sqrt(sumLatSq / entries.length)
    const combined = sigHeave + sigLateral
    if (combined > maxCombined) {
      maxCombined = combined
      worstDirection = dir
    }
  }

  return { raoByPeriod, worstDirection, craneTipHeaveM, craneTipLateralM }
}
