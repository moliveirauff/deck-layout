import { forwardRef, useImperativeHandle, useMemo } from 'react'
import { Stage, Layer, Rect, Ellipse, Circle, Line, Arrow, Text, Shape, Group, Path, Arc } from 'react-konva'
import { useDeckTransform } from '../../hooks/useDeckTransform'
import type { VesselBarrier, DeckLoadZone, CraneCurvePoint, Vessel, ProjectEquipment, EquipmentLibrary } from '../../types/database'
import type { ValidationResult } from '../../lib/calculations/deckValidation'
import type { CraneToggle } from '../../stores/useCraneStore'
import type { CraneInfo } from '../../hooks/useDeckLayout'

export type DeckCanvasHandle = { zoomIn: () => void; zoomOut: () => void; fit: () => void }


type Props = {
  vessel: Vessel | null
  barriers: VesselBarrier[]; zones: DeckLoadZone[]
  craneCurve: CraneCurvePoint[]; placed: ProjectEquipment[]
  libById: Record<string, EquipmentLibrary>; validationMap: Record<string, ValidationResult>
  selectedId: string | null; showGrid: boolean
  craneToggle: CraneToggle | 'both'
  craneDeckInfo: CraneInfo | null
  craneOverboardInfo: CraneInfo | null
  onDrop: (equipId: string, wx: number, wy: number) => void
  onMove: (id: string, wx: number, wy: number) => void
  onOverboardMove: (id: string, wx: number, wy: number) => void
  onSelect: (id: string | null) => void
}

export const DeckCanvas = forwardRef<DeckCanvasHandle, Props>(function DeckCanvas(props, ref) {
  const {
    vessel, barriers, zones, craneCurve, placed, libById, validationMap,
    selectedId, showGrid, craneToggle, craneDeckInfo, craneOverboardInfo,
    onDrop, onMove, onOverboardMove, onSelect,
  } = props
  const deckL = vessel?.deck_length_m ?? 0
  const deckW = vessel?.deck_width_m ?? 0
  const { containerRef, stageRef, size, tf, handleWheel } = useDeckTransform(deckL, deckW)

  useImperativeHandle(ref, () => ({
    zoomIn() {
      const stage = stageRef.current; if (!stage) return
      const s = stage.scaleX(); const cx = size.w / 2; const cy = size.h / 2
      const ns = Math.min(20, s * 1.25)
      const ox = (stage.x() - cx) * (ns / s) + cx; const oy = (stage.y() - cy) * (ns / s) + cy
      stage.scale({ x: ns, y: ns }); stage.position({ x: ox, y: oy })
    },
    zoomOut() {
      const stage = stageRef.current; if (!stage) return
      const s = stage.scaleX(); const cx = size.w / 2; const cy = size.h / 2
      const ns = Math.max(0.1, s / 1.25)
      const ox = (stage.x() - cx) * (ns / s) + cx; const oy = (stage.y() - cy) * (ns / s) + cy
      stage.scale({ x: ns, y: ns }); stage.position({ x: ox, y: oy })
    },
    fit() { const stage = stageRef.current; if (!stage) return; stage.scale({ x: 1, y: 1 }); stage.position({ x: 0, y: 0 }) },
  }))

  const { ox, oy, bs } = tf
  const wx = (x: number) => ox + x * bs
  const wy = (y: number) => oy + (deckW - y) * bs
  const fz = Math.max(7, Math.min(11, bs * 0.9))

  const gridLines = useMemo(() => {
    if (!showGrid || deckL <= 0) return []
    const lines: number[][] = []
    for (let x = 0; x <= deckL; x += 5) lines.push([wx(x), wy(0), wx(x), wy(deckW)])
    for (let y = 0; y <= deckW; y += 5) lines.push([wx(0), wy(y), wx(deckL), wy(y)])
    return lines
  }, [showGrid, deckL, deckW, tf]) // eslint-disable-line react-hooks/exhaustive-deps

  const maxR = useMemo(() => {
    const rs = craneCurve.map((p) => p.radius_m).filter((r) => r > 0)
    return rs.length ? Math.max(...rs) : 0
  }, [craneCurve])

  /** Capacity at maximum radius (lowest capacity point) */
  const capacityAtMaxR = useMemo(() => {
    if (!craneCurve.length || maxR === 0) return null
    return craneCurve.find((p) => p.radius_m === maxR)?.capacity_t ?? null
  }, [craneCurve, maxR])

  const pX = vessel?.crane_pedestal_x ?? 0
  const pY = vessel?.crane_pedestal_y ?? 0
  const sMin = vessel?.crane_slew_min_deg ?? 0
  const sMax = vessel?.crane_slew_max_deg ?? 360
  const minR = vessel?.crane_min_radius_m ?? 0

  const selectedItem = placed.find((p) => p.id === selectedId)
  const showOverboard = craneToggle === 'overboard' || craneToggle === 'both'
  // Active crane info for boom line rendering
  const activeCraneInfo = craneToggle === 'overboard' ? craneOverboardInfo : craneDeckInfo
  const activeTargetX = craneToggle === 'overboard'
    ? (selectedItem?.overboard_pos_x ?? selectedItem?.deck_pos_x ?? 0)
    : (selectedItem?.deck_pos_x ?? 0)
  const activeTargetY = craneToggle === 'overboard'
    ? (selectedItem?.overboard_pos_y ?? selectedItem?.deck_pos_y ?? 0)
    : (selectedItem?.deck_pos_y ?? 0)

  function handleCanvasDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const equipId = e.dataTransfer.getData('text/plain')
    if (!equipId) return
    const stage = stageRef.current; if (!stage) return
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const px = e.clientX - rect.left; const py = e.clientY - rect.top
    const sx = (px - stage.x()) / stage.scaleX()
    const sy = (py - stage.y()) / stage.scaleY()
    onDrop(equipId, (sx - ox) / bs, deckW - (sy - oy) / bs)
  }

  // SVG path string for realistic hull
  const hullPathData = useMemo(() => {
    if (deckL <= 0 || deckW <= 0) return ''
    const straightEnd = deckL * 0.8
    return `M ${wx(0)} ${wy(0)} L ${wx(0)} ${wy(deckW)} L ${wx(straightEnd)} ${wy(deckW)} L ${wx(deckL)} ${wy(deckW / 2)} L ${wx(straightEnd)} ${wy(0)} Z`
  }, [deckL, deckW, wx, wy])

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden bg-blue-300" onDragOver={(e) => e.preventDefault()} onDrop={handleCanvasDrop}>
      <Stage ref={stageRef} width={size.w} height={size.h} draggable onWheel={handleWheel}
        onClick={(e) => { if (e.target === e.target.getStage()) onSelect(null) }}>
        <Layer>
          {/* Ocean Background - infinite blue */}
          <Rect
            x={-5000} y={-5000}
            width={10000} height={10000}
            fill="#93c5fd" listening={false}
          />

          {/* Grid */}
          {gridLines.map((pts, i) => <Line key={i} points={pts} stroke="#e5e7eb" strokeWidth={0.5} listening={false} />)}

          {/* Realistic Hull */}
          {deckL > 0 && <Path data={hullPathData} fill="#e2e8f0" stroke="#374151" strokeWidth={2} listening={false} shadowColor="black" shadowBlur={15} shadowOpacity={0.2} shadowOffset={{x: 0, y: 5}} />}

          {/* Load zones */}
          {zones.map((z) => <Group key={z.id} listening={false}>
            <Rect x={wx(z.x_m)} y={wy(z.y_m + z.width_m)} width={z.length_m * bs} height={z.width_m * bs} fill="rgba(59,130,246,0.18)" stroke="#3b82f6" strokeWidth={1} />
            <Text x={wx(z.x_m) + 3} y={wy(z.y_m + z.width_m) + 3} text={`${z.capacity_t_per_m2} t/m²`} fontSize={fz} fill="#1d4ed8" />
          </Group>)}

          {/* Barriers */}
          {barriers.map((b) => <Group key={b.id} listening={false}>
            <Rect x={wx(b.x_m)} y={wy(b.y_m + b.width_m)} width={b.length_m * bs} height={b.width_m * bs} fill="rgba(239,68,68,0.4)" stroke="#b91c1c" strokeWidth={1.5} dash={[4, 4]} />
            <Text x={wx(b.x_m) + 3} y={wy(b.y_m + b.width_m) + 3} text={b.name} fontSize={fz} fill="#991b1b" />
          </Group>)}

          {/* Placed equipment */}
          {placed.map((pe) => {
            const eq = libById[pe.equipment_id]; if (!eq) return null
            const lPx = eq.length_m * bs; const wPx = eq.width_m * bs
            const cx = wx(pe.deck_pos_x); const cy = wy(pe.deck_pos_y)
            const vr = validationMap[pe.id]
            const bad = vr?.ok === false
            const sel = pe.id === selectedId
            const isGhosted = sel && showOverboard
            const opacity = isGhosted ? 0.2 : 1
            const fill = bad ? 'rgba(239,68,68,0.55)' : 'rgba(34,197,94,0.55)'
            const stroke = sel ? '#2563eb' : bad ? '#dc2626' : '#16a34a'
            const sw = sel ? 2.5 : 1.5
            const capacityOk = pe.id === selectedId ? activeCraneInfo?.ok ?? true : true
            const isEqOk = vr?.ok !== false && capacityOk

            return (
              <Group key={pe.id} x={cx} y={cy} rotation={pe.deck_rotation_deg} draggable opacity={opacity}
                onClick={() => onSelect(pe.id)}
                onDragEnd={(e) => { onMove(pe.id, (e.target.x() - ox) / bs, deckW - (e.target.y() - oy) / bs) }}>
                {eq.geometry_type === 'cylinder'
                  ? <Ellipse radiusX={lPx / 2} radiusY={wPx / 2} fill={fill} stroke={stroke} strokeWidth={sw} shadowColor="black" shadowBlur={5} shadowOpacity={0.3} shadowOffset={{x: 2, y: 2}} />
                  : <Rect x={-lPx / 2} y={-wPx / 2} width={lPx} height={wPx} fill={fill} stroke={stroke} strokeWidth={sw} shadowColor="black" shadowBlur={5} shadowOpacity={0.3} shadowOffset={{x: 2, y: 2}} />}
                
                {/* 2-line Label */}
                <Text text={`${pe.label ?? eq.name}\n${eq.dry_weight_t} t`} fontSize={Math.max(6, Math.min(10, bs * 0.75))} fill="#1f2937" x={-lPx / 2} y={-wPx / 2 + 2} align="center" width={lPx} />
                
                {/* Status icon at top-right corner */}
                <Circle x={lPx / 2} y={-wPx / 2} radius={Math.max(3, bs * 0.2)} fill={isEqOk ? '#22c55e' : '#ef4444'} stroke="white" strokeWidth={1} />
                {bad && <Text text="⚠" fontSize={12} fill="#dc2626" x={-6} y={-6} />}
              </Group>
            )
          })}

          {/* Overboard ghost for selected item */}
          {selectedItem && showOverboard && (() => {
            const eq = libById[selectedItem.equipment_id]; if (!eq) return null
            const obX = selectedItem.overboard_pos_x
            const obY = selectedItem.overboard_pos_y
            const lPx = eq.length_m * bs; const wPx = eq.width_m * bs
            const gx = obX != null ? wx(obX) : wx(pX)
            const gy = obY != null ? wy(obY) : wy(-5)
            const obOk = craneOverboardInfo?.ok !== false
            const fill = obOk ? 'rgba(34,197,94,0.55)' : 'rgba(239,68,68,0.55)'
            const stroke = obOk ? '#16a34a' : '#dc2626'
            return (
              <Group x={gx} y={gy} draggable
                onDragEnd={(e) => {
                  onOverboardMove(selectedItem.id, (e.target.x() - ox) / bs, deckW - (e.target.y() - oy) / bs)
                }}>
                {eq.geometry_type === 'cylinder'
                  ? <Ellipse radiusX={lPx / 2} radiusY={wPx / 2} fill={fill} stroke={stroke} strokeWidth={2} dash={[6, 3]} />
                  : <Rect x={-lPx / 2} y={-wPx / 2} width={lPx} height={wPx} fill={fill} stroke={stroke} strokeWidth={2} dash={[6, 3]} />}
                <Text text={`OB: ${eq.name}`} fontSize={Math.max(6, Math.min(10, bs * 0.75))} fill="#1f2937" x={-lPx / 2 + 2} y={-wPx / 2 + 2} />
              </Group>
            )
          })()}

          {/* Crane boom line from pedestal to active target */}
          {selectedId && activeCraneInfo && (
            <Group listening={false}>
              {(() => {
                let arcColor = '#16a34a'
                if (activeCraneInfo.utilizationPct > 90) arcColor = '#dc2626'
                else if (activeCraneInfo.utilizationPct > 70) arcColor = '#f97316'
                
                return (
                  <>
                    <Line
                      points={[wx(pX), wy(pY), wx(activeTargetX), wy(activeTargetY)]}
                      stroke={activeCraneInfo.ok ? arcColor : '#dc2626'}
                      strokeWidth={2}
                    />
                    <Text
                      x={(wx(pX) + wx(activeTargetX)) / 2 + 4}
                      y={(wy(pY) + wy(activeTargetY)) / 2 - 12}
                      text={`R = ${activeCraneInfo.radiusM.toFixed(1)}m`}
                      fontSize={fz}
                      fill="#374151"
                    />
                    {/* Active radius arc */}
                    <Shape
                      x={wx(pX)} y={wy(pY)}
                      stroke={arcColor}
                      strokeWidth={3}
                      dash={[10, 6]}
                      sceneFunc={(ctx, shape) => {
                        const r = activeCraneInfo.radiusM * bs
                        ctx.beginPath()
                        ctx.arc(0, 0, r, 0, 2 * Math.PI, false)
                        ctx.strokeShape(shape)
                      }}
                    />
                    {/* Capacity label at right of arc */}
                    <Text
                      x={wx(pX) + activeCraneInfo.radiusM * bs + 5}
                      y={wy(pY) - 8}
                      text={`${activeCraneInfo.capacityT.toFixed(0)} t`}
                      fontSize={fz + 1}
                      fontStyle="bold"
                      fill="#f97316"
                    />
                    {/* Capacity label at top of arc */}
                    <Text
                      x={wx(pX) - 14}
                      y={wy(pY) - activeCraneInfo.radiusM * bs - 16}
                      text={`${activeCraneInfo.radiusM.toFixed(0)} m`}
                      fontSize={fz}
                      fill="#f97316"
                    />
                  </>
                )
              })()}
            </Group>
          )}

          {/* "Both" mode: dashed path between deck and overboard positions */}
          {craneToggle === 'both' && selectedItem && selectedItem.overboard_pos_x != null && selectedItem.overboard_pos_y != null && (
            <Line
              points={[wx(selectedItem.deck_pos_x), wy(selectedItem.deck_pos_y), wx(selectedItem.overboard_pos_x), wy(selectedItem.overboard_pos_y)]}
              stroke="#6366f1"
              strokeWidth={1.5}
              dash={[8, 4]}
              listening={false}
            />
          )}

          {/* Crane pedestal and envelope */}
          {deckL > 0 && <>
            {/* Slew Forbidden Zones */}
            {(sMax - sMin < 360 && maxR > 0) && (
              <Arc
                x={wx(pX)} y={wy(pY)}
                innerRadius={minR > 0 ? minR * bs : 0}
                outerRadius={maxR * bs}
                rotation={-sMax}
                angle={360 - (sMax - sMin)}
                fill="rgba(239,68,68,0.15)"
                stroke="rgba(239,68,68,0.3)"
                strokeWidth={1}
                listening={false}
              />
            )}

            {/* Min radius arc */}
            {minR > 0 && (
              <Shape x={wx(pX)} y={wy(pY)} stroke="#dc2626" strokeWidth={1.5} dash={[5, 5]} listening={false}
                sceneFunc={(ctx, shape) => {
                  const r = minR * bs; ctx.beginPath()
                  if (sMax - sMin >= 360) ctx.arc(0, 0, r, 0, 2 * Math.PI, false)
                  else ctx.arc(0, 0, r, -(sMin * Math.PI / 180), -(sMax * Math.PI / 180), true)
                  ctx.strokeShape(shape)
                }} />
            )}

            {/* Max radius slew envelope — thick bright orange dashed */}
            {maxR > 0 && <>
              <Shape x={wx(pX)} y={wy(pY)} stroke="#f97316" strokeWidth={3} dash={[10, 6]} listening={false}
                sceneFunc={(ctx, shape) => {
                  const r = maxR * bs; ctx.beginPath()
                  if (sMax - sMin >= 360) ctx.arc(0, 0, r, 0, 2 * Math.PI, false)
                  else ctx.arc(0, 0, r, -(sMin * Math.PI / 180), -(sMax * Math.PI / 180), true)
                  ctx.strokeShape(shape)
                }} />
              {/* Capacity label at right of max-radius arc */}
              {capacityAtMaxR != null && (
                <Text
                  x={wx(pX) + maxR * bs + 5}
                  y={wy(pY) - 8}
                  text={`${maxR.toFixed(0)} m · ${capacityAtMaxR} t`}
                  fontSize={fz}
                  fill="#ea580c"
                  listening={false}
                />
              )}
            </>}
            <Circle x={wx(pX)} y={wy(pY)} radius={6} fill="#111827" listening={false} />
            {/* Axes */}
            <Arrow points={[wx(0), wy(0), wx(Math.min(10, deckL * 0.15)), wy(0)]} fill="#dc2626" stroke="#dc2626" strokeWidth={1.5} pointerLength={6} pointerWidth={5} listening={false} />
            <Text x={wx(Math.min(10, deckL * 0.15)) + 4} y={wy(0) - 7} text="X" fontSize={9} fill="#dc2626" listening={false} />
            <Arrow points={[wx(0), wy(0), wx(0), wy(Math.min(8, deckW * 0.2))]} fill="#2563eb" stroke="#2563eb" strokeWidth={1.5} pointerLength={6} pointerWidth={5} listening={false} />
            <Text x={wx(0) + 4} y={wy(Math.min(8, deckW * 0.2)) - 12} text="Y" fontSize={9} fill="#2563eb" listening={false} />
          </>}
        </Layer>
      </Stage>
    </div>
  )
})
