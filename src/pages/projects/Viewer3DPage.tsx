import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useProjectStore } from '../../stores/useProjectStore'
import { useDeckLayoutStore } from '../../stores/useDeckLayoutStore'
import { useEquipmentStore } from '../../stores/useEquipmentStore'
import { Scene } from '../../components/viewer-3d/Scene'
import { ViewControls } from '../../components/viewer-3d/ViewControls'
import type { SceneCaptureApi } from '../../components/viewer-3d/SceneCapture'
import type { ViewMode } from '../../components/viewer-3d/EquipmentMesh'
import type { EquipmentLibrary } from '../../types/database'

type Toggles = {
  barriers: boolean
  loadZones: boolean
  grid: boolean
  water: boolean
  labels: boolean
}

export default function Viewer3DPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const activeProject = useProjectStore((s) => s.activeProject)
  const deckStore = useDeckLayoutStore()
  const equipStore = useEquipmentStore()

  const [viewMode, setViewMode] = useState<ViewMode>('both')
  const [toggles, setToggles] = useState<Toggles>({
    barriers: true,
    loadZones: true,
    grid: true,
    water: true,
    labels: true,
  })
  const [activePeId, setActivePeId] = useState('')
  const [screenshot, setScreenshot] = useState<string | null>(null)

  const captureRef = useRef<SceneCaptureApi>(null)

  // Load project equipment on mount
  useEffect(() => {
    if (!projectId) return
    void deckStore.loadProjectEquipment(projectId)
    void equipStore.loadEquipment()
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select first placed equipment item
  useEffect(() => {
    if (!activePeId && deckStore.items.length > 0) {
      setActivePeId(deckStore.items[0].id)
    }
  }, [deckStore.items, activePeId])

  const vessel = activeProject?.vessel_snapshot?.vessel ?? null
  const barriers = activeProject?.vessel_snapshot?.barriers ?? []
  const deckLoadZones = activeProject?.vessel_snapshot?.deck_load_zones ?? []

  const libById = useMemo<Record<string, EquipmentLibrary>>(() => {
    const m: Record<string, EquipmentLibrary> = {}
    equipStore.items.forEach((e) => { m[e.id] = e })
    return m
  }, [equipStore.items])

  function handleToggle(key: keyof Toggles) {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  if (!vessel) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400">
        No vessel snapshot for this project.
      </div>
    )
  }

  const cx = vessel.deck_length_m / 2
  const cz = vessel.deck_width_m / 2

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Active equipment selector */}
      {deckStore.items.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 bg-gray-50 text-xs">
          <span className="font-medium text-gray-600">Active equipment:</span>
          <select
            value={activePeId}
            onChange={(e) => setActivePeId(e.target.value)}
            className="rounded border border-gray-300 bg-white px-2 py-0.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {deckStore.items.map((pe) => {
              const eq = libById[pe.equipment_id]
              return (
                <option key={pe.id} value={pe.id}>
                  {pe.label ?? eq?.name ?? pe.id}
                </option>
              )
            })}
          </select>
          <span className="text-gray-400">(crane target + lift path)</span>
        </div>
      )}

      {/* Main area: 3D canvas + controls panel */}
      <div className="flex flex-1 overflow-hidden gap-3 p-3">
        {/* Canvas fills remaining space */}
        <div className="flex-1 overflow-hidden rounded-lg">
          <Scene
            vessel={vessel}
            barriers={barriers}
            deckLoadZones={deckLoadZones}
            placed={deckStore.items}
            libById={libById}
            activePeId={activePeId}
            viewMode={viewMode}
            toggles={toggles}
            captureRef={captureRef}
          />
        </div>

        {/* Controls sidebar */}
        <ViewControls
          viewMode={viewMode}
          onViewMode={setViewMode}
          toggles={toggles}
          onToggle={handleToggle}
          captureRef={captureRef}
          cx={cx}
          cz={cz}
          onScreenshot={setScreenshot}
        />
      </div>

      {/* Screenshot preview */}
      {screenshot && (
        <div className="border-t border-gray-200 bg-gray-50 p-3 flex items-start gap-3">
          <img
            src={screenshot}
            alt="Scene screenshot"
            className="h-28 rounded border border-gray-200 shadow-sm object-contain bg-white"
          />
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-gray-700">Screenshot captured</p>
            <a
              href={screenshot}
              download="sublift-3d.png"
              className="text-xs text-blue-600 hover:underline"
            >
              Download PNG
            </a>
            <button
              onClick={() => setScreenshot(null)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
