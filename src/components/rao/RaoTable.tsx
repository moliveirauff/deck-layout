import { useMemo } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Button } from '../ui/button'

export type RaoRow = {
  wave_period_s: number
  heave_amplitude_m_per_m: number
  heave_phase_deg: number
  roll_amplitude_deg_per_m: number
  roll_phase_deg: number
  pitch_amplitude_deg_per_m: number
  pitch_phase_deg: number
}

type Props = {
  rows: RaoRow[]
  onChange: (rows: RaoRow[]) => void
}

const col = createColumnHelper<RaoRow>()

const FIELDS: Array<{ key: keyof RaoRow; label: string; step: number }> = [
  { key: 'wave_period_s', label: 'Period (s)', step: 1 },
  { key: 'heave_amplitude_m_per_m', label: 'Heave Amp', step: 0.01 },
  { key: 'heave_phase_deg', label: 'Heave Pha', step: 5 },
  { key: 'roll_amplitude_deg_per_m', label: 'Roll Amp', step: 0.1 },
  { key: 'roll_phase_deg', label: 'Roll Pha', step: 5 },
  { key: 'pitch_amplitude_deg_per_m', label: 'Pitch Amp', step: 0.01 },
  { key: 'pitch_phase_deg', label: 'Pitch Pha', step: 5 },
]

function emptyRow(): RaoRow {
  return { wave_period_s: 0, heave_amplitude_m_per_m: 0, heave_phase_deg: 0, roll_amplitude_deg_per_m: 0, roll_phase_deg: 0, pitch_amplitude_deg_per_m: 0, pitch_phase_deg: 0 }
}

export function RaoTable({ rows, onChange }: Props) {
  const updateCell = (rowIdx: number, key: keyof RaoRow, value: number) => {
    const next = rows.map((r, i) => (i === rowIdx ? { ...r, [key]: value } : r))
    onChange(next)
  }

  const removeRow = (idx: number) => {
    onChange(rows.filter((_, i) => i !== idx))
  }

  const columns = useMemo(() => [
    col.display({
      id: 'idx',
      header: '#',
      size: 36,
      cell: (info) => <span className="text-xs text-gray-400">{info.row.index + 1}</span>,
    }),
    ...FIELDS.map((f) =>
      col.accessor(f.key, {
        header: f.label,
        size: f.key === 'wave_period_s' ? 80 : 90,
        cell: (info) => (
          <input
            type="number"
            step={f.step}
            value={info.getValue()}
            onChange={(e) => updateCell(info.row.index, f.key, parseFloat(e.target.value) || 0)}
            className="w-full border-0 bg-transparent px-1 py-0.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400 rounded"
          />
        ),
      }),
    ),
    col.display({
      id: 'actions',
      size: 36,
      cell: (info) => (
        <button
          onClick={() => removeRow(info.row.index)}
          className="text-xs text-red-500 hover:text-red-700"
          title="Remove row"
        >
          ✕
        </button>
      ),
    }),
  ], [rows]) // eslint-disable-line react-hooks/exhaustive-deps

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-2 py-1.5 text-left font-medium text-gray-500" style={{ width: h.getSize() }}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-100">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-6 text-center text-gray-400">
                  No RAO rows. Add rows manually or paste from clipboard.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-2 py-0.5" style={{ width: cell.column.getSize() }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Button variant="outline" size="sm" onClick={() => onChange([...rows, emptyRow()])}>
        + Add Row
      </Button>
    </div>
  )
}
