import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowDown, Play, CheckCircle, AlertTriangle, Droplets, Waves, Anchor } from 'lucide-react'
import { useProjectStore } from '../../stores/useProjectStore'
import { useDeckLayoutStore } from '../../stores/useDeckLayoutStore'
import { useEquipmentStore } from '../../stores/useEquipmentStore'
import { useLoweringStore } from '../../stores/useLoweringStore'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/skeleton'
import { buoyancyTonnes, calculateCurrentDrag, calculateResidualTension } from '../../lib/calculations/lowering'
import { dragCoefficient } from '../../lib/calculations/hydro/dragCoefficient'
import { projectedAreas, submergedVolume } from '../../lib/calculations/hydro/projectedAreas'
import type { LoweringResultInsert } from '../../types/database'

function fmt(n: number | null | undefined, dec = 2): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toFixed(dec)
}

export default function LoweringPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const activeProject = useProjectStore((s) => s.activeProject)
  const deckStore = useDeckLayoutStore()
  const equipStore = useEquipmentStore()
  const loweringStore = useLoweringStore()

  const [selectedPeId, setSelectedPeId] = useState<string>('')
  const [isRunning, setIsRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)

  // ── Load data ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return
    void deckStore.loadProjectEquipment(projectId)
    void equipStore.loadEquipment()
    void loweringStore.loadCurrentProfile(projectId)
    void loweringStore.loadAll(projectId)
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select first item
  useEffect(() => {
    if (!selectedPeId && deckStore.items.length > 0) {
      setSelectedPeId(deckStore.items[0].id)
    }
  }, [deckStore.items, selectedPeId])

  // ── Derived ──────────────────────────────────────────────────────────────
  const libById = useMemo(() => {
    const m: Record<string, typeof equipStore.items[0]> = {}
    equipStore.items.forEach((e) => { m[e.id] = e })
    return m
  }, [equipStore.items])

  const selectedPe = deckStore.items.find((pe) => pe.id === selectedPeId) ?? null
  const selectedEq = selectedPe ? libById[selectedPe.equipment_id] : null

  // Use current profile from store or fall back to default 0.5 m/s
  const currentProfile = useMemo(() => {
    if (loweringStore.currentProfile.length > 0) {
      return loweringStore.currentProfile.map((e) => ({
        depth_m: e.depth_m,
        current_speed_ms: e.current_speed_ms,
      }))
    }
    // Default fallback: uniform 0.5 m/s
    return [
      { depth_m: 0, current_speed_ms: 0.5 },
      { depth_m: 100, current_speed_ms: 0.5 },
      { depth_m: 500, current_speed_ms: 0.3 },
      { depth_m: 1000, current_speed_ms: 0.2 },
      { depth_m: activeProject?.water_depth_m ?? 2000, current_speed_ms: 0.1 },
    ]
  }, [loweringStore.currentProfile, activeProject])

  const savedResult = selectedPeId ? loweringStore.results[selectedPeId] : null

  // ── Run analysis ─────────────────────────────────────────────────────────
  async function handleRun() {
    if (!selectedPe || !selectedEq) return
    setIsRunning(true)
    setRunError(null)
    try {
      const hookLoad = selectedPe.hook_load_t ?? selectedEq.dry_weight_t * 1.1

      const vol = selectedEq.submerged_volume_m3 ??
        submergedVolume(selectedEq.geometry_type, selectedEq.length_m, selectedEq.width_m, selectedEq.height_m)

      const buoyancy_t = buoyancyTonnes(vol)

      const cd = dragCoefficient(selectedEq.geometry_type, {
        length_m: selectedEq.length_m,
        width_m: selectedEq.width_m,
        height_m: selectedEq.height_m,
      })
      const areas = projectedAreas(
        selectedEq.geometry_type,
        selectedEq.length_m,
        selectedEq.width_m,
        selectedEq.height_m,
      )

      const dragResult = calculateCurrentDrag({
        currentProfile,
        cd_x: cd.cd_x,
        projected_area_x_m2: areas.area_x_m2,
      })

      const tension = calculateResidualTension({
        hook_load_t: hookLoad,
        buoyancy_t,
        max_current_drag_kn: dragResult.max_drag_kn,
      })

      const insert: LoweringResultInsert = {
        project_equipment_id: selectedPe.id,
        hook_load_submerged_t: tension.hook_load_submerged_t,
        buoyancy_force_kn: buoyancy_t * 9.81,
        max_current_drag_kn: dragResult.max_drag_kn,
        max_current_depth_m: dragResult.max_drag_depth_m,
        residual_hook_tension_t: tension.residual_tension_t,
        residual_ok: tension.residual_ok,
        landing_load_t: tension.hook_load_submerged_t,
        calculated_at: new Date().toISOString(),
      }

      await loweringStore.saveResults([insert])
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsRunning(false)
    }
  }

  const isLoading = deckStore.isLoading || equipStore.isLoading || loweringStore.isLoading

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="overflow-auto">
      <div className="mx-auto max-w-[1200px] px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Lowering Analysis</h1>
            <p className="mt-1 text-sm text-gray-500">
              DNV hook load, buoyancy, current drag and residual tension during overboarding.
            </p>
          </div>
        </div>

        {/* Equipment selector + Run button */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Equipment</label>
          {isLoading ? (
            <Skeleton className="h-9 w-64" />
          ) : (
            <select
              value={selectedPeId}
              onChange={(e) => setSelectedPeId(e.target.value)}
              className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {deckStore.items.length === 0 && (
                <option value="">No equipment in project</option>
              )}
              {deckStore.items.map((pe) => {
                const eq = libById[pe.equipment_id]
                return (
                  <option key={pe.id} value={pe.id}>
                    {pe.label ?? eq?.name ?? pe.id}
                  </option>
                )
              })}
            </select>
          )}
          <Button
            size="sm"
            onClick={handleRun}
            disabled={!selectedPe || !selectedEq || isRunning}
            className="gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            {isRunning ? 'Running…' : 'Run Lowering Analysis'}
          </Button>
        </div>

        {/* Error */}
        {runError && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {runError}
          </p>
        )}
        {loweringStore.error && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {loweringStore.error}
          </p>
        )}

        {/* Inputs summary */}
        {selectedEq && selectedPe && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
            <h2 className="text-sm font-semibold text-gray-700">Input Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <Stat label="Dry Weight" value={`${fmt(selectedEq.dry_weight_t, 1)} t`} />
              <Stat label="Hook Load" value={`${fmt(selectedPe.hook_load_t ?? selectedEq.dry_weight_t * 1.1, 1)} t`} />
              <Stat label="Volume" value={`${fmt(selectedEq.submerged_volume_m3 ?? submergedVolume(selectedEq.geometry_type, selectedEq.length_m, selectedEq.width_m, selectedEq.height_m), 2)} m³`} />
              <Stat label="Current Profile" value={loweringStore.currentProfile.length > 0 ? `${loweringStore.currentProfile.length} pts (DB)` : 'Default (0.5 m/s)'} />
            </div>
          </div>
        )}

        {/* Results */}
        {savedResult ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-700">Results</h2>
              <span className="text-xs text-gray-400">
                {new Date(savedResult.calculated_at).toLocaleString()}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ResultCard
                icon={<Anchor className="h-5 w-5 text-blue-500" />}
                label="Hook Load (Submerged)"
                value={`${fmt(savedResult.hook_load_submerged_t, 2)} t`}
                sub="In-water hook load"
              />
              <ResultCard
                icon={<Droplets className="h-5 w-5 text-cyan-500" />}
                label="Buoyancy Force"
                value={`${fmt(savedResult.buoyancy_force_kn, 1)} kN`}
                sub={`≈ ${fmt(savedResult.buoyancy_force_kn / 9.81, 1)} t`}
              />
              <ResultCard
                icon={<Waves className="h-5 w-5 text-orange-400" />}
                label="Max Current Drag"
                value={`${fmt(savedResult.max_current_drag_kn, 1)} kN`}
                sub={savedResult.max_current_depth_m != null ? `at ${savedResult.max_current_depth_m} m depth` : ''}
              />
              <ResultCard
                icon={
                  savedResult.residual_ok
                    ? <CheckCircle className="h-5 w-5 text-green-500" />
                    : <AlertTriangle className="h-5 w-5 text-red-500" />
                }
                label="Residual Tension"
                value={`${fmt(savedResult.residual_hook_tension_t, 2)} t`}
                sub={savedResult.residual_ok ? 'Cable taut — OK' : 'Risk of slack wire — NOK'}
                highlight={savedResult.residual_ok ? 'green' : 'red'}
              />
            </div>

            {!savedResult.residual_ok && (
              <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                ⚠️ Negative residual tension — risk of slack wire. Equipment may be buoyant or current drag too high.
                Consider adding ballast, flooding the structure, or reviewing the current profile.
              </div>
            )}
          </div>
        ) : selectedPe && !isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
            <ArrowDown className="h-10 w-10 opacity-30" />
            <p className="text-sm">No analysis yet — click <strong>Run Lowering Analysis</strong> to calculate.</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-gray-900">{value}</p>
    </div>
  )
}

function ResultCard({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  highlight?: 'green' | 'red'
}) {
  const border = highlight === 'green' ? 'border-green-200 bg-green-50' : highlight === 'red' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'
  return (
    <div className={`rounded-lg border p-4 space-y-2 ${border}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium text-gray-600">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  )
}
