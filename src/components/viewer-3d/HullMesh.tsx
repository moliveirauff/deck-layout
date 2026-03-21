import { useMemo } from 'react'
import * as THREE from 'three'
import { DECK_HEIGHT, BULWARK_H, BULWARK_W } from './sceneHelpers'

const HULL_DRAFT_M = 10

type Props = { length: number; width: number }

export function HullMesh({ length: L, width: W }: Props) {
  const { shape, bulwarkShape } = useMemo(() => {
    const bowLen = Math.min(L * 0.15, 15)
    const rectLen = L - bowLen

    const s = new THREE.Shape()
    s.moveTo(0, 0)
    s.lineTo(rectLen, 0)
    s.lineTo(L, W / 2)
    s.lineTo(rectLen, W)
    s.lineTo(0, W)
    s.lineTo(0, 0)

    const bs = new THREE.Shape()
    bs.moveTo(0, 0)
    bs.lineTo(rectLen, 0)
    bs.lineTo(L, W / 2)
    bs.lineTo(rectLen, W)
    bs.lineTo(0, W)
    bs.lineTo(0, 0)

    const hole = new THREE.Path()
    const bw = BULWARK_W || 0.2
    const insetTipX = L - bw * 2
    hole.moveTo(bw, bw)
    hole.lineTo(rectLen, bw)
    hole.lineTo(insetTipX, W / 2)
    hole.lineTo(rectLen, W - bw)
    hole.lineTo(bw, W - bw)
    hole.lineTo(bw, bw)
    bs.holes.push(hole)

    return { shape: s, bulwarkShape: bs }
  }, [L, W])

  const extrudeSettings = { depth: HULL_DRAFT_M, bevelEnabled: false }
  const bulwarkSettings = { depth: BULWARK_H, bevelEnabled: false }

  return (
    <group>
      {/* Bottom Hull (Red) - from Y=0 down to Y=-10 */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <extrudeGeometry args={[shape, extrudeSettings]} />
        <meshStandardMaterial color="#8B0000" roughness={0.7} />
      </mesh>

      {/* Top Hull (Grey) - from Y=10 down to Y=0 */}
      <mesh position={[0, DECK_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <extrudeGeometry args={[shape, extrudeSettings]} />
        <meshStandardMaterial color="#A0A0A0" roughness={0.8} />
      </mesh>

      {/* Bulwarks - from Y=11.5 down to Y=10 */}
      <mesh position={[0, DECK_HEIGHT + BULWARK_H, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <extrudeGeometry args={[bulwarkShape, bulwarkSettings]} />
        <meshStandardMaterial color="#808890" roughness={0.8} />
      </mesh>
    </group>
  )
}
