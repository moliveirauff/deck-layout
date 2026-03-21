import { useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useProjectStore } from '../../stores/useProjectStore'
import { useDeckLayoutStore } from '../../stores/useDeckLayoutStore'
import { useEquipmentStore } from '../../stores/useEquipmentStore'
import { useAnalysisStore } from '../../stores/useAnalysisStore'
import { WeatherSection } from '../../components/analysis/WeatherSection'
import { Skeleton } from '../../components/ui/skeleton'
import type { EquipmentLibrary } from '../../types/database'

/**
 * Weather Window page — standalone route for /projects/:id/weather
 * Wraps the WeatherSection component that lives in the Analysis page.
 */
export default function WeatherPage() {
  const { id: projectId } = useParams<{ id: string }>()

  const activeProject = useProjectStore((s) => s.activeProject)
  const deckStore = useDeckLayoutStore()
  const equipStore = useEquipmentStore()
  const analysisStore = useAnalysisStore()

  useEffect(() => {
    if (!projectId) return
    void deckStore.loadProjectEquipment(projectId)
    void equipStore.loadEquipment()
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load analysis results for all equipment so operability can be computed
  useEffect(() => {
    for (const pe of deckStore.items) {
      void analysisStore.loadResults(pe.id)
    }
  }, [deckStore.items]) // eslint-disable-line react-hooks/exhaustive-deps

  const libById = useMemo<Record<string, EquipmentLibrary>>(() => {
    const m: Record<string, EquipmentLibrary> = {}
    equipStore.items.forEach((e) => { m[e.id] = e })
    return m
  }, [equipStore.items])

  const analyzedItems = useMemo(
    () => deckStore.items.filter((pe) => analysisStore.results[pe.id] != null),
    [deckStore.items, analysisStore.results],
  )

  const isLoading = deckStore.isLoading || equipStore.isLoading

  if (!projectId || !activeProject) {
    return (
      <div className="p-6 space-y-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  return (
    <div className="overflow-auto">
      <div className="mx-auto max-w-[1400px] px-6 py-6 space-y-5">
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-xl font-semibold text-gray-900">Weather Window</h1>
          <p className="mt-1 text-sm text-gray-500">
            Scatter diagram input and operability analysis based on DNV splash zone limits.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <WeatherSection
            projectId={projectId}
            analyzedItems={analyzedItems}
            libById={libById}
          />
        )}
      </div>
    </div>
  )
}
