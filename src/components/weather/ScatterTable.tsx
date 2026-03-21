import type { ScatterMatrix } from './scatterMatrix'
import { totalOccurrence } from './scatterMatrix'

type Props = {
  matrix: ScatterMatrix
  onChange: (m: ScatterMatrix) => void
}

export function ScatterTable({ matrix, onChange }: Props) {
  const { hsValues, tpValues, cells } = matrix
  const total = totalOccurrence(matrix)
  const totalOk = total >= 98 && total <= 102
  const hasData = total > 0

  function setCell(hi: number, ti: number, value: number) {
    const next = cells.map((row, ri) =>
      row.map((v, ci) => (ri === hi && ci === ti ? Math.max(0, value) : v)),
    )
    onChange({ ...matrix, cells: next })
  }

  return (
    <div className="space-y-2">
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
            {hsValues.map((hs, hi) => (
              <tr key={hs} className="even:bg-gray-50">
                <td className="px-2 py-0.5 text-right font-medium text-gray-600 whitespace-nowrap">
                  {hs.toFixed(2)}
                </td>
                {tpValues.map((_, ti) => {
                  const val = cells[hi]?.[ti] ?? 0
                  return (
                    <td key={ti} className="px-1 py-0.5">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={val === 0 ? '' : val}
                        placeholder="—"
                        onChange={(e) => setCell(hi, ti, parseFloat(e.target.value) || 0)}
                        className="w-11 border border-transparent rounded px-1 py-0.5 text-right text-[11px] text-gray-700 bg-transparent focus:border-blue-400 focus:bg-white focus:outline-none"
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-300">
              <td className="px-2 py-1 text-right text-gray-500 text-[11px]">Total</td>
              <td colSpan={tpValues.length} className="px-2 py-1 text-left">
                <span className={`font-semibold ${hasData ? (totalOk ? 'text-green-700' : 'text-amber-600') : 'text-gray-400'}`}>
                  {hasData ? `${total.toFixed(1)} %` : '—'}
                </span>
                {hasData && !totalOk && (
                  <span className="ml-2 text-[10px] text-amber-600">
                    (should be ~100 %; warn if outside 98–102 %)
                  </span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
