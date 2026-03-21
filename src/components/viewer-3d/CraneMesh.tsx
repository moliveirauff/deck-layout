import * as THREE from 'three'
import { useMemo } from 'react'
import type { Vessel, ProjectEquipment } from '../../types/database'
import { DECK_HEIGHT, hookPosition } from './sceneHelpers'
import type { ViewMode } from './EquipmentMesh'

type Props = {
  vessel: Vessel
  activePe: ProjectEquipment | null
  viewMode: ViewMode
}

/** Cylinder geometry + transforms between two world-space points. */
function CylinderBetween({
  start,
  end,
  radius,
  color,
}: {
  start: [number, number, number]
  end: [number, number, number]
  radius: number
  color: string
}) {
  const { pos, quat, len } = useMemo(() => {
    const s = new THREE.Vector3(...start)
    const e = new THREE.Vector3(...end)
    const dir = e.clone().sub(s)
    const len = dir.length()
    dir.normalize()
    const pos: [number, number, number] = [
      (s.x + e.x) / 2,
      (s.y + e.y) / 2,
      (s.z + e.z) / 2,
    ]
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir,
    )
    return { pos, quat, len }
  }, [start, end])

  return (
    <mesh position={pos} quaternion={quat} castShadow>
      <cylinderGeometry args={[radius, radius * 1.3, len, 16]} />
      <meshStandardMaterial color={color} roughness={0.6} metalness={0.4} />
    </mesh>
  )
}

export function CraneMesh({ vessel, activePe, viewMode }: Props) {
  const px = vessel.crane_pedestal_x
  const py = vessel.crane_pedestal_y
  const ph = vessel.crane_pedestal_height_m
  const boomLen = vessel.crane_boom_length_m

  // Choose active crane geometry based on viewMode and active equipment
  const useOverboard = (viewMode === 'overboard' || viewMode === 'both') && activePe?.crane_slew_overboard_deg != null

  const slewDeg    = useOverboard ? (activePe?.crane_slew_overboard_deg ?? 0)    : (activePe?.crane_slew_deck_deg ?? 0)
  const boomDeg    = useOverboard ? (activePe?.crane_boom_angle_overboard_deg ?? 30) : (activePe?.crane_boom_angle_deck_deg ?? 30)
  const radiusM    = useOverboard ? (activePe?.crane_radius_overboard_m ?? 20)    : (activePe?.crane_radius_deck_m ?? 20)

  const pedestalTop: [number, number, number] = [px, DECK_HEIGHT + ph, py]
  const hook = hookPosition(px, py, ph, radiusM, slewDeg, boomDeg, boomLen)

  return (
    <group>
      {/* Pedestal cylinder */}
      <mesh position={[px, DECK_HEIGHT + ph / 2, py]} castShadow>
        <cylinderGeometry args={[1.5, 1.8, ph, 16]} />
        <meshStandardMaterial color="#444850" roughness={0.5} metalness={0.6} />
      </mesh>

      {/* Boom */}
      <CylinderBetween
        start={pedestalTop}
        end={hook}
        radius={0.4}
        color="#556070"
      />

      {/* Hook sphere */}
      <mesh position={hook} castShadow>
        <sphereGeometry args={[0.5, 12, 12]} />
        <meshStandardMaterial color="#cc9900" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* Cable — thin line from hook straight down to deck height */}
      <mesh position={[hook[0], (hook[1] + DECK_HEIGHT) / 2, hook[2]]}>
        <cylinderGeometry args={[0.05, 0.05, hook[1] - DECK_HEIGHT, 6]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
    </group>
  )
}
