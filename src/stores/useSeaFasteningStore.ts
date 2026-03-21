import { create } from 'zustand'
import type { SeaFasteningResult, SeaFasteningResultInsert } from '../types/database'
import {
  loadAllSeaFasteningResults as fetchAll,
  saveSeaFasteningResult as persistResult,
} from '../lib/supabase/seafasteningService'

type SeaFasteningState = {
  /** Sea fastening results keyed by project_equipment_id. */
  results: Record<string, SeaFasteningResult>
  isLoading: boolean
  isSaving: boolean
  error: string | null

  /** Load all sea fastening results for all equipment items in a project. */
  loadAll: (projectId: string) => Promise<void>
  /** Insert or update a sea fastening result for a project equipment item. */
  saveResult: (result: SeaFasteningResultInsert) => Promise<void>
  /** Clear local state (e.g. when navigating away from a project). */
  clear: () => void
}

export const useSeaFasteningStore = create<SeaFasteningState>((set) => ({
  results: {},
  isLoading: false,
  isSaving: false,
  error: null,

  loadAll: async (projectId) => {
    set({ isLoading: true, error: null })
    const { data, error } = await fetchAll(projectId)
    if (error) {
      set({ isLoading: false, error })
      return
    }
    const mapped: Record<string, SeaFasteningResult> = {}
    for (const r of data ?? []) {
      mapped[r.project_equipment_id] = r
    }
    set({ results: mapped, isLoading: false })
  },

  saveResult: async (result) => {
    set({ isSaving: true, error: null })
    const { data, error } = await persistResult(result)
    if (error) {
      set({ isSaving: false, error })
      return
    }
    if (!data) {
      set({ isSaving: false })
      return
    }
    set((state) => ({
      results: { ...state.results, [data.project_equipment_id]: data },
      isSaving: false,
    }))
  },

  clear: () => set({ results: {}, isLoading: false, isSaving: false, error: null }),
}))
