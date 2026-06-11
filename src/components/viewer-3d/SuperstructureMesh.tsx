import { useMemo } from 'react'
import * as THREE from 'three'
import { DECK_HEIGHT } from './sceneHelpers'
import { hullBowLength } from '../../lib/hullShape'

type Props = {
  /** Comprimento do deck de trabalho (m). */
  deckLength: number
  /** Largura do deck (m). */
  deckWidth: number
  /** Espaço de casco disponível à frente do deck, em direção à proa (m). */
  bowExtension: number
}

const SS_COLOR = '#e8e8e6'
const SS_ROUGHNESS = 0.6

/** Textura canvas do helideck: círculo amarelo + "H" branco sobre cinza. */
function makeHelideckTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#46505a'
  ctx.fillRect(0, 0, 256, 256)
  ctx.strokeStyle = '#e3b51e'
  ctx.lineWidth = 10
  ctx.beginPath()
  ctx.arc(128, 128, 100, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 120px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('H', 128, 134)
  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 4
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/**
 * Bloco de acomodações procedural na proa: níveis empilhados com setback,
 * banda de janelas da ponte, bridge wings, mastro e helideck octogonal.
 * Puramente visual — não participa de validação nem de posicionamento.
 */
export function SuperstructureMesh({ deckLength, deckWidth, bowExtension }: Props) {
  const W = deckWidth
  const helideckTex = useMemo(() => makeHelideckTexture(), [])

  // Geometria derivada do espaço entre o fim do deck e a proa do casco.
  // Espaço < 8 m → sobrepõe visualmente a extremidade de proa do deck.
  const g = useMemo(() => {
    const hullLen = deckLength + Math.max(0, bowExtension)
    const bowLen = hullBowLength({ x0: 0, x1: hullLen, y0: 0, y1: W })
    const overlapped = bowExtension < 8
    const ssLen = overlapped
      ? Math.min(Math.max(deckLength * 0.12, 8), 14)
      : Math.min(Math.max((bowExtension - 2) * 0.7, 7), 32)
    // Frente do bloco: antes da curva de proa (com folga onde o casco ainda é largo)
    const frontX = overlapped ? hullLen - bowLen * 0.55 : Math.min(deckLength + 2 + ssLen, hullLen - bowLen * 0.45)
    const aftX = frontX - ssLen
    const ssW = overlapped ? W * 0.7 : W * 0.8
    return { frontX, aftX, ssLen, ssW }
  }, [deckLength, bowExtension, W])

  const cz = W / 2
  const base = DECK_HEIGHT
  // Níveis: [comprimento, largura, altura] com setback progressivo na frente
  const levels: Array<[number, number, number]> = [
    [g.ssLen, g.ssW, 3.0],
    [g.ssLen * 0.88, g.ssW * 0.94, 3.0],
    [g.ssLen * 0.74, g.ssW * 0.88, 2.8],
    [g.ssLen * 0.55, g.ssW * 0.84, 2.6], // ponte
  ]
  let y = base
  const levelMeshes = levels.map(([len, wid, h], i) => {
    const cy = y + h / 2
    const cx = g.frontX - len / 2 // alinhados pela frente (setback para ré)
    y += h
    return (
      <mesh key={i} position={[cx, cy, cz]} castShadow receiveShadow>
        <boxGeometry args={[len, h, wid]} />
        <meshStandardMaterial color={SS_COLOR} roughness={SS_ROUGHNESS} />
      </mesh>
    )
  })
  const bridgeTop = y
  const bridge = levels[3]
  const bridgeFloor = bridgeTop - bridge[2]
  const bridgeFrontX = g.frontX - bridge[0] / 2

  const heliR = Math.min(W * 0.42, 9)
  const heliY = bridgeTop + 1.6
  const heliX = g.frontX + heliR * 0.35

  return (
    <group>
      {levelMeshes}

      {/* Banda de janelas da ponte — caixa fina escura levemente emissiva */}
      <mesh position={[bridgeFrontX, bridgeFloor + bridge[2] * 0.62, cz]}>
        <boxGeometry args={[bridge[0] + 0.15, 1.0, bridge[1] + 0.15]} />
        <meshStandardMaterial color="#16222e" emissive="#274a66" emissiveIntensity={0.35} roughness={0.25} metalness={0.4} />
      </mesh>

      {/* Bridge wings — passadiço fino atravessando toda a boca */}
      <mesh position={[bridgeFrontX, bridgeFloor + 0.5, cz]} castShadow>
        <boxGeometry args={[2.2, 1.0, W * 1.04]} />
        <meshStandardMaterial color={SS_COLOR} roughness={SS_ROUGHNESS} />
      </mesh>

      {/* Mastro principal + travessa + radar */}
      <group position={[g.aftX + g.ssLen * 0.3, bridgeTop, cz]}>
        <mesh position={[0, 3, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.2, 6, 8]} />
          <meshStandardMaterial color="#d8d8d4" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0, 4.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 4, 6]} />
          <meshStandardMaterial color="#d8d8d4" roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0, 6.1, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.25, 12]} />
          <meshStandardMaterial color="#f0f0ee" roughness={0.4} />
        </mesh>
      </group>

      {/* Suportes do helideck */}
      {[-0.5, 0.5].map((s) => (
        <mesh key={s} position={[heliX - heliR * 0.3, (bridgeFloor + heliY) / 2, cz + s * heliR]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, heliY - bridgeFloor, 8]} />
          <meshStandardMaterial color="#aab2b8" roughness={0.6} metalness={0.3} />
        </mesh>
      ))}

      {/* Helideck octogonal com marcação H (textura na tampa superior) */}
      <mesh position={[heliX, heliY, cz]} castShadow>
        <cylinderGeometry args={[heliR, heliR, 0.4, 8]} />
        <meshStandardMaterial attach="material-0" color="#46505a" roughness={0.7} />
        <meshStandardMaterial attach="material-1" map={helideckTex} roughness={0.7} />
        <meshStandardMaterial attach="material-2" color="#3a434c" roughness={0.7} />
      </mesh>
    </group>
  )
}
