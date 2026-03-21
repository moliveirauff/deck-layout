const G = 9.80665 // m/s²

/**
 * Input for sea-fastening force calculation.
 */
export type SeaFasteningForcesInput = {
  /** Equipment dry weight (tonnes) */
  dry_weight_t: number
  /** Transversal acceleration at equipment position (m/s²) */
  a_transversal_ms2: number
  /** Longitudinal acceleration at equipment position (m/s²) */
  a_longitudinal_ms2: number
  /** Vertical acceleration at equipment position (m/s²) — already includes g */
  a_vertical_ms2: number
  /** Number of tie-downs */
  n_tiedowns: number
  /** Safety factor for tie-down design, default 3.0 */
  sf_tiedown?: number
  /** Dynamic amplification factor for transit, default 1.3 */
  daf_transit?: number
}

/**
 * Sea-fastening force results.
 */
export type SeaFasteningForces = {
  /** Transversal force (kN) */
  force_transversal_kn: number
  /** Longitudinal force (kN) */
  force_longitudinal_kn: number
  /** Vertical force (kN) */
  force_vertical_kn: number
  /** Uplift force (kN) — max(0, F_v - weight) */
  force_uplift_kn: number
  /** Horizontal resultant force sqrt(Ft² + Fl²) (kN) */
  force_horizontal_resultant_kn: number
  /** MBL required per tie-down (kN) */
  mbl_required_per_tiedown_kn: number
  /** Whether tie-down capacity is sufficient (always false if no MBL provided) */
  tiedown_ok: boolean
  /** DAF transit used */
  daf_transit: number
}

/**
 * Calculate sea-fastening forces for an equipment item during transit.
 *
 * Unit conversion:
 *   mass_kg = dry_weight_t × 1000
 *   F (N) = mass_kg × a (m/s²)
 *   F (kN) = F (N) / 1000 = dry_weight_t × a (m/s²)
 *
 * Design force:
 *   F_design = F_horizontal_resultant × DAF_transit
 *   MBL_required = F_design × SF / n_tiedowns
 */
export function calculateSeaFasteningForces(
  input: SeaFasteningForcesInput,
): SeaFasteningForces {
  const {
    dry_weight_t,
    a_transversal_ms2,
    a_longitudinal_ms2,
    a_vertical_ms2,
    n_tiedowns,
    sf_tiedown = 3.0,
    daf_transit = 1.3,
  } = input

  // F = dry_weight_t × acceleration (kN)
  // Because: mass_kg × a / 1000 = (dry_weight_t × 1000) × a / 1000 = dry_weight_t × a
  const forceTransversal = dry_weight_t * a_transversal_ms2
  const forceLongitudinal = dry_weight_t * a_longitudinal_ms2
  const forceVertical = dry_weight_t * a_vertical_ms2

  // Weight force in kN
  const weightForce = dry_weight_t * G

  // Uplift = vertical force exceeding static weight
  const forceUplift = Math.max(0, forceVertical - weightForce)

  // Horizontal resultant
  const forceHorizontalResultant = Math.sqrt(
    forceTransversal * forceTransversal + forceLongitudinal * forceLongitudinal,
  )

  // Design force with DAF, then distribute to tie-downs with safety factor
  const designForce = forceHorizontalResultant * daf_transit
  const mblRequired = (designForce * sf_tiedown) / n_tiedowns

  return {
    force_transversal_kn: forceTransversal,
    force_longitudinal_kn: forceLongitudinal,
    force_vertical_kn: forceVertical,
    force_uplift_kn: forceUplift,
    force_horizontal_resultant_kn: forceHorizontalResultant,
    mbl_required_per_tiedown_kn: mblRequired,
    tiedown_ok: false, // no MBL provided in input — always false
    daf_transit,
  }
}
