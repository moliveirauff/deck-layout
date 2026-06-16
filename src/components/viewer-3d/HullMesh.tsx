import { useMemo } from 'react'
import * as THREE from 'three'
import { DECK_HEIGHT, BULWARK_H, BULWARK_W } from './sceneHelpers'
import { hullPlanSegments, type HullSegment } from '../../lib/hullShape'

const HULL_DRAFT_M = 10
const BOOT_TOP_M = 1.2 // faixa boot-top preta entre antifouling e costado

type Props = {
  length: number
  width: number
  /** Extensão visual do casco além do deck, em direção à proa (m). */
  bowExtension?: number
}

/** Converte segmentos de planta do casco em THREE.Shape/Path. */
function segmentsToPath<T extends THREE.Path>(segments: HullSegment[], target: T): T {
  for (const s of segments) {
    switch (s.kind) {
      case 'move':
        target.moveTo(s.x, s.y)
        break
      case 'line':
        target.lineTo(s.x, s.y)
        break
      case 'quad':
        target.quadraticCurveTo(s.cx, s.cy, s.x, s.y)
        break
      case 'cubic':
        target.bezierCurveTo(s.c1x, s.c1y, s.c2x, s.c2y, s.x, s.y)
        break
      case 'close':
        target.closePath()
        break
    }
  }
  return target
}

export function HullMesh({ length: L, width: W, bowExtension = 0 }: Props) {
  const hullLen = L + Math.max(0, bowExtension)

  const { shape, bulwarkShape } = useMemo(() => {
    const box = { x0: 0, x1: hullLen, y0: 0, y1: W }
    const s = segmentsToPath(hullPlanSegments(box), new THREE.Shape())

    // Bulwark: contorno do casco com furo interno offset BULWARK_W
    const bs = segmentsToPath(hullPlanSegments(box), new THREE.Shape())
    const bw = BULWARK_W || 0.2
    const hole = segmentsToPath(
      hullPlanSegments({ x0: bw, x1: hullLen - bw, y0: bw, y1: W - bw }),
      new THREE.Path(),
    )
    bs.holes.push(hole)

    return { shape: s, bulwarkShape: bs }
  }, [hullLen, W])

  const antifoulingSettings = { depth: HULL_DRAFT_M, bevelEnabled: false }
  const bootTopSettings = { depth: BOOT_TOP_M, bevelEnabled: false }
  const topsideSettings = { depth: DECK_HEIGHT - BOOT_TOP_M, bevelEnabled: false }
  const bulwarkSettings = { depth: BULWARK_H, bevelEnabled: false }

  return (
    <group>
      {/* Obras vivas — antifouling vermelho, de Y=0 até Y=-10 */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <extrudeGeometry args={[shape, antifoulingSettings]} />
        <meshStandardMaterial color="#8B0000" roughness={0.55} metalness={0.25} />
      </mesh>

      {/* Boot-top preto na linha d'água, de Y=1.2 até Y=0 */}
      <mesh position={[0, BOOT_TOP_M, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <extrudeGeometry args={[shape, bootTopSettings]} />
        <meshStandardMaterial color="#15181b" roughness={0.5} metalness={0.2} />
      </mesh>

      {/* Costado + convés, de Y=10 até Y=1.2 — material 0 = tampas (deck anti-slip),
          material 1 = paredes laterais (costado cinza-claro) */}
      <mesh position={[0, DECK_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <extrudeGeometry args={[shape, topsideSettings]} />
        <meshStandardMaterial attach="material-0" color="#3d5c45" roughness={0.9} metalness={0.05} />
        <meshStandardMaterial attach="material-1" color="#c9ced3" roughness={0.55} metalness={0.25} />
      </mesh>

      {/* Bulwarks, de Y=11.5 até Y=10 */}
      <mesh position={[0, DECK_HEIGHT + BULWARK_H, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <extrudeGeometry args={[bulwarkShape, bulwarkSettings]} />
        <meshStandardMaterial color="#b8bec4" roughness={0.6} metalness={0.25} />
      </mesh>
    </group>
  )
}
