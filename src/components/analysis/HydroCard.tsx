type Props = {
  cd_x: number
  cd_y: number
  cd_z: number
  ca: number
  cs: number
  area_x_m2: number
  area_y_m2: number
  area_z_m2: number
  volume_m3: number
}

export function HydroCard({ cd_x, cd_y, cd_z, ca, cs, area_x_m2, area_y_m2, area_z_m2, volume_m3 }: Props) {
  return (
    <div className="rounded border border-gray-200 bg-gray-50 p-4 text-xs space-y-1">
      <p className="font-semibold text-gray-700 text-sm mb-2">
        Hydrodynamic Coefficients
        <span className="ml-2 font-normal text-gray-400">(auto-calculated from geometry)</span>
      </p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        <Row label="Cd_x" value={cd_x.toFixed(2)} />
        <Row label="Area_x" value={`${area_x_m2.toFixed(2)} m²`} />
        <Row label="Cd_y" value={cd_y.toFixed(2)} />
        <Row label="Area_y" value={`${area_y_m2.toFixed(2)} m²`} />
        <Row label="Cd_z" value={cd_z.toFixed(2)} />
        <Row label="Area_z" value={`${area_z_m2.toFixed(2)} m²`} />
        <Row label="Ca" value={ca.toFixed(2)} />
        <Row label="Volume" value={`${volume_m3.toFixed(2)} m³`} />
        <Row label="Cs" value={cs.toFixed(2)} />
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium font-mono text-gray-800">{value}</span>
    </div>
  )
}
