/**
 * Coordinate helpers shared across all 3D viewer components.
 *
 * DATA space  →  THREE.JS space
 *   data X   →  Three.js X            (bow = +X)
 *   data Y   →  Three.js Z = deckW-y  (port = +Z, starboard = low/neg Z)
 *   vertical →  Three.js Y            (up = +Y)
 *
 * Data Y matches the 2D top-down canvas where port (Y=0) is rendered at the
 * top of the view and starboard (Y=deckWidth) at the bottom. The same flip
 * (`deckWidth - y`) applies to on-deck AND overboard points so both stay on
 * the correct side of the vessel — otherwise the boom, hook and overboard
 * equipment render mirrored against the 2D layout.
 *
 * The vessel deck sits at Y = DECK_HEIGHT above the waterline (Y = 0).
 */

export const DECK_HEIGHT = 10   // m above waterline
export const BULWARK_H = 1.5    // m — raised edge height
export const BULWARK_W = 0.3    // m — bulwark wall thickness

/**
 * Map a world/overboard (x, y) coordinate to a Three.js [X, Y, Z] position.
 *
 * Overboard points share the same lateral axis as the on-deck plane, so the
 * `deckWidth - y` flip must be applied here too. Without it, the crane boom
 * and any equipment rendered at its overboard position appear mirrored
 * against the 2D top-down layout.
 */
export function toSceneWorld(
  x: number,
  y: number,
  deckWidth: number,
  heightAboveDeck = 0,
): [number, number, number] {
  return [x, DECK_HEIGHT + heightAboveDeck, deckWidth - y]
}

/**
 * Map an on-deck (x, y) coordinate to Three.js.
 *
 * Matches the 2D deck canvas orientation, where data Y is rendered as
 * `deckWidth - y`.
 */
export function toSceneDeck(
  x: number,
  y: number,
  deckWidth: number,
  heightAboveDeck = 0,
): [number, number, number] {
  return [x, DECK_HEIGHT + heightAboveDeck, deckWidth - y]
}
