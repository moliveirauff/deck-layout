/**
 * CaptureLayer — off-screen hidden renders for PDF image capture.
 * Exposes captureAll() via forwardRef. Everything renders at fixed pixel dimensions
 * positioned at left: -9999px so it is in the DOM but invisible to the user.
 */

import { forwardRef, useImperativeHandle, useRef } from 'react'
import { Stage, Layer, Rect, Ellipse, Group, Text, Circle } from 'react-konva'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { SeaStateGrid } from '../analysis/SeaStateGrid'
import { OverlayView } from '../weather/OverlayView'
import { Scene } from '../viewer-3d/Scene'
import { type SceneCaptureApi } from '../viewer-3d/SceneCapture'
import { entriesToMatrix } from '../weather/scatterMatrix'
import type { ReportData, ReportSections, CapturedImages } from '../../lib/report/buildPdf'
import type { GridCell } from '../analysis/SeaStateGrid'
import type { SeaStateLimit } from '../../types/database'
import html2canvas from 'html2canvas'

export type CaptureLayerApi = {
  captureAll: () => Promise<CapturedImages>
}

type Props = {
  data: ReportData
  sections: ReportSections
}

// ── Static Konva deck for 2D capture ─────────────────────────────────────────

type KonvaStageRef = { toDataURL: (config?: Record<string, unknown>) => string } | null

function StaticDeckStage({
  data,
  stageRef,
}: {
  data: ReportData
  stageRef: React.MutableRefObject<KonvaStageRef>
}) {
  const W = 640, H = 380
  const { vessel, barriers, placed, libById } = data
  const bs = Math.min(W / vessel.deck_length_m, H / vessel.deck_width_m) * 0.85
  const ox = (W - vessel.deck_length_m * bs) / 2
  const oy = (H - vessel.deck_width_m * bs) / 2
  const wx = (x: number) => ox + x * bs
  const wy = (y: number) => oy + (vessel.deck_width_m - y) * bs

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Stage ref={(s: any) => { stageRef.current = s as KonvaStageRef }} width={W} height={H}>
      <Layer>
        <Rect x={0} y={0} width={W} height={H} fill="#dbeafe" />
        <Rect
          x={wx(0)} y={wy(vessel.deck_width_m)}
          width={vessel.deck_length_m * bs} height={vessel.deck_width_m * bs}
          fill="#d1d5db" stroke="#374151" strokeWidth={2}
        />
        {barriers.map(b => (
          <Rect key={b.id}
            x={wx(b.x_m)} y={wy(b.y_m + b.width_m)}
            width={b.length_m * bs} height={b.width_m * bs}
            fill="rgba(239,68,68,0.4)" stroke="#dc2626" strokeWidth={1}
          />
        ))}
        {placed.map(pe => {
          const eq = libById[pe.equipment_id]
          if (!eq) return null
          const lPx = eq.length_m * bs
          const wPx = eq.width_m * bs
          return (
            <Group key={pe.id} x={wx(pe.deck_pos_x)} y={wy(pe.deck_pos_y)} rotation={pe.deck_rotation_deg}>
              {eq.geometry_type === 'cylinder'
                ? <Ellipse radiusX={lPx / 2} radiusY={wPx / 2} fill="rgba(34,197,94,0.6)" stroke="#16a34a" strokeWidth={1.5} />
                : <Rect x={-lPx / 2} y={-wPx / 2} width={lPx} height={wPx} fill="rgba(34,197,94,0.6)" stroke="#16a34a" strokeWidth={1.5} />}
              <Text text={pe.label ?? eq.name} fontSize={Math.max(6, bs * 0.7)} fill="#1f2937" x={-lPx / 2 + 2} y={-wPx / 2 + 2} />
            </Group>
          )
        })}
        <Circle x={wx(vessel.crane_pedestal_x)} y={wy(vessel.crane_pedestal_y)} radius={6} fill="#111827" />
      </Layer>
    </Stage>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function limitsToGridCells(limits: SeaStateLimit[]): GridCell[] {
  return limits.map(l => ({
    hs_m: l.hs_m,
    tp_s: l.tp_s,
    is_feasible: l.is_feasible,
    utilization_pct: l.utilization_pct,
  }))
}

async function captureEl(el: HTMLElement | null): Promise<string | undefined> {
  if (!el) return undefined
  try {
    const canvas = await html2canvas(el, {
      backgroundColor: '#ffffff',
      scale: 1.5,
      logging: false,
      useCORS: true,
    })
    return canvas.toDataURL('image/png')
  } catch {
    return undefined
  }
}

// ── CaptureLayer ──────────────────────────────────────────────────────────────

export const CaptureLayer = forwardRef<CaptureLayerApi, Props>(function CaptureLayer({ data, sections }, ref) {
  const craneChartRef = useRef<HTMLDivElement>(null)
  const seaStateEls = useRef<Map<string, HTMLDivElement | null>>(new Map())
  const overlayRef = useRef<HTMLDivElement>(null)
  const deckStageRef = useRef<KonvaStageRef>(null)
  const sceneCaptureRef = useRef<SceneCaptureApi>(null)

  useImperativeHandle(ref, () => ({
    captureAll: async (): Promise<CapturedImages> => {
      const images: CapturedImages = {}

      if (sections.vesselSummary) {
        images.craneCurveChart = await captureEl(craneChartRef.current)
      }

      if (sections.seaStateTables) {
        images.seaStateGrids = {}
        for (const [peId, el] of seaStateEls.current) {
          const url = await captureEl(el)
          if (url) images.seaStateGrids[peId] = url
        }
      }

      if (sections.weatherWindow) {
        images.scatterOverlay = await captureEl(overlayRef.current)
      }

      if (sections.deckLayout && deckStageRef.current) {
        images.deckLayout = deckStageRef.current.toDataURL({ pixelRatio: 1.5 })
      }

      if (sections.view3d) {
        // Wait for sceneCaptureRef to be populated (Three.js canvas initialized)
        const start = Date.now()
        while (!sceneCaptureRef.current && Date.now() - start < 5000) {
          await new Promise(r => setTimeout(r, 100))
        }
        await new Promise(r => setTimeout(r, 500)) // allow one render cycle
        if (sceneCaptureRef.current) {
          images.view3d = sceneCaptureRef.current.capture()
        }
      }

      return images
    },
  }))

  const analyzed = data.placed.filter(pe => {
    const result = data.analysisResults[pe.id]
    return result && (data.seaStateLimits[result.id]?.length ?? 0) > 0
  })

  // First analyzed item used for scatter overlay
  const overlayPe = analyzed[0]
  const overlayResult = overlayPe ? data.analysisResults[overlayPe.id] : null
  const overlayLimits = overlayResult ? (data.seaStateLimits[overlayResult.id] ?? []) : []
  const overlayMatrix = entriesToMatrix(data.scatterEntries)
  const overlayLabel = overlayPe
    ? (overlayPe.label ?? data.libById[overlayPe.equipment_id]?.name ?? '')
    : ''

  const craneChartData = [...data.craneCurve]
    .sort((a, b) => a.radius_m - b.radius_m)
    .map(p => ({ radius: p.radius_m, capacity: p.capacity_t }))

  const HIDE: React.CSSProperties = {
    position: 'fixed',
    left: '-9999px',
    top: '0px',
    background: '#fff',
    pointerEvents: 'none',
    zIndex: -1,
  }

  return (
    <>
      {/* Crane curve chart (Recharts → html2canvas) */}
      {sections.vesselSummary && craneChartData.length > 0 && (
        <div ref={craneChartRef} style={{ ...HIDE, width: '600px', padding: '16px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: '#1e3a8a' }}>
            Crane Capacity Curve
          </p>
          <LineChart width={555} height={270} data={craneChartData} margin={{ top: 5, right: 20, bottom: 30, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="radius" label={{ value: 'Radius (m)', position: 'insideBottom', offset: -15 }} />
            <YAxis label={{ value: 'Capacity (t)', angle: -90, position: 'insideLeft', offset: 10 }} />
            <Tooltip />
            <Legend verticalAlign="top" />
            <Line type="monotone" dataKey="capacity" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </div>
      )}

      {/* Sea state grids */}
      {sections.seaStateTables && analyzed.map(pe => {
        const result = data.analysisResults[pe.id]
        const cells = limitsToGridCells(data.seaStateLimits[result.id] ?? [])
        return (
          <div
            key={pe.id}
            ref={el => seaStateEls.current.set(pe.id, el)}
            style={{ ...HIDE, width: '900px', padding: '12px' }}
          >
            <SeaStateGrid cells={cells} />
          </div>
        )
      })}

      {/* Scatter overlay */}
      {sections.weatherWindow && overlayLimits.length > 0 && (
        <div ref={overlayRef} style={{ ...HIDE, width: '720px', padding: '12px' }}>
          <OverlayView matrix={overlayMatrix} limits={overlayLimits} equipmentLabel={overlayLabel} />
        </div>
      )}

      {/* Static Konva stage for 2D deck layout */}
      {sections.deckLayout && (
        <div style={{ ...HIDE, width: '640px', height: '380px' }}>
          <StaticDeckStage data={data} stageRef={deckStageRef} />
        </div>
      )}

      {/* Hidden 3D scene for screenshot */}
      {sections.view3d && (
        <div style={{ ...HIDE, width: '640px', height: '380px' }}>
          <Scene
            vessel={data.vessel}
            barriers={data.barriers}
            deckLoadZones={data.deckLoadZones}
            placed={data.placed}
            libById={data.libById}
            activePeId={data.placed[0]?.id ?? ''}
            viewMode="both"
            toggles={{ barriers: true, loadZones: true, grid: true, water: true, labels: false }}
            captureRef={sceneCaptureRef}
          />
        </div>
      )}
    </>
  )
})
