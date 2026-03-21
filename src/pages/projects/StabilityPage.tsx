import { useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useProjectStore } from '../../stores/useProjectStore'
import { useDeckLayoutStore } from '../../stores/useDeckLayoutStore'
import { useEquipmentStore } from '../../stores/useEquipmentStore'
import { useStabilityStore } from '../../stores/useStabilityStore'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { calculateKG, type CargoItem } from '../../lib/calculations/stability/kgCalculation'
import { verifyGM } from '../../lib/calculations/stability/gmVerification'
import { calculateTrimAndList } from '../../lib/calculations/stability/trimAndList'
import type { StabilityResultInsert } from '../../types/database'

export default function StabilityPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const projectStore = useProjectStore()
  const deckStore = useDeckLayoutStore()
  const equipStore = useEquipmentStore()
  const stabilityStore = useStabilityStore()

  useEffect(() => {
    if (!projectId) return
    void deckStore.loadProjectEquipment(projectId)
    void equipStore.loadEquipment()
    void stabilityStore.loadResult(projectId)
  }, [projectId])

  const vessel = projectStore.activeProject?.vessel_snapshot?.vessel
  const hasVesselParams = vessel?.displacement_t != null && vessel?.lbp_m != null && vessel?.beam_m != null && vessel?.kg_lightship_m != null && vessel?.gm_min_m != null && vessel?.deck_elevation_m != null

  const cargoItems = useMemo(() => {
    return deckStore.items
      .map(pe => {
        const eq = equipStore.items.find(e => e.id === pe.equipment_id)
        if (!eq) return null
        return {
          pe_id: pe.id,
          label: pe.label || eq.name,
          weight_t: pe.hook_load_t ?? eq.dry_weight_t,
          deck_pos_x: pe.deck_pos_x,
          deck_pos_y: pe.deck_pos_y,
          height_m: eq.height_m,
          kg_m: (vessel?.deck_elevation_m ?? 0) + eq.height_m / 2
        }
      })
      .filter(Boolean) as (CargoItem & { pe_id: string; label: string; kg_m: number })[]
  }, [deckStore.items, equipStore.items, vessel?.deck_elevation_m])

  const calc = useMemo(() => {
    if (!vessel || !hasVesselParams) return null
    
    const kgRes = calculateKG({
      displacement_t: vessel.displacement_t!,
      kg_lightship_m: vessel.kg_lightship_m!,
      deck_elevation_m: vessel.deck_elevation_m!,
      cargo: cargoItems
    })

    const km = vessel.gm_min_m! + vessel.kg_lightship_m! // estimate
    const gmRes = verifyGM(vessel.gm_min_m!, vessel.kg_lightship_m!, kgRes.kg_loaded_m, km)

    const trimRes = calculateTrimAndList({
      displacement_loaded_t: kgRes.total_weight_t,
      lbp_m: vessel.lbp_m!,
      beam_m: vessel.beam_m!,
      gm_loaded_m: gmRes.gm_loaded_m,
      cargo: cargoItems
    })

    const all_ok = gmRes.gm_ok && trimRes.trim_ok && trimRes.list_ok

    return { kgRes, gmRes, trimRes, all_ok }
  }, [vessel, hasVesselParams, cargoItems])

  async function handleSave() {
    if (!projectId || !calc) return
    const insert: StabilityResultInsert = {
      project_id: projectId,
      total_deck_load_t: calc.kgRes.total_deck_load_t,
      displacement_loaded_t: calc.kgRes.total_weight_t,
      kg_loaded_m: calc.kgRes.kg_loaded_m,
      gm_loaded_m: calc.gmRes.gm_loaded_m,
      gm_ok: calc.gmRes.gm_ok,
      trim_moment_tm: calc.trimRes.trim_moment_tm,
      trim_angle_deg: calc.trimRes.trim_angle_deg,
      trim_ok: calc.trimRes.trim_ok,
      list_moment_tm: calc.trimRes.list_moment_tm,
      list_angle_deg: calc.trimRes.list_angle_deg,
      list_ok: calc.trimRes.list_ok,
      all_ok: calc.all_ok,
      calculated_at: new Date().toISOString()
    }
    await stabilityStore.saveResult(insert)
  }

  if (!hasVesselParams) {
    return <div className="p-8 text-amber-600">Vessel particulars (LBP, Displacement, KG, GM_min, Deck Elevation, Beam) are missing. Please update the vessel in the Library.</div>
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Stability Verification</h1>
        <Button onClick={handleSave} disabled={!calc || stabilityStore.isSaving}>
          {stabilityStore.isSaving ? 'Saving...' : 'Save Stability Report'}
        </Button>
      </div>

      {stabilityStore.error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded">{stabilityStore.error}</div>}

      {calc && (
        <div className={`p-6 rounded-lg text-center font-bold text-3xl border-2 ${calc.all_ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {calc.all_ok ? 'STABILITY PASSED' : 'STABILITY FAILED'}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 border rounded-lg shadow-sm">
          <h2 className="font-semibold text-lg mb-4">Vessel Particulars</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Displacement (Lightship)</span><span className="font-mono">{vessel?.displacement_t?.toFixed(1)} t</span></div>
            <div className="flex justify-between"><span className="text-gray-500">LBP</span><span className="font-mono">{vessel?.lbp_m?.toFixed(1)} m</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Beam</span><span className="font-mono">{vessel?.beam_m?.toFixed(1)} m</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Deck Elevation</span><span className="font-mono">{vessel?.deck_elevation_m?.toFixed(2)} m</span></div>
            <div className="flex justify-between"><span className="text-gray-500">KG Lightship</span><span className="font-mono">{vessel?.kg_lightship_m?.toFixed(2)} m</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Required Minimum GM</span><span className="font-mono">{vessel?.gm_min_m?.toFixed(2)} m</span></div>
          </div>
        </div>

        <div className="bg-white p-4 border rounded-lg shadow-sm">
          <h2 className="font-semibold text-lg mb-4">Verification Results</h2>
          {calc ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Total Deck Load</span>
                <span className="font-mono font-medium">{calc.kgRes.total_deck_load_t.toFixed(1)} t</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Loaded Displacement</span>
                <span className="font-mono">{calc.kgRes.total_weight_t.toFixed(1)} t</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-gray-500">Loaded KG</span>
                <span className="font-mono">{calc.kgRes.kg_loaded_m.toFixed(2)} m</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Loaded GM</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{calc.gmRes.gm_loaded_m.toFixed(2)} m</span>
                  <Badge variant={calc.gmRes.gm_ok ? 'default' : 'destructive'} className={calc.gmRes.gm_ok ? 'bg-green-600' : ''}>{calc.gmRes.gm_ok ? 'PASS' : 'FAIL'}</Badge>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-gray-500">Trim Angle</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{calc.trimRes.trim_angle_deg.toFixed(2)}°</span>
                  <Badge variant={calc.trimRes.trim_ok ? 'default' : 'destructive'} className={calc.trimRes.trim_ok ? 'bg-green-600' : ''}>{calc.trimRes.trim_ok ? 'PASS' : 'FAIL'}</Badge>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">List Angle</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{calc.trimRes.list_angle_deg.toFixed(2)}°</span>
                  <Badge variant={calc.trimRes.list_ok ? 'default' : 'destructive'} className={calc.trimRes.list_ok ? 'bg-green-600' : ''}>{calc.trimRes.list_ok ? 'PASS' : 'FAIL'}</Badge>
                </div>
              </div>
            </div>
          ) : <p>Missing vessel data to calculate.</p>}
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-semibold text-lg">Deck Cargo Detail</h2>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Equipment</th>
              <th className="px-4 py-2 font-medium text-right">Weight (t)</th>
              <th className="px-4 py-2 font-medium text-right">Deck X (m)</th>
              <th className="px-4 py-2 font-medium text-right">Deck Y (m)</th>
              <th className="px-4 py-2 font-medium text-right">Local KG (m)</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {cargoItems.map(c => (
              <tr key={c.pe_id}>
                <td className="px-4 py-2">{c.label}</td>
                <td className="px-4 py-2 text-right font-mono">{c.weight_t.toFixed(1)}</td>
                <td className="px-4 py-2 text-right font-mono">{c.deck_pos_x.toFixed(1)}</td>
                <td className="px-4 py-2 text-right font-mono">{c.deck_pos_y.toFixed(1)}</td>
                <td className="px-4 py-2 text-right font-mono">{c.kg_m.toFixed(2)}</td>
              </tr>
            ))}
            {cargoItems.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No equipment on deck</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
