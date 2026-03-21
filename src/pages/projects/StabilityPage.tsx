import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Scale, Save, CheckCircle2, XCircle } from 'lucide-react'
import { useProjectStore } from '../../stores/useProjectStore'
import { useDeckLayoutStore } from '../../stores/useDeckLayoutStore'
import { useEquipmentStore } from '../../stores/useEquipmentStore'
import { useStabilityStore } from '../../stores/useStabilityStore'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { calculateKG, verifyGM, calculateTrimAndList } from '../../lib/calculations/stability'
import type { EquipmentLibrary } from '../../types/database'

export default function StabilityPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const { activeProject } = useProjectStore()
  const { items: deckItems, loadProjectEquipment } = useDeckLayoutStore()
  const { items: eqLibrary, loadEquipment } = useEquipmentStore()
  const { loadResult, saveResult } = useStabilityStore()

  useEffect(() => {
    if (projectId) {
      void loadProjectEquipment(projectId)
      void loadEquipment()
      void loadResult(projectId)
    }
  }, [projectId])

  const vessel = activeProject?.vessel_snapshot?.vessel

  // We allow the user to override KM or default to a rough estimation
  const defaultKm = vessel ? ((vessel.kg_lightship_m || 0) + (vessel.gm_min_m || 0) + 1.5) : 10
  const [kmOverride, setKmOverride] = useState<string>('')

  const kmToUse = kmOverride ? parseFloat(kmOverride) : defaultKm

  const libById = useMemo(() => {
    const map: Record<string, EquipmentLibrary> = {}
    eqLibrary.forEach(eq => { map[eq.id] = eq })
    return map
  }, [eqLibrary])

  const cargo = useMemo(() => {
    return deckItems
      .filter(item => item.deck_pos_x !== null && item.deck_pos_y !== null)
      .map(item => {
        const eq = libById[item.equipment_id]
        if (!eq) return null
        const riggingWeight = eq.rigging_weight_t || 0
        const contingency = eq.contingency_pct || 0
        const totalWeight = eq.dry_weight_t * (1 + contingency / 100) + riggingWeight
        return {
          id: item.id,
          label: item.label || eq.name,
          deck_pos_x: item.deck_pos_x,
          deck_pos_y: item.deck_pos_y,
          height_m: eq.height_m,
          weight_t: totalWeight,
          kg_local: (vessel?.deck_elevation_m || 0) + eq.height_m / 2
        }
      })
      .filter(c => c !== null) as Array<{
        id: string; label: string; deck_pos_x: number; deck_pos_y: number;
        height_m: number; weight_t: number; kg_local: number;
      }>
  }, [deckItems, libById, vessel])

  const calcResults = useMemo(() => {
    if (!vessel) return null

    const kgRes = calculateKG({
      displacement_t: vessel.displacement_t || 0,
      kg_lightship_m: vessel.kg_lightship_m || 0,
      deck_elevation_m: vessel.deck_elevation_m || 0,
      cargo
    })

    const gmRes = verifyGM(
      vessel.gm_min_m || 0,
      vessel.kg_lightship_m || 0,
      kgRes.kg_loaded_m,
      kmToUse
    )

    const trimListRes = calculateTrimAndList({
      displacement_loaded_t: kgRes.total_weight_t,
      lbp_m: vessel.lbp_m || vessel.deck_length_m,
      beam_m: vessel.beam_m || vessel.deck_width_m,
      gm_loaded_m: gmRes.gm_loaded_m,
      cargo
    })

    const allOk = gmRes.gm_ok && trimListRes.trim_ok && trimListRes.list_ok

    return { kgRes, gmRes, trimListRes, allOk }
  }, [vessel, cargo, kmToUse])

  if (!vessel || !calcResults) {
    return <div className="p-8 text-slate-400">Loading vessel and calculation data...</div>
  }

  const { kgRes, gmRes, trimListRes, allOk } = calcResults

  const handleSave = async () => {
    if (!projectId) return
    await saveResult({
      project_id: projectId,
      total_deck_load_t: kgRes.total_deck_load_t,
      displacement_loaded_t: kgRes.total_weight_t,
      kg_loaded_m: kgRes.kg_loaded_m,
      gm_loaded_m: gmRes.gm_loaded_m,
      gm_ok: gmRes.gm_ok,
      trim_moment_tm: trimListRes.trim_moment_tm,
      trim_angle_deg: trimListRes.trim_angle_deg,
      trim_ok: trimListRes.trim_ok,
      list_moment_tm: trimListRes.list_moment_tm,
      list_angle_deg: trimListRes.list_angle_deg,
      list_ok: trimListRes.list_ok,
      all_ok: allOk,
      calculated_at: new Date().toISOString()
    })
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-slate-50 p-6">
      <div className="mb-6 flex items-center gap-3">
        <Scale className="h-6 w-6 text-slate-700" />
        <h1 className="text-2xl font-semibold text-slate-800">Stability Report</h1>
      </div>

      <div className={`mb-8 flex items-center justify-center rounded-lg p-6 shadow-sm border ${allOk ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
        {allOk ? (
          <div className="flex items-center gap-3 text-green-700">
            <CheckCircle2 className="h-8 w-8" />
            <h2 className="text-3xl font-bold tracking-wide">STABILITY PASSED</h2>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-red-700">
            <XCircle className="h-8 w-8" />
            <h2 className="text-3xl font-bold tracking-wide">STABILITY FAILED</h2>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Vessel Particulars */}
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between border-b pb-3">
            <h3 className="text-lg font-semibold text-slate-800">Vessel Particulars</h3>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <label>KM (m):</label>
              <Input 
                className="h-7 w-20 px-2 py-1" 
                placeholder={defaultKm.toFixed(2)} 
                value={kmOverride} 
                onChange={e => setKmOverride(e.target.value)} 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            <div className="text-slate-500">Displacement (Light)</div>
            <div className="font-medium text-slate-800">{vessel.displacement_t || 0} t</div>
            
            <div className="text-slate-500">LBP</div>
            <div className="font-medium text-slate-800">{vessel.lbp_m || vessel.deck_length_m} m</div>
            
            <div className="text-slate-500">Beam</div>
            <div className="font-medium text-slate-800">{vessel.beam_m || vessel.deck_width_m} m</div>
            
            <div className="text-slate-500">Lightship KG</div>
            <div className="font-medium text-slate-800">{vessel.kg_lightship_m || 0} m</div>
            
            <div className="text-slate-500">GM Min</div>
            <div className="font-medium text-slate-800">{vessel.gm_min_m || 0} m</div>
            
            <div className="text-slate-500">Deck Elevation</div>
            <div className="font-medium text-slate-800">{vessel.deck_elevation_m || 0} m</div>
          </div>
        </Card>

        {/* Results */}
        <Card className="p-5">
          <h3 className="mb-4 border-b pb-3 text-lg font-semibold text-slate-800">Calculated Results</h3>
          <div className="grid grid-cols-[1fr_auto_auto] gap-y-4 text-sm items-center">
            
            <div className="text-slate-500">Loaded KG</div>
            <div className="font-medium text-slate-800 pr-4">{kgRes.kg_loaded_m.toFixed(2)} m</div>
            <div></div>

            <div className="text-slate-500">Loaded GM</div>
            <div className="font-medium text-slate-800 pr-4">{gmRes.gm_loaded_m.toFixed(2)} m</div>
            <Badge className={gmRes.gm_ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
              {gmRes.gm_ok ? 'OK' : 'Failed'}
            </Badge>

            <div className="text-slate-500">Trim Angle</div>
            <div className="font-medium text-slate-800 pr-4">{trimListRes.trim_angle_deg.toFixed(2)}°</div>
            <Badge className={trimListRes.trim_ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
              {trimListRes.trim_ok ? 'OK' : 'Failed'}
            </Badge>

            <div className="text-slate-500">List Angle</div>
            <div className="font-medium text-slate-800 pr-4">{trimListRes.list_angle_deg.toFixed(2)}°</div>
            <Badge className={trimListRes.list_ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
              {trimListRes.list_ok ? 'OK' : 'Failed'}
            </Badge>

          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Save className="h-4 w-4" /> Save Stability Report
            </Button>
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <h3 className="mb-4 border-b pb-3 text-lg font-semibold text-slate-800">Deck Cargo</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-slate-500">
              <tr>
                <th className="pb-2 font-medium">Equipment</th>
                <th className="pb-2 font-medium">Pos X (m)</th>
                <th className="pb-2 font-medium">Pos Y (m)</th>
                <th className="pb-2 font-medium">Weight (t)</th>
                <th className="pb-2 font-medium">KG Local (m)</th>
              </tr>
            </thead>
            <tbody className="divide-y text-slate-700">
              {cargo.length > 0 ? (
                cargo.map(c => (
                  <tr key={c.id}>
                    <td className="py-2">{c.label}</td>
                    <td className="py-2">{c.deck_pos_x.toFixed(2)}</td>
                    <td className="py-2">{c.deck_pos_y.toFixed(2)}</td>
                    <td className="py-2">{c.weight_t.toFixed(1)}</td>
                    <td className="py-2">{c.kg_local.toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-400">No equipment placed on deck.</td>
                </tr>
              )}
            </tbody>
            <tfoot className="border-t font-medium text-slate-800">
              <tr>
                <td colSpan={3} className="py-2 text-right">Total Cargo:</td>
                <td className="py-2">{kgRes.total_deck_load_t.toFixed(1)} t</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  )
}
