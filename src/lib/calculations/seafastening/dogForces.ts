/**
 * Sea-fastening dog (welded stopper) force distribution — simplified prototype.
 *
 * Model assumptions (preliminary):
 *  - Each dog is welded to the deck and bears against the equipment footprint
 *    along a single side (bow, stern, port, starboard).
 *  - A dog on a longitudinal side (bow/stern) reacts horizontal longitudinal
 *    force only; a dog on a transversal side (port/starboard) reacts
 *    horizontal transversal force only.
 *  - All dogs react vertical uplift in tension.
 *  - Per-axis force is divided equally among dogs on the side under load
 *    (load goes to the opposite side under inertia — e.g. bow-going inertia
 *    is restrained by stern dogs).
 *  - DAF for transit is applied at the equipment level; per-dog SF is left
 *    to the operator via capacity input.
 *  - Combined check uses linear interaction:  U = max(Fh / Ch, Fv / Cv).
 *
 * Not modeled here (out of scope for this prototype):
 *  - Eccentricity / moment redistribution between dogs.
 *  - Friction contribution.
 *  - Diagonal / inclined dogs.
 *  - Concurrent multi-axis loading per DNV envelope (treated as decoupled).
 */

export type DogSide = 'bow' | 'stern' | 'port' | 'starboard'

export type Dog = {
  id: string
  side: DogSide
  /** Position along the side, normalized 0..1 (0 = port-end on bow/stern, fwd-end on port/starboard). */
  t: number
}

export type DogCapacity = {
  /** Horizontal capacity per dog (kN). */
  horizontal_kn: number
  /** Vertical (uplift) capacity per dog (kN). */
  vertical_kn: number
}

export type DogForcesInput = {
  dogs: Dog[]
  /** Longitudinal design force on the equipment (kN, absolute). */
  force_longitudinal_kn: number
  /** Transversal design force on the equipment (kN, absolute). */
  force_transversal_kn: number
  /** Uplift force on the equipment (kN, >= 0). */
  force_uplift_kn: number
  capacity: DogCapacity
}

export type DogResult = {
  id: string
  side: DogSide
  /** Horizontal force reacted by this dog (kN). */
  horizontal_kn: number
  /** Vertical force reacted by this dog (kN). */
  vertical_kn: number
  /** Utilization U = max(Fh/Ch, Fv/Cv), 0..∞. OK when U ≤ 1.0. */
  utilization: number
  ok: boolean
}

export type DogForcesResult = {
  perDog: DogResult[]
  /** Highest utilization across all dogs. */
  maxUtilization: number
  /** True if every dog has U ≤ 1.0. */
  allOk: boolean
}

const LONGITUDINAL_SIDES: ReadonlySet<DogSide> = new Set<DogSide>(['bow', 'stern'])
const TRANSVERSAL_SIDES: ReadonlySet<DogSide> = new Set<DogSide>(['port', 'starboard'])

/**
 * Default 8-dog layout: 2 dogs per side at t = 1/3 and 2/3.
 */
export function defaultDogLayout(): Dog[] {
  const sides: DogSide[] = ['bow', 'stern', 'port', 'starboard']
  const tPositions = [1 / 3, 2 / 3]
  const dogs: Dog[] = []
  for (const side of sides) {
    for (let i = 0; i < tPositions.length; i++) {
      dogs.push({ id: `${side}-${i + 1}`, side, t: tPositions[i] })
    }
  }
  return dogs
}

/**
 * Distribute equipment-level design forces across the configured dogs and
 * compute per-dog utilization against the provided capacity.
 *
 * @param input dogs + design forces (already DAF-amplified) + capacity per dog
 */
export function calculateDogForces(input: DogForcesInput): DogForcesResult {
  const { dogs, force_longitudinal_kn, force_transversal_kn, force_uplift_kn, capacity } = input

  const nLong = dogs.filter((d) => LONGITUDINAL_SIDES.has(d.side)).length
  const nTrans = dogs.filter((d) => TRANSVERSAL_SIDES.has(d.side)).length
  const nTotal = dogs.length

  const fLongPer = nLong > 0 ? Math.abs(force_longitudinal_kn) / nLong : 0
  const fTransPer = nTrans > 0 ? Math.abs(force_transversal_kn) / nTrans : 0
  const fUpPer = nTotal > 0 ? Math.abs(force_uplift_kn) / nTotal : 0

  const safeDiv = (num: number, den: number): number => (den > 0 ? num / den : num > 0 ? Infinity : 0)

  const perDog: DogResult[] = dogs.map((d) => {
    const horizontal = LONGITUDINAL_SIDES.has(d.side) ? fLongPer : fTransPer
    const vertical = fUpPer
    const uH = safeDiv(horizontal, capacity.horizontal_kn)
    const uV = safeDiv(vertical, capacity.vertical_kn)
    const utilization = Math.max(uH, uV)
    return {
      id: d.id,
      side: d.side,
      horizontal_kn: horizontal,
      vertical_kn: vertical,
      utilization,
      ok: utilization <= 1.0,
    }
  })

  const maxUtilization = perDog.reduce((m, r) => Math.max(m, r.utilization), 0)
  const allOk = perDog.every((r) => r.ok)

  return { perDog, maxUtilization, allOk }
}
