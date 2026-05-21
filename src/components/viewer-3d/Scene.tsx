import { Suspense, useState, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Grid } from '@react-three/drei'
import * as THREE from 'three'
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

type FloatingCameraPreset = 'perspective' | 'top' | 'port' | 'bow' | 'stern' | null

function CameraUpdater({ preset, cx, cz }: { preset: FloatingCameraPreset; cx: number; cz: number }) {
  const { camera, invalidate } = useThree()
  
  useEffect(() => {
    if (!preset) return
    const t = new THREE.Vector3(cx, DECK_HEIGHT, cz)
    switch (preset) {
      case 'perspective':
        camera.position.set(cx - 80, 80, cz - 60)
        break
      case 'top':
        camera.position.set(cx, 150, cz)
        break
      case 'port':
        camera.position.set(cx, 30, cz - 150)
        break
      case 'bow':
        camera.position.set(cx + 150, 30, cz)
        break
      case 'stern':
        camera.position.set(cx - 150, 30, cz)
        break
    }
    camera.lookAt(t)
    invalidate() // request one render frame — avoids full React re-render
  }, [preset, cx, cz, camera, invalidate])
  return null
}

export function Scene({ vessel, barriers, deckLoadZones, placed, libById, activePeId, viewMode, toggles, captureRef }: Props) {
  const cx = vessel.deck_length_m / 2
  const cz = vessel.deck_width_m / 2
  const activePe = placed.find((p) => p.id === activePeId) ?? null

  const [preset, setPreset] = useState<FloatingCameraPreset>(null)

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button className="bg-white/80 hover:bg-white text-gray-700 text-xs px-2 py-1 rounded shadow" onClick={() => setPreset('top')}>Top</button>
        <button className="bg-white/80 hover:bg-white text-gray-700 text-xs px-2 py-1 rounded shadow" onClick={() => setPreset('port')}>Port</button>
        <button className="bg-white/80 hover:bg-white text-gray-700 text-xs px-2 py-1 rounded shadow" onClick={() => setPreset('bow')}>Bow</button>
        <button className="bg-white/80 hover:bg-white text-gray-700 text-xs px-2 py-1 rounded shadow" onClick={() => setPreset('stern')}>Stern</button>
        <button className="bg-white/80 hover:bg-white text-gray-700 text-xs px-2 py-1 rounded shadow" onClick={() => setPreset('perspective')}>Perspective</button>
      </div>
      <Canvas
        camera={{ position: [cx - 80, 80, cz - 60], fov: 55 }}
        shadows
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        className="rounded-lg"
        style={{ width: '100%', height: '100%' }}
      >
        <CameraUpdater preset={preset} cx={cx} cz={cz} />
        {/* Sky */}
        <color attach="background" args={['#c8dff5']} />
        <fog attach="fog" args={['#c8dff5', 200, 600]} />

        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[100, 200, 60]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} />
        <hemisphereLight args={['#c8dff5', '#444444', 0.4]} />

        <Suspense fallback={<mesh><boxGeometry args={[1,1,1]} /><meshStandardMaterial color="#94a3b8" /></mesh>}>
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
                deckWidth={vessel.deck_width_m}
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
            <mesh position={[cx, 0, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[1000, 1000]} />
              <meshStandardMaterial color="#228b7e" transparent opacity={0.6} roughness={0.1} metalness={0.1} />
            </mesh>
          )}
        </Suspense>

        {/* Screenshot + camera control (inside Canvas) */}
        <SceneCapture ref={captureRef} target={[cx, DECK_HEIGHT, cz]} />
      </Canvas>
    </div>
  )
}
