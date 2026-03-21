import { create } from 'zustand'
import type {
  EquipmentLibrary,
  EquipmentLibraryInsert,
  EquipmentLibraryUpdate,
} from '../types/database'
import {
  loadEquipment as fetchEquipment,
  saveEquipment as persistEquipment,
  updateEquipment as persistUpdate,
  deleteEquipment as persistDelete,
} from '../lib/supabase/equipmentService'

type EquipmentState = {
  items: EquipmentLibrary[]
  isLoading: boolean
  isSaving: boolean
  error: string | null

  /** Load all equipment items from the global library. */
  loadEquipment: () => Promise<void>
  /** Create a new equipment item and add it to the local list. */
  addEquipment: (equipment: EquipmentLibraryInsert) => Promise<void>
  /** Update an existing equipment item in place. */
  updateEquipment: (id: string, updates: EquipmentLibraryUpdate) => Promise<void>
  /** Delete an equipment item. Fails if referenced by any project. */
  deleteEquipment: (id: string) => Promise<void>
}

export const useEquipmentStore = create<EquipmentState>((set, get) => ({
  items: [],
  isLoading: false,
  isSaving: false,
  error: null,

  loadEquipment: async () => {
    set({ isLoading: true, error: null })
    const { data, error } = await fetchEquipment()
    if (error) {
      set({ isLoading: false, error })
      return
    }
    set({ items: data ?? [], isLoading: false })
  },

  addEquipment: async (equipment) => {
    set({ isSaving: true, error: null })
    const { data, error } = await persistEquipment(equipment)
    if (error) {
      set({ isSaving: false, error })
      return
    }
    if (data) {
      set((state) => ({ items: [...state.items, data], isSaving: false }))
    }
  },

  updateEquipment: async (id, updates) => {
    set({ isSaving: true, error: null })
    const { data, error } = await persistUpdate(id, updates)
    if (error) {
      set({ isSaving: false, error })
      return
    }
    if (data) {
      set((state) => ({
        items: state.items.map((item) => (item.id === id ? data : item)),
        isSaving: false,
      }))
    }
  },

  deleteEquipment: async (id) => {
    const previous = get().items
    // Optimistic removal
    set((state) => ({ items: state.items.filter((i) => i.id !== id), isSaving: true, error: null }))
    const { error } = await persistDelete(id)
    if (error) {
      // Revert on failure (e.g. FK restrict)
      set({ items: previous, isSaving: false, error })
      return
    }
    set({ isSaving: false })
  },
}))
