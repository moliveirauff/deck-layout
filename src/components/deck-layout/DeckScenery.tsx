import { useCallback, useMemo } from 'react'
import { Group, Line, Path, Rect, Text } from 'react-konva'
import {
  hullPlanSegments,
  hullSegmentsToContext,
  hullSegmentsToSvgPath,
  type PathContext2D,
} from '../../lib/hullShape'

type Props = {
  deckL: number
  deckW: number
  bs: number
  wx: (x: number) => number
  wy: (y: number) => number
  showGrid: boolean
}

const BULWARK_INSET_M = 0.8

/**
 * Cenário de fundo do deck em planta: água com gradiente, casco com curvas,
 * plating do convés, grid, bulwark, linha de centro e indicação BOW/STERN.
 * Apenas visual — não altera coordenadas nem interação.
 */
export function DeckScenery({ deckL, deckW, bs, wx, wy, showGrid }: Props) {
  const hullPath = useMemo(() => {
    if (deckL <= 0 || deckW <= 0) return ''
    return hullSegmentsToSvgPath(hullPlanSegments({ x0: 0, x1: deckL, y0: 0, y1: deckW }), wx, wy)
  }, [deckL, deckW, wx, wy])

  const bulwarkPath = useMemo(() => {
    if (deckL <= BULWARK_INSET_M * 4 || deckW <= BULWARK_INSET_M * 4) return ''
    const i = BULWARK_INSET_M
    return hullSegmentsToSvgPath(
      hullPlanSegments({ x0: i, x1: deckL - i, y0: i, y1: deckW - i }),
      wx,
      wy,
    )
  }, [deckL, deckW, wx, wy])

  // Linhas de plating transversais (a cada 10 m), bem sutis, sob o grid
  const platingLines = useMemo(() => {
    if (deckL <= 0 || deckW <= 0) return []
    const lines: number[][] = []
    for (let x = 10; x < deckL; x += 10) lines.push([wx(x), wy(0), wx(x), wy(deckW)])
    return lines
  }, [deckL, deckW, wx, wy])

  const gridLines = useMemo(() => {
    if (!showGrid || deckL <= 0 || deckW <= 0) return []
    const lines: number[][] = []
    for (let x = 0; x <= deckL; x += 5) lines.push([wx(x), wy(0), wx(x), wy(deckW)])
    for (let y = 0; y <= deckW; y += 5) lines.push([wx(0), wy(y), wx(deckL), wy(y)])
    return lines
  }, [showGrid, deckL, deckW, wx, wy])

  // Clip do plating/grid ao contorno do casco (não vazar além da curva da proa)
  const clipToHull = useCallback(
    (ctx: PathContext2D) => {
      hullSegmentsToContext(hullPlanSegments({ x0: 0, x1: deckL, y0: 0, y1: deckW }), ctx, wx, wy)
    },
    [deckL, deckW, wx, wy],
  )

  return (
    <>
      {/* Água — gradiente oceânico */}
      <Rect
        x={-5000}
        y={-5000}
        width={10000}
        height={10000}
        fillLinearGradientStartPoint={{ x: 0, y: -5000 }}
        fillLinearGradientEndPoint={{ x: 0, y: 5000 }}
        fillLinearGradientColorStops={[0, '#1e5f8a', 1, '#2e7cb0']}
        listening={false}
      />

      {deckL > 0 && deckW > 0 && (
        <>
          {/* Casco em planta — convés aço com sombra suave sobre a água */}
          <Path
            data={hullPath}
            fill="#9aa3ad"
            stroke="#374151"
            strokeWidth={2}
            listening={false}
            shadowColor="black"
            shadowBlur={18}
            shadowOpacity={0.35}
            shadowOffset={{ x: 5, y: 8 }}
          />

          <Group clipFunc={clipToHull} listening={false}>
            {/* Plating do convés (sob o grid) */}
            {platingLines.map((pts, i) => (
              <Line key={`pl-${i}`} points={pts} stroke="rgba(255,255,255,0.22)" strokeWidth={0.6} listening={false} />
            ))}

            {/* Grid */}
            {gridLines.map((pts, i) => (
              <Line key={`gr-${i}`} points={pts} stroke="rgba(229,231,235,0.55)" strokeWidth={0.5} listening={false} />
            ))}
          </Group>

          {/* Bulwark — contorno interno offset do casco */}
          {bulwarkPath && (
            <Path data={bulwarkPath} stroke="#6b7280" strokeWidth={0.8} listening={false} />
          )}

          {/* Linha de centro (dash-dot) */}
          <Line
            points={[wx(0), wy(deckW / 2), wx(deckL), wy(deckW / 2)]}
            stroke="#4b5563"
            strokeWidth={0.8}
            dash={[14, 5, 3, 5]}
            listening={false}
          />

          {/* Indicação BOW / STERN discreta, fora do casco */}
          <Text
            x={wx(deckL) + Math.max(8, bs)}
            y={wy(deckW / 2) - 6}
            text="BOW"
            fontSize={10}
            fontStyle="bold"
            fill="rgba(255,255,255,0.8)"
            listening={false}
          />
          <Text
            x={wx(0) - 60 - Math.max(8, bs)}
            y={wy(deckW / 2) - 6}
            width={60}
            align="right"
            text="STERN"
            fontSize={10}
            fontStyle="bold"
            fill="rgba(255,255,255,0.8)"
            listening={false}
          />
        </>
      )}
    </>
  )
}
