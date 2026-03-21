import { Html } from '@react-three/drei'
import type { Vessel, VesselBarrier, DeckLoadZone } from '../../types/database'
import { toScene } from './sceneHelpers'
import { HullMesh } from './HullMesh'

type Props = {
  vessel: Vessel
  barriers: VesselBarrier[]
  deckLoadZones: DeckLoadZone[]
  showBarriers: boolean
  showLoadZones: boolean
  showLabels: boolean
}

export function DeckMesh({ vessel, barriers, deckLoadZones, showBarriers, showLoadZones, showLabels }: Props) {
  const L = vessel.deck_length_m
  const W = vessel.deck_width_m

  return (
    <group>
      {/* Vessel hull — volumetric shape with tapered bow, red bottom, grey top, bulwarks */}
      <HullMesh length={L} width={W} />

      {/* Barriers */}
      {showBarriers && barriers.map((b) => (
        <group key={b.id} position={toScene(b.x_m + b.length_m / 2, b.y_m + b.width_m / 2, (b.height_m ?? 2) / 2)}>
          <mesh castShadow>
            <boxGeometry args={[b.length_m, b.height_m ?? 2, b.width_m]} />
            <meshStandardMaterial color="#cc2222" transparent opacity={0.5} roughness={0.8} />
          </mesh>
          {showLabels && (
            <Html position={[0, (b.height_m ?? 2) / 2 + 0.5, 0]} center distanceFactor={50}>
              <div className="text-[9px] bg-black/60 text-white px-1 rounded pointer-events-none">{b.name}</div>
            </Html>
          )}
        </group>
      ))}

      {/* Deck load zones */}
      {showLoadZones && deckLoadZones.map((z) => (
        <group key={z.id} position={toScene(z.x_m + z.length_m / 2, z.y_m + z.width_m / 2, 0.02)}>
          <mesh>
            <boxGeometry args={[z.length_m, 0.02, z.width_m]} />
            <meshStandardMaterial color="#2244cc" transparent opacity={0.2} roughness={0.8} />
          </mesh>
          {showLabels && (
            <Html position={[0, 0.5, 0]} center distanceFactor={50}>
              <div className="text-[9px] bg-black/60 text-white px-1 rounded pointer-events-none">{z.capacity_t_per_m2} t/m²</div>
            </Html>
          )}
        </group>
      ))}
    </group>
  )
}
