import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Anchor } from 'lucide-react'
import { useProjectStore } from '../../stores/useProjectStore'
import { useDeckLayoutStore } from '../../stores/useDeckLayoutStore'
import { useEquipmentStore } from '../../stores/useEquipmentStore'
import { useRaoStore } from '../../stores/useRaoStore'
import { useSeaFasteningStore } from '../../stores/useSeaFasteningStore'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { EquipmentDogsCard } from '../../components/seafastening/EquipmentDogsCard'
import type { EquipmentLibrary } from '../../types/database'

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
  }, [projectId, loadProjectEquipment, loadEquipment, loadRaos, loadSeaFasteningResults])

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

  const placedItems = useMemo(() => deckItems.filter((item) => item.deck_pos_x !== null), [deckItems])

  const libById = useMemo(() => {
    const map: Record<string, EquipmentLibrary> = {}
    eqLibrary.forEach((eq) => {
      map[eq.id] = eq
    })
    return map
  }, [eqLibrary])

  if (!vessel || !activeProject) {
    return <div className="p-8 text-slate-400">Carregando dados do vessel...</div>
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-slate-50 p-6">
      <div className="mb-6 flex items-center gap-3">
        <Anchor className="h-6 w-6 text-slate-700" />
        <h1 className="text-2xl font-semibold text-slate-800">Sea-Fastening (Dogs)</h1>
      </div>

      <Card className="mb-8 p-5">
        <h2 className="mb-4 text-lg font-medium text-slate-800">Condições de trânsito</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label>Hs (m)</Label>
            <Input type="number" step="0.1" value={hs} onChange={(e) => setHs(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Tp (s)</Label>
            <Input type="number" step="0.1" value={tp} onChange={(e) => setTp(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Heading (°)</Label>
            <Input type="number" step="1" value={heading} onChange={(e) => setHeading(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Duração (h)</Label>
            <Input type="number" step="1" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSaveTransit} className="bg-blue-600 hover:bg-blue-700">Salvar condições</Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {placedItems.map((item) => {
          const eq = libById[item.equipment_id]
          if (!eq) return null
          return (
            <EquipmentDogsCard
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
