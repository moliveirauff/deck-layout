import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useProjectStore } from '../../stores/useProjectStore'
import { useDeckLayoutStore } from '../../stores/useDeckLayoutStore'
import { useEquipmentStore } from '../../stores/useEquipmentStore'
import { useRaoStore } from '../../stores/useRaoStore'
import { useAnalysisStore } from '../../stores/useAnalysisStore'
import { Button } from '../../components/ui/button'
import { InputSummary } from '../../components/analysis/InputSummary'
import { HydroCard } from '../../components/analysis/HydroCard'
import { ResultsCard } from '../../components/analysis/ResultsCard'
import { SeaStateGrid, type GridCell } from '../../components/analysis/SeaStateGrid'
import { WeatherSection } from '../../components/analysis/WeatherSection'
import { useAnalysisRunner } from '../../components/analysis/useAnalysisRunner'
import { dragCoefficient } from '../../lib/calculations/hydro/dragCoefficient'
import { addedMassCoefficient } from '../../lib/calculations/hydro/addedMassCoefficient'
import { slammingCoefficient } from '../../lib/calculations/hydro/slammingCoefficient'
import { projectedAreas, submergedVolume } from '../../lib/calculations/hydro/projectedAreas'
import { calculateCraneTipMotion, craneTipPosition } from '../../lib/calculations/motion/craneTipMotion'
import type { EquipmentLibrary, ProjectEquipment, SeaStateLimitInsert, SplashZoneResultInsert } from '../../types/database'
import type { SeaStateCellResult } from '../../lib/calculations/dnv/generateSeaStateGrid'

export default function AnalysisPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const activeProject = useProjectStore((s) => s.activeProject)
  const deckStore = useDeckLayoutStore()
  const equipStore = useEquipmentStore()
  const raoStore = useRaoStore()
  const analysisStore = useAnalysisStore()
  const runner = useAnalysisRunner()

  const [selectedPeId, setSelectedPeId] = useState<string>('')
  const [localCells, setLocalCells] = useState<SeaStateCellResult[]>([])
  const [runAllProgress, setRunAllProgress] = useState<{ done: number; total: number } | null>(null)

  const vessel = activeProject?.vessel_snapshot?.vessel ?? null

  useEffect(() => {
    if (!projectId) return
    void deckStore.loadProjectEquipment(projectId)
    void equipStore.loadEquipment()
    void raoStore.loadRaos(projectId)
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  const eligibleItems = useMemo(
    () => deckStore.items.filter((pe) => pe.overboard_pos_x != null && pe.crane_capacity_overboard_t != null && (pe.crane_capacity_overboard_t ?? 0) > 0),
    [deckStore.items],
  )

  useEffect(() => {
    if (!selectedPeId && eligibleItems.length > 0) setSelectedPeId(eligibleItems[0].id)
  }, [eligibleItems, selectedPeId])

  const libById = useMemo<Record<string, EquipmentLibrary>>(() => {
    const m: Record<string, EquipmentLibrary> = {}
    equipStore.items.forEach((e) => { m[e.id] = e })
    return m
  }, [equipStore.items])

  const selectedPe = eligibleItems.find((pe) => pe.id === selectedPeId) ?? null
  const selectedEq = selectedPe ? libById[selectedPe.equipment_id] : null

  useEffect(() => {
    if (selectedPeId) {
      void analysisStore.loadResults(selectedPeId)
      setLocalCells([])
    }
  }, [selectedPeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const hydro = useMemo(() => {
    if (!selectedEq) return null
    const dims = { length_m: selectedEq.length_m, width_m: selectedEq.width_m, height_m: selectedEq.height_m }
    return {
      cd: dragCoefficient(selectedEq.geometry_type, dims),
      ca: addedMassCoefficient(selectedEq.geometry_type, dims),
      cs: slammingCoefficient(selectedEq.geometry_type),
      areas: projectedAreas(selectedEq.geometry_type, selectedEq.length_m, selectedEq.width_m, selectedEq.height_m),
      volume: selectedEq.submerged_volume_m3 ?? submergedVolume(selectedEq.geometry_type, selectedEq.length_m, selectedEq.width_m, selectedEq.height_m),
    }
  }, [selectedEq])

  const craneTip = useMemo(() => {
    if (!vessel || !selectedPe || !selectedPe.crane_radius_overboard_m || !selectedPe.crane_boom_angle_overboard_deg) return null
    const tip = craneTipPosition(vessel.crane_pedestal_x, vessel.crane_pedestal_y, vessel.crane_pedestal_height_m, selectedPe.crane_radius_overboard_m, selectedPe.crane_slew_overboard_deg ?? 0, selectedPe.crane_boom_angle_overboard_deg, vessel.crane_boom_length_m)
    return calculateCraneTipMotion(raoStore.entries, tip)
  }, [vessel, selectedPe, raoStore.entries])

  async function runAnalysis(pe: ProjectEquipment) {
    const eq = libById[pe.equipment_id]
    if (!eq || !vessel || !pe.crane_capacity_overboard_t) return
    const dims = { length_m: eq.length_m, width_m: eq.width_m, height_m: eq.height_m }
    const cdVal = dragCoefficient(eq.geometry_type, dims)
    const caVal = addedMassCoefficient(eq.geometry_type, dims)
    const csVal = slammingCoefficient(eq.geometry_type)
    const areasVal = projectedAreas(eq.geometry_type, eq.length_m, eq.width_m, eq.height_m)
    const volumeVal = eq.submerged_volume_m3 ?? submergedVolume(eq.geometry_type, eq.length_m, eq.width_m, eq.height_m)
    const tip = craneTipPosition(vessel.crane_pedestal_x, vessel.crane_pedestal_y, vessel.crane_pedestal_height_m, pe.crane_radius_overboard_m!, pe.crane_slew_overboard_deg ?? 0, pe.crane_boom_angle_overboard_deg!, vessel.crane_boom_length_m)
    const ct = calculateCraneTipMotion(raoStore.entries, tip)

    const gridResult = await runner.run({
      hs_m: 0, tp_s: 0,
      cd_z: cdVal.cd_z, ca: caVal, cs: csVal,
      area_z_m2: areasVal.area_z_m2, volume_m3: volumeVal,
      crane_tip_heave_m: ct.craneTipHeaveM,
      dry_weight_t: eq.dry_weight_t,
      crane_capacity_overboard_t: pe.crane_capacity_overboard_t,
    })

    const worstRow = gridResult.cells.find((c) => c.hs_m === gridResult.max_hs_m) ?? gridResult.cells[0]
    const resultInsert: SplashZoneResultInsert = {
      project_equipment_id: pe.id,
      cd_x: cdVal.cd_x, cd_y: cdVal.cd_y, cd_z: cdVal.cd_z,
      ca: caVal, cs: csVal,
      projected_area_x_m2: areasVal.area_x_m2, projected_area_y_m2: areasVal.area_y_m2, projected_area_z_m2: areasVal.area_z_m2,
      submerged_volume_m3: volumeVal,
      crane_tip_heave_m: ct.craneTipHeaveM, crane_tip_lateral_m: ct.craneTipLateralM,
      daf: worstRow?.daf ?? 1, max_hs_m: gridResult.max_hs_m,
      calculated_at: new Date().toISOString(),
    }
    const limits: Omit<SeaStateLimitInsert, 'splash_zone_result_id'>[] = gridResult.cells.map((c) => ({
      hs_m: c.hs_m, tp_s: c.tp_s, is_feasible: c.is_feasible, utilization_pct: c.utilization_pct,
    }))
    await analysisStore.runAnalysis(resultInsert, limits)
    if (pe.id === selectedPeId) setLocalCells(gridResult.cells)
  }

  async function handleRunAll() {
    setRunAllProgress({ done: 0, total: eligibleItems.length })
    for (let i = 0; i < eligibleItems.length; i++) {
      await runAnalysis(eligibleItems[i])
      setRunAllProgress({ done: i + 1, total: eligibleItems.length })
    }
    setRunAllProgress(null)
  }

  const storedResult = selectedPeId ? analysisStore.results[selectedPeId] : null
  const storedLimits = storedResult ? (analysisStore.seaStateLimits[storedResult.id] ?? []) : []
  const displayCells: GridCell[] = localCells.length > 0
    ? localCells
    : storedLimits.map((l) => ({ hs_m: l.hs_m, tp_s: l.tp_s, is_feasible: l.is_feasible, utilization_pct: l.utilization_pct }))

  const maxHsM = localCells.length > 0
    ? Math.max(0, ...localCells.filter((c) => localCells.filter((x) => x.hs_m === c.hs_m).every((x) => x.is_feasible)).map((c) => c.hs_m))
    : (storedResult?.max_hs_m ?? 0)
  const daf = localCells.length > 0
    ? Math.max(1, ...localCells.filter((c) => c.hs_m === maxHsM).map((c) => c.daf ?? 1))
    : (storedResult?.daf ?? 1)
  const maxUtil = displayCells.filter((c) => c.hs_m === maxHsM).reduce((mx, c) => Math.max(mx, c.utilization_pct), 0)

  const noRaos = raoStore.entries.length === 0
  const canRun = selectedPe != null && selectedEq != null && !noRaos && !runner.state.isRunning

  const analyzedItems = useMemo(
    () => deckStore.items.filter((pe) => analysisStore.results[pe.id] != null),
    [deckStore.items, analysisStore.results],
  )

  return (
    <div className="overflow-auto">
      <div className="mx-auto max-w-[1400px] px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-gray-200 pb-4">
        <h1 className="text-xl font-semibold text-gray-900">Analysis</h1>
        <Button variant="outline" size="sm" onClick={handleRunAll} disabled={eligibleItems.length === 0 || runner.state.isRunning || !!runAllProgress}>
          {runAllProgress ? `Running ${runAllProgress.done}/${runAllProgress.total}…` : 'Run All Equipment'}
        </Button>
      </div>

      {/* Equipment selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Equipment</label>
        <select value={selectedPeId} onChange={(e) => setSelectedPeId(e.target.value)}
          className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
          {eligibleItems.length === 0 && <option value="">No equipment with overboard position</option>}
          {eligibleItems.map((pe) => {
            const eq = libById[pe.equipment_id]
            return <option key={pe.id} value={pe.id}>{pe.label ?? eq?.name ?? pe.id}</option>
          })}
        </select>
        <Button size="sm" onClick={() => selectedPe && runAnalysis(selectedPe)} disabled={!canRun}>
          {runner.state.isRunning ? `Running… ${Math.round(runner.state.progress * 100)}%` : 'Run Analysis'}
        </Button>
      </div>

      {/* Warnings / errors / progress */}
      {noRaos && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">Add vessel RAOs in the Vessel Editor (RAO tab) before running analysis.</p>}
      {runner.state.error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{runner.state.error}</p>}
      {analysisStore.error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{analysisStore.error}</p>}
      {runner.state.isRunning && (
        <div className="h-1.5 bg-gray-200 rounded overflow-hidden">
          <div className="h-full bg-blue-500 transition-all duration-100" style={{ width: `${Math.round(runner.state.progress * 100)}%` }} />
        </div>
      )}

      {/* Input summary + hydro coefficients */}
      {selectedEq && selectedPe && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <InputSummary eq={selectedEq} pe={selectedPe} craneTipHeaveM={craneTip?.craneTipHeaveM ?? storedResult?.crane_tip_heave_m ?? 0} craneTipLateralM={craneTip?.craneTipLateralM ?? storedResult?.crane_tip_lateral_m ?? 0} />
          {hydro && (
            <HydroCard cd_x={hydro.cd.cd_x} cd_y={hydro.cd.cd_y} cd_z={hydro.cd.cd_z} ca={hydro.ca} cs={hydro.cs} area_x_m2={hydro.areas.area_x_m2} area_y_m2={hydro.areas.area_y_m2} area_z_m2={hydro.areas.area_z_m2} volume_m3={hydro.volume} />
          )}
        </div>
      )}

      {/* Results card */}
      {displayCells.length > 0 && <ResultsCard maxHsM={maxHsM} daf={daf} maxUtilizationPct={maxUtil} />}

      {/* Sea state grid */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-700">Sea State Operability Table</h2>
        <p className="text-xs text-gray-400">Tp (s) across columns, Hs (m) down rows. Values show utilization %.</p>
        <SeaStateGrid cells={displayCells} />
      </section>

      {/* Weather window — scatter diagram + operability + overlay */}
      {projectId && (
        <WeatherSection
          projectId={projectId}
          analyzedItems={analyzedItems}
          libById={libById}
        />
      )}
      </div>
    </div>
  )
}

