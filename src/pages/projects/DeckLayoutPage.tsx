import { useMemo, useRef } from 'react'
import { useDeckLayout } from '../../hooks/useDeckLayout'
import { DeckCanvas, type DeckCanvasHandle } from '../../components/deck-layout/DeckCanvas'
import { EquipmentPanel } from '../../components/deck-layout/EquipmentPanel'
import { CranePanel } from '../../components/deck-layout/CranePanel'
import { Skeleton } from '../../components/ui/skeleton'

function ToolbarBtn({ onClick, label, active }: { onClick: () => void; label: string; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`rounded px-3 py-1 text-xs font-medium transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
    >
      {label}
    </button>
  )
}

export default function DeckLayoutPage() {
  const canvasRef = useRef<DeckCanvasHandle>(null)
  const {
    vessel, barriers, zones, craneCurve, placed, library, libById, validationMap,
    selectedId, setSelectedId, showGrid, setShowGrid, snap, setSnap,
    craneToggle, setCraneToggle,
    craneDeckInfo, craneOverboardInfo,
    selectedItem, selectedEq,
    handleDrop, handleMove, handleOverboardMove, handleRotate, handleRemove, isLoading,
  } = useDeckLayout()

  /** Max crane capacity = capacity at minimum radius point */
  const maxCapacity = useMemo(() => {
    if (!craneCurve.length) return null
    return [...craneCurve].sort((a, b) => a.radius_m - b.radius_m)[0].capacity_t
  }, [craneCurve])

  /** Active crane info depending on toggle */
  const activeCraneInfo = craneToggle === 'overboard' ? craneOverboardInfo : craneDeckInfo

  if (isLoading) {
    return (
      <div className="flex h-full overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-4 py-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-7 w-20" />)}
          </div>
          <Skeleton className="flex-1 m-4 rounded" />
        </div>
        <div className="w-[300px] shrink-0 border-l border-gray-200 bg-white p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      </div>
    )
  }

  if (!vessel) {
    return <div className="flex h-full items-center justify-center text-sm text-gray-400">No vessel snapshot for this project.</div>
  }

  const craneTypeLabel = vessel.crane_type === 'knuckle_boom' ? 'Knuckle Boom' : 'OMC'

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Canvas area + right panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas column */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Canvas wrapper — relative so info overlay can be positioned inside */}
          <div className="relative flex-1 overflow-hidden">
            <DeckCanvas
              ref={canvasRef}
              vessel={vessel}
              barriers={barriers}
              zones={zones}
              craneCurve={craneCurve}
              placed={placed}
              libById={libById}
              validationMap={validationMap}
              selectedId={selectedId}
              showGrid={showGrid}
              craneToggle={craneToggle}
              craneDeckInfo={craneDeckInfo}
              craneOverboardInfo={craneOverboardInfo}
              onDrop={handleDrop}
              onMove={handleMove}
              onOverboardMove={handleOverboardMove}
              onSelect={(id) => setSelectedId(id)}
            />

            {/* Crane info overlay — top-left corner */}
            <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-gray-200 bg-white/90 px-3 py-2 shadow-sm backdrop-blur-sm">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Crane</p>
              <p className="text-xs text-gray-700"><span className="text-gray-500">Type:</span> {craneTypeLabel}</p>
              {maxCapacity != null && (
                <p className="text-xs text-gray-700"><span className="text-gray-500">Max cap:</span> {maxCapacity} t</p>
              )}
              {activeCraneInfo && (
                <p className="mt-0.5 text-xs font-semibold text-orange-600">
                  R = {activeCraneInfo.radiusM.toFixed(1)} m · {activeCraneInfo.capacityT.toFixed(0)} t
                </p>
              )}
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex shrink-0 items-center gap-2 border-t border-gray-200 bg-white px-4 py-2">
            <ToolbarBtn label="Zoom +" onClick={() => canvasRef.current?.zoomIn()} />
            <ToolbarBtn label="Zoom −" onClick={() => canvasRef.current?.zoomOut()} />
            <ToolbarBtn label="Fit" onClick={() => canvasRef.current?.fit()} />
            <span className="mx-1 h-4 w-px bg-gray-200" />
            <ToolbarBtn label={showGrid ? 'Grid On' : 'Grid Off'} onClick={() => setShowGrid(!showGrid)} active={showGrid} />
            <ToolbarBtn label={snap ? 'Snap On' : 'Snap Off'} onClick={() => setSnap(!snap)} active={snap} />
            <span className="ml-auto text-xs text-gray-400">
              {placed.length} item{placed.length !== 1 ? 's' : ''} on deck
              {snap && ' · snap 0.5 m'}
            </span>
          </div>
        </div>

        {/* Right panel — 300px */}
        <aside className="w-[300px] shrink-0 overflow-y-auto border-l border-gray-200 bg-white">
          <EquipmentPanel
            library={library}
            placed={placed}
            libById={libById}
            validationMap={validationMap}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRemove={handleRemove}
            onRotate={handleRotate}
          />

          {/* Crane interaction panel — shown when an item is selected */}
          {selectedItem && selectedEq && (
            <div className="border-t border-gray-200">
              <CranePanel
                item={selectedItem}
                equipment={selectedEq}
                toggle={craneToggle}
                onToggle={setCraneToggle}
                deckInfo={craneDeckInfo}
                overboardInfo={craneOverboardInfo}
                onOverboardChange={handleOverboardMove}
              />
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
