import { create } from 'zustand'
import type {
  SplashZoneResult,
  SplashZoneResultInsert,
  SeaStateLimit,
  SeaStateLimitInsert,
} from '../types/database'
import {
  saveAnalysisResult as persistResult,
  loadAnalysisResult,
  saveSeaStateLimits as persistLimits,
  loadSeaStateLimits,
} from '../lib/supabase/analysisService'

type AnalysisState = {
  /** Splash zone results keyed by project_equipment_id. */
  results: Record<string, SplashZoneResult>
  /** Sea state limit grids keyed by splash_zone_result_id. */
  seaStateLimits: Record<string, SeaStateLimit[]>
  isLoading: boolean
  isRunning: boolean
  error: string | null

  /**
   * Load the splash zone result and its sea state limit grid for an equipment item.
   * No-ops silently if no analysis has been run yet (result will be absent from the map).
   */
  loadResults: (projectEquipmentId: string) => Promise<void>
  /**
   * Persist a complete analysis result (splash zone result + sea state grid).
   *
   * The caller is responsible for running the DNV calculations via
   * src/lib/calculations/ and passing the pre-computed data here.
   * This keeps calculation logic out of the store.
   */
  runAnalysis: (
    result: SplashZoneResultInsert,
    limits: Omit<SeaStateLimitInsert, 'splash_zone_result_id'>[],
  ) => Promise<void>
  /** Remove the in-memory result for an equipment item (does not delete from Supabase). */
  clearResults: (projectEquipmentId: string) => void
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  results: {},
  seaStateLimits: {},
  isLoading: false,
  isRunning: false,
  error: null,

  loadResults: async (projectEquipmentId) => {
    set({ isLoading: true, error: null })

    const { data: result, error: resultError } = await loadAnalysisResult(projectEquipmentId)
    if (resultError) {
      set({ isLoading: false, error: resultError })
      return
    }

    if (!result) {
      // No analysis yet — that is not an error
      set({ isLoading: false })
      return
    }

    const { data: limits, error: limitsError } = await loadSeaStateLimits(result.id)
    if (limitsError) {
      set({ isLoading: false, error: limitsError })
      return
    }

    set((state) => ({
      results: { ...state.results, [projectEquipmentId]: result },
      seaStateLimits: { ...state.seaStateLimits, [result.id]: limits ?? [] },
      isLoading: false,
    }))
  },

  runAnalysis: async (result, limits) => {
    set({ isRunning: true, error: null })

    const { data: savedResult, error: resultError } = await persistResult(result)
    if (resultError) {
      set({ isRunning: false, error: resultError })
      return
    }
    if (!savedResult) {
      set({ isRunning: false, error: 'Analysis save returned no data' })
      return
    }

    const { data: savedLimits, error: limitsError } = await persistLimits(savedResult.id, limits)
    if (limitsError) {
      set({ isRunning: false, error: limitsError })
      return
    }

    set((state) => ({
      results: {
        ...state.results,
        [savedResult.project_equipment_id]: savedResult,
      },
      seaStateLimits: {
        ...state.seaStateLimits,
        [savedResult.id]: savedLimits ?? [],
      },
      isRunning: false,
    }))
  },

  clearResults: (projectEquipmentId) => {
    const { results } = get()
    const result = results[projectEquipmentId]
    if (!result) return

    set((state) => {
      const nextResults = { ...state.results }
      const nextLimits = { ...state.seaStateLimits }
      delete nextResults[projectEquipmentId]
      delete nextLimits[result.id]
      return { results: nextResults, seaStateLimits: nextLimits }
    })
  },
}))
