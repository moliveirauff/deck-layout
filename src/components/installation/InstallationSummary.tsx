import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { hsLightStatus, type InstallationLimits } from '../../lib/calculations/installation'

type Props = {
  limits: InstallationLimits
}

function lightClasses(hs: number): string {
  const status = hsLightStatus(hs)
  if (status === 'green') return 'bg-green-100 text-green-800 border-green-200'
  if (status === 'amber') return 'bg-amber-100 text-amber-800 border-amber-200'
  return 'bg-red-100 text-red-800 border-red-200'
}

function CriterionCard({
  label,
  value,
  ok,
  hint,
}: {
  label: string
  value: string
  ok: boolean
  hint?: string
}) {
  return (
    <div className={`rounded-lg border p-3 ${ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        {ok ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
      </div>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  )
}

export function InstallationSummary({ limits }: Props) {
  const status = hsLightStatus(limits.hs_limit_m)
  return (
    <div className="space-y-3">
      <div className={`flex items-center justify-between rounded-lg border-2 p-4 ${lightClasses(limits.hs_limit_m)}`}>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider opacity-70">Hs limite consolidado</p>
          <p className="mt-1 text-3xl font-bold">{limits.hs_limit_m.toFixed(2)} m</p>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs">
          {status === 'green' && <span className="font-semibold">VERDE — operação confortável</span>}
          {status === 'amber' && (
            <>
              <AlertTriangle className="h-5 w-5" />
              <span className="font-semibold">ÂMBAR — janela apertada</span>
            </>
          )}
          {status === 'red' && (
            <>
              <XCircle className="h-5 w-5" />
              <span className="font-semibold">VERMELHO — não operacional</span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <CriterionCard
          label="Splash zone (carga do guindaste)"
          value={`${limits.hs_limit_splash_m.toFixed(2)} m`}
          ok={limits.hs_limit_splash_m > 0}
          hint="Hook load ≤ 90% capacidade overboard"
        />
        <CriterionCard
          label="Landing (velocidade no fundo)"
          value={`${limits.hs_limit_landing_m.toFixed(2)} m`}
          ok={limits.hs_limit_landing_m > 0}
          hint="v_ct ≤ 1.5 m/s"
        />
        <CriterionCard
          label="Slack (cabo sob tração)"
          value={limits.slack_ok ? 'OK' : 'NÃO'}
          ok={limits.slack_ok}
          hint="Residual hook tension > 0"
        />
      </div>
    </div>
  )
}
