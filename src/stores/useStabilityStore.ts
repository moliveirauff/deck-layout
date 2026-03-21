import { create } from 'zustand'
import type { StabilityResult, StabilityResultInsert } from '../types/database'
import {
  loadStabilityResult as fetchResult,
  saveStabilityResult as persistResult,
} from '../lib/supabase/stabilityService'

type StabilityState = {
  /** The stability result for the current project, or null if not yet calculated. */
  result: StabilityResult | null
  isLoading: boolean
  isSaving: boolean
  error: string | null

  /** Load the stability result for a project. */
  loadResult: (projectId: string) => Promise<void>
  /** Insert or update the stability result for a project. */
  saveResult: (result: StabilityResultInsert) => Promise<void>
  /** Clear local state (e.g. when navigating away from a project). */
  clear: () => void
}

export const useStabilityStore = create<StabilityState>((set) => ({
  result: null,
  isLoading: false,
  isSaving: false,
  error: null,

  loadResult: async (projectId) => {
    set({ isLoading: true, error: null })
    const { data, error } = await fetchResult(projectId)
    if (error) {
      set({ isLoading: false, error })
      return
    }
    set({ result: data, isLoading: false })
  },

  saveResult: async (result) => {
    set({ isSaving: true, error: null })
    const { data, error } = await persistResult(result)
    if (error) {
      set({ isSaving: false, error })
      return
    }
    set({ result: data, isSaving: false })
  },

  clear: () => set({ result: null, isLoading: false, isSaving: false, error: null }),
}))
