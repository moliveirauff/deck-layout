import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Play, Activity } from 'lucide-react'
import { useProjectStore } from '../../stores/useProjectStore'
import { useDeckLayoutStore } from '../../stores/useDeckLayoutStore'
import { useEquipmentStore } from '../../stores/useEquipmentStore'
import { useRaoStore } from '../../stores/useRaoStore'
import { useLoweringStore } from '../../stores/useLoweringStore'
import { Button } from '../../components/ui/button'
import { InstallationSummary } from '../../components/installation/InstallationSummary'
import { SantosOperabilityCard } from '../../components/installation/SantosOperabilityCard'
import { dragCoefficient } from '../../lib/calculations/hydro/dragCoefficient'
import { addedMassCoefficient } from '../../lib/calculations/hydro/addedMassCoefficient'
import { slammingCoefficient } from '../../lib/calculations/hydro/slammingCoefficient'
import { projectedAreas, submergedVolume } from '../../lib/calculations/hydro/projectedAreas'
import { calculateCraneTipMotion, craneTipPosition } from '../../lib/calculations/motion/craneTipMotion'
import { buoyancyTonnes, calculateCurrentDrag, calculateResidualTension } from '../../lib/calculations/lowering'
import {
  calculateInstallationLimits,
  DEFAULT_SANTOS_HS_BINS,
  HS_CAP,
  type InstallationLimits,
  type SantosHsBin,
} from '../../lib/calculations/installation'

export default function InstallationPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const activeProject = useProjectStore((s) => s.activeProject)
  const deckStore = useDeckLayoutStore()
  const equipStore = useEquipmentStore()
  const raoStore = useRaoStore()
  const loweringStore = useLoweringStore()

  const [selectedPeId, setSelectedPeId] = useState<string>('')
  const [limits, setLimits] = useState<InstallationLimits | null>(null)
  const [runError, setRunError] = useState<string | null>(null)
  const [bins, setBins] = useState<SantosHsBin[]>(() => DEFAULT_SANTOS_HS_BINS.map((b) => ({ ...b })))

  const vessel = activeProject?.vessel_snapshot?.vessel ?? null

  useEffect(() => {
    if (!projectId) return
    void deckStore.loadProjectEquipment(projectId)
    void equipStore.loadEquipment()
    void raoStore.loadRaos(projectId)
    void loweringStore.loadCurrentProfile(projectId)
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  const eligibleItems = useMemo(
    () =>
      deckStore.items.filter(
        (pe) =>
          pe.overboard_pos_x != null &&
          pe.crane_capacity_overboard_t != null &&
          (pe.crane_capacity_overboard_t ?? 0) > 0,
      ),
    [deckStore.items],
  )

  useEffect(() => {
    if (!selectedPeId && eligibleItems.length > 0) setSelectedPeId(eligibleItems[0].id)
  }, [eligibleItems, selectedPeId])

  useEffect(() => {
    setLimits(null)
    setRunError(null)
  }, [selectedPeId])

  const selectedPe = eligibleItems.find((pe) => pe.id === selectedPeId) ?? null
  const selectedEq = selectedPe ? equipStore.items.find((e) => e.id === selectedPe.equipment_id) ?? null : null

  const currentProfile = useMemo(() => {
    if (loweringStore.currentProfile.length > 0) {
      return loweringStore.currentProfile.map((e) => ({
        depth_m: e.depth_m,
        current_speed_ms: e.current_speed_ms,
      }))
    }
    return [
      { depth_m: 0, current_speed_ms: 0.5 },
      { depth_m: 100, current_speed_ms: 0.5 },
      { depth_m: 500, current_speed_ms: 0.3 },
      { depth_m: 1000, current_speed_ms: 0.2 },
      { depth_m: activeProject?.water_depth_m ?? 2000, current_speed_ms: 0.1 },
    ]
  }, [loweringStore.currentProfile, activeProject])

  function runAnalysis(): void {
    setRunError(null)
    if (!vessel || !selectedPe || !selectedEq || !selectedPe.crane_capacity_overboard_t) {
      setRunError('Selecione um equipamento com posição overboard e capacidade de guindaste.')
      return
    }
    if (raoStore.entries.length === 0) {
      setRunError('Cadastre os RAOs da embarcação antes de rodar a análise.')
      return
    }
    try {
      const dims = { length_m: selectedEq.length_m, width_m: selectedEq.width_m, height_m: selectedEq.height_m }
      const cd = dragCoefficient(selectedEq.geometry_type, dims)
      const ca = addedMassCoefficient(selectedEq.geometry_type, dims)
      const cs = slammingCoefficient(selectedEq.geometry_type)
      const areas = projectedAreas(selectedEq.geometry_type, selectedEq.length_m, selectedEq.width_m, selectedEq.height_m)
      const volume = selectedEq.submerged_volume_m3 ?? submergedVolume(selectedEq.geometry_type, selectedEq.length_m, selectedEq.width_m, selectedEq.height_m)
      const tip = craneTipPosition(
        vessel.crane_pedestal_x,
        vessel.crane_pedestal_y,
        vessel.crane_pedestal_height_m,
        selectedPe.crane_radius_overboard_m ?? 0,
        selectedPe.crane_slew_overboard_deg ?? 0,
        selectedPe.crane_boom_angle_overboard_deg ?? 60,
        vessel.crane_boom_length_m,
      )
      const motion = calculateCraneTipMotion(raoStore.entries, tip)
      const hookLoad = selectedPe.hook_load_t ?? selectedEq.dry_weight_t * 1.1
      const buoyancy = buoyancyTonnes(volume)
      const dragResult = calculateCurrentDrag({ currentProfile, cd_x: cd.cd_x, projected_area_x_m2: areas.area_x_m2 })
      const tension = calculateResidualTension({
        hook_load_t: hookLoad,
        buoyancy_t: buoyancy,
        max_current_drag_kn: dragResult.max_drag_kn,
      })

      const result = calculateInstallationLimits({
        dry_weight_t: selectedEq.dry_weight_t,
        crane_capacity_overboard_t: selectedPe.crane_capacity_overboard_t,
        cd_z: cd.cd_z,
        ca,
        cs,
        area_z_m2: areas.area_z_m2,
        volume_m3: volume,
        craneTipMotionResult: motion,
        residual_tension_t: tension.residual_tension_t,
      })
      setLimits(result)
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Erro desconhecido')
    }
  }

  function handleBinChange(index: number, value: number): void {
    setBins((prev) => prev.map((b, i) => (i === index ? { ...b, probability_pct: value } : b)))
  }

  return (
    <div className="overflow-auto">
      <div className="mx-auto max-w-[1400px] space-y-5 px-6 py-6">
        <header className="border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-slate-700" />
            <h1 className="text-xl font-semibold text-slate-900">Installation Analysis</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            DNV simplificado · Hs varrido até {HS_CAP.toFixed(1)} m · splash zone + landing no fundo + slack · operabilidade Bacia de Santos.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-3">
          <label className="whitespace-nowrap text-sm font-medium text-slate-700">Equipamento</label>
          <select
            value={selectedPeId}
            onChange={(e) => setSelectedPeId(e.target.value)}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {eligibleItems.length === 0 && <option value="">Sem equipamento com overboard</option>}
            {eligibleItems.map((pe) => {
              const eq = equipStore.items.find((e) => e.id === pe.equipment_id)
              return (
                <option key={pe.id} value={pe.id}>{pe.label ?? eq?.name ?? pe.id}</option>
              )
            })}
          </select>
          <Button size="sm" onClick={runAnalysis} disabled={!selectedPe || !selectedEq} className="gap-1.5">
            <Play className="h-3.5 w-3.5" /> Rodar análise
          </Button>
        </div>

        {runError && (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{runError}</p>
        )}
        {raoStore.entries.length === 0 && (
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Sem RAOs cadastrados para a embarcação — adicione no editor da vessel antes de rodar.
          </p>
        )}

        {limits && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <InstallationSummary limits={limits} />
            <SantosOperabilityCard hsLimitM={limits.hs_limit_m} bins={bins} onBinChange={handleBinChange} />
          </div>
        )}

        {limits && (
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Detalhe do varrimento</h2>
            <p className="mb-3 text-xs text-slate-500">
              ✓ = critério passa para todos os Tp testados (4–18 s). · = critério falha em algum Tp.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-2 py-1 text-left font-medium">Hs (m)</th>
                    <th className="px-2 py-1 text-center font-medium">Splash zone</th>
                    <th className="px-2 py-1 text-center font-medium">Landing</th>
                  </tr>
                </thead>
                <tbody>
                  {limits.rows.map((r) => (
                    <tr key={r.hs_m} className="border-t border-slate-100">
                      <td className="px-2 py-1 font-mono">{r.hs_m.toFixed(2)}</td>
                      <td className={`px-2 py-1 text-center ${r.splash_ok ? 'text-green-600' : 'text-slate-400'}`}>
                        {r.splash_ok ? '✓' : '·'}
                      </td>
                      <td className={`px-2 py-1 text-center ${r.landing_ok ? 'text-green-600' : 'text-slate-400'}`}>
                        {r.landing_ok ? '✓' : '·'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
