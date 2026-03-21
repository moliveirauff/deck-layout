import { useState } from 'react'
import { TP_VALUES, HS_VALUES } from '../../lib/calculations/dnv/generateSeaStateGrid'
import type { ForceBreakdown } from '../../lib/calculations/dnv/seaStateFeasibility'

export type GridCell = {
  hs_m: number
  tp_s: number
  is_feasible: boolean
  utilization_pct: number
  force_breakdown?: ForceBreakdown
  daf?: number
}

type Props = {
  cells: GridCell[]
}

type TooltipState = {
  cell: GridCell
  x: number
  y: number
} | null

function cellColor(utilization_pct: number): string {
  if (utilization_pct <= 70) return 'bg-green-200 text-green-900'
  if (utilization_pct <= 90) return 'bg-yellow-200 text-yellow-900'
  return 'bg-red-200 text-red-900'
}

function toKN(n: number) {
  return (n / 1000).toFixed(1)
}

export function SeaStateGrid({ cells }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState>(null)

  if (cells.length === 0) {
    return (
      <div className="rounded border border-gray-200 px-4 py-8 text-center text-xs text-gray-400">
        Run analysis to see the operability grid
      </div>
    )
  }

  const byKey = new Map<string, GridCell>()
  for (const c of cells) byKey.set(`${c.hs_m}_${c.tp_s}`, c)

  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <table className="text-[10px] border-collapse">
          <thead>
            <tr>
              <th className="px-2 py-1 text-right text-gray-500 font-normal w-14">
                Hs \ Tp
              </th>
              {TP_VALUES.map((tp) => (
                <th key={tp} className="px-1 py-1 text-center font-medium text-gray-600 w-10">
                  {tp}s
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...HS_VALUES].reverse().map((hs) => (
              <tr key={hs}>
                <td className="px-2 py-0.5 text-right font-medium text-gray-600">{hs.toFixed(2)}</td>
                {TP_VALUES.map((tp) => {
                  const cell = byKey.get(`${hs}_${tp}`)
                  if (!cell) return <td key={tp} className="px-1 py-0.5 text-center bg-gray-100 w-10">—</td>
                  return (
                    <td
                      key={tp}
                      className={`px-1 py-0.5 text-center cursor-pointer select-none w-10 rounded-sm ${cellColor(cell.utilization_pct)}`}
                      onMouseEnter={(e) => {
                        const rect = (e.target as HTMLElement).getBoundingClientRect()
                        setTooltip({ cell, x: rect.right + 8, y: rect.top })
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {cell.utilization_pct.toFixed(0)}%
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-2 text-[10px] text-gray-500">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-green-200" /> ≤70% Safe</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-yellow-200" /> 70–90% Limited</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-red-200" /> &gt;90% Not feasible</span>
      </div>

      {/* Floating tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-white border border-gray-300 rounded shadow-lg p-2.5 text-xs w-52 pointer-events-none"
          style={{ left: Math.min(tooltip.x, window.innerWidth - 220), top: tooltip.y }}
        >
          <p className="font-semibold text-gray-800 mb-1">
            Hs = {tooltip.cell.hs_m.toFixed(2)} m | Tp = {tooltip.cell.tp_s} s
          </p>
          <p className={`mb-1 font-medium ${tooltip.cell.is_feasible ? 'text-green-700' : 'text-red-600'}`}>
            {tooltip.cell.is_feasible ? 'Feasible' : 'Not feasible'}
            {' '}— {tooltip.cell.utilization_pct.toFixed(1)}%
          </p>
          {tooltip.cell.daf != null && (
            <p className="text-gray-600">DAF: {tooltip.cell.daf.toFixed(3)}</p>
          )}
          {tooltip.cell.force_breakdown && (
            <table className="mt-1 w-full">
              <tbody className="text-[10px]">
                <ForceRow label="Static" kn={tooltip.cell.force_breakdown.f_static_N} />
                <ForceRow label="Drag" kn={tooltip.cell.force_breakdown.f_drag_N} />
                <ForceRow label="Inertia" kn={tooltip.cell.force_breakdown.f_inertia_N} />
                <ForceRow label="Slam" kn={tooltip.cell.force_breakdown.f_slam_N} />
                <tr className="border-t border-gray-200 font-semibold">
                  <td className="text-gray-700 pr-2">Total</td>
                  <td className="text-right text-gray-800">{toKN(tooltip.cell.force_breakdown.f_total_N)} kN</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

function ForceRow({ label, kn }: { label: string; kn: number }) {
  return (
    <tr>
      <td className="text-gray-500 pr-2">{label}</td>
      <td className="text-right text-gray-700">{toKN(kn)} kN</td>
    </tr>
  )
}
