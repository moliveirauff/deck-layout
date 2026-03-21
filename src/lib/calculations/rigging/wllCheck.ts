/**
 * WLL (Working Load Limit) and MBL (Minimum Breaking Load) verification
 * for rigging components per DNV-ST-0378.
 */

/**
 * Check if the design sling force is within the WLL of the rigging component.
 *
 * @param sling_force_design_t - Design force per sling (tonnes)
 * @param wll_t - Working Load Limit of the component (tonnes)
 * @returns ok = true if force ≤ WLL; utilization_pct = force/WLL × 100
 */
export function checkWLL(
  sling_force_design_t: number,
  wll_t: number,
): { ok: boolean; utilization_pct: number } {
  const utilization_pct = wll_t > 0 ? (sling_force_design_t / wll_t) * 100 : Infinity
  return {
    ok: sling_force_design_t <= wll_t,
    utilization_pct,
  }
}

/**
 * Check if the MBL provides adequate safety factor.
 * If MBL is null, it is estimated as WLL × 5 (standard for wire rope slings).
 *
 * @param sling_force_design_t - Design force per sling (tonnes)
 * @param wll_t - Working Load Limit (tonnes)
 * @param mbl_t - Minimum Breaking Load (tonnes), or null to estimate
 * @returns ok = true if sf ≥ 5; sf = MBL / design_force
 */
export function checkMBL(
  sling_force_design_t: number,
  wll_t: number,
  mbl_t: number | null,
): { ok: boolean; sf: number } {
  const effective_mbl = mbl_t ?? wll_t * 5
  const sf = sling_force_design_t > 0 ? effective_mbl / sling_force_design_t : Infinity
  return {
    ok: sf >= 5,
    sf,
  }
}
