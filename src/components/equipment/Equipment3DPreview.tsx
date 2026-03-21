import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Html } from '@react-three/drei'
import type { GeometryType } from '../../types/database'

const SCENE_SCALE = 3 // max dimension normalised to this many units

type ShapeProps = {
  l: number
  w: number
  h: number
  geometryType: GeometryType
  scale: number
}

function EquipmentShape({ l, w, h, geometryType, scale }: ShapeProps) {
  const sl = l * scale
  const sw = w * scale
  const sh = h * scale

  return (
    <mesh position={[0, sh / 2, 0]}>
      {geometryType === 'cylinder' ? (
        // Cylinder: radius = w/2, height = l, axis along Y; but for visual clarity
        // we stand it upright: radius = w/2 in XZ plane, length = l along Y
        <cylinderGeometry args={[sw / 2, sw / 2, sl, 32]} />
      ) : (
        <boxGeometry args={[sl, sh, sw]} />
      )}
      <meshStandardMaterial color="#3b82f6" transparent opacity={0.85} />
    </mesh>
  )
}

type LabelProps = {
  l: number
  w: number
  h: number
  scale: number
}

function DimensionLabels({ l, w, h, scale }: LabelProps) {
  const sl = l * scale
  const sw = w * scale
  const sh = h * scale

  return (
    <>
      {/* L label — along X axis */}
      <Html position={[sl / 2 + 0.2, sh / 2, 0]} center distanceFactor={8}>
        <span className="whitespace-nowrap rounded bg-white/80 px-1 py-0.5 text-[10px] font-medium text-gray-700 shadow">
          L {l.toFixed(1)} m
        </span>
      </Html>
      {/* W label — along Z axis */}
      <Html position={[0, sh / 2, sw / 2 + 0.2]} center distanceFactor={8}>
        <span className="whitespace-nowrap rounded bg-white/80 px-1 py-0.5 text-[10px] font-medium text-gray-700 shadow">
          W {w.toFixed(1)} m
        </span>
      </Html>
      {/* H label — along Y axis */}
      <Html position={[0, sh + 0.25, 0]} center distanceFactor={8}>
        <span className="whitespace-nowrap rounded bg-white/80 px-1 py-0.5 text-[10px] font-medium text-gray-700 shadow">
          H {h.toFixed(1)} m
        </span>
      </Html>
    </>
  )
}

type Props = {
  length: number
  width: number
  height: number
  geometryType: GeometryType
}

/** Three.js 3D mini-preview of an equipment item with orbit controls and auto-rotate. */
export function Equipment3DPreview({ length, width, height, geometryType }: Props) {
  const valid = length > 0 && width > 0 && height > 0

  if (!valid) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-100 text-sm text-gray-400">
        Enter dimensions to see 3D preview
      </div>
    )
  }

  const maxDim = Math.max(length, width, height)
  const scale = SCENE_SCALE / maxDim

  return (
    <Canvas
      camera={{ position: [7, 5, 7], fov: 45 }}
      className="h-full w-full"
      style={{ background: '#f9fafb' }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 5]} intensity={0.8} />

      <Suspense fallback={null}>
        <EquipmentShape l={length} w={width} h={height} geometryType={geometryType} scale={scale} />
        <DimensionLabels l={length} w={width} h={height} scale={scale} />
      </Suspense>

      <Grid
        args={[20, 20]}
        position={[0, 0, 0]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#d1d5db"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#9ca3af"
        fadeDistance={25}
        infiniteGrid
      />

      <OrbitControls autoRotate autoRotateSpeed={1.5} enablePan={false} minDistance={3} maxDistance={20} />
    </Canvas>
  )
}
