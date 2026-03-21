import { useMemo } from 'react'
import { Stage, Layer, Rect, Circle, Line, Arrow, Text, Shape, Group } from 'react-konva'
import { useDeckTransform } from '../../hooks/useDeckTransform'
import type { VesselFormState, BarrierRow, ZoneRow, CraneRow } from '../../hooks/useVesselEditor'

type Props = {
  values: VesselFormState
  barriers: BarrierRow[]
  zones: ZoneRow[]
  cranePoints: CraneRow[]
}

// World → canvas coordinate transforms (Y is flipped: port = up in canvas)
function makeTransform(deckW: number, bs: number, ox: number, oy: number) {
  return {
    wx: (x: number) => ox + x * bs,
    wy: (y: number) => oy + (deckW - y) * bs,
  }
}

/** 2D top-down deck preview with Konva canvas (pan + mouse-wheel zoom). */
export function DeckPreviewCanvas({ values, barriers, zones, cranePoints }: Props) {
  const deckL = parseFloat(values.deck_length_m) || 0
  const deckW = parseFloat(values.deck_width_m) || 0
  const { containerRef, stageRef, size, tf, handleWheel } = useDeckTransform(deckL, deckW)
  const { wx, wy } = makeTransform(deckW, tf.bs, tf.ox, tf.oy)

  // ── Grid lines (every 5 m) ──────────────────────────────────────────────────
  const gridLines = useMemo(() => {
    if (deckL <= 0 || deckW <= 0) return []
    const { bs, ox, oy } = tf
    const lwx = (x: number) => ox + x * bs
    const lwy = (y: number) => oy + (deckW - y) * bs
    const lines: number[][] = []
    for (let x = 0; x <= deckL; x += 5) lines.push([lwx(x), lwy(0), lwx(x), lwy(deckW)])
    for (let y = 0; y <= deckW; y += 5) lines.push([lwx(0), lwy(y), lwx(deckL), lwy(y)])
    return lines
  }, [deckL, deckW, tf])

  // ── Crane data ──────────────────────────────────────────────────────────────
  const pX = parseFloat(values.crane_pedestal_x) || 0
  const pY = parseFloat(values.crane_pedestal_y) || 0
  const slewMin = parseFloat(values.crane_slew_min_deg) || 0
  const slewMax = isNaN(parseFloat(values.crane_slew_max_deg)) ? 360 : parseFloat(values.crane_slew_max_deg)
  const maxR = useMemo(() => {
    const rs = cranePoints.map((p) => parseFloat(p.radius_m)).filter((r) => r > 0)
    return rs.length ? Math.max(...rs) : 0
  }, [cranePoints])

  // ── Zone / barrier canvas rects (pre-computed) ──────────────────────────────
  const zoneRects = useMemo(() =>
    zones.map((z) => {
      const x = parseFloat(z.x_m), y = parseFloat(z.y_m)
      const l = parseFloat(z.length_m), w = parseFloat(z.width_m)
      const cap = parseFloat(z.capacity_t_per_m2)
      if ([x, y, l, w].some(isNaN)) return null
      return { key: z._key, cx: wx(x), cy: wy(y + w), pw: l * tf.bs, ph: w * tf.bs, cap }
    }), [zones, tf, deckW]) // eslint-disable-line react-hooks/exhaustive-deps

  const barrierRects = useMemo(() =>
    barriers.map((b) => {
      const x = parseFloat(b.x_m), y = parseFloat(b.y_m)
      const l = parseFloat(b.length_m), w = parseFloat(b.width_m)
      if ([x, y, l, w].some(isNaN)) return null
      return { key: b._key, name: b.name, cx: wx(x), cy: wy(y + w), pw: l * tf.bs, ph: w * tf.bs }
    }), [barriers, tf, deckW]) // eslint-disable-line react-hooks/exhaustive-deps

  const fontSize = Math.max(7, Math.min(11, tf.bs * 0.9))
  const axisL = deckL > 0 ? Math.min(10, deckL * 0.15) : 5
  const axisW = deckW > 0 ? Math.min(10, deckW * 0.15) : 5

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden bg-gray-50">
      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        draggable
        onWheel={handleWheel}
      >
        <Layer>
          {/* Grid */}
          {gridLines.map((pts, i) => (
            <Line key={i} points={pts} stroke="#e5e7eb" strokeWidth={0.5} listening={false} />
          ))}

          {/* Deck outline */}
          {deckL > 0 && (
            <Rect x={wx(0)} y={wy(deckW)} width={deckL * tf.bs} height={deckW * tf.bs}
              fill="#d1d5db" stroke="#374151" strokeWidth={2} listening={false} />
          )}

          {/* Deck load zones */}
          {zoneRects.map((r) => r && (
            <Group key={r.key} listening={false}>
              <Rect x={r.cx} y={r.cy} width={r.pw} height={r.ph}
                fill="rgba(59,130,246,0.18)" stroke="#3b82f6" strokeWidth={1} />
              {!isNaN(r.cap) && (
                <Text x={r.cx + 3} y={r.cy + 3} text={`${r.cap} t/m²`}
                  fontSize={fontSize} fill="#1d4ed8" />
              )}
            </Group>
          ))}

          {/* Barriers */}
          {barrierRects.map((r) => r && (
            <Group key={r.key} listening={false}>
              <Rect x={r.cx} y={r.cy} width={r.pw} height={r.ph}
                fill="rgba(239,68,68,0.3)" stroke="#dc2626" strokeWidth={1} />
              {r.name && (
                <Text x={r.cx + 3} y={r.cy + 3} text={r.name}
                  fontSize={fontSize} fill="#991b1b" />
              )}
            </Group>
          ))}

          {/* Crane max-radius arc (dashed, slew range) */}
          {deckL > 0 && maxR > 0 && (
            <Shape
              x={wx(pX)} y={wy(pY)}
              stroke="#111827" strokeWidth={1.5} dash={[6, 4]} listening={false}
              sceneFunc={(ctx, shape) => {
                const r = maxR * tf.bs
                ctx.beginPath()
                if (slewMax - slewMin >= 360) {
                  ctx.arc(0, 0, r, 0, 2 * Math.PI, false)
                } else {
                  // World CCW angle θ → canvas angle −θ (Y flipped); anticlockwise=true keeps CCW in world
                  ctx.arc(0, 0, r, -(slewMin * Math.PI / 180), -(slewMax * Math.PI / 180), true)
                }
                ctx.strokeShape(shape)
              }}
            />
          )}

          {/* Crane pedestal marker */}
          {deckL > 0 && (
            <Circle x={wx(pX)} y={wy(pY)} radius={5} fill="#111827" listening={false} />
          )}

          {/* Coordinate axes at deck origin (stern-starboard corner) */}
          {deckL > 0 && (
            <>
              <Arrow points={[wx(0), wy(0), wx(axisL), wy(0)]}
                fill="#dc2626" stroke="#dc2626" strokeWidth={1.5}
                pointerLength={6} pointerWidth={5} listening={false} />
              <Text x={wx(axisL) + 4} y={wy(0) - 7} text="X (bow)"
                fontSize={9} fill="#dc2626" listening={false} />
              <Arrow points={[wx(0), wy(0), wx(0), wy(axisW)]}
                fill="#2563eb" stroke="#2563eb" strokeWidth={1.5}
                pointerLength={6} pointerWidth={5} listening={false} />
              <Text x={wx(0) + 4} y={wy(axisW) - 14} text="Y (port)"
                fontSize={9} fill="#2563eb" listening={false} />
            </>
          )}
        </Layer>
      </Stage>
    </div>
  )
}
