import { useState } from 'react'
import { Input } from '../ui/input'
import type { EquipmentLibrary, ProjectEquipment } from '../../types/database'
import type { ValidationResult } from '../../lib/calculations/deckValidation'

type Props = {
  library: EquipmentLibrary[]
  placed: ProjectEquipment[]
  libById: Record<string, EquipmentLibrary>
  validationMap: Record<string, ValidationResult>
  selectedId: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onRotate: (id: string, deg: number) => void
}

function ValidationBadge({ vr }: { vr: ValidationResult | undefined }) {
  if (!vr) return null
  if (vr.ok) return <span className="text-xs text-green-600">✓ OK</span>
  const msgs = []
  if (!vr.inBounds) msgs.push('Out of bounds')
  if (!vr.noBarrierCollision) msgs.push('Barrier collision')
  if (!vr.noOverlap) msgs.push('Overlaps equipment')
  if (vr.deckLoadOk === false) msgs.push(`Deck load ${vr.pressure.toFixed(1)} > ${vr.zoneCapacity} t/m²`)
  return <span className="text-xs text-red-600">⚠ {msgs.join('; ')}</span>
}

export function EquipmentPanel({ library, placed, libById, validationMap, selectedId, onSelect, onRemove, onRotate }: Props) {
  const [search, setSearch] = useState('')
  const filtered = library.filter((e) => !search || e.name.toLowerCase().includes(search.toLowerCase()))
  const selected = placed.find((p) => p.id === selectedId)
  const selectedEq = selected ? libById[selected.equipment_id] : null

  return (
    <div className="flex h-full flex-col divide-y divide-gray-200 overflow-hidden text-sm">
      {/* ── Library section ────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="shrink-0 bg-gray-50 px-3 py-2">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Available Equipment</p>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="h-7 text-xs" />
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5">
          {filtered.length === 0
            ? <p className="px-1 py-4 text-center text-xs text-gray-400">No equipment found</p>
            : filtered.map((eq) => (
              <div
                key={eq.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', eq.id)}
                className="cursor-grab rounded border border-gray-200 bg-white px-3 py-2 hover:border-blue-300 hover:shadow-sm active:cursor-grabbing"
              >
                <p className="font-medium text-gray-900 leading-tight">{eq.name}</p>
                <p className="text-xs text-gray-500 capitalize">{eq.geometry_type} · {eq.length_m}×{eq.width_m}×{eq.height_m} m · {eq.dry_weight_t} t</p>
                <p className="mt-1 text-[10px] text-gray-400">⠿ drag to deck</p>
              </div>
            ))}
        </div>
      </div>

      {/* ── On Deck section ────────────────────────────────── */}
      <div className="flex max-h-52 flex-col overflow-hidden">
        <p className="shrink-0 bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          On Deck ({placed.length} item{placed.length !== 1 ? 's' : ''})
        </p>
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
          {placed.length === 0
            ? <p className="px-1 py-3 text-center text-xs text-gray-400">Drag equipment onto the deck</p>
            : placed.map((pe) => {
              const eq = libById[pe.equipment_id]
              const vr = validationMap[pe.id]
              const isSel = pe.id === selectedId
              return (
                <button key={pe.id} onClick={() => onSelect(pe.id)}
                  className={`w-full rounded px-2 py-1.5 text-left transition-colors ${isSel ? 'bg-blue-50 ring-1 ring-blue-300' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 truncate">{pe.label ?? eq?.name ?? '—'}</span>
                    <ValidationBadge vr={vr} />
                  </div>
                  <p className="text-[10px] text-gray-400">
                    x: {pe.deck_pos_x.toFixed(1)} m · y: {pe.deck_pos_y.toFixed(1)} m · {pe.deck_rotation_deg}°
                  </p>
                </button>
              )
            })}
        </div>
      </div>

      {/* ── Selected item properties ───────────────────────── */}
      {selected && selectedEq && (
        <div className="shrink-0 px-3 py-3 space-y-2 bg-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Selected: {selectedEq.name}</p>
          <p className="text-xs text-gray-500">{selectedEq.length_m}×{selectedEq.width_m}×{selectedEq.height_m} m · {selectedEq.dry_weight_t} t</p>

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 w-16 shrink-0">Rotation °</label>
            <Input type="number" value={selected.deck_rotation_deg} step={15} min={-360} max={360}
              onChange={(e) => onRotate(selected.id, parseFloat(e.target.value) || 0)}
              className="h-7 w-20 text-xs" />
          </div>

          <ValidationBadge vr={validationMap[selected.id]} />

          <button onClick={() => onRemove(selected.id)}
            className="w-full rounded border border-red-200 py-1 text-xs text-red-600 hover:bg-red-50">
            Remove from Deck
          </button>
        </div>
      )}
    </div>
  )
}
