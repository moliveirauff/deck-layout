export type OperabilityItem = {
  id: string
  name: string
  max_hs_m: number
  operability_pct: number
}

type Props = {
  items: OperabilityItem[]
}

function indicator(pct: number): { label: string; className: string } {
  if (pct >= 80) return { label: 'Good', className: 'text-green-700 bg-green-100' }
  if (pct >= 50) return { label: 'Moderate', className: 'text-yellow-700 bg-yellow-100' }
  return { label: 'Poor', className: 'text-red-700 bg-red-100' }
}

export function OperabilityResultsTable({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded border border-gray-200 px-4 py-6 text-center text-xs text-gray-400">
        Run DNV analysis and save scatter diagram to see operability results
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded border border-gray-200">
      <table className="w-full text-xs">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-500">Equipment</th>
            <th className="px-3 py-2 text-right font-medium text-gray-500">Max Hs</th>
            <th className="px-3 py-2 text-right font-medium text-gray-500">Operability</th>
            <th className="px-3 py-2 text-center font-medium text-gray-500">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => {
            const ind = indicator(item.operability_pct)
            return (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-900">{item.name}</td>
                <td className="px-3 py-2 text-right text-gray-700 font-mono">
                  {item.max_hs_m > 0 ? `${item.max_hs_m.toFixed(2)} m` : '—'}
                </td>
                <td className="px-3 py-2 text-right text-gray-700 font-mono">
                  {item.operability_pct.toFixed(1)} %
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${ind.className}`}>
                    {ind.label}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
