import type { EquipmentLibrary, ProjectEquipment } from '../../types/database'

type Props = {
  eq: EquipmentLibrary
  pe: ProjectEquipment
  craneTipHeaveM: number
  craneTipLateralM: number
}

export function InputSummary({ eq, pe, craneTipHeaveM, craneTipLateralM }: Props) {
  const geomLabel =
    eq.geometry_type === 'cylinder'
      ? `Cylinder D=${eq.width_m}m × L=${eq.length_m}m`
      : `Box ${eq.length_m}×${eq.width_m}×${eq.height_m} m`

  return (
    <div className="rounded border border-gray-200 bg-gray-50 p-4 text-xs space-y-1">
      <p className="font-semibold text-gray-700 text-sm mb-2">Input Summary</p>
      <Row label="Dry weight" value={`${eq.dry_weight_t.toFixed(1)} t`} />
      <Row label="Geometry" value={geomLabel} />
      <Row
        label="Crane capacity (overboard)"
        value={
          pe.crane_capacity_overboard_t != null
            ? `${pe.crane_capacity_overboard_t.toFixed(0)} t`
            : '—'
        }
      />
      <Row
        label="Crane radius (overboard)"
        value={pe.crane_radius_overboard_m != null ? `${pe.crane_radius_overboard_m.toFixed(1)} m` : '—'}
      />
      <div className="border-t border-gray-200 pt-1 mt-1">
        <Row label="Crane tip heave (sig.)" value={`${craneTipHeaveM.toFixed(2)} m`} />
        <Row label="Crane tip lateral (sig.)" value={`${craneTipLateralM.toFixed(2)} m`} />
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  )
}
