/**
 * Coordinate helpers shared across all 3D viewer components.
 *
 * DATA space  →  THREE.JS space
 *   data X   →  Three.js X   (bow = +X)
 *   data Y   →  Three.js Z   (starboard = +Z)
 *   vertical →  Three.js Y   (up = +Y)
 *
 * The vessel deck sits at Y = DECK_HEIGHT above the waterline (Y = 0).
 */

export const DECK_HEIGHT = 10   // m above waterline
export const BULWARK_H = 1.5    // m — raised edge height
export const BULWARK_W = 0.3    // m — bulwark wall thickness

/** Map a deck (x, y) coordinate to a Three.js [X, Y, Z] world position. */
export function toScene(x: number, y: number, heightAboveDeck = 0): [number, number, number] {
  return [x, DECK_HEIGHT + heightAboveDeck, y]
}

/**
 * Compute the hook world position from crane pedestal and boom geometry.
 * Returns [hookX, hookY, hookZ] in Three.js world space.
 */
export function hookPosition(
  pedestalX: number,
  pedestalY: number,
  pedestalH: number,
  radiusM: number,
  slewDeg: number,
  boomAngleDeg: number,
  boomLengthM: number,
): [number, number, number] {
  const slewRad = (slewDeg * Math.PI) / 180
  const boomRad = (boomAngleDeg * Math.PI) / 180
  const hx = pedestalX + radiusM * Math.cos(slewRad)
  const hz = pedestalY + radiusM * Math.sin(slewRad)
  const hy = DECK_HEIGHT + pedestalH + boomLengthM * Math.sin(boomRad)
  return [hx, hy, hz]
}
