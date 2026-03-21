import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Save } from 'lucide-react'
import { useProjectStore } from '../../stores/useProjectStore'
import { useDeckLayoutStore } from '../../stores/useDeckLayoutStore'
import { useEquipmentStore } from '../../stores/useEquipmentStore'
import { useRiggingStore } from '../../stores/useRiggingStore'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { Skeleton } from '../../components/ui/skeleton'
import {
  calculateHookLoad,
  calculateSlingForce,
  calculateSlingForceDesign,
  checkWLL,
} from '../../lib/calculations/rigging'
import { updateProjectEquipmentHookLoad } from '../../lib/supabase/projectEquipmentService'
import { HookLoadCard } from './rigging/HookLoadCard'
import { ArrangementTable } from './rigging/ArrangementTable'
import { AddItemModal } from './rigging/AddItemModal'
import type { ArrangementRow } from './rigging/types'
import type { RiggingItem } from '../../types/database'

/**
 * RiggingPage — TRD-09
 * Allows the user to select an equipment item from the project deck, configure
 * its rigging arrangement from the global library, and see live hook-load
 * calculations before saving to the database.
 */
export default function RiggingPage() {
  const { id: projectId } = useParams<{ id: string }>()

  const activeProject = useProjectStore((s) => s.activeProject)
  const deckStore = useDeckLayoutStore()
  const equipStore = useEquipmentStore()
  const riggingStore = useRiggingStore()

  const [selectedPeId, setSelectedPeId] = useState<string>('')
  const [rows, setRows] = useState<ArrangementRow[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return
    void deckStore.loadProjectEquipment(projectId)
  }, [projectId, deckStore])

  useEffect(() => {
    void equipStore.loadItems()
  }, [equipStore])

  useEffect(() => {
    void riggingStore.loadItems()
  }, [riggingStore])

  // ── When PE selection changes, load saved arrangement ────────────────────
  useEffect(() => {
    if (!selectedPeId) {
      setRows([])
      return
    }
    void riggingStore.loadArrangement(selectedPeId).then(() => {
      const saved = riggingStore.arrangements[selectedPeId] ?? []
      const loaded: ArrangementRow[] = saved.flatMap((entry) => {
        const libItem = riggingStore.items.find((i) => i.id === entry.rigging_item_id)
        if (!libItem) return []
        return [buildRow(libItem, entry.quantity, entry.angle_from_vertical_deg, hookLoad)]
      })
      setRows(loaded)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeId])

  // ── Derived values ────────────────────────────────────────────────────────
  const selectedPe = deckStore.items.find((pe) => pe.id === selectedPeId) ?? null
  const selectedEquipment = selectedPe
    ? equipStore.items.find((e) => e.id === selectedPe.equipment_id) ?? null
    : null

  const dryWeight = selectedEquipment?.dry_weight_t ?? 0
  const contingencyPct = selectedEquipment?.contingency_pct ?? 5

  const riggingWeightSum = useMemo(() => {
    return rows.reduce((acc, row) => {
      const weightPerUnit = row.riggingItem.weight_kg / 1000
      return acc + weightPerUnit * row.qty
    }, 0)
  }, [rows])

  const hookLoad = calculateHookLoad(dryWeight, riggingWeightSum, contingencyPct)

  // ── Recalculate rows when hookLoad changes ────────────────────────────────
  const recalcRows = useMemo<ArrangementRow[]>(() => {
    return rows.map((row) => buildRow(row.riggingItem, row.qty, row.angle, hookLoad))
  }, [rows, hookLoad])

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleAddItem(item: RiggingItem, qty: number, angle: number) {
    setRows((prev) => [...prev, buildRow(item, qty, angle, hookLoad)])
  }

  function handleRemoveRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!selectedPeId) return
    setIsSaving(true)
    setSaveError(null)
    try {
      const entries = recalcRows.map((row) => ({
        rigging_item_id: row.riggingItem.id,
        quantity: row.qty,
        angle_from_vertical_deg: row.angle,
        sling_force_t: Number.isFinite(row.slingForce) ? row.slingForce : null,
        sling_force_design_t: Number.isFinite(row.designForce) ? row.designForce : null,
        wll_ok: row.wllOk,
      }))
      await riggingStore.saveArrangement(selectedPeId, entries)
      await updateProjectEquipmentHookLoad(selectedPeId, hookLoad)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setIsSaving(false)
    }
  }

  // ── Loading states ────────────────────────────────────────────────────────
  const isLoading = deckStore.isLoading || equipStore.isLoading || riggingStore.isLoading

  const peOptions = deckStore.items.map((pe) => {
    const eq = equipStore.items.find((e) => e.id === pe.equipment_id)
    const label = pe.label ?? eq?.name ?? pe.id
    return { id: pe.id, label }
  })

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Rigging Configuration</h2>
      </div>

      {/* ── Equipment selector ── */}
      <div className="max-w-sm">
        {isLoading ? (
          <Skeleton className="h-10 w-full bg-slate-700" />
        ) : (
          <Select value={selectedPeId} onValueChange={setSelectedPeId}>
            <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
              <SelectValue placeholder="Select equipment…" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {peOptions.map(({ id, label }) => (
                <SelectItem key={id} value={id} className="text-slate-200">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {selectedPeId && (
        <>
          {/* ── Hook Load Breakdown ── */}
          <div className="max-w-sm">
            <HookLoadCard
              dryWeight={dryWeight}
              riggingWeight={riggingWeightSum}
              contingencyPct={contingencyPct}
              hookLoad={hookLoad}
            />
          </div>

          {/* ── Rigging Arrangement ── */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-200">
                  Rigging Arrangement
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddModal(true)}
                  className="gap-1.5 border-slate-600 text-slate-300 hover:text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Item from Library
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ArrangementTable rows={recalcRows} onRemove={handleRemoveRow} />

              {saveError && (
                <p className="text-sm text-red-400">{saveError}</p>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={isSaving || recalcRows.length === 0}
                  className="gap-1.5"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving…' : 'Save Arrangement'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!selectedPeId && !isLoading && (
        <p className="text-sm text-slate-400">
          Select an equipment item above to configure its rigging arrangement.
        </p>
      )}

      {/* ── Add Item Modal ── */}
      {showAddModal && (
        <AddItemModal
          library={riggingStore.items}
          onAdd={handleAddItem}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}

// ── Helper ────────────────────────────────────────────────────────────────────

function buildRow(
  item: RiggingItem,
  qty: number,
  angle: number,
  hookLoad: number,
): ArrangementRow {
  const slingForce = calculateSlingForce(hookLoad, qty, angle)
  const designForce = calculateSlingForceDesign(slingForce)
  const { ok: wllOk } = checkWLL(designForce, item.wll_t)
  return { riggingItem: item, qty, angle, slingForce, designForce, wllOk }
}
