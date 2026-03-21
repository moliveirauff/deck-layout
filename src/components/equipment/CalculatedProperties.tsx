import type { GeometryType } from '../../types/database'

type Props = {
  length: number
  width: number
  height: number
  weight: number
  geometryType: GeometryType
}

function fmt(n: number, decimals = 2): string {
  return isFinite(n) ? n.toFixed(decimals) : '—'
}

function Row({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-mono text-gray-900">
        {value} <span className="text-xs text-gray-400">{unit}</span>
      </span>
    </div>
  )
}

/** Read-only panel showing geometry-derived properties for an equipment item. */
export function CalculatedProperties({ length, width, height, weight, geometryType }: Props) {
  const valid = length > 0 && width > 0 && height > 0 && weight > 0

  const volume =
    geometryType === 'cylinder'
      ? Math.PI * Math.pow(width / 2, 2) * length
      : length * width * height

  const footprint = length * width
  const deckPressure = footprint > 0 ? weight / footprint : 0

  // Projected areas: X = front face (W×H), Y = side face (L×H), Z = top face (L×W)
  const areaX = width * height
  const areaY = length * height
  const areaZ = length * width

  if (!valid) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Calculated Properties
        </p>
        <p className="mt-2 text-xs text-gray-400">
          Enter dimensions and weight to see calculated properties.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Calculated Properties
      </p>
      <div className="divide-y divide-gray-100">
        <Row
          label={geometryType === 'cylinder' ? 'Volume  (π·r²·L)' : 'Volume  (L×W×H)'}
          value={fmt(volume)}
          unit="m³"
        />
        <Row label="Footprint Area  (L×W)" value={fmt(footprint)} unit="m²" />
        <Row label="Deck Pressure  (W/A)" value={fmt(deckPressure)} unit="t/m²" />
        <Row label="Projected Area X  (W×H)" value={fmt(areaX)} unit="m²" />
        <Row label="Projected Area Y  (L×H)" value={fmt(areaY)} unit="m²" />
        <Row label="Projected Area Z  (L×W)" value={fmt(areaZ)} unit="m²" />
      </div>
    </div>
  )
}
