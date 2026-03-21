import { GRAVITY } from '../hydro/constants'

/**
 * Dynamic Amplification Factor (DAF) per DNV-ST-N001 (simplified approach).
 *
 *   DAF = 1 + a_ct / g
 *
 * Where a_ct is the significant crane tip vertical acceleration at a given
 * wave angular frequency ω:
 *
 *   a_ct = craneTipHeaveM × ω²
 *
 * A DAF of 1.0 means no dynamic amplification (quasi-static). Values > 1
 * amplify the static hook load.
 *
 * @param craneTipHeaveM  Significant crane tip vertical heave amplitude (m)
 * @param omega           Wave angular frequency (rad/s), ω = 2π / Tp
 * @returns               DAF (dimensionless, ≥ 1.0)
 */
export function dynamicAmplificationFactor(
  craneTipHeaveM: number,
  omega: number,
): number {
  const a_ct = craneTipHeaveM * omega * omega
  return 1 + a_ct / GRAVITY
}

/**
 * Crane tip vertical acceleration (m/s²) from significant heave amplitude and wave frequency.
 *
 * @param craneTipHeaveM  Significant crane tip vertical heave amplitude (m)
 * @param omega           Wave angular frequency (rad/s)
 */
export function craneTipAcceleration(craneTipHeaveM: number, omega: number): number {
  return craneTipHeaveM * omega * omega
}

/**
 * Crane tip vertical velocity (m/s) from significant heave amplitude and wave frequency.
 *
 * @param craneTipHeaveM  Significant crane tip vertical heave amplitude (m)
 * @param omega           Wave angular frequency (rad/s)
 */
export function craneTipVelocity(craneTipHeaveM: number, omega: number): number {
  return craneTipHeaveM * omega
}
