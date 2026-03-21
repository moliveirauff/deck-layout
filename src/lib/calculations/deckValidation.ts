import type { VesselBarrier, DeckLoadZone } from '../../types/database'

/** Equipment placement described in world coordinates (meters). */
export type EquipPlacement = {
  cx: number      // center X in world space
  cy: number      // center Y in world space
  halfL: number   // half of length_m
  halfW: number   // half of width_m
  rotDeg: number  // CW rotation in degrees
  weightT: number // dry_weight_t
}

type AABB = { x1: number; y1: number; x2: number; y2: number }

/** Axis-aligned bounding box of a possibly-rotated rectangle. */
export function aabbOf(p: EquipPlacement): AABB {
  const r = (p.rotDeg * Math.PI) / 180
  const c = Math.abs(Math.cos(r))
  const s = Math.abs(Math.sin(r))
  const hx = p.halfL * c + p.halfW * s
  const hy = p.halfL * s + p.halfW * c
  return { x1: p.cx - hx, y1: p.cy - hy, x2: p.cx + hx, y2: p.cy + hy }
}

function overlaps(a: AABB, b: AABB): boolean {
  return !(a.x2 <= b.x1 || b.x2 <= a.x1 || a.y2 <= b.y1 || b.y2 <= a.y1)
}

export type ValidationResult = {
  inBounds: boolean
  noBarrierCollision: boolean
  noOverlap: boolean
  deckLoadOk: boolean | null   // null = not within any load zone
  pressure: number             // t/m² of this equipment
  zoneCapacity: number | null  // lowest overlapping zone capacity
  ok: boolean                  // true iff all checks pass
}

/**
 * Validate a single equipment placement against deck bounds, barriers,
 * overlapping equipment, and deck load zone capacities.
 *
 * @param equip  - the item being validated
 * @param deckL  - deck length (m)
 * @param deckW  - deck width (m)
 * @param barriers  - vessel barriers
 * @param zones  - deck load zones
 * @param others - OTHER placements on deck (exclude the item itself)
 */
export function validatePlacement(
  equip: EquipPlacement,
  deckL: number,
  deckW: number,
  barriers: Pick<VesselBarrier, 'x_m' | 'y_m' | 'length_m' | 'width_m'>[],
  zones: Pick<DeckLoadZone, 'x_m' | 'y_m' | 'length_m' | 'width_m' | 'capacity_t_per_m2'>[],
  others: EquipPlacement[],
): ValidationResult {
  const box = aabbOf(equip)

  // 1. Bounds check
  const inBounds = box.x1 >= 0 && box.y1 >= 0 && box.x2 <= deckL && box.y2 <= deckW

  // 2. Barrier collision
  let noBarrierCollision = true
  for (const b of barriers) {
    const bBox: AABB = { x1: b.x_m, y1: b.y_m, x2: b.x_m + b.length_m, y2: b.y_m + b.width_m }
    if (overlaps(box, bBox)) { noBarrierCollision = false; break }
  }

  // 3. Equipment-to-equipment overlap
  let noOverlap = true
  for (const other of others) {
    if (overlaps(box, aabbOf(other))) { noOverlap = false; break }
  }

  // 4. Deck load capacity — check against the lowest-capacity overlapping zone
  const area = equip.halfL * 2 * (equip.halfW * 2)
  const pressure = area > 0 ? equip.weightT / area : 0
  let zoneCapacity: number | null = null

  for (const z of zones) {
    const zBox: AABB = { x1: z.x_m, y1: z.y_m, x2: z.x_m + z.length_m, y2: z.y_m + z.width_m }
    if (overlaps(box, zBox)) {
      if (zoneCapacity === null || z.capacity_t_per_m2 < zoneCapacity) {
        zoneCapacity = z.capacity_t_per_m2
      }
    }
  }

  const deckLoadOk = zoneCapacity !== null ? pressure <= zoneCapacity : null
  const ok = inBounds && noBarrierCollision && noOverlap && deckLoadOk !== false

  return { inBounds, noBarrierCollision, noOverlap, deckLoadOk, pressure, zoneCapacity, ok }
}
