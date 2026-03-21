import { Button } from '../ui/button'
import { Input } from '../ui/input'
import type { BarrierRow } from '../../hooks/useVesselEditor'

type BarriersTabProps = {
  rows: BarrierRow[]
  deckLength: number
  deckWidth: number
  onChange: (rows: BarrierRow[]) => void
}

function newRow(): BarrierRow {
  return {
    _key: crypto.randomUUID(),
    name: '', x_m: '0', y_m: '0', length_m: '', width_m: '', height_m: '1',
  }
}

function update(rows: BarrierRow[], key: string, field: keyof Omit<BarrierRow, '_key'>, value: string): BarrierRow[] {
  return rows.map((r) => (r._key === key ? { ...r, [field]: value } : r))
}

/** Tab 2 — Barriers: inline-editable table of rectangular deck obstructions. */
export function BarriersTab({ rows, deckLength, deckWidth, onChange }: BarriersTabProps) {
  const bounds = deckLength > 0 ? ` Deck bounds: ${deckLength} × ${deckWidth} m.` : ' Set deck dimensions on the Deck tab first.'

  function handleRemove(key: string) {
    if (!window.confirm('Remove this barrier?')) return
    onChange(rows.filter((r) => r._key !== key))
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="text-xs text-gray-500">
          Rectangular obstructions where equipment cannot be placed.{bounds}
        </p>
        <Button size="sm" variant="outline" onClick={() => onChange([...rows, newRow()])}>
          + Add Barrier
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
          No barriers defined. Click &ldquo;+ Add Barrier&rdquo; to start.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                <th className="pb-2 pr-2 w-6">#</th>
                <th className="pb-2 pr-2">Name</th>
                <th className="pb-2 pr-2">X (m)</th>
                <th className="pb-2 pr-2">Y (m)</th>
                <th className="pb-2 pr-2">Length (m)</th>
                <th className="pb-2 pr-2">Width (m)</th>
                <th className="pb-2 pr-2">Height (m)</th>
                <th className="pb-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row._key} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-1.5 pr-2 text-xs text-gray-400">{i + 1}</td>
                  <td className="py-1.5 pr-2">
                    <Input
                      value={row.name}
                      onChange={(e) => onChange(update(rows, row._key, 'name', e.target.value))}
                      placeholder="e.g. Pipe Rack"
                      className="w-36"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <Input
                      type="number" value={row.x_m} min={0} max={deckLength || undefined} step={0.1}
                      onChange={(e) => onChange(update(rows, row._key, 'x_m', e.target.value))}
                      className="w-20"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <Input
                      type="number" value={row.y_m} min={0} max={deckWidth || undefined} step={0.1}
                      onChange={(e) => onChange(update(rows, row._key, 'y_m', e.target.value))}
                      className="w-20"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <Input
                      type="number" value={row.length_m} min={0.1} step={0.1}
                      onChange={(e) => onChange(update(rows, row._key, 'length_m', e.target.value))}
                      placeholder="e.g. 10"
                      className="w-20"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <Input
                      type="number" value={row.width_m} min={0.1} step={0.1}
                      onChange={(e) => onChange(update(rows, row._key, 'width_m', e.target.value))}
                      placeholder="e.g. 5"
                      className="w-20"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <Input
                      type="number" value={row.height_m} min={0.1} step={0.1}
                      onChange={(e) => onChange(update(rows, row._key, 'height_m', e.target.value))}
                      placeholder="1.0"
                      className="w-20"
                    />
                  </td>
                  <td className="py-1.5">
                    <button
                      type="button"
                      onClick={() => handleRemove(row._key)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      title="Remove barrier"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
