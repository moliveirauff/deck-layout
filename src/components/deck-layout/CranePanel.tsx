import { Input } from '../ui/input'
import type { CraneInfo } from '../../hooks/useDeckLayout'
import type { CraneToggle } from '../../stores/useCraneStore'
import type { ProjectEquipment, EquipmentLibrary } from '../../types/database'

type Props = {
  item: ProjectEquipment
  equipment: EquipmentLibrary
  toggle: CraneToggle | 'both'
  onToggle: (t: CraneToggle | 'both') => void
  deckInfo: CraneInfo | null
  overboardInfo: CraneInfo | null
  onOverboardChange: (id: string, x: number, y: number) => void
}

function StatusIndicator({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${ok ? 'text-green-600' : 'text-red-600'}`}>
      {ok ? '✓' : '✗'} {label}
    </span>
  )
}

function CraneDataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-medium text-gray-900">{value}</span>
    </div>
  )
}

function CraneDataBlock({ info, label }: { info: CraneInfo; label: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <CraneDataRow label="Crane Radius" value={`${info.radiusM.toFixed(1)} m`} />
      <CraneDataRow label="Boom Angle" value={info.boomAngleDeg != null ? `${info.boomAngleDeg.toFixed(1)}°` : '—'} />
      <CraneDataRow label="Capacity @ radius" value={`${info.capacityT.toFixed(1)} t`} />
      <CraneDataRow label="Equipment Weight" value={`${info.weightT.toFixed(1)} t`} />
      <CraneDataRow label="Utilization" value={`${info.utilizationPct.toFixed(1)}%`} />
      <CraneDataRow label="Slew Angle" value={`${info.slewDeg.toFixed(1)}°`} />
      <div className="flex flex-wrap gap-2 pt-1">
        <StatusIndicator ok={info.capacityOk} label="Capacity" />
        <StatusIndicator ok={info.reachOk} label="Reach" />
        <StatusIndicator ok={info.slewOk} label="Slew" />
      </div>
      <div className="pt-0.5">
        {info.ok
          ? <span className="text-xs font-semibold text-green-600">Status: OK</span>
          : <span className="text-xs font-semibold text-red-600">Status: FAIL</span>}
      </div>
    </div>
  )
}

const TOGGLE_OPTIONS: Array<{ value: CraneToggle | 'both'; label: string }> = [
  { value: 'deck', label: 'Deck' },
  { value: 'overboard', label: 'Overboard' },
  { value: 'both', label: 'Both' },
]

export function CranePanel({ item, equipment, toggle, onToggle, deckInfo, overboardInfo, onOverboardChange }: Props) {
  const obX = item.overboard_pos_x
  const obY = item.overboard_pos_y

  return (
    <div className="space-y-3 px-3 py-3 text-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Crane — {equipment.name} ({equipment.dry_weight_t} t)
        </p>
      </div>

      {/* Toggle */}
      <div className="flex gap-1">
        {TOGGLE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onToggle(opt.value)}
            className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
              toggle === opt.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Deck crane data */}
      {(toggle === 'deck' || toggle === 'both') && deckInfo && (
        <CraneDataBlock info={deckInfo} label="Deck Position (Pick-up)" />
      )}

      {/* Overboard crane data */}
      {(toggle === 'overboard' || toggle === 'both') && (
        <div className="space-y-2">
          {overboardInfo ? (
            <CraneDataBlock info={overboardInfo} label="Overboard Position (Splash Zone)" />
          ) : (
            <div className="rounded border border-amber-200 bg-amber-50 px-2 py-2">
              <p className="text-xs font-medium text-amber-700">Set overboard position</p>
              <p className="text-[10px] text-amber-600">Drag the dashed equipment ghost on the canvas or enter coordinates below.</p>
            </div>
          )}

          {/* Overboard coordinate inputs */}
          <div className="flex items-center gap-2">
            <label className="w-10 shrink-0 text-xs text-gray-500">OB X</label>
            <Input
              type="number"
              value={obX ?? ''}
              step={0.5}
              placeholder="m"
              onChange={(e) => {
                const x = parseFloat(e.target.value)
                if (!isNaN(x)) onOverboardChange(item.id, x, obY ?? 0)
              }}
              className="h-7 w-20 text-xs"
            />
            <label className="w-10 shrink-0 text-xs text-gray-500">OB Y</label>
            <Input
              type="number"
              value={obY ?? ''}
              step={0.5}
              placeholder="m"
              onChange={(e) => {
                const y = parseFloat(e.target.value)
                if (!isNaN(y)) onOverboardChange(item.id, obX ?? 0, y)
              }}
              className="h-7 w-20 text-xs"
            />
          </div>
        </div>
      )}
    </div>
  )
}
