import type { RaoEntry } from '../../../types/database'

const G = 9.80665 // m/s²
const DEG_TO_RAD = Math.PI / 180

/**
 * Input for transit acceleration calculation at an equipment position on deck.
 */
export type TransitAccelerationsInput = {
  /** Vessel RAO entries (from project) */
  raoEntries: ReadonlyArray<
    Pick<
      RaoEntry,
      | 'wave_direction_deg'
      | 'wave_period_s'
      | 'heave_amplitude_m_per_m'
      | 'roll_amplitude_deg_per_m'
      | 'pitch_amplitude_deg_per_m'
    >
  >
  /** Significant wave height during transit (m) */
  hs_transit_m: number
  /** Peak wave period during transit (s) */
  tp_transit_s: number
  /** Vessel heading relative to waves (deg). 90 = beam seas, 0/180 = head/following */
  heading_deg: number
  /** Equipment X position on deck (m) — longitudinal from vessel origin */
  deck_pos_x: number
  /** Equipment Y position on deck (m) — transverse from vessel origin */
  deck_pos_y: number
  /** Length Between Perpendiculars (m) */
  lbp_m: number
  /** Beam of vessel (m) */
  beam_m: number
}

/**
 * Transit accelerations at equipment position (m/s²).
 */
export type TransitAccelerations = {
  /** Transversal acceleration (m/s²) */
  a_transversal_ms2: number
  /** Longitudinal acceleration (m/s²) */
  a_longitudinal_ms2: number
  /** Vertical acceleration (m/s²) — includes gravity */
  a_vertical_ms2: number
  /** Tp used in the calculation (s) */
  tp_used_s: number
}

/**
 * Find the angular distance between two angles in degrees [0, 360).
 */
function angleDifference(a: number, b: number): number {
  const diff = Math.abs(((a - b + 540) % 360) - 180)
  return diff
}

/**
 * Linearly interpolate a value between two bracketing points.
 */
function lerp(x0: number, y0: number, x1: number, y1: number, x: number): number {
  if (x1 === x0) return y0
  const alpha = (x - x0) / (x1 - x0)
  return y0 + alpha * (y1 - y0)
}

/**
 * Given RAO entries for a single direction, interpolate RAO values at a target period.
 * Returns { roll_deg_per_m, pitch_deg_per_m, heave_m_per_m }.
 */
function interpolateRaoAtPeriod(
  entries: ReadonlyArray<
    Pick<
      RaoEntry,
      | 'wave_period_s'
      | 'heave_amplitude_m_per_m'
      | 'roll_amplitude_deg_per_m'
      | 'pitch_amplitude_deg_per_m'
    >
  >,
  tp_s: number,
): { roll_deg_per_m: number; pitch_deg_per_m: number; heave_m_per_m: number } {
  if (entries.length === 0) {
    return { roll_deg_per_m: 0, pitch_deg_per_m: 0, heave_m_per_m: 0 }
  }

  const sorted = [...entries].sort((a, b) => a.wave_period_s - b.wave_period_s)

  // Clamp below
  if (tp_s <= sorted[0].wave_period_s) {
    return {
      roll_deg_per_m: sorted[0].roll_amplitude_deg_per_m,
      pitch_deg_per_m: sorted[0].pitch_amplitude_deg_per_m,
      heave_m_per_m: sorted[0].heave_amplitude_m_per_m,
    }
  }

  // Clamp above
  if (tp_s >= sorted[sorted.length - 1].wave_period_s) {
    const last = sorted[sorted.length - 1]
    return {
      roll_deg_per_m: last.roll_amplitude_deg_per_m,
      pitch_deg_per_m: last.pitch_amplitude_deg_per_m,
      heave_m_per_m: last.heave_amplitude_m_per_m,
    }
  }

  // Find bracketing entries
  let lowerIdx = 0
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].wave_period_s <= tp_s && tp_s < sorted[i + 1].wave_period_s) {
      lowerIdx = i
      break
    }
  }

  const lo = sorted[lowerIdx]
  const hi = sorted[lowerIdx + 1]

  return {
    roll_deg_per_m: lerp(lo.wave_period_s, lo.roll_amplitude_deg_per_m, hi.wave_period_s, hi.roll_amplitude_deg_per_m, tp_s),
    pitch_deg_per_m: lerp(lo.wave_period_s, lo.pitch_amplitude_deg_per_m, hi.wave_period_s, hi.pitch_amplitude_deg_per_m, tp_s),
    heave_m_per_m: lerp(lo.wave_period_s, lo.heave_amplitude_m_per_m, hi.wave_period_s, hi.heave_amplitude_m_per_m, tp_s),
  }
}

/**
 * Calculate transit accelerations at an equipment position on deck.
 *
 * Method (simplified RAO-based per DNV-ST-N001):
 * 1. Find RAO entries for the closest wave direction to the heading
 * 2. Interpolate RAOs at the transit Tp
 * 3. Compute angular accelerations from RAOs × ω² × wave_amplitude
 * 4. Convert to linear accelerations at equipment position using lever arms
 * 5. Apply conservative minimums (0.3g transversal for beam seas per DNV)
 */
export function calculateTransitAccelerations(
  input: TransitAccelerationsInput,
): TransitAccelerations {
  const {
    raoEntries,
    hs_transit_m,
    tp_transit_s,
    heading_deg,
    deck_pos_x,
    deck_pos_y,
    lbp_m,
    beam_m,
  } = input

  // If no RAOs available, use DNV default conservative values
  if (raoEntries.length === 0) {
    return {
      a_transversal_ms2: 0.5 * G,
      a_longitudinal_ms2: 0.3 * G,
      a_vertical_ms2: G + 0.2 * G,
      tp_used_s: tp_transit_s,
    }
  }

  // Wave encounter direction: 90° = beam seas (worst for roll)
  // Group RAO entries by direction
  const byDirection = new Map<number, typeof raoEntries[number][]>()
  for (const entry of raoEntries) {
    const arr = byDirection.get(entry.wave_direction_deg) ?? []
    arr.push(entry)
    byDirection.set(entry.wave_direction_deg, arr)
  }

  // Find closest direction to heading
  let closestDir = 0
  let minDiff = Infinity
  for (const dir of byDirection.keys()) {
    const diff = angleDifference(dir, heading_deg)
    if (diff < minDiff) {
      minDiff = diff
      closestDir = dir
    }
  }

  const dirEntries = byDirection.get(closestDir) ?? []

  // Interpolate RAOs at transit Tp
  const rao = interpolateRaoAtPeriod(dirEntries, tp_transit_s)

  // Wave parameters
  const waveAmplitude = hs_transit_m / 2 // m
  const omega = (2 * Math.PI) / tp_transit_s // rad/s

  // Angular accelerations (rad/s²)
  const rollAngAcc = rao.roll_deg_per_m * DEG_TO_RAD * waveAmplitude * omega * omega
  const pitchAngAcc = rao.pitch_deg_per_m * DEG_TO_RAD * waveAmplitude * omega * omega
  const heaveAcc = rao.heave_m_per_m * waveAmplitude * omega * omega

  // Lever arms from vessel center
  const armY = Math.abs(deck_pos_y - beam_m / 2) // distance from centerline (m)
  const armX = Math.abs(deck_pos_x - lbp_m / 2) // distance from midship (m)

  // Linear accelerations at equipment position
  // Transversal = roll angular acc × arm_y + heave coupling (conservative additive)
  let aTransversal = rollAngAcc * armY + heaveAcc * 0.1 // 10% heave coupling
  aTransversal = Math.max(aTransversal, 0.05 * G) // minimum 5% g base

  // Longitudinal = pitch angular acc × arm_x + small coupling
  let aLongitudinal = pitchAngAcc * armX + heaveAcc * 0.1
  aLongitudinal = Math.max(aLongitudinal, 0.05 * G)

  // Vertical = g + heave acceleration (always positive, includes gravity)
  const aVertical = G + heaveAcc

  // DNV conservative minimums for beam seas (heading ~90° or ~270°)
  const isBeamSeas = angleDifference(heading_deg, 90) <= 30 || angleDifference(heading_deg, 270) <= 30
  if (isBeamSeas) {
    aTransversal = Math.max(aTransversal, 0.3 * G)
  }
  // Conservative minimum: longitudinal never less than 0.15g
  aLongitudinal = Math.max(aLongitudinal, 0.15 * G)

  return {
    a_transversal_ms2: aTransversal,
    a_longitudinal_ms2: aLongitudinal,
    a_vertical_ms2: aVertical,
    tp_used_s: tp_transit_s,
  }
}
