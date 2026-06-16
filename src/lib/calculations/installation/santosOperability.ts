/**
 * Wave climate operability for Santos Basin (offshore SE Brazil).
 *
 * Distribution is a representative annual Hs marginal taken from open-source
 * literature (PNBOIA buoy data and IEAPM regional climatology). It is meant
 * as a prototype seed — the operator can edit the table on screen.
 *
 * Method (simplified):
 *  - Marginal probability of Hs in 0.5 m bins (sum = 100%).
 *  - Operability fraction = sum of bin probabilities with bin_upper ≤ Hs_limit.
 *  - Workable hours per 24 h window = 24 × operability_fraction.
 *
 * Out of scope: persistence per sea state (Markov), seasonal variation,
 * directionality, joint Hs-Tp probability.
 */

export type SantosHsBin = {
  /** Lower edge (m). */
  hs_low_m: number
  /** Upper edge (m). */
  hs_high_m: number
  /** Marginal probability of Hs falling in this bin (%). */
  probability_pct: number
}

export const DEFAULT_SANTOS_HS_BINS: SantosHsBin[] = [
  { hs_low_m: 0.0, hs_high_m: 0.5, probability_pct: 2 },
  { hs_low_m: 0.5, hs_high_m: 1.0, probability_pct: 12 },
  { hs_low_m: 1.0, hs_high_m: 1.5, probability_pct: 28 },
  { hs_low_m: 1.5, hs_high_m: 2.0, probability_pct: 30 },
  { hs_low_m: 2.0, hs_high_m: 2.5, probability_pct: 16 },
  { hs_low_m: 2.5, hs_high_m: 3.0, probability_pct: 8 },
  { hs_low_m: 3.0, hs_high_m: 3.5, probability_pct: 3 },
  { hs_low_m: 3.5, hs_high_m: 99, probability_pct: 1 },
]

export type SantosOperabilityResult = {
  /** Fraction of time (0..1) with Hs ≤ Hs_limit. */
  operability_fraction: number
  /** Workable hours in a 24 h operation window. */
  workable_hours_in_24h: number
  /** Per-bin breakdown contributing to the fraction. */
  contributions: Array<SantosHsBin & { contributes: boolean }>
}

/**
 * Compute Santos basin operability given an Hs limit (m).
 *
 * Bins whose upper edge ≤ Hs_limit contribute fully; bins whose lower edge
 * ≥ Hs_limit do not contribute; the bin containing Hs_limit contributes
 * proportionally to the linear fraction of the bin below the limit.
 */
export function santosOperability(
  hs_limit_m: number,
  bins: ReadonlyArray<SantosHsBin> = DEFAULT_SANTOS_HS_BINS,
): SantosOperabilityResult {
  if (!Number.isFinite(hs_limit_m) || hs_limit_m <= 0) {
    return {
      operability_fraction: 0,
      workable_hours_in_24h: 0,
      contributions: bins.map((b) => ({ ...b, contributes: false })),
    }
  }
  const totalPct = bins.reduce((s, b) => s + b.probability_pct, 0)
  if (totalPct <= 0) {
    return {
      operability_fraction: 0,
      workable_hours_in_24h: 0,
      contributions: bins.map((b) => ({ ...b, contributes: false })),
    }
  }

  let cumulativePct = 0
  const contributions = bins.map((b) => {
    let contribution = 0
    if (b.hs_high_m <= hs_limit_m) {
      contribution = b.probability_pct
    } else if (b.hs_low_m < hs_limit_m && hs_limit_m < b.hs_high_m) {
      const width = b.hs_high_m - b.hs_low_m
      contribution = width > 0 ? b.probability_pct * ((hs_limit_m - b.hs_low_m) / width) : 0
    }
    cumulativePct += contribution
    return { ...b, contributes: contribution > 0 }
  })

  const operability_fraction = cumulativePct / totalPct
  return {
    operability_fraction,
    workable_hours_in_24h: 24 * operability_fraction,
    contributions,
  }
}
