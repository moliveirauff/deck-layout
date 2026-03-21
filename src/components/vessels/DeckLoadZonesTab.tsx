import { Button } from '../ui/button'
import { Input } from '../ui/input'
import type { ZoneRow } from '../../hooks/useVesselEditor'

type DeckLoadZonesTabProps = {
  rows: ZoneRow[]
  deckLength: number
  deckWidth: number
  onChange: (rows: ZoneRow[]) => void
}

function newRow(): ZoneRow {
  return {
    _key: crypto.randomUUID(),
    name: '', x_m: '0', y_m: '0', length_m: '', width_m: '', capacity_t_per_m2: '',
  }
}

function update(rows: ZoneRow[], key: string, field: keyof Omit<ZoneRow, '_key'>, value: string): ZoneRow[] {
  return rows.map((r) => (r._key === key ? { ...r, [field]: value } : r))
}

/** Tab 3 — Deck Load Zones: inline-editable table of deck capacity regions. */
export function DeckLoadZonesTab({ rows, deckLength, deckWidth, onChange }: DeckLoadZonesTabProps) {
  const bounds = deckLength > 0 ? ` Deck bounds: ${deckLength} × ${deckWidth} m.` : ' Set deck dimensions on the Deck tab first.'

  function handleRemove(key: string) {
    if (!window.confirm('Remove this deck load zone?')) return
    onChange(rows.filter((r) => r._key !== key))
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="text-xs text-gray-500">
          Zones with defined load capacity. Overlapping zones use the minimum capacity.{bounds}
        </p>
        <Button size="sm" variant="outline" onClick={() => onChange([...rows, newRow()])}>
          + Add Zone
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
          No load zones defined. Click &ldquo;+ Add Zone&rdquo; to start.
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
                <th className="pb-2 pr-2">Capacity (t/m²)</th>
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
                      placeholder="e.g. Zone A"
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
                      placeholder="e.g. 20"
                      className="w-20"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <Input
                      type="number" value={row.width_m} min={0.1} step={0.1}
                      onChange={(e) => onChange(update(rows, row._key, 'width_m', e.target.value))}
                      placeholder="e.g. 10"
                      className="w-20"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <Input
                      type="number" value={row.capacity_t_per_m2} min={0.01} step={0.1}
                      onChange={(e) => onChange(update(rows, row._key, 'capacity_t_per_m2', e.target.value))}
                      placeholder="e.g. 5.0"
                      className="w-24"
                    />
                  </td>
                  <td className="py-1.5">
                    <button
                      type="button"
                      onClick={() => handleRemove(row._key)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      title="Remove zone"
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
