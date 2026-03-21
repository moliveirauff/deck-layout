import { create } from 'zustand'
import type {
  ScatterDiagramEntry,
  ScatterDiagramEntryInsert,
  WeatherWindowResult,
  SeaStateLimit,
} from '../types/database'
import {
  loadScatterDiagram as fetchScatter,
  saveScatterDiagram as persistScatter,
  saveWeatherResult as persistWeatherResult,
  loadWeatherResult,
} from '../lib/supabase/weatherService'

type WeatherState = {
  scatterEntries: ScatterDiagramEntry[]
  /** Weather window results keyed by project_equipment_id. */
  weatherResults: Record<string, WeatherWindowResult>
  isLoading: boolean
  isSaving: boolean
  error: string | null

  /** Load scatter diagram entries for a project. */
  loadScatterDiagram: (projectId: string) => Promise<void>
  /**
   * Replace the scatter diagram for a project with the provided entries and persist.
   * Entries should sum to ~100% occurrence.
   */
  saveScatterDiagram: (
    projectId: string,
    entries: Omit<ScatterDiagramEntryInsert, 'project_id'>[],
  ) => Promise<void>
  /**
   * Load an existing weather window result for a project equipment item.
   * No-ops silently if no result has been saved yet.
   */
  loadWeatherResult: (projectEquipmentId: string) => Promise<void>
  /**
   * Calculate and persist the weather window result for a project equipment item.
   *
   * Computes operability by cross-referencing the current scatter diagram with
   * the provided sea state limits: sums occurrence_pct for all feasible Hs/Tp cells.
   *
   * @param projectEquipmentId - The equipment item to compute operability for
   * @param seaStateLimits     - Limits from useAnalysisStore for this equipment item
   * @param maxHsLimitM        - Maximum Hs from the splash zone analysis
   */
  calculateOperability: (
    projectEquipmentId: string,
    seaStateLimits: SeaStateLimit[],
    maxHsLimitM: number,
  ) => Promise<void>
}

export const useWeatherStore = create<WeatherState>((set, get) => ({
  scatterEntries: [],
  weatherResults: {},
  isLoading: false,
  isSaving: false,
  error: null,

  loadScatterDiagram: async (projectId) => {
    set({ isLoading: true, error: null })
    const { data, error } = await fetchScatter(projectId)
    if (error) {
      set({ isLoading: false, error })
      return
    }
    set({ scatterEntries: data ?? [], isLoading: false })
  },

  saveScatterDiagram: async (projectId, entries) => {
    set({ isSaving: true, error: null })
    const { data, error } = await persistScatter(projectId, entries)
    if (error) {
      set({ isSaving: false, error })
      return
    }
    set({ scatterEntries: data ?? [], isSaving: false })
  },

  loadWeatherResult: async (projectEquipmentId) => {
    set({ isLoading: true, error: null })
    const { data, error } = await loadWeatherResult(projectEquipmentId)
    if (error) {
      set({ isLoading: false, error })
      return
    }
    if (!data) {
      // No result yet — not an error
      set({ isLoading: false })
      return
    }
    set((state) => ({
      weatherResults: { ...state.weatherResults, [projectEquipmentId]: data },
      isLoading: false,
    }))
  },

  calculateOperability: async (projectEquipmentId, seaStateLimits, maxHsLimitM) => {
    const { scatterEntries } = get()
    set({ isSaving: true, error: null })

    // Build a lookup from "hs_m|tp_s" → is_feasible for fast matching
    const feasibilityMap = new Map<string, boolean>()
    for (const limit of seaStateLimits) {
      feasibilityMap.set(`${limit.hs_m}|${limit.tp_s}`, limit.is_feasible)
    }

    // Sum occurrence percentages for all scatter cells that are within operational limits
    let operabilityPct = 0
    for (const entry of scatterEntries) {
      const key = `${entry.hs_m}|${entry.tp_s}`
      if (feasibilityMap.get(key) === true) {
        operabilityPct += entry.occurrence_pct
      }
    }

    const result = {
      project_equipment_id: projectEquipmentId,
      operability_pct: Math.min(operabilityPct, 100),
      max_hs_limit_m: maxHsLimitM,
      calculated_at: new Date().toISOString(),
    }

    const { data: saved, error } = await persistWeatherResult(result)
    if (error) {
      set({ isSaving: false, error })
      return
    }
    if (saved) {
      set((state) => ({
        weatherResults: { ...state.weatherResults, [projectEquipmentId]: saved },
        isSaving: false,
      }))
    }
  },
}))
