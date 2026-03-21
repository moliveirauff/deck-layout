import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'

interface Props {
  dryWeight: number
  riggingWeight: number
  contingencyPct: number
  hookLoad: number
}

function fmt(n: number): string {
  return Number.isFinite(n) ? n.toFixed(1) : '—'
}

export function HookLoadCard({ dryWeight, riggingWeight, contingencyPct, hookLoad }: Props) {
  const contingency = dryWeight * (contingencyPct / 100)

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-slate-200">
          Hook Load Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Row label="Dry Weight" value={`${fmt(dryWeight)} t`} />
        <Row label="Rigging Weight" value={`${fmt(riggingWeight)} t`} />
        <Row
          label={`Contingency (${contingencyPct}%)`}
          value={`${fmt(contingency)} t`}
        />
        <div className="border-t border-slate-600 pt-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-100">Hook Load</span>
            <span className="text-lg font-bold text-sky-400">{fmt(hookLoad)} t</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-slate-300">
      <span>{label}</span>
      <span className="font-medium text-slate-100">{value}</span>
    </div>
  )
}
