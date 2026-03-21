import { Html } from '@react-three/drei'
import type { Vessel, VesselBarrier, DeckLoadZone } from '../../types/database'
import { DECK_HEIGHT, BULWARK_H, BULWARK_W, toScene } from './sceneHelpers'
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
  const cx = L / 2
  const cz = W / 2

  return (
    <group>
      {/* Vessel hull — tapered box below deck, waterline (Y=0) at mid-hull height */}
      <HullMesh length={L} width={W} />

      {/* Deck surface */}
      <mesh position={[cx, DECK_HEIGHT, cz]} receiveShadow>
        <boxGeometry args={[L, 0.2, W]} />
        <meshStandardMaterial color="#a0a8b0" roughness={0.8} />
      </mesh>

      {/* Bulwark — 4 sides */}
      {/* Bow (+X) */}
      <mesh position={[L, DECK_HEIGHT + BULWARK_H / 2, cz]}>
        <boxGeometry args={[BULWARK_W, BULWARK_H, W + BULWARK_W * 2]} />
        <meshStandardMaterial color="#808890" />
      </mesh>
      {/* Stern (-X) */}
      <mesh position={[0, DECK_HEIGHT + BULWARK_H / 2, cz]}>
        <boxGeometry args={[BULWARK_W, BULWARK_H, W + BULWARK_W * 2]} />
        <meshStandardMaterial color="#808890" />
      </mesh>
      {/* Starboard (+Z) */}
      <mesh position={[cx, DECK_HEIGHT + BULWARK_H / 2, W]}>
        <boxGeometry args={[L, BULWARK_H, BULWARK_W]} />
        <meshStandardMaterial color="#808890" />
      </mesh>
      {/* Port (-Z) */}
      <mesh position={[cx, DECK_HEIGHT + BULWARK_H / 2, 0]}>
        <boxGeometry args={[L, BULWARK_H, BULWARK_W]} />
        <meshStandardMaterial color="#808890" />
      </mesh>

      {/* Barriers */}
      {showBarriers && barriers.map((b) => (
        <group key={b.id} position={toScene(b.x_m + b.length_m / 2, b.y_m + b.width_m / 2, (b.height_m ?? 2) / 2)}>
          <mesh castShadow>
            <boxGeometry args={[b.length_m, b.height_m ?? 2, b.width_m]} />
            <meshStandardMaterial color="#cc2222" transparent opacity={0.5} />
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
            <meshStandardMaterial color="#2244cc" transparent opacity={0.2} />
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
