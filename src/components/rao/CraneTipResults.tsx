import { useMemo } from 'react'
import type { RaoEntry, ProjectEquipment, EquipmentLibrary, Vessel } from '../../types/database'
import { craneTipPosition, calculateCraneTipMotion, type CraneTipMotionResult } from '../../lib/calculations/motion/craneTipMotion'

type Props = {
  raoEntries: RaoEntry[]
  placed: ProjectEquipment[]
  libById: Record<string, EquipmentLibrary>
  vessel: Vessel
}

type ItemResult = {
  id: string
  name: string
  result: CraneTipMotionResult
}

export function CraneTipResults({ raoEntries, placed, libById, vessel }: Props) {
  const results = useMemo<ItemResult[]>(() => {
    if (raoEntries.length === 0) return []
    const items: ItemResult[] = []
    for (const pe of placed) {
      if (pe.overboard_pos_x == null || pe.overboard_pos_y == null) continue
      if (pe.crane_radius_overboard_m == null || pe.crane_boom_angle_overboard_deg == null) continue

      const eq = libById[pe.equipment_id]
      if (!eq) continue

      const tip = craneTipPosition(
        vessel.crane_pedestal_x,
        vessel.crane_pedestal_y,
        vessel.crane_pedestal_height_m,
        pe.crane_radius_overboard_m,
        pe.crane_slew_overboard_deg ?? 0,
        pe.crane_boom_angle_overboard_deg,
        vessel.crane_boom_length_m,
      )
      const result = calculateCraneTipMotion(raoEntries, tip)
      items.push({ id: pe.id, name: pe.label ?? eq.name, result })
    }
    return items
  }, [raoEntries, placed, libById, vessel])

  if (raoEntries.length === 0) {
    return (
      <div className="rounded border border-gray-200 px-4 py-6 text-center text-xs text-gray-400">
        Save RAO data first to calculate crane tip motions
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="rounded border border-amber-200 bg-amber-50 px-4 py-4 text-xs text-amber-700">
        No equipment items have overboard positions defined. Set overboard positions on the Deck Layout page first.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded border border-gray-200">
      <table className="w-full text-xs">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-500">Equipment</th>
            <th className="px-3 py-2 text-right font-medium text-gray-500">Heave (m)</th>
            <th className="px-3 py-2 text-right font-medium text-gray-500">Lateral (m)</th>
            <th className="px-3 py-2 text-right font-medium text-gray-500">Worst Dir.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {results.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-900">{r.name}</td>
              <td className="px-3 py-2 text-right text-gray-700">{r.result.craneTipHeaveM.toFixed(2)}</td>
              <td className="px-3 py-2 text-right text-gray-700">{r.result.craneTipLateralM.toFixed(2)}</td>
              <td className="px-3 py-2 text-right text-gray-700">{r.result.worstDirection}°</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
