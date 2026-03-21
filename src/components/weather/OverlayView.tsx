import type { SeaStateLimit } from '../../types/database'
import { classifyScatterCell, type CellClass } from '../../lib/calculations/weather/operabilityAnalysis'
import type { ScatterMatrix } from './scatterMatrix'

type Props = {
  matrix: ScatterMatrix
  limits: SeaStateLimit[]
  equipmentLabel: string
}

const CLASS_STYLES: Record<CellClass, string> = {
  feasible:   'bg-green-200 text-green-900',
  infeasible: 'bg-red-200 text-red-900',
  'no-data':  'bg-gray-100 text-gray-400',
}

export function OverlayView({ matrix, limits, equipmentLabel }: Props) {
  const { hsValues, tpValues, cells } = matrix

  if (limits.length === 0) {
    return (
      <div className="rounded border border-amber-200 bg-amber-50 px-4 py-4 text-xs text-amber-700">
        No DNV analysis results found for <strong>{equipmentLabel}</strong>. Run analysis first.
      </div>
    )
  }

  // Pre-compute classifications for boundary detection
  const cls: CellClass[][] = hsValues.map((hs, hi) =>
    tpValues.map((tp, ti) => classifyScatterCell(cells[hi]?.[ti] ?? 0, hs, tp, limits)),
  )

  // A boundary exists between two adjacent cells if both have occurrence and differ in feasibility
  function hasBoundaryRight(hi: number, ti: number): boolean {
    if (ti >= tpValues.length - 1) return false
    const a = cls[hi][ti], b = cls[hi][ti + 1]
    return (a === 'feasible' && b === 'infeasible') || (a === 'infeasible' && b === 'feasible')
  }
  function hasBoundaryBottom(hi: number, ti: number): boolean {
    if (hi >= hsValues.length - 1) return false
    const a = cls[hi][ti], b = cls[hi + 1][ti]
    return (a === 'feasible' && b === 'infeasible') || (a === 'infeasible' && b === 'feasible')
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-gray-600">
        Overlay for <span className="font-semibold">{equipmentLabel}</span>
      </p>

      <div className="overflow-x-auto">
        <table className="border-collapse text-[11px]">
          <thead>
            <tr>
              <th className="px-2 py-1 text-right text-gray-500 font-normal w-14 whitespace-nowrap">
                Hs \ Tp (s)
              </th>
              {tpValues.map((tp) => (
                <th key={tp} className="px-1.5 py-1 text-center font-medium text-gray-600 min-w-[44px]">
                  {tp}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...hsValues].reverse().map((hs, riRev) => {
              const hi = hsValues.length - 1 - riRev
              return (
                <tr key={hs}>
                  <td className="px-2 py-0.5 text-right font-medium text-gray-600 whitespace-nowrap">
                    {hs.toFixed(2)}
                  </td>
                  {tpValues.map((_, ti) => {
                    const occurrence = cells[hi]?.[ti] ?? 0
                    const cellCls = cls[hi][ti]
                    const bRight = hasBoundaryRight(hi, ti)
                    const bBottom = hasBoundaryBottom(hi, ti)
                    return (
                      <td
                        key={ti}
                        title={`Hs=${hs} m, Tp=${tpValues[ti]} s\nOccurrence: ${occurrence > 0 ? occurrence.toFixed(2) + ' %' : '—'}\nStatus: ${cellCls}`}
                        className={[
                          'px-1.5 py-1 text-center min-w-[44px] select-none',
                          CLASS_STYLES[cellCls],
                          bRight ? 'border-r-2 border-r-blue-700' : '',
                          bBottom ? 'border-b-2 border-b-blue-700' : '',
                        ].join(' ')}
                      >
                        {occurrence > 0 ? occurrence.toFixed(1) : '—'}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-[10px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-green-200" />
          Feasible + occurrence
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-red-200" />
          Infeasible + occurrence
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-gray-100 border border-gray-300" />
          No occurrence
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-6 h-0.5 bg-blue-700" />
          Feasibility boundary
        </span>
      </div>
    </div>
  )
}
