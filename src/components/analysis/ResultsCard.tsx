type Props = {
  maxHsM: number
  daf: number
  maxUtilizationPct: number
}

export function ResultsCard({ maxHsM, daf, maxUtilizationPct }: Props) {
  const feasible = maxHsM > 0

  return (
    <div
      className={`rounded border p-4 text-xs space-y-1 ${
        feasible ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
      }`}
    >
      <p className="font-semibold text-gray-700 text-sm mb-2">Analysis Results</p>
      <div className="flex justify-between gap-4">
        <span className="text-gray-500">Maximum Hs (all Tp feasible)</span>
        <span className={`font-bold text-sm ${feasible ? 'text-green-700' : 'text-red-600'}`}>
          {feasible ? `${maxHsM.toFixed(2)} m` : 'No feasible sea state'}
        </span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-gray-500">Dynamic Amplification Factor</span>
        <span className="font-medium font-mono text-gray-800">{daf.toFixed(3)}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-gray-500">Utilization at max Hs</span>
        <span className="font-medium font-mono text-gray-800">
          {maxUtilizationPct < Infinity ? `${maxUtilizationPct.toFixed(1)} %` : '—'}
        </span>
      </div>
    </div>
  )
}
