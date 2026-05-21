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

/** Map a world/overboard (x, y) coordinate to a Three.js [X, Y, Z] position. */
export function toSceneWorld(x: number, y: number, heightAboveDeck = 0): [number, number, number] {
  return [x, DECK_HEIGHT + heightAboveDeck, y]
}

/**
 * Map an on-deck (x, y) coordinate to Three.js.
 *
 * Deck objects must match the 2D deck canvas orientation, where data Y is
 * rendered as `deckWidth - y`. Overboard points remain in world coordinates.
 */
export function toSceneDeck(
  x: number,
  y: number,
  deckWidth: number,
  heightAboveDeck = 0,
): [number, number, number] {
  return [x, DECK_HEIGHT + heightAboveDeck, deckWidth - y]
}
