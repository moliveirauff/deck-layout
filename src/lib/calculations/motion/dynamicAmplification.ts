import { GRAVITY } from '../hydro/constants'

/** Maximum DAF per DNV-ST-N001 (cap to prevent absurd values). */
export const DAF_MAX = 2.0

/**
 * Dynamic Amplification Factor (DAF) per DNV-ST-N001 (simplified approach).
 *
 *   DAF = min(1 + a_ct / g, DAF_MAX)
 *
 * Where a_ct is the significant crane tip vertical acceleration at a given
 * wave angular frequency ω:
 *
 *   a_ct = craneTipHeaveM × ω²
 *
 * Capped at DAF_MAX = 2.0 per DNV engineering practice.
 *
 * @param craneTipHeaveM  Significant crane tip vertical heave amplitude (m)
 * @param omega           Wave angular frequency (rad/s), ω = 2π / Tp
 * @returns               DAF (dimensionless, 1.0 ≤ DAF ≤ DAF_MAX)
 */
export function dynamicAmplificationFactor(
  craneTipHeaveM: number,
  omega: number,
): number {
  const a_ct = craneTipHeaveM * omega * omega
  return Math.min(1 + a_ct / GRAVITY, DAF_MAX)
}

/**
 * Crane tip vertical acceleration (m/s²) from significant heave amplitude and wave frequency.
 */
export function craneTipAcceleration(craneTipHeaveM: number, omega: number): number {
  return craneTipHeaveM * omega * omega
}

/**
 * Crane tip vertical velocity (m/s) from significant heave amplitude and wave frequency.
 */
export function craneTipVelocity(craneTipHeaveM: number, omega: number): number {
  return craneTipHeaveM * omega
}
