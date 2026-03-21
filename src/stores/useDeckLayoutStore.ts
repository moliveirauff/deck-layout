import { create } from 'zustand'
import type { ProjectEquipment, ProjectEquipmentInsert } from '../types/database'
import {
  loadProjectEquipment as fetchEquipment,
  addEquipmentToProject,
  updateEquipmentPosition,
  removeEquipmentFromProject,
} from '../lib/supabase/projectEquipmentService'

type DeckLayoutState = {
  items: ProjectEquipment[]
  selectedEquipmentId: string | null
  isLoading: boolean
  isSaving: boolean
  error: string | null

  /** Load all equipment placements for the given project. */
  loadProjectEquipment: (projectId: string) => Promise<void>
  /** Add an equipment item from the global library onto the deck. */
  addToProject: (placement: ProjectEquipmentInsert) => Promise<void>
  /**
   * Update the deck position (x, y) and any pre-computed crane geometry fields.
   * Pass only the fields that have changed.
   */
  updatePosition: (
    id: string,
    updates: Partial<
      Pick<
        ProjectEquipment,
        | 'deck_pos_x'
        | 'deck_pos_y'
        | 'crane_slew_deck_deg'
        | 'crane_boom_angle_deck_deg'
        | 'crane_radius_deck_m'
        | 'crane_capacity_deck_t'
        | 'deck_load_ok'
        | 'capacity_check_deck_ok'
      >
    >,
  ) => Promise<void>
  /** Convenience wrapper to update rotation angle only. */
  updateRotation: (id: string, deg: number) => Promise<void>
  /** Remove an equipment placement (cascades to analysis results). */
  removeFromProject: (id: string) => Promise<void>
  /** Set the currently selected equipment item (null to deselect). */
  setSelectedEquipment: (id: string | null) => void
}

export const useDeckLayoutStore = create<DeckLayoutState>((set, get) => ({
  items: [],
  selectedEquipmentId: null,
  isLoading: false,
  isSaving: false,
  error: null,

  loadProjectEquipment: async (projectId) => {
    set({ isLoading: true, error: null })
    const { data, error } = await fetchEquipment(projectId)
    if (error) {
      set({ isLoading: false, error })
      return
    }
    set({ items: data ?? [], isLoading: false })
  },

  addToProject: async (placement) => {
    set({ isSaving: true, error: null })
    const { data, error } = await addEquipmentToProject(placement)
    if (error) {
      set({ isSaving: false, error })
      return
    }
    if (data) {
      set((state) => ({ items: [...state.items, data], isSaving: false }))
    }
  },

  updatePosition: async (id, updates) => {
    // Optimistic update for responsive canvas interaction
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item,
      ),
      isSaving: true,
      error: null,
    }))
    const { data, error } = await updateEquipmentPosition(id, updates)
    if (error) {
      // Reload from Supabase to restore consistent state on failure
      const { projectId } = (() => {
        const item = get().items.find((i) => i.id === id)
        return { projectId: item?.project_id ?? null }
      })()
      set({ isSaving: false, error })
      if (projectId) {
        const { data: fresh } = await fetchEquipment(projectId)
        if (fresh) set({ items: fresh })
      }
      return
    }
    if (data) {
      set((state) => ({
        items: state.items.map((item) => (item.id === id ? data : item)),
        isSaving: false,
      }))
    }
  },

  updateRotation: async (id, deg) => {
    await get().updatePosition(id, { deck_rotation_deg: deg } as Parameters<DeckLayoutState['updatePosition']>[1])
  },

  removeFromProject: async (id) => {
    const previous = get().items
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
      selectedEquipmentId: state.selectedEquipmentId === id ? null : state.selectedEquipmentId,
      isSaving: true,
      error: null,
    }))
    const { error } = await removeEquipmentFromProject(id)
    if (error) {
      set({ items: previous, isSaving: false, error })
      return
    }
    set({ isSaving: false })
  },

  setSelectedEquipment: (id) => {
    set({ selectedEquipmentId: id })
  },
}))
