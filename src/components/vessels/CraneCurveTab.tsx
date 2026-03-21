import { useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import type { CraneRow } from '../../hooks/useVesselEditor'

type CraneCurveTabProps = {
  rows: CraneRow[]
  onChange: (rows: CraneRow[]) => void
}

function newRow(): CraneRow {
  return { _key: crypto.randomUUID(), radius_m: '', capacity_t: '', boom_angle_deg: '' }
}

function update(rows: CraneRow[], key: string, field: keyof Omit<CraneRow, '_key'>, value: string): CraneRow[] {
  return rows.map((r) => (r._key === key ? { ...r, [field]: value } : r))
}

/** Tab 5 — Crane Curve: editable radius/capacity table with live chart. */
export function CraneCurveTab({ rows, onChange }: CraneCurveTabProps) {
  // Derive chart data: valid rows sorted by radius ascending
  const chartData = useMemo(() => {
    return rows
      .map((r) => ({ radius_m: parseFloat(r.radius_m), capacity_t: parseFloat(r.capacity_t) }))
      .filter((p) => p.radius_m > 0 && p.capacity_t > 0 && !isNaN(p.radius_m) && !isNaN(p.capacity_t))
      .sort((a, b) => a.radius_m - b.radius_m)
  }, [rows])

  // Non-monotonic warning: capacity should decrease as radius increases
  const isNonMonotone = useMemo(() => {
    return chartData.length >= 2 &&
      chartData.some((p, i) => i > 0 && p.capacity_t >= chartData[i - 1].capacity_t)
  }, [chartData])

  function handleRemove(key: string) {
    if (!window.confirm('Remove this point?')) return
    onChange(rows.filter((r) => r._key !== key))
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="text-xs text-gray-500">
          Capacity curve used to interpolate lifting limits at any radius. Min 2 points required.
          Rows are sorted by radius on save.
        </p>
        <Button size="sm" variant="outline" onClick={() => onChange([...rows, newRow()])}>
          + Add Point
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
          No points defined. Click &ldquo;+ Add Point&rdquo; to start.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                <th className="pb-2 pr-2 w-6">#</th>
                <th className="pb-2 pr-2">Radius (m)</th>
                <th className="pb-2 pr-2">Capacity (t)</th>
                <th className="pb-2 pr-2">Boom Angle (°)</th>
                <th className="pb-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row._key} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-1.5 pr-2 text-xs text-gray-400">{i + 1}</td>
                  <td className="py-1.5 pr-2">
                    <Input
                      type="number" value={row.radius_m} min={0.1} step={0.5}
                      onChange={(e) => onChange(update(rows, row._key, 'radius_m', e.target.value))}
                      placeholder="e.g. 15"
                      className="w-24"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <Input
                      type="number" value={row.capacity_t} min={0.1} step={1}
                      onChange={(e) => onChange(update(rows, row._key, 'capacity_t', e.target.value))}
                      placeholder="e.g. 300"
                      className="w-24"
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <Input
                      type="number" value={row.boom_angle_deg} min={0} max={90} step={1}
                      onChange={(e) => onChange(update(rows, row._key, 'boom_angle_deg', e.target.value))}
                      placeholder="optional"
                      className="w-24"
                    />
                  </td>
                  <td className="py-1.5">
                    <button
                      type="button"
                      onClick={() => handleRemove(row._key)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      title="Remove point"
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

      {isNonMonotone && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Warning: capacity does not decrease monotonically with radius. Verify your curve data —
          most cranes have decreasing capacity at greater reach.
        </div>
      )}

      {chartData.length >= 2 && (
        <div className="mt-4">
          <p className="mb-1 text-xs font-medium text-gray-500">Capacity Curve</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 24, left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="radius_m"
                type="number"
                domain={['dataMin', 'dataMax']}
                label={{ value: 'Radius (m)', position: 'insideBottom', offset: -12, fontSize: 11 }}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                dataKey="capacity_t"
                label={{ value: 'Capacity (t)', angle: -90, position: 'insideLeft', offset: 8, fontSize: 11 }}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                formatter={(v: number) => [`${v} t`, 'Capacity']}
                labelFormatter={(r: number) => `Radius: ${r} m`}
              />
              <Line
                type="monotone"
                dataKey="capacity_t"
                stroke="#2563eb"
                strokeWidth={2}
                dot={{ r: 4, fill: '#2563eb' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {chartData.length === 1 && (
        <p className="mt-3 text-xs text-gray-400">Add at least one more point to see the chart.</p>
      )}
    </div>
  )
}
