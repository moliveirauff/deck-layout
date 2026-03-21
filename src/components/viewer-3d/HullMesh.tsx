import { useMemo } from 'react'
import * as THREE from 'three'
import { DECK_HEIGHT } from './sceneHelpers'

const HULL_DRAFT_M = 10
/** Hull top sits flush with the underside of the deck surface. */
const HULL_TOP_Y = DECK_HEIGHT
/** Keel level — 10 m below waterline (Y = 0), giving waterline at the hull's mid-height. */
const HULL_BOT_Y = -HULL_DRAFT_M

type Props = { length: number; width: number }

/**
 * Simplified tapered ship hull rendered below the deck.
 * Cross-sections are widest at midship and taper toward bow and stern.
 * The waterline plane (Y = 0) bisects the hull at approximately mid-height
 * since DECK_HEIGHT = 10 and HULL_DRAFT_M = 10.
 */
export function HullMesh({ length: L, width: W }: Props) {
  const geometry = useMemo(() => {
    if (L <= 0 || W <= 0) return new THREE.BufferGeometry()

    // Longitudinal cross-sections: [x, topFullWidth, botFullWidth]
    // Hull is centered on Z = W / 2 (same as deck).
    const sections: Array<{ x: number; topW: number; botW: number }> = [
      { x: 0,       topW: W * 0.75, botW: W * 0.50 }, // stern — heavily tapered
      { x: L * 0.2, topW: W * 0.92, botW: W * 0.78 }, // quarter-stern
      { x: L * 0.5, topW: W,        botW: W * 0.90 }, // midship — widest
      { x: L * 0.8, topW: W * 0.95, botW: W * 0.85 }, // quarter-bow
      { x: L,       topW: W * 0.60, botW: W * 0.42 }, // bow — most tapered
    ]

    // Per section — 4 vertices in order: portTop, starTop, portBot, starBot
    //   i*4+0  portTop  (x, HULL_TOP_Y, ptZ)
    //   i*4+1  starTop  (x, HULL_TOP_Y, stZ)
    //   i*4+2  portBot  (x, HULL_BOT_Y, pbZ)
    //   i*4+3  starBot  (x, HULL_BOT_Y, sbZ)
    const verts: number[] = []
    const idx: number[] = []

    for (const s of sections) {
      const ptZ = (W - s.topW) / 2
      const stZ = (W + s.topW) / 2
      const pbZ = (W - s.botW) / 2
      const sbZ = (W + s.botW) / 2
      verts.push(s.x, HULL_TOP_Y, ptZ) // 0 portTop
      verts.push(s.x, HULL_TOP_Y, stZ) // 1 starTop
      verts.push(s.x, HULL_BOT_Y, pbZ) // 2 portBot
      verts.push(s.x, HULL_BOT_Y, sbZ) // 3 starBot
    }

    // Side and bottom quads between adjacent cross-sections
    for (let i = 0; i < sections.length - 1; i++) {
      const a = i * 4
      const b = (i + 1) * 4

      // Port side
      idx.push(a, a + 2, b)
      idx.push(b, a + 2, b + 2)

      // Starboard side
      idx.push(a + 1, b + 1, a + 3)
      idx.push(b + 1, b + 3, a + 3)

      // Keel (bottom)
      idx.push(a + 2, a + 3, b + 2)
      idx.push(b + 2, a + 3, b + 3)
    }

    // Stern end cap (section 0, normal points −X)
    idx.push(0, 1, 2)
    idx.push(1, 3, 2)

    // Bow end cap (last section, normal points +X)
    const last = (sections.length - 1) * 4
    idx.push(last, last + 2, last + 1)
    idx.push(last + 1, last + 2, last + 3)

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
    geo.setIndex(idx)
    geo.computeVertexNormals()
    return geo
  }, [L, W])

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color="#1e3a5f"
        transparent
        opacity={0.7}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
