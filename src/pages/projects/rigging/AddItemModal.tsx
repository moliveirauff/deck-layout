import { useState } from 'react'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Badge } from '../../../components/ui/badge'
import type { RiggingItem } from '../../../types/database'

interface Props {
  library: RiggingItem[]
  onAdd: (item: RiggingItem, qty: number, angle: number) => void
  onClose: () => void
}

export function AddItemModal({ library, onAdd, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [selectedItem, setSelectedItem] = useState<RiggingItem | null>(null)
  const [qty, setQty] = useState(4)
  const [angle, setAngle] = useState(30)

  const filtered = library.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase()),
  )

  function handleAdd() {
    if (!selectedItem) return
    onAdd(selectedItem, qty, angle)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
        <div className="border-b border-slate-700 px-5 py-4">
          <h3 className="text-base font-semibold text-white">Add Item from Library</h3>
        </div>

        <div className="space-y-4 p-5">
          {/* Search */}
          <Input
            placeholder="Search rigging items…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
          />

          {/* Library list */}
          <div className="max-h-48 overflow-y-auto space-y-1 rounded border border-slate-700">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-400">No items found</p>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedItem(item)}
                  className={[
                    'flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors',
                    selectedItem?.id === item.id
                      ? 'bg-slate-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700',
                  ].join(' ')}
                >
                  <span>{item.name}</span>
                  <span className="flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      {item.rigging_type}
                    </Badge>
                    <span className="text-slate-400">WLL {item.wll_t} t</span>
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Config */}
          {selectedItem && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Quantity</label>
                <Input
                  type="number"
                  min={1}
                  max={16}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Angle from vertical (°)</label>
                <Input
                  type="number"
                  min={0}
                  max={89}
                  value={angle}
                  onChange={(e) => setAngle(Math.min(89, Math.max(0, parseFloat(e.target.value) || 0)))}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-700 px-5 py-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!selectedItem}>
            Add
          </Button>
        </div>
      </div>
    </div>
  )
}
