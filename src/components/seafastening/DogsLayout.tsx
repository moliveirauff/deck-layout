import { useRef, useCallback } from 'react'
import type { Dog, DogResult, DogSide } from '../../lib/calculations/seafastening/dogForces'

type Props = {
  equipmentLength: number
  equipmentWidth: number
  dogs: Dog[]
  results: DogResult[]
  /** Called when a dog is dragged to a new position along its side. */
  onDogMove: (id: string, newT: number) => void
}

const PADDING = 28 // SVG padding around the equipment rectangle
const VIEW_W = 360
const VIEW_H = 240
const RECT_W = VIEW_W - PADDING * 2
const RECT_H = VIEW_H - PADDING * 2
const DOG_R = 7

/** Convert a dog (side + t) to (x, y) coordinates in the SVG viewbox. */
function dogPosition(side: DogSide, t: number): { x: number; y: number } {
  const clamped = Math.min(1, Math.max(0, t))
  switch (side) {
    case 'bow':
      return { x: PADDING + RECT_W, y: PADDING + clamped * RECT_H }
    case 'stern':
      return { x: PADDING, y: PADDING + clamped * RECT_H }
    case 'port':
      return { x: PADDING + clamped * RECT_W, y: PADDING }
    case 'starboard':
      return { x: PADDING + clamped * RECT_W, y: PADDING + RECT_H }
  }
}

/** Inverse: from a pointer's local SVG coords, compute the new t along a side. */
function pointerToT(side: DogSide, localX: number, localY: number): number {
  const raw =
    side === 'bow' || side === 'stern'
      ? (localY - PADDING) / RECT_H
      : (localX - PADDING) / RECT_W
  return Math.min(1, Math.max(0, raw))
}

function dogColor(result: DogResult | undefined): string {
  if (!result) return '#94a3b8' // slate-400 — no data yet
  if (result.utilization > 1.0) return '#dc2626' // red-600
  if (result.utilization > 0.8) return '#f59e0b' // amber-500
  return '#16a34a' // green-600
}

export function DogsLayout({
  equipmentLength,
  equipmentWidth,
  dogs,
  results,
  onDogMove,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const draggingId = useRef<string | null>(null)
  const resultById = new Map(results.map((r) => [r.id, r]))

  const getLocalPoint = useCallback((evt: React.PointerEvent<SVGElement>): { x: number; y: number } | null => {
    const svg = svgRef.current
    if (!svg) return null
    const pt = svg.createSVGPoint()
    pt.x = evt.clientX
    pt.y = evt.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const local = pt.matrixTransform(ctm.inverse())
    return { x: local.x, y: local.y }
  }, [])

  const handlePointerDown = (id: string) => (evt: React.PointerEvent<SVGCircleElement>) => {
    draggingId.current = id
    evt.currentTarget.setPointerCapture(evt.pointerId)
  }

  const handlePointerMove = (evt: React.PointerEvent<SVGCircleElement>) => {
    const id = draggingId.current
    if (!id) return
    const dog = dogs.find((d) => d.id === id)
    if (!dog) return
    const pt = getLocalPoint(evt)
    if (!pt) return
    onDogMove(id, pointerToT(dog.side, pt.x, pt.y))
  }

  const handlePointerUp = (evt: React.PointerEvent<SVGCircleElement>) => {
    if (draggingId.current) {
      evt.currentTarget.releasePointerCapture(evt.pointerId)
      draggingId.current = null
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full max-w-sm select-none rounded border border-slate-200 bg-slate-50"
      >
        {/* Equipment footprint (top-view) */}
        <rect
          x={PADDING}
          y={PADDING}
          width={RECT_W}
          height={RECT_H}
          fill="#cbd5e1"
          stroke="#64748b"
          strokeWidth={1.5}
        />
        {/* Bow label (right side, +X) */}
        <text x={VIEW_W - 4} y={VIEW_H / 2} textAnchor="end" className="fill-slate-500 text-[10px]">BOW</text>
        <text x={4} y={VIEW_H / 2} className="fill-slate-500 text-[10px]">STERN</text>
        <text x={VIEW_W / 2} y={12} textAnchor="middle" className="fill-slate-500 text-[10px]">PORT</text>
        <text x={VIEW_W / 2} y={VIEW_H - 4} textAnchor="middle" className="fill-slate-500 text-[10px]">STBD</text>

        {/* Equipment dimensions */}
        <text x={VIEW_W / 2} y={VIEW_H / 2 - 4} textAnchor="middle" className="fill-slate-600 text-[11px]">
          {equipmentLength.toFixed(1)} × {equipmentWidth.toFixed(1)} m
        </text>

        {/* Dogs */}
        {dogs.map((d) => {
          const { x, y } = dogPosition(d.side, d.t)
          const r = resultById.get(d.id)
          return (
            <g key={d.id}>
              <circle
                cx={x}
                cy={y}
                r={DOG_R}
                fill={dogColor(r)}
                stroke="#1e293b"
                strokeWidth={1}
                className="cursor-grab active:cursor-grabbing"
                onPointerDown={handlePointerDown(d.id)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              />
              <title>
                {d.id} — H: {r ? r.horizontal_kn.toFixed(1) : '—'} kN · V: {r ? r.vertical_kn.toFixed(1) : '—'} kN · U: {r ? r.utilization.toFixed(2) : '—'}
              </title>
            </g>
          )
        })}
      </svg>
      <p className="text-[11px] text-slate-500">Arraste cada dog ao longo do seu lado · cor = utilização (verde &lt;0.8 · âmbar &lt;1.0 · vermelho ≥1.0)</p>
    </div>
  )
}
