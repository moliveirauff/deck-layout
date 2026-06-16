import { useMemo, useState } from 'react'
import { AlertTriangle, Save, RotateCcw } from 'lucide-react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import { DogsLayout } from './DogsLayout'
import { calculateTransitAccelerations } from '../../lib/calculations/seafastening/transitAccelerations'
import {
  calculateSeaFasteningForces,
  calculateGrillagePressure,
  checkGrillageCapacity,
  calculateDogForces,
  defaultDogLayout,
  type Dog,
} from '../../lib/calculations/seafastening'
import { validatePlacement } from '../../lib/calculations/deckValidation'
import type {
  EquipmentLibrary,
  ProjectEquipment,
  RaoEntry,
  Vessel,
  VesselBarrier,
  DeckLoadZone,
  SeaFasteningResult,
  SeaFasteningResultInsert,
  Project,
} from '../../types/database'

const DAF_TRANSIT = 1.3
const G = 9.80665

type Props = {
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
}

export function EquipmentDogsCard({
  item,
  equipment,
  vessel,
  zones,
  barriers,
  allPlaced,
  raoEntries,
  activeProject,
  savedResult,
  onSave,
}: Props) {
  const [dogs, setDogs] = useState<Dog[]>(() => defaultDogLayout())
  const [capH, setCapH] = useState<string>('200')
  const [capV, setCapV] = useState<string>('100')
  const [grillageArea, setGrillageArea] = useState<string>(savedResult?.grillage_area_m2?.toString() || '')

  const accels = useMemo(
    () =>
      calculateTransitAccelerations({
        raoEntries,
        hs_transit_m: activeProject.transit_hs_m || 0,
        tp_transit_s: activeProject.transit_tp_s || 0,
        heading_deg: activeProject.transit_heading_deg || 0,
        deck_pos_x: item.deck_pos_x,
        deck_pos_y: item.deck_pos_y,
        lbp_m: vessel.lbp_m || vessel.deck_length_m,
        beam_m: vessel.beam_m || vessel.deck_width_m,
      }),
    [raoEntries, activeProject, item.deck_pos_x, item.deck_pos_y, vessel],
  )

  const forces = useMemo(
    () =>
      calculateSeaFasteningForces({
        dry_weight_t: equipment.dry_weight_t,
        a_transversal_ms2: accels.a_transversal_ms2,
        a_longitudinal_ms2: accels.a_longitudinal_ms2,
        a_vertical_ms2: accels.a_vertical_ms2,
        n_tiedowns: dogs.length,
      }),
    [equipment.dry_weight_t, accels, dogs.length],
  )

  const capHkN = parseFloat(capH) || 0
  const capVkN = parseFloat(capV) || 0

  const dogForces = useMemo(
    () =>
      calculateDogForces({
        dogs,
        force_longitudinal_kn: forces.force_longitudinal_kn * DAF_TRANSIT,
        force_transversal_kn: forces.force_transversal_kn * DAF_TRANSIT,
        force_uplift_kn: forces.force_uplift_kn * DAF_TRANSIT,
        capacity: { horizontal_kn: capHkN, vertical_kn: capVkN },
      }),
    [dogs, forces, capHkN, capVkN],
  )

  const pressure = useMemo(() => {
    const area = parseFloat(grillageArea) || 0
    return calculateGrillagePressure(equipment.dry_weight_t, area)
  }, [equipment.dry_weight_t, grillageArea])

  const zoneCapacity = useMemo(() => {
    const p = {
      id: item.id,
      cx: item.deck_pos_x,
      cy: item.deck_pos_y,
      halfL: equipment.length_m / 2,
      halfW: equipment.width_m / 2,
      rotDeg: item.deck_rotation_deg,
      weightT: equipment.dry_weight_t,
    }
    const others = allPlaced
      .filter((o) => o.id !== item.id)
      .map((o) => ({ id: o.id, cx: o.deck_pos_x, cy: o.deck_pos_y, halfL: 0, halfW: 0, rotDeg: 0, weightT: 0 }))
    const res = validatePlacement(p, vessel.deck_length_m, vessel.deck_width_m, barriers, zones, others)
    return res.zoneCapacity
  }, [item, equipment, vessel, barriers, zones, allPlaced])

  const grillageOk = zoneCapacity ? checkGrillageCapacity(pressure, zoneCapacity) : false

  const handleDogMove = (id: string, newT: number) =>
    setDogs((prev) => prev.map((d) => (d.id === id ? { ...d, t: newT } : d)))

  const handleResetDogs = () => setDogs(defaultDogLayout())

  const maxHorizPerDog = Math.max(...dogForces.perDog.map((r) => r.horizontal_kn))

  const handleSave = () =>
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
      n_tiedowns: dogs.length,
      mbl_required_per_tiedown_kn: maxHorizPerDog,
      tiedown_type: `Welded dogs (H ${capHkN} / V ${capVkN} kN)`,
      tiedown_mbl_kn: capHkN || null,
      tiedown_ok: dogForces.allOk,
      grillage_area_m2: parseFloat(grillageArea) || null,
      grillage_pressure_t_m2: pressure,
      deck_load_grillage_ok: grillageOk,
      daf_transit: DAF_TRANSIT,
      calculated_at: new Date().toISOString(),
    })

  return (
    <Card className="flex flex-col p-5">
      <div className="mb-4 flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">{item.label || equipment.name}</h3>
          <p className="text-sm text-slate-500">
            Peso: {equipment.dry_weight_t} t · Pos: ({item.deck_pos_x}m, {item.deck_pos_y}m)
          </p>
        </div>
        <Badge className={dogForces.allOk ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
          {dogForces.allOk ? 'OK' : 'NÃO OK'}
        </Badge>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2 rounded bg-slate-50 p-3 text-sm">
        <div><span className="text-slate-500">Acc T:</span> {(accels.a_transversal_ms2 / G).toFixed(2)}g</div>
        <div><span className="text-slate-500">Acc L:</span> {(accels.a_longitudinal_ms2 / G).toFixed(2)}g</div>
        <div><span className="text-slate-500">Acc V:</span> {(accels.a_vertical_ms2 / G).toFixed(2)}g</div>
        <div><span className="text-slate-500">F_L:</span> {forces.force_longitudinal_kn.toFixed(1)} kN</div>
        <div><span className="text-slate-500">F_T:</span> {forces.force_transversal_kn.toFixed(1)} kN</div>
        <div><span className="text-slate-500">F_uplift:</span> {forces.force_uplift_kn.toFixed(1)} kN</div>
      </div>

      <div className="mb-4 space-y-3 border-l-2 border-blue-200 pl-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-slate-700">Dogs ({dogs.length}) — DAF {DAF_TRANSIT}</h4>
          <Button size="sm" variant="ghost" onClick={handleResetDogs} className="h-7 gap-1 text-xs">
            <RotateCcw className="h-3 w-3" /> Reset
          </Button>
        </div>

        <DogsLayout
          equipmentLength={equipment.length_m}
          equipmentWidth={equipment.width_m}
          dogs={dogs}
          results={dogForces.perDog}
          onDogMove={handleDogMove}
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Capacidade H por dog (kN)</Label>
            <Input type="number" value={capH} onChange={(e) => setCapH(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Capacidade V por dog (kN)</Label>
            <Input type="number" value={capV} onChange={(e) => setCapV(e.target.value)} />
          </div>
        </div>

        <div className="rounded bg-slate-50 p-2 text-xs">
          <div className="mb-1 font-medium text-slate-700">Força por dog (DAF aplicado)</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {dogForces.perDog.map((r) => (
              <div key={r.id} className="flex items-center justify-between">
                <span className="text-slate-500">{r.id}</span>
                <span className={r.ok ? 'text-slate-700' : 'font-semibold text-red-700'}>
                  H {r.horizontal_kn.toFixed(1)} · V {r.vertical_kn.toFixed(1)} · U {r.utilization.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
            <span className="text-slate-600">Util. máxima:</span>
            <span className="font-semibold text-slate-800">{dogForces.maxUtilization.toFixed(2)}</span>
          </div>
        </div>

        {forces.force_uplift_kn > 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-700">
            <AlertTriangle className="h-3 w-3" /> Uplift presente — dogs reagindo em tração vertical
          </div>
        )}
      </div>

      <div className="mb-6 space-y-3 border-l-2 border-blue-200 pl-4">
        <h4 className="font-medium text-slate-700">Grillage</h4>
        <div className="space-y-1.5">
          <Label className="text-xs">Área de contato (m²)</Label>
          <Input type="number" step="0.1" value={grillageArea} onChange={(e) => setGrillageArea(e.target.value)} />
        </div>
        <div className="flex items-center justify-between bg-slate-50 p-2 text-sm">
          <span>
            Pressão: {pressure === Infinity ? '—' : pressure.toFixed(2)} t/m²
            {zoneCapacity ? ` (vs ${zoneCapacity} t/m²)` : ' (sem zona)'}
          </span>
          {grillageArea && zoneCapacity && (
            <Badge className={grillageOk ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
              {grillageOk ? 'OK' : 'Excede'}
            </Badge>
          )}
        </div>
      </div>

      <div className="mt-auto flex justify-end">
        <Button onClick={handleSave} className="gap-2" variant="outline">
          <Save className="h-4 w-4" /> Salvar
        </Button>
      </div>
    </Card>
  )
}
