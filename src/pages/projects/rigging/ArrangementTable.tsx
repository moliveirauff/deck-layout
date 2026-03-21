import { Trash2 } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import type { ArrangementRow } from './types'

interface Props {
  rows: ArrangementRow[]
  onRemove: (index: number) => void
}

function fmt(n: number): string {
  return Number.isFinite(n) && n !== Infinity ? n.toFixed(2) : '—'
}

export function ArrangementTable({ rows, onRemove }: Props) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-400">
        No items added yet. Click "+ Add Item from Library" to start.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700 text-xs uppercase tracking-wider text-slate-400">
            <th className="pb-2 text-left">Item</th>
            <th className="pb-2 text-left">Type</th>
            <th className="pb-2 text-right">WLL (t)</th>
            <th className="pb-2 text-right">Qty</th>
            <th className="pb-2 text-right">Angle (°)</th>
            <th className="pb-2 text-right">Force/sling (t)</th>
            <th className="pb-2 text-right">Design Force (t)</th>
            <th className="pb-2 text-center">Status</th>
            <th className="pb-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${row.riggingItem.id}-${index}`}
              className="border-b border-slate-700/50 text-slate-300"
            >
              <td className="py-2 pr-3 font-medium text-slate-100">{row.riggingItem.name}</td>
              <td className="py-2 pr-3">
                <Badge variant="outline" className="text-xs">
                  {row.riggingItem.rigging_type}
                </Badge>
              </td>
              <td className="py-2 pr-3 text-right">{fmt(row.riggingItem.wll_t)}</td>
              <td className="py-2 pr-3 text-right">{row.qty}</td>
              <td className="py-2 pr-3 text-right">{row.angle}</td>
              <td className="py-2 pr-3 text-right">{fmt(row.slingForce)}</td>
              <td className="py-2 pr-3 text-right">{fmt(row.designForce)}</td>
              <td className="py-2 pr-3 text-center">
                {row.wllOk ? (
                  <span className="text-green-400">✅</span>
                ) : (
                  <span className="text-red-400">❌</span>
                )}
              </td>
              <td className="py-2 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(index)}
                  className="h-7 w-7 p-0 text-slate-400 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
