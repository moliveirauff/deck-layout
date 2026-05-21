import { Html, Line } from '@react-three/drei'
import type { ProjectEquipment, EquipmentLibrary } from '../../types/database'
import { toSceneDeck, toSceneWorld, DECK_HEIGHT } from './sceneHelpers'

export type ViewMode = 'deck' | 'overboard' | 'both'

type Props = {
  pe: ProjectEquipment
  eq: EquipmentLibrary
  viewMode: ViewMode
  showLabels: boolean
  deckWidth: number
}

function EquipGeometry({ eq }: { eq: EquipmentLibrary }) {
  if (eq.geometry_type === 'cylinder') {
    return <cylinderGeometry args={[eq.width_m / 2, eq.width_m / 2, eq.height_m, 16]} />
  }
  return <boxGeometry args={[eq.length_m, eq.height_m, eq.width_m]} />
}

function EquipMaterial({ color, wireframe, opacity = 1 }: { color: string; wireframe?: boolean; opacity?: number }) {
  return (
    <meshStandardMaterial
      color={color}
      wireframe={wireframe}
      transparent={opacity < 1}
      opacity={opacity}
      roughness={0.8}
      metalness={0.2}
    />
  )
}

function getColorForId(id: string) {
  const colors = ['#eab308', '#3b82f6', '#ef4444', '#10b981', '#f97316', '#8b5cf6', '#06b6d4']
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export function EquipmentMesh({ pe, eq, viewMode, showLabels, deckWidth }: Props) {
  const h2 = eq.height_m / 2
  const deckPos = toSceneDeck(pe.deck_pos_x, pe.deck_pos_y, deckWidth, h2)
  const rotY = (pe.deck_rotation_deg * Math.PI) / 180

  const hasOverboard =
    pe.overboard_pos_x != null &&
    pe.overboard_pos_y != null

  const obPos = hasOverboard
    ? toSceneWorld(pe.overboard_pos_x!, pe.overboard_pos_y!, h2)
    : null

  const showDeck   = viewMode === 'deck'   || viewMode === 'both'
  const showOb     = (viewMode === 'overboard' || viewMode === 'both') && hasOverboard
  const ghostDeck  = viewMode === 'both' && hasOverboard

  const color = getColorForId(pe.equipment_id)

  return (
    <group>
      {/* Deck position */}
      {showDeck && (
        <group position={deckPos} rotation={[0, rotY, 0]}>
          <mesh castShadow>
            <EquipGeometry eq={eq} />
            <EquipMaterial color={color} wireframe={ghostDeck} opacity={ghostDeck ? 0.4 : 1} />
          </mesh>
          {showLabels && !ghostDeck && (
            <Html position={[0, h2 + 0.8, 0]} center distanceFactor={50}>
              <div className="text-[9px] bg-black/60 text-white px-1 rounded pointer-events-none">
                {pe.label ?? eq.name}
              </div>
            </Html>
          )}
        </group>
      )}

      {/* Overboard position (solid) */}
      {showOb && obPos && (
        <group position={obPos}>
          <mesh castShadow>
            <EquipGeometry eq={eq} />
            <EquipMaterial color={color} />
          </mesh>
          {showLabels && (
            <Html position={[0, h2 + 0.8, 0]} center distanceFactor={50}>
              <div className="text-[9px] bg-black/60 text-white px-1 rounded pointer-events-none">
                {pe.label ?? eq.name}
              </div>
            </Html>
          )}
        </group>
      )}

      {/* Lift path arc (Both mode) */}
      {viewMode === 'both' && obPos && (
        <Line
          points={[
            [deckPos[0], DECK_HEIGHT + 0.05, deckPos[2]],
            [obPos[0], DECK_HEIGHT + 0.05, obPos[2]],
          ]}
          color="#ffffff"
          lineWidth={1.5}
          dashed
          dashSize={1}
          gapSize={0.8}
        />
      )}
    </group>
  )
}

