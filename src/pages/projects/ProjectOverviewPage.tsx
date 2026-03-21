import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/skeleton'
import { useProjectStore } from '../../stores/useProjectStore'
import { loadProjectEquipment } from '../../lib/supabase/projectEquipmentService'
import { loadEquipment } from '../../lib/supabase/equipmentService'
import { loadAnalyzedEquipmentIds } from '../../lib/supabase/analysisService'
import type { ProjectEquipment, EquipmentLibrary } from '../../types/database'

// ─── Status pill ──────────────────────────────────────────────────────────────

function Pill({ ok }: { ok: boolean | null }) {
  if (ok === null) return <span className="text-xs text-gray-400">—</span>
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
      {ok ? '✓' : '✗'}
    </span>
  )
}

// ─── Info Row ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectOverviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const activeProject = useProjectStore((s) => s.activeProject)

  const [placements, setPlacements] = useState<ProjectEquipment[]>([])
  const [library, setLibrary] = useState<EquipmentLibrary[]>([])
  const [analyzedIds, setAnalyzedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    void Promise.all([loadProjectEquipment(id), loadEquipment()]).then(
      async ([placRes, libRes]) => {
        if (placRes.error) { setLoadError(placRes.error); setLoading(false); return }
        const placed = placRes.data ?? []
        const lib = libRes.data ?? []
        const { data: aIds } = await loadAnalyzedEquipmentIds(placed.map((p) => p.id))
        setPlacements(placed)
        setLibrary(lib)
        setAnalyzedIds(aIds ?? [])
        setLoading(false)
      },
    )
  }, [id])

  const libById = useMemo(() => {
    const m: Record<string, EquipmentLibrary> = {}
    library.forEach((e) => { m[e.id] = e })
    return m
  }, [library])

  const isLoaded = activeProject !== null && activeProject.id === id
  const vessel = activeProject?.vessel_snapshot?.vessel

  if (!isLoaded || loading) {
    return (
      <div className="overflow-auto p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-72" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-36" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
            <Skeleton className="h-3 w-20" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
            <Skeleton className="h-3 w-16" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (loadError) {
    return <div className="p-8 text-sm text-red-600">{loadError}</div>
  }

  const analyzedSet = new Set(analyzedIds)

  return (
    <div className="overflow-auto">
      <div className="mx-auto max-w-[1400px] px-6 py-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{activeProject.name}</h1>
          {activeProject.description && (
            <p className="mt-0.5 text-sm text-gray-500">{activeProject.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => navigate('deck')}>Go to Deck Layout</Button>
          <Button size="sm" variant="outline" disabled title="Available after deck layout is complete">
            Run All Analysis
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Project Info</p>
          <div className="divide-y divide-gray-100">
            <InfoRow label="Field" value={activeProject.field_name ?? '—'} />
            <InfoRow label="Water Depth" value={activeProject.water_depth_m != null ? `${activeProject.water_depth_m} m` : '—'} />
            <InfoRow label="Status" value={activeProject.status} />
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Vessel</p>
          {vessel ? (
            <div className="divide-y divide-gray-100">
              <InfoRow label="Name" value={vessel.name} />
              <InfoRow label="Type" value={vessel.vessel_type} />
              <InfoRow label="Deck" value={`${vessel.deck_length_m} × ${vessel.deck_width_m} m`} />
              <InfoRow label="Crane" value={vessel.crane_type === 'knuckle_boom' ? 'Knuckle boom' : 'OMC'} />
              <InfoRow label="Boom" value={`${vessel.crane_boom_length_m} m`} />
            </div>
          ) : (
            <p className="text-sm text-gray-400">No vessel snapshot.</p>
          )}
        </div>
      </div>

      {/* Equipment table */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Equipment ({placements.length} item{placements.length !== 1 ? 's' : ''})
          </p>
        </div>

        {placements.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-gray-400">
            No equipment placed yet.{' '}
            <button className="text-blue-600 underline" onClick={() => navigate('deck')}>
              Go to Deck Layout
            </button>{' '}
            to add equipment.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                <th className="px-4 py-2">Label / Equipment</th>
                <th className="px-4 py-2 text-center">Deck Load</th>
                <th className="px-4 py-2 text-center">Crane (Deck)</th>
                <th className="px-4 py-2 text-center">Crane (OB)</th>
                <th className="px-4 py-2 text-center">Analyzed</th>
              </tr>
            </thead>
            <tbody>
              {placements.map((pe) => {
                const eq = libById[pe.equipment_id]
                const analyzed = analyzedSet.has(pe.id)
                return (
                  <tr key={pe.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <p className="font-medium text-gray-900">{pe.label ?? eq?.name ?? '—'}</p>
                      {eq && (
                        <p className="text-xs text-gray-400">
                          {eq.geometry_type} · {eq.length_m}×{eq.width_m}×{eq.height_m} m · {eq.dry_weight_t} t
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center"><Pill ok={pe.deck_load_ok} /></td>
                    <td className="px-4 py-2 text-center"><Pill ok={pe.capacity_check_deck_ok} /></td>
                    <td className="px-4 py-2 text-center"><Pill ok={pe.capacity_check_overboard_ok} /></td>
                    <td className="px-4 py-2 text-center">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${analyzed ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                        {analyzed ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      </div>
    </div>
  )
}

