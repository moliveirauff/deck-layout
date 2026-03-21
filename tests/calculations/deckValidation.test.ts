import { describe, it, expect } from 'vitest'
import { validatePlacement, aabbOf, type EquipPlacement } from '../../src/lib/calculations/deckValidation'

// Realistic seed data: Seven Seas (80×25m), Forward Deck zone (x:0,y:3,30×19m, 5 t/m²)
const DECK_L = 80
const DECK_W = 25

const BARRIER = { x_m: 5, y_m: 0, length_m: 50, width_m: 3, height_m: 2.5 } // Pipe Rack Port
const ZONE = { x_m: 0, y_m: 3, length_m: 30, width_m: 19, capacity_t_per_m2: 5.0 }

function plet(cx: number, cy: number, rotDeg = 0): EquipPlacement {
  // PLET-A: 3×2m, 8t
  return { cx, cy, halfL: 1.5, halfW: 1.0, rotDeg, weightT: 8 }
}

describe('aabbOf', () => {
  it('returns tight box for axis-aligned rect', () => {
    const b = aabbOf({ cx: 10, cy: 10, halfL: 3, halfW: 1, rotDeg: 0, weightT: 5 })
    expect(b.x1).toBeCloseTo(7)
    expect(b.x2).toBeCloseTo(13)
    expect(b.y1).toBeCloseTo(9)
    expect(b.y2).toBeCloseTo(11)
  })

  it('expands AABB for 45° rotation', () => {
    const b = aabbOf({ cx: 0, cy: 0, halfL: 2, halfW: 1, rotDeg: 45, weightT: 0 })
    // At 45°, hx = hy = 2*cos45 + 1*sin45 = (2+1)/√2 ≈ 2.121
    expect(b.x1).toBeCloseTo(-2.121, 2)
    expect(b.x2).toBeCloseTo(2.121, 2)
  })
})

describe('validatePlacement — bounds', () => {
  it('passes for equipment fully inside deck', () => {
    const r = validatePlacement(plet(10, 8), DECK_L, DECK_W, [], [], [])
    expect(r.inBounds).toBe(true)
  })

  it('fails for equipment overlapping starboard edge (y < halfW)', () => {
    const r = validatePlacement(plet(10, 0.5), DECK_L, DECK_W, [], [], [])
    expect(r.inBounds).toBe(false)
  })

  it('fails for equipment beyond bow (x > deckL - halfL)', () => {
    const r = validatePlacement(plet(79.5, 12), DECK_L, DECK_W, [], [], [])
    expect(r.inBounds).toBe(false)
  })
})

describe('validatePlacement — barrier collision', () => {
  it('detects collision with Pipe Rack Port barrier', () => {
    // Barrier at y:0-3, equipment center at y:2 → overlaps
    const r = validatePlacement(plet(20, 2), DECK_L, DECK_W, [BARRIER], [], [])
    expect(r.noBarrierCollision).toBe(false)
  })

  it('clears when equipment is above barrier', () => {
    // Equipment center at y:6, halfW=1, so y range [5,7]. Barrier ends at y=3.
    const r = validatePlacement(plet(20, 6), DECK_L, DECK_W, [BARRIER], [], [])
    expect(r.noBarrierCollision).toBe(true)
  })
})

describe('validatePlacement — equipment overlap', () => {
  it('detects overlap between two adjacent items', () => {
    const a = plet(10, 8)
    const b = plet(11, 8)  // centers 1m apart, combined halfL = 1.5+1.5 = 3 → overlap
    const r = validatePlacement(a, DECK_L, DECK_W, [], [], [b])
    expect(r.noOverlap).toBe(false)
  })

  it('passes when items are spaced far enough apart', () => {
    const a = plet(10, 8)
    const b = plet(14, 8)  // 4m gap > 3m needed
    const r = validatePlacement(a, DECK_L, DECK_W, [], [], [b])
    expect(r.noOverlap).toBe(true)
  })
})

describe('validatePlacement — deck load', () => {
  it('computes pressure correctly (8t / 3×2 = 1.33 t/m²) and passes 5 t/m² zone', () => {
    // Equipment in Forward Deck zone (0–30m x, 3–22m y)
    const r = validatePlacement(plet(10, 8), DECK_L, DECK_W, [], [ZONE], [])
    expect(r.pressure).toBeCloseTo(8 / 6, 5) // 1.333 t/m²
    expect(r.deckLoadOk).toBe(true)
    expect(r.zoneCapacity).toBe(5.0)
  })

  it('fails deck load when weight exceeds zone capacity', () => {
    // Manifold: 5×3m, 100t → 100/15 = 6.67 t/m² > 5 t/m²
    const heavy: EquipPlacement = { cx: 10, cy: 10, halfL: 2.5, halfW: 1.5, rotDeg: 0, weightT: 100 }
    const r = validatePlacement(heavy, DECK_L, DECK_W, [], [ZONE], [])
    expect(r.deckLoadOk).toBe(false)
  })

  it('returns null deckLoadOk when not in any zone', () => {
    const r = validatePlacement(plet(60, 12), DECK_L, DECK_W, [], [ZONE], [])
    expect(r.deckLoadOk).toBeNull()  // zone only covers x:0-30
  })
})

describe('validatePlacement — ok flag', () => {
  it('is true when all checks pass', () => {
    const r = validatePlacement(plet(10, 8), DECK_L, DECK_W, [BARRIER], [ZONE], [])
    expect(r.ok).toBe(true)
  })

  it('is false when any single check fails', () => {
    // Out of bounds
    const r = validatePlacement(plet(79.5, 12), DECK_L, DECK_W, [], [], [])
    expect(r.ok).toBe(false)
  })
})
