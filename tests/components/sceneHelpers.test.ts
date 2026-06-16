import { describe, it, expect } from 'vitest'
import {
  toSceneDeck,
  toSceneWorld,
  DECK_HEIGHT,
} from '../../src/components/viewer-3d/sceneHelpers'

// Reference vessel width (Seven Seas-class deck): 25 m.
const DECK_W = 25

describe('sceneHelpers — lateral consistency 2D → 3D', () => {
  it('toSceneDeck flips Y → deckWidth - y (port = high Z, starboard = low Z)', () => {
    // y = 0 (port) → Z = deckWidth
    expect(toSceneDeck(0, 0, DECK_W)).toEqual([0, DECK_HEIGHT, DECK_W])
    // y = deckWidth (starboard) → Z = 0
    expect(toSceneDeck(0, DECK_W, DECK_W)).toEqual([0, DECK_HEIGHT, 0])
  })

  it('toSceneWorld applies the SAME lateral flip as toSceneDeck', () => {
    // Equipment with deck_pos_y = 12.5 and overboard_pos_y = 12.5 must land
    // on the same lateral Z in the 3D scene — otherwise overboard renders
    // mirrored against the 2D top-down layout (bug fix 2026-06-16).
    const deck = toSceneDeck(40, 12.5, DECK_W)
    const ob = toSceneWorld(40, 12.5, DECK_W)
    expect(ob[2]).toBeCloseTo(deck[2], 6)
  })

  it('overboard point outside the starboard bulwark stays on the starboard side', () => {
    // y > deckWidth means outboard starboard; Z must be negative (matches
    // the side where toSceneDeck places starboard-edge equipment).
    const ob = toSceneWorld(60, DECK_W + 5, DECK_W)
    expect(ob[2]).toBeLessThan(0)
  })

  it('overboard point outside the port bulwark stays on the port side', () => {
    // y < 0 means outboard port; Z must be > deckWidth.
    const ob = toSceneWorld(60, -5, DECK_W)
    expect(ob[2]).toBeGreaterThan(DECK_W)
  })

  it('heightAboveDeck shifts only Y, never X or Z', () => {
    const base = toSceneWorld(10, 5, DECK_W, 0)
    const raised = toSceneWorld(10, 5, DECK_W, 3)
    expect(raised[0]).toBe(base[0])
    expect(raised[2]).toBe(base[2])
    expect(raised[1] - base[1]).toBeCloseTo(3, 6)
  })
})
