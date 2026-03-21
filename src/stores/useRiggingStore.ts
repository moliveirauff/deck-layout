import { create } from 'zustand'
import type { RiggingItem, RiggingItemInsert, ProjectEquipmentRigging, ProjectEquipmentRiggingInsert } from '../types/database'
import {
  loadRiggingItems as fetchRiggingItems,
  saveRiggingItem as persistRiggingItem,
  deleteRiggingItem as persistDeleteRiggingItem,
  loadProjectEquipmentRigging as fetchArrangement,
  saveProjectEquipmentRigging as persistArrangement,
} from '../lib/supabase/riggingService'

type RiggingState = {
  /** Global rigging item library. */
  items: RiggingItem[]
  isLoading: boolean
  error: string | null

  /** Rigging arrangements keyed by project_equipment_id. */
  arrangements: Record<string, ProjectEquipmentRigging[]>
  isArrangementLoading: boolean
  arrangementError: string | null

  /** Load all rigging items from the global library. */
  loadItems: () => Promise<void>
  /** Insert or update a rigging item in the library. */
  saveItem: (item: RiggingItemInsert & { id?: string }) => Promise<void>
  /** Delete a rigging item from the library. */
  deleteItem: (id: string) => Promise<void>

  /** Load the rigging arrangement for a project equipment item. */
  loadArrangement: (projectEquipmentId: string) => Promise<void>
  /**
   * Replace the rigging arrangement for a project equipment item.
   * Persists the full set (replace-all semantics).
   */
  saveArrangement: (
    projectEquipmentId: string,
    entries: Omit<ProjectEquipmentRiggingInsert, 'project_equipment_id'>[],
  ) => Promise<void>
}

export const useRiggingStore = create<RiggingState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  arrangements: {},
  isArrangementLoading: false,
  arrangementError: null,

  loadItems: async () => {
    set({ isLoading: true, error: null })
    const { data, error } = await fetchRiggingItems()
    if (error) {
      set({ isLoading: false, error })
      return
    }
    set({ items: data ?? [], isLoading: false })
  },

  saveItem: async (item) => {
    set({ isLoading: true, error: null })
    const { data, error } = await persistRiggingItem(item)
    if (error) {
      set({ isLoading: false, error })
      return
    }
    if (!data) {
      set({ isLoading: false })
      return
    }
    const { items } = get()
    const exists = items.some((i) => i.id === data.id)
    set({
      items: exists
        ? items.map((i) => (i.id === data.id ? data : i))
        : [...items, data],
      isLoading: false,
    })
  },

  deleteItem: async (id) => {
    set({ isLoading: true, error: null })
    const { error } = await persistDeleteRiggingItem(id)
    if (error) {
      set({ isLoading: false, error })
      return
    }
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
      isLoading: false,
    }))
  },

  loadArrangement: async (projectEquipmentId) => {
    set({ isArrangementLoading: true, arrangementError: null })
    const { data, error } = await fetchArrangement(projectEquipmentId)
    if (error) {
      set({ isArrangementLoading: false, arrangementError: error })
      return
    }
    set((state) => ({
      arrangements: {
        ...state.arrangements,
        [projectEquipmentId]: data ?? [],
      },
      isArrangementLoading: false,
    }))
  },

  saveArrangement: async (projectEquipmentId, entries) => {
    set({ isArrangementLoading: true, arrangementError: null })
    const { data, error } = await persistArrangement(projectEquipmentId, entries)
    if (error) {
      set({ isArrangementLoading: false, arrangementError: error })
      return
    }
    set((state) => ({
      arrangements: {
        ...state.arrangements,
        [projectEquipmentId]: data ?? [],
      },
      isArrangementLoading: false,
    }))
  },
}))
