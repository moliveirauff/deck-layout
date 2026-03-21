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
 */
export type CraneTipMotionResult = {
  craneTipHeaveM: number   // Significant vertical motion at crane tip (m)
  craneTipLateralM: number // Significant lateral motion at crane tip (m)
  worstDirection: number   // Wave direction producing maximum motion (degrees)
}

/**
 * Calculate the crane tip position relative to vessel origin.
 *
 * @param pedestalX   Crane pedestal X position on deck (m)
 * @param pedestalY   Crane pedestal Y position on deck (m)
 * @param pedestalH   Crane pedestal height above deck (m)
 * @param radiusM     Horizontal crane radius to overboard target (m)
 * @param slewDeg     Slew angle to overboard target (degrees from +X axis)
 * @param boomAngleDeg Boom angle from horizontal (degrees)
 * @param boomLengthM  Boom length (m)
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
 *
 * Roll and pitch RAOs are given in deg/m and converted to rad/m internally.
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
 * Calculate significant crane tip heave and lateral motion from RAO entries.
 *
 * Uses simplified regular-wave approach (MVP):
 * - For each wave direction, find the maximum crane tip RAO across all periods
 * - Significant motion ≈ max crane tip RAO (amplitude in m/m of wave height)
 * - Select the worst-case direction
 *
 * @param raoEntries  All RAO entries for this project (multiple directions)
 * @param tip         Crane tip position for this equipment's overboard config
 * @returns Crane tip motion result with heave, lateral, and worst direction
 */
export function calculateCraneTipMotion(
  raoEntries: ReadonlyArray<Pick<
    RaoEntry,
    'wave_direction_deg' | 'wave_period_s' | 'heave_amplitude_m_per_m' | 'roll_amplitude_deg_per_m' | 'pitch_amplitude_deg_per_m'
  >>,
  tip: CraneTipPosition,
): CraneTipMotionResult {
  if (raoEntries.length === 0) {
    return { craneTipHeaveM: 0, craneTipLateralM: 0, worstDirection: 0 }
  }

  // Group by wave direction
  const byDir = new Map<number, typeof raoEntries[number][]>()
  for (const r of raoEntries) {
    const arr = byDir.get(r.wave_direction_deg) ?? []
    arr.push(r)
    byDir.set(r.wave_direction_deg, arr)
  }

  let maxHeave = 0
  let maxLateral = 0
  let worstDir = 0

  for (const [dir, entries] of byDir) {
    // RMS of crane tip RAOs across all periods for this direction
    let sumVertSq = 0
    let sumLatSq = 0
    for (const rao of entries) {
      const { verticalRaoMperM, lateralRaoMperM } = craneTipRao(rao, tip)
      sumVertSq += verticalRaoMperM * verticalRaoMperM
      sumLatSq += lateralRaoMperM * lateralRaoMperM
    }
    // Significant amplitude ≈ 2 × σ (simplified spectral approach)
    const sigHeave = 2 * Math.sqrt(sumVertSq / entries.length)
    const sigLateral = 2 * Math.sqrt(sumLatSq / entries.length)

    // Track worst case (based on combined motion magnitude)
    const combined = sigHeave + sigLateral
    if (combined > maxHeave + maxLateral) {
      maxHeave = sigHeave
      maxLateral = sigLateral
      worstDir = dir
    }
  }

  return { craneTipHeaveM: maxHeave, craneTipLateralM: maxLateral, worstDirection: worstDir }
}
