import { CloudSun, Clock } from 'lucide-react'
import {
  santosOperability,
  type SantosHsBin,
} from '../../lib/calculations/installation'
import { Input } from '../ui/input'

type Props = {
  hsLimitM: number
  bins: SantosHsBin[]
  onBinChange: (index: number, probability_pct: number) => void
}

export function SantosOperabilityCard({ hsLimitM, bins, onBinChange }: Props) {
  const op = santosOperability(hsLimitM, bins)
  const totalPct = bins.reduce((s, b) => s + b.probability_pct, 0)

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <CloudSun className="h-5 w-5 text-blue-500" />
        <h3 className="text-sm font-semibold text-slate-800">Operabilidade — Bacia de Santos</h3>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">Operabilidade</p>
          <p className="text-2xl font-bold text-slate-900">{(op.operability_fraction * 100).toFixed(1)}%</p>
          <p className="text-[11px] text-slate-500">Tempo com Hs ≤ {hsLimitM.toFixed(2)} m</p>
        </div>
        <div className="rounded border border-blue-200 bg-blue-50 p-3">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-blue-600" />
            <p className="text-[11px] uppercase tracking-wider text-blue-700">Janela 24 h</p>
          </div>
          <p className="text-2xl font-bold text-blue-900">{op.workable_hours_in_24h.toFixed(1)} h</p>
          <p className="text-[11px] text-blue-700">Horas operáveis dentro de uma janela de 24 h</p>
        </div>
      </div>

      <div className="overflow-hidden rounded border border-slate-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-2 py-1 text-left font-medium">Bin Hs (m)</th>
              <th className="px-2 py-1 text-right font-medium">P (%)</th>
              <th className="px-2 py-1 text-center font-medium">Conta</th>
            </tr>
          </thead>
          <tbody>
            {op.contributions.map((b, idx) => (
              <tr key={`${b.hs_low_m}-${b.hs_high_m}`} className={b.contributes ? 'bg-green-50' : 'bg-white'}>
                <td className="px-2 py-1 font-mono text-slate-700">
                  {b.hs_low_m.toFixed(1)} – {b.hs_high_m >= 90 ? '∞' : b.hs_high_m.toFixed(1)}
                </td>
                <td className="px-2 py-1 text-right">
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={b.probability_pct}
                    onChange={(e) => onBinChange(idx, parseFloat(e.target.value) || 0)}
                    className="ml-auto h-7 w-16 text-right text-xs"
                  />
                </td>
                <td className="px-2 py-1 text-center text-slate-500">
                  {b.contributes ? '✓' : '·'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 text-slate-600">
            <tr>
              <td className="px-2 py-1 font-medium">Total</td>
              <td className={`px-2 py-1 text-right font-medium ${Math.abs(totalPct - 100) < 0.5 ? 'text-slate-700' : 'text-amber-700'}`}>
                {totalPct.toFixed(0)}%
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      {Math.abs(totalPct - 100) >= 0.5 && (
        <p className="mt-2 text-[11px] text-amber-700">Total ≠ 100% — operabilidade é normalizada pela soma das probabilidades.</p>
      )}
    </div>
  )
}
