/**
 * GM (metacentric height) verification for loaded vessel.
 *
 * GM_loaded = KM - KG_loaded
 * where KM (metacentric_height_m) = distance from keel to metacentre.
 *
 * Pass criteria: GM_loaded ≥ GM_min
 */

export type GMVerificationResult = {
  gm_loaded_m: number
  gm_ok: boolean
}

/**
 * Verify GM of the loaded vessel.
 *
 * @param gm_min_m - Minimum allowable GM from vessel data
 * @param kg_lightship_m - KG of the lightship (unused directly but kept for API clarity)
 * @param kg_loaded_m - KG of the loaded vessel (from calculateKG)
 * @param metacentric_height_m - KM: keel-to-metacentre height of the vessel
 * @returns GM verification result with loaded GM and pass/fail
 */
export function verifyGM(
  gm_min_m: number,
  _kg_lightship_m: number,
  kg_loaded_m: number,
  metacentric_height_m: number,
): GMVerificationResult {
  // GM = KM - KG
  const gm_loaded_m = metacentric_height_m - kg_loaded_m

  return {
    gm_loaded_m,
    gm_ok: gm_loaded_m >= gm_min_m,
  }
}
