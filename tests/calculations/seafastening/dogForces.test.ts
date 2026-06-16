import { describe, test, expect } from 'vitest'
import {
  calculateDogForces,
  defaultDogLayout,
  type Dog,
  type DogCapacity,
} from '../../../src/lib/calculations/seafastening/dogForces'

const CAP: DogCapacity = { horizontal_kn: 200, vertical_kn: 100 }

describe('defaultDogLayout', () => {
  test('returns 8 dogs, 2 per side', () => {
    const dogs = defaultDogLayout()
    expect(dogs).toHaveLength(8)
    expect(dogs.filter((d) => d.side === 'bow')).toHaveLength(2)
    expect(dogs.filter((d) => d.side === 'stern')).toHaveLength(2)
    expect(dogs.filter((d) => d.side === 'port')).toHaveLength(2)
    expect(dogs.filter((d) => d.side === 'starboard')).toHaveLength(2)
  })

  test('positions are at 1/3 and 2/3 along each side', () => {
    const dogs = defaultDogLayout()
    const ts = dogs.map((d) => d.t).sort()
    // 8 dogs total, 4 at 1/3 and 4 at 2/3
    expect(ts.slice(0, 4)).toEqual([1 / 3, 1 / 3, 1 / 3, 1 / 3])
    expect(ts.slice(4)).toEqual([2 / 3, 2 / 3, 2 / 3, 2 / 3])
  })
})

describe('calculateDogForces — default 8-dog layout, 10 t container in moderate transit', () => {
  // Realistic case: 10 t equipment, a_long = 3 m/s², a_trans = 5 m/s², a_vert = 12 m/s²
  // F_L = 10 * 3 = 30 kN ; F_T = 10 * 5 = 50 kN ; F_V_uplift = 10 * (12 - 9.81) = 21.9 kN
  // With DAF 1.3:  F_L_d = 39 kN ; F_T_d = 65 kN ; F_V_d = 28.47 kN
  const dogs = defaultDogLayout()
  const result = calculateDogForces({
    dogs,
    force_longitudinal_kn: 39,
    force_transversal_kn: 65,
    force_uplift_kn: 28.47,
    capacity: CAP,
  })

  test('returns one result per dog', () => {
    expect(result.perDog).toHaveLength(8)
  })

  test('bow/stern dogs each take F_L / 4 = 9.75 kN horizontal', () => {
    const bowDog = result.perDog.find((r) => r.side === 'bow')
    expect(bowDog?.horizontal_kn).toBeCloseTo(9.75, 3)
    const sternDog = result.perDog.find((r) => r.side === 'stern')
    expect(sternDog?.horizontal_kn).toBeCloseTo(9.75, 3)
  })

  test('port/starboard dogs each take F_T / 4 = 16.25 kN horizontal', () => {
    const portDog = result.perDog.find((r) => r.side === 'port')
    expect(portDog?.horizontal_kn).toBeCloseTo(16.25, 3)
    const stbdDog = result.perDog.find((r) => r.side === 'starboard')
    expect(stbdDog?.horizontal_kn).toBeCloseTo(16.25, 3)
  })

  test('all dogs share uplift equally: F_V / 8 = 3.55875 kN', () => {
    for (const r of result.perDog) {
      expect(r.vertical_kn).toBeCloseTo(28.47 / 8, 3)
    }
  })

  test('utilization stays well below 1.0 for this load level', () => {
    expect(result.maxUtilization).toBeLessThan(0.1)
    expect(result.allOk).toBe(true)
  })
})

describe('calculateDogForces — heavy load triggers failure', () => {
  test('marks dogs not OK when transversal force exceeds capacity', () => {
    const dogs = defaultDogLayout()
    // 4 transversal dogs × 200 kN cap = 800 kN max → push to 1000 kN
    const result = calculateDogForces({
      dogs,
      force_longitudinal_kn: 0,
      force_transversal_kn: 1000,
      force_uplift_kn: 0,
      capacity: CAP,
    })
    const transDogs = result.perDog.filter((r) => r.side === 'port' || r.side === 'starboard')
    for (const r of transDogs) {
      expect(r.horizontal_kn).toBeCloseTo(250, 3) // 1000/4
      expect(r.utilization).toBeCloseTo(1.25, 3)
      expect(r.ok).toBe(false)
    }
    const longDogs = result.perDog.filter((r) => r.side === 'bow' || r.side === 'stern')
    for (const r of longDogs) {
      expect(r.horizontal_kn).toBe(0)
      expect(r.ok).toBe(true)
    }
    expect(result.allOk).toBe(false)
    expect(result.maxUtilization).toBeCloseTo(1.25, 3)
  })

  test('vertical utilization can drive failure when uplift dominates', () => {
    const dogs = defaultDogLayout()
    // 8 dogs × 100 kN vert cap = 800 kN total → push uplift to 900 kN
    const result = calculateDogForces({
      dogs,
      force_longitudinal_kn: 0,
      force_transversal_kn: 0,
      force_uplift_kn: 900,
      capacity: CAP,
    })
    for (const r of result.perDog) {
      expect(r.vertical_kn).toBeCloseTo(112.5, 3)
      expect(r.utilization).toBeCloseTo(1.125, 3)
      expect(r.ok).toBe(false)
    }
    expect(result.allOk).toBe(false)
  })
})

describe('calculateDogForces — edge cases', () => {
  test('zero forces produce zero utilization and all OK', () => {
    const result = calculateDogForces({
      dogs: defaultDogLayout(),
      force_longitudinal_kn: 0,
      force_transversal_kn: 0,
      force_uplift_kn: 0,
      capacity: CAP,
    })
    expect(result.maxUtilization).toBe(0)
    expect(result.allOk).toBe(true)
  })

  test('asymmetric layout: only one side has longitudinal dogs', () => {
    const dogs: Dog[] = [
      { id: 'b1', side: 'bow', t: 0.5 },
      { id: 'p1', side: 'port', t: 0.5 },
      { id: 's1', side: 'starboard', t: 0.5 },
    ]
    const result = calculateDogForces({
      dogs,
      force_longitudinal_kn: 100,
      force_transversal_kn: 100,
      force_uplift_kn: 30,
      capacity: CAP,
    })
    // Only 1 bow dog absorbs 100 kN long
    expect(result.perDog[0].horizontal_kn).toBe(100)
    // 2 transversal dogs split 100 kN → 50 each
    expect(result.perDog[1].horizontal_kn).toBe(50)
    expect(result.perDog[2].horizontal_kn).toBe(50)
    // 3 total dogs share uplift
    expect(result.perDog[0].vertical_kn).toBeCloseTo(10, 3)
  })

  test('zero capacity with non-zero force returns Infinity utilization', () => {
    const dogs = defaultDogLayout()
    const result = calculateDogForces({
      dogs,
      force_longitudinal_kn: 10,
      force_transversal_kn: 0,
      force_uplift_kn: 0,
      capacity: { horizontal_kn: 0, vertical_kn: 100 },
    })
    const bowDog = result.perDog.find((r) => r.side === 'bow')!
    expect(bowDog.utilization).toBe(Infinity)
    expect(bowDog.ok).toBe(false)
  })
})
