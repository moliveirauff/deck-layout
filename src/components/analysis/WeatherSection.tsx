import { useEffect, useMemo, useState } from 'react'
import { Button } from '../ui/button'
import { ScatterTable } from '../weather/ScatterTable'
import { ScatterPasteDialog } from '../weather/ScatterPasteDialog'
import { OperabilityResultsTable, type OperabilityItem } from '../weather/OperabilityResultsTable'
import { OverlayView } from '../weather/OverlayView'
import { calculateOperability } from '../../lib/calculations/weather/operabilityAnalysis'
import {
  emptyMatrix,
  entriesToMatrix,
  matrixToEntries,
  totalOccurrence,
  type ScatterMatrix,
} from '../weather/scatterMatrix'
import { useWeatherStore } from '../../stores/useWeatherStore'
import { useAnalysisStore } from '../../stores/useAnalysisStore'
import type { EquipmentLibrary, ProjectEquipment } from '../../types/database'

type Props = {
  projectId: string
  analyzedItems: ProjectEquipment[]
  libById: Record<string, EquipmentLibrary>
}

/**
 * Scatter diagram input, operability results, and overlay view.
 * Rendered as the lower section of the merged Analysis page.
 */
export function WeatherSection({ projectId, analyzedItems, libById }: Props) {
  const weatherStore = useWeatherStore()
  const analysisStore = useAnalysisStore()

  const [matrix, setMatrix] = useState<ScatterMatrix>(emptyMatrix())
  const [pasteOpen, setPasteOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const [overlayPeId, setOverlayPeId] = useState('')

  // Auto-select first overlay item when analyzed items change
  useEffect(() => {
    if (!overlayPeId && analyzedItems.length > 0) setOverlayPeId(analyzedItems[0].id)
  }, [analyzedItems, overlayPeId])

  // Load scatter diagram on mount
  useEffect(() => {
    void weatherStore.loadScatterDiagram(projectId)
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Populate matrix when Supabase entries arrive
  useEffect(() => {
    setMatrix(entriesToMatrix(weatherStore.scatterEntries))
  }, [weatherStore.scatterEntries])

  // Compute operability for all analyzed equipment (pure, reactive to matrix changes)
  const operabilityItems = useMemo<OperabilityItem[]>(() => {
    return analyzedItems.map((pe) => {
      const eq = libById[pe.equipment_id]
      const result = analysisStore.results[pe.id]
      const limits = result ? (analysisStore.seaStateLimits[result.id] ?? []) : []
      const operability = calculateOperability(matrixToEntries(matrix), limits)
      return {
        id: pe.id,
        name: pe.label ?? eq?.name ?? pe.id,
        max_hs_m: result?.max_hs_m ?? 0,
        operability_pct: operability,
      }
    })
  }, [analyzedItems, analysisStore.results, analysisStore.seaStateLimits, matrix, libById])

  async function handleSave() {
    const entries = matrixToEntries(matrix)
    await weatherStore.saveScatterDiagram(projectId, entries)

    // Persist operability results for each analyzed equipment
    for (const pe of analyzedItems) {
      const result = analysisStore.results[pe.id]
      const limits = result ? (analysisStore.seaStateLimits[result.id] ?? []) : []
      if (limits.length > 0) {
        await weatherStore.calculateOperability(pe.id, limits, result?.max_hs_m ?? 0)
      }
    }
    setSaved(true)
  }

  const overlayResult = overlayPeId ? analysisStore.results[overlayPeId] : null
  const overlayLimits = overlayResult ? (analysisStore.seaStateLimits[overlayResult.id] ?? []) : []
  const overlayLabel = (() => {
    const pe = deckStore_findPe(overlayPeId, analyzedItems)
    return pe?.label ?? libById[pe?.equipment_id ?? '']?.name ?? ''
  })()

  const total = totalOccurrence(matrix)
  const totalWarn = total > 0 && (total < 98 || total > 102)

  return (
    <div className="space-y-6 border-t border-gray-200 pt-6">
      {/* ── Scatter Diagram Input ──────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Scatter Diagram Input</h2>
        <ScatterTable matrix={matrix} onChange={(m) => { setMatrix(m); setSaved(false) }} />
        {totalWarn && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
            Total occurrence is {total.toFixed(1)} % — should be ~100 % (tolerance ±2 %)
          </p>
        )}
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setPasteOpen(true)}>
            Paste from Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setMatrix(emptyMatrix()); setSaved(false) }}>
            Clear
          </Button>
          <Button size="sm" onClick={handleSave} disabled={weatherStore.isSaving}>
            {weatherStore.isSaving ? 'Saving…' : 'Save'}
          </Button>
          {saved && <span className="self-center text-xs text-green-600">Saved</span>}
        </div>
        {weatherStore.error && <p className="text-xs text-red-600">{weatherStore.error}</p>}
      </section>

      {/* ── Operability Results ──────────────────────────────── */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-700">Operability Results</h2>
        <OperabilityResultsTable items={operabilityItems} />
      </section>

      {/* ── Overlay View ─────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Scatter Diagram Overlay</h2>
        {analyzedItems.length > 0 ? (
          <>
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Equipment</label>
              <select
                value={overlayPeId}
                onChange={(e) => setOverlayPeId(e.target.value)}
                className="rounded border border-gray-300 bg-white px-3 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {analyzedItems.map((pe) => (
                  <option key={pe.id} value={pe.id}>
                    {pe.label ?? libById[pe.equipment_id]?.name ?? pe.id}
                  </option>
                ))}
              </select>
            </div>
            <OverlayView matrix={matrix} limits={overlayLimits} equipmentLabel={overlayLabel} />
          </>
        ) : (
          <div className="rounded border border-gray-200 px-4 py-6 text-center text-xs text-gray-400">
            Run DNV analysis for at least one equipment item to enable the overlay view
          </div>
        )}
      </section>

      <ScatterPasteDialog
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        onPaste={(m) => { setMatrix(m); setSaved(false) }}
      />
    </div>
  )
}

/** Local helper to find a ProjectEquipment from the analyzed list by id. */
function deckStore_findPe(peId: string, items: ProjectEquipment[]): ProjectEquipment | undefined {
  return items.find((p) => p.id === peId)
}
