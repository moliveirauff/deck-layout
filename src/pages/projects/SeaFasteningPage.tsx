import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Anchor, Save, AlertTriangle } from 'lucide-react'
import { useProjectStore } from '../../stores/useProjectStore'
import { useDeckLayoutStore } from '../../stores/useDeckLayoutStore'
import { useEquipmentStore } from '../../stores/useEquipmentStore'
import { useRaoStore } from '../../stores/useRaoStore'
import { useSeaFasteningStore } from '../../stores/useSeaFasteningStore'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Badge } from '../../components/ui/badge'
import { calculateTransitAccelerations } from '../../lib/calculations/seafastening/transitAccelerations'
import { calculateSeaFasteningForces, calculateGrillagePressure, checkGrillageCapacity } from '../../lib/calculations/seafastening'
import { validatePlacement } from '../../lib/calculations/deckValidation'
import type { EquipmentLibrary, ProjectEquipment, RaoEntry, Vessel, VesselBarrier, DeckLoadZone, SeaFasteningResult, SeaFasteningResultInsert, Project } from '../../types/database'

export default function SeaFasteningPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const { activeProject, updateProject } = useProjectStore()
  const { items: deckItems, loadProjectEquipment } = useDeckLayoutStore()
  const { items: eqLibrary, loadEquipment } = useEquipmentStore()
  const { entries: raoEntries, loadRaos } = useRaoStore()
  const { results, saveResult, loadAll: loadSeaFasteningResults } = useSeaFasteningStore()

  const [hs, setHs] = useState(activeProject?.transit_hs_m?.toString() || '')
  const [tp, setTp] = useState(activeProject?.transit_tp_s?.toString() || '')
  const [heading, setHeading] = useState(activeProject?.transit_heading_deg?.toString() || '')
  const [duration, setDuration] = useState(activeProject?.transit_duration_h?.toString() || '')

  useEffect(() => {
    if (projectId) {
      void loadProjectEquipment(projectId)
      void loadEquipment()
      void loadRaos(projectId)
      void loadSeaFasteningResults(projectId)
    }
  }, [projectId])

  const vessel = activeProject?.vessel_snapshot?.vessel
  const zones = activeProject?.vessel_snapshot?.deck_load_zones || []
  const barriers = activeProject?.vessel_snapshot?.barriers || []

  const handleSaveTransit = async () => {
    if (!projectId) return
    await updateProject(projectId, {
      transit_hs_m: parseFloat(hs) || null,
      transit_tp_s: parseFloat(tp) || null,
      transit_heading_deg: parseFloat(heading) || null,
      transit_duration_h: parseFloat(duration) || null,
    })
  }

  const placedItems = useMemo(() => {
    return deckItems.filter(item => item.deck_pos_x !== null)
  }, [deckItems])

  const libById = useMemo(() => {
    const map: Record<string, EquipmentLibrary> = {}
    eqLibrary.forEach(eq => { map[eq.id] = eq })
    return map
  }, [eqLibrary])

  if (!vessel || !activeProject) {
    return <div className="p-8 text-slate-400">Loading vessel data...</div>
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-slate-50 p-6">
      <div className="mb-6 flex items-center gap-3">
        <Anchor className="h-6 w-6 text-slate-700" />
        <h1 className="text-2xl font-semibold text-slate-800">Sea-Fastening Analysis</h1>
      </div>

      <Card className="mb-8 p-5">
        <h2 className="mb-4 text-lg font-medium text-slate-800">Transit Conditions</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label>Hs (m)</Label>
            <Input type="number" step="0.1" value={hs} onChange={e => setHs(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Tp (s)</Label>
            <Input type="number" step="0.1" value={tp} onChange={e => setTp(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Heading (deg)</Label>
            <Input type="number" step="1" value={heading} onChange={e => setHeading(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Duration (h)</Label>
            <Input type="number" step="1" value={duration} onChange={e => setDuration(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSaveTransit} className="bg-blue-600 hover:bg-blue-700">Save Conditions</Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {placedItems.map(item => {
          const eq = libById[item.equipment_id]
          if (!eq) return null
          
          return (
            <EquipmentSeaFasteningCard
              key={item.id}
              item={item}
              equipment={eq}
              vessel={vessel}
              zones={zones}
              barriers={barriers}
              allPlaced={placedItems}
              raoEntries={raoEntries}
              activeProject={activeProject}
              savedResult={results[item.id]}
              onSave={saveResult}
            />
          )
        })}
      </div>
    </div>
  )
}

function EquipmentSeaFasteningCard({ item, equipment, vessel, zones, barriers, allPlaced, raoEntries, activeProject, savedResult, onSave }: {
  item: ProjectEquipment
  equipment: EquipmentLibrary
  vessel: Vessel
  zones: DeckLoadZone[]
  barriers: VesselBarrier[]
  allPlaced: ProjectEquipment[]
  raoEntries: RaoEntry[]
  activeProject: Project
  savedResult: SeaFasteningResult | null
  onSave: (result: SeaFasteningResultInsert) => void
}) {
  const [nTiedowns, setNTiedowns] = useState(savedResult?.n_tiedowns?.toString() || '4')
  const [tiedownMbl, setTiedownMbl] = useState(savedResult?.tiedown_mbl_kn?.toString() || '')
  const [tiedownType, setTiedownType] = useState(savedResult?.tiedown_type || '')
  const [grillageArea, setGrillageArea] = useState(savedResult?.grillage_area_m2?.toString() || '')

  const accels = useMemo(() => {
    return calculateTransitAccelerations({
      raoEntries,
      hs_transit_m: activeProject.transit_hs_m || 0,
      tp_transit_s: activeProject.transit_tp_s || 0,
      heading_deg: activeProject.transit_heading_deg || 0,
      deck_pos_x: item.deck_pos_x,
      deck_pos_y: item.deck_pos_y,
      lbp_m: vessel.lbp_m || vessel.deck_length_m,
      beam_m: vessel.beam_m || vessel.deck_width_m,
    })
  }, [raoEntries, activeProject, item.deck_pos_x, item.deck_pos_y, vessel])

  const forces = useMemo(() => {
    return calculateSeaFasteningForces({
      dry_weight_t: equipment.dry_weight_t,
      a_transversal_ms2: accels.a_transversal_ms2,
      a_longitudinal_ms2: accels.a_longitudinal_ms2,
      a_vertical_ms2: accels.a_vertical_ms2,
      n_tiedowns: parseInt(nTiedowns) || 1,
    })
  }, [equipment.dry_weight_t, accels, nTiedowns])

  const mblRequired = forces.mbl_required_per_tiedown_kn
  const mblProvided = parseFloat(tiedownMbl) || 0
  const tiedownOk = mblProvided >= mblRequired

  const pressure = useMemo(() => {
    const area = parseFloat(grillageArea) || 0
    return calculateGrillagePressure(equipment.dry_weight_t, area)
  }, [equipment.dry_weight_t, grillageArea])

  const zoneCapacity = useMemo(() => {
    const p = { id: item.id, cx: item.deck_pos_x, cy: item.deck_pos_y, halfL: equipment.length_m / 2, halfW: equipment.width_m / 2, rotDeg: item.deck_rotation_deg, weightT: equipment.dry_weight_t }
    const others = allPlaced.filter((o: ProjectEquipment) => o.id !== item.id).map((o: ProjectEquipment) => ({
      id: o.id, cx: o.deck_pos_x, cy: o.deck_pos_y, halfL: 0, halfW: 0, rotDeg: 0, weightT: 0
    }))
    const res = validatePlacement(p, vessel.deck_length_m, vessel.deck_width_m, barriers, zones, others)
    return res.zoneCapacity
  }, [item, equipment, vessel, barriers, zones, allPlaced])

  const grillageOk = zoneCapacity ? checkGrillageCapacity(pressure, zoneCapacity) : false

  const handleSave = () => {
    onSave({
      project_equipment_id: item.id,
      acc_transversal_ms2: accels.a_transversal_ms2,
      acc_longitudinal_ms2: accels.a_longitudinal_ms2,
      acc_vertical_ms2: accels.a_vertical_ms2,
      force_transversal_kn: forces.force_transversal_kn,
      force_longitudinal_kn: forces.force_longitudinal_kn,
      force_vertical_kn: forces.force_vertical_kn,
      force_uplift_kn: forces.force_uplift_kn,
      force_horizontal_resultant_kn: forces.force_horizontal_resultant_kn,
      n_tiedowns: parseInt(nTiedowns) || 1,
      mbl_required_per_tiedown_kn: mblRequired,
      tiedown_type: tiedownType || null,
      tiedown_mbl_kn: mblProvided || null,
      tiedown_ok: tiedownOk,
      grillage_area_m2: parseFloat(grillageArea) || null,
      grillage_pressure_t_m2: pressure,
      deck_load_grillage_ok: grillageOk,
      daf_transit: forces.daf_transit,
      calculated_at: new Date().toISOString(),
    })
  }

  return (
    <Card className="flex flex-col p-5">
      <div className="mb-4 flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">{item.label || equipment.name}</h3>
          <p className="text-sm text-slate-500">Weight: {equipment.dry_weight_t} t | Pos: ({item.deck_pos_x}m, {item.deck_pos_y}m)</p>
        </div>
        {forces.force_uplift_kn > 0 && (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200"><AlertTriangle className="mr-1 h-3 w-3" /> Uplift</Badge>
        )}
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 rounded bg-slate-50 p-3 text-sm">
        <div><span className="text-slate-500">Acc Trans:</span> {(accels.a_transversal_ms2 / 9.80665).toFixed(2)}g</div>
        <div><span className="text-slate-500">Acc Long:</span> {(accels.a_longitudinal_ms2 / 9.80665).toFixed(2)}g</div>
        <div><span className="text-slate-500">Acc Vert:</span> {(accels.a_vertical_ms2 / 9.80665).toFixed(2)}g</div>
        
        <div><span className="text-slate-500">Force T:</span> {forces.force_transversal_kn.toFixed(1)} kN</div>
        <div><span className="text-slate-500">Force L:</span> {forces.force_longitudinal_kn.toFixed(1)} kN</div>
        <div><span className="text-slate-500">Force V:</span> {forces.force_vertical_kn.toFixed(1)} kN</div>
        
        <div className="col-span-3 font-medium text-slate-700">
          Resultant Horizontal: {forces.force_horizontal_resultant_kn.toFixed(1)} kN
          {forces.force_uplift_kn > 0 && ` | Uplift: ${forces.force_uplift_kn.toFixed(1)} kN`}
        </div>
      </div>

      <div className="mb-4 space-y-4 border-l-2 border-blue-200 pl-4">
        <h4 className="font-medium text-slate-700">Tie-down Configuration</h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Number</Label>
            <Input type="number" value={nTiedowns} onChange={e => setNTiedowns(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">MBL Provided (kN)</Label>
            <Input type="number" value={tiedownMbl} onChange={e => setTiedownMbl(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Type</Label>
            <Input value={tiedownType} onChange={e => setTiedownType(e.target.value)} placeholder="e.g. Chain" />
          </div>
        </div>
        <div className="flex items-center justify-between bg-slate-50 p-2 text-sm">
          <span>Required MBL: <strong className="text-slate-800">{mblRequired.toFixed(1)} kN</strong></span>
          {mblProvided > 0 && (
            <Badge className={tiedownOk ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
              {tiedownOk ? 'OK' : 'Insufficient'}
            </Badge>
          )}
        </div>
      </div>

      <div className="mb-6 space-y-4 border-l-2 border-blue-200 pl-4">
        <h4 className="font-medium text-slate-700">Grillage Check</h4>
        <div className="space-y-1.5">
          <Label className="text-xs">Contact Area (m²)</Label>
          <Input type="number" step="0.1" value={grillageArea} onChange={e => setGrillageArea(e.target.value)} />
        </div>
        <div className="flex items-center justify-between bg-slate-50 p-2 text-sm">
          <span>
            Pressure: {pressure === Infinity ? '—' : pressure.toFixed(2)} t/m² 
            {zoneCapacity ? ` (vs ${zoneCapacity} t/m²)` : ' (No Zone)'}
          </span>
          {grillageArea && zoneCapacity && (
            <Badge className={grillageOk ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
              {grillageOk ? 'OK' : 'Exceeds'}
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-auto flex justify-end">
        <Button onClick={handleSave} className="gap-2" variant="outline">
          <Save className="h-4 w-4" /> Save Sea-Fastening
        </Button>
      </div>
    </Card>
  )
}
