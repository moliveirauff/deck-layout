import { create } from 'zustand'
import type {
  LoweringResult,
  LoweringResultInsert,
  CurrentProfileEntry,
  CurrentProfileEntryInsert,
} from '../types/database'
import {
  loadAllLoweringResults as fetchAll,
  saveAllLoweringResults as persistAll,
  loadCurrentProfile as fetchCurrentProfile,
  saveCurrentProfile as persistCurrentProfile,
} from '../lib/supabase/loweringService'

type LoweringState = {
  /** Lowering results keyed by project_equipment_id. */
  results: Record<string, LoweringResult>
  /** Current profile entries for the active project, ordered by depth ascending. */
  currentProfile: CurrentProfileEntry[]
  isLoading: boolean
  isSaving: boolean
  error: string | null

  /** Load all lowering results for all equipment items in a project. */
  loadAll: (projectId: string) => Promise<void>
  /** Load the current profile for a project. */
  loadCurrentProfile: (projectId: string) => Promise<void>
  /**
   * Replace the current profile for a project (replace-all semantics).
   * Persists the full set in one transaction.
   */
  saveCurrentProfile: (
    projectId: string,
    entries: Omit<CurrentProfileEntryInsert, 'project_id'>[],
  ) => Promise<void>
  /**
   * Insert or update multiple lowering results at once.
   * Upserts by project_equipment_id.
   */
  saveResults: (results: LoweringResultInsert[]) => Promise<void>
  /** Clear local state (e.g. when navigating away from a project). */
  clear: () => void
}

export const useLoweringStore = create<LoweringState>((set) => ({
  results: {},
  currentProfile: [],
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
    const mapped: Record<string, LoweringResult> = {}
    for (const r of data ?? []) {
      mapped[r.project_equipment_id] = r
    }
    set({ results: mapped, isLoading: false })
  },

  loadCurrentProfile: async (projectId) => {
    set({ isLoading: true, error: null })
    const { data, error } = await fetchCurrentProfile(projectId)
    if (error) {
      set({ isLoading: false, error })
      return
    }
    set({ currentProfile: data ?? [], isLoading: false })
  },

  saveCurrentProfile: async (projectId, entries) => {
    set({ isSaving: true, error: null })
    const { data, error } = await persistCurrentProfile(projectId, entries)
    if (error) {
      set({ isSaving: false, error })
      return
    }
    set({ currentProfile: data ?? [], isSaving: false })
  },

  saveResults: async (results) => {
    set({ isSaving: true, error: null })
    const { data, error } = await persistAll(results)
    if (error) {
      set({ isSaving: false, error })
      return
    }
    const mapped: Record<string, LoweringResult> = {}
    for (const r of data ?? []) {
      mapped[r.project_equipment_id] = r
    }
    set((state) => ({
      results: { ...state.results, ...mapped },
      isSaving: false,
    }))
  },

  clear: () =>
    set({ results: {}, currentProfile: [], isLoading: false, isSaving: false, error: null }),
}))
