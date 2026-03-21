import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Grid } from '@react-three/drei'
import { DeckMesh } from './DeckMesh'
import { EquipmentMesh, type ViewMode } from './EquipmentMesh'
import { CraneMesh } from './CraneMesh'
import { SceneCapture, type SceneCaptureApi } from './SceneCapture'
import { DECK_HEIGHT } from './sceneHelpers'
import type { Vessel, VesselBarrier, DeckLoadZone, ProjectEquipment, EquipmentLibrary } from '../../types/database'

type Toggles = {
  barriers: boolean
  loadZones: boolean
  grid: boolean
  water: boolean
  labels: boolean
}

type Props = {
  vessel: Vessel
  barriers: VesselBarrier[]
  deckLoadZones: DeckLoadZone[]
  placed: ProjectEquipment[]
  libById: Record<string, EquipmentLibrary>
  activePeId: string
  viewMode: ViewMode
  toggles: Toggles
  captureRef: React.RefObject<SceneCaptureApi>
}

export function Scene({ vessel, barriers, deckLoadZones, placed, libById, activePeId, viewMode, toggles, captureRef }: Props) {
  const cx = vessel.deck_length_m / 2
  const cz = vessel.deck_width_m / 2
  const activePe = placed.find((p) => p.id === activePeId) ?? null

  return (
    <Canvas
      camera={{ position: [cx - 80, 80, cz - 60], fov: 55 }}
      shadows
      gl={{ preserveDrawingBuffer: true }}
      className="rounded-lg"
    >
      {/* Sky */}
      <color attach="background" args={['#c8dff5']} />
      <fog attach="fog" args={['#c8dff5', 200, 600]} />

      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[100, 200, 60]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />

      <Suspense fallback={null}>
        {/* Deck + barriers + load zones */}
        <DeckMesh
          vessel={vessel}
          barriers={barriers}
          deckLoadZones={deckLoadZones}
          showBarriers={toggles.barriers}
          showLoadZones={toggles.loadZones}
          showLabels={toggles.labels}
        />

        {/* Equipment items */}
        {placed.map((pe) => {
          const eq = libById[pe.equipment_id]
          if (!eq) return null
          return (
            <EquipmentMesh
              key={pe.id}
              pe={pe}
              eq={eq}
              viewMode={viewMode}
              showLabels={toggles.labels}
            />
          )
        })}

        {/* Crane */}
        <CraneMesh vessel={vessel} activePe={activePe} viewMode={viewMode} />

        {/* Grid on deck */}
        {toggles.grid && (
          <Grid
            position={[cx, DECK_HEIGHT + 0.12, cz]}
            args={[vessel.deck_length_m, vessel.deck_width_m]}
            cellSize={5}
            cellThickness={0.4}
            cellColor="#888"
            sectionSize={25}
            sectionThickness={0.8}
            sectionColor="#666"
            fadeDistance={200}
            fadeStrength={1}
          />
        )}

        {/* Water surface */}
        {toggles.water && (
          <mesh position={[cx, 0, cz]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[400, 400]} />
            <meshStandardMaterial color="#1a4a8a" transparent opacity={0.4} roughness={0.2} />
          </mesh>
        )}
      </Suspense>

      {/* Screenshot + camera control (inside Canvas) */}
      <SceneCapture ref={captureRef} target={[cx, DECK_HEIGHT, cz]} />
    </Canvas>
  )
}
