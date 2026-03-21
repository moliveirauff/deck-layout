import { create } from 'zustand'
import type { RaoEntry, RaoEntryInsert, VesselRaoEntry, VesselRaoEntryInsert } from '../types/database'
import {
  loadRaoEntries,
  saveRaoEntries as persistRaoEntries,
  loadVesselRaoEntries,
  saveVesselRaoEntries as persistVesselRaoEntries,
} from '../lib/supabase/raoService'

type RaoState = {
  // ── Project RAO entries (used by Analysis page for crane tip calc) ───────────
  entries: RaoEntry[]
  isLoading: boolean
  isSaving: boolean
  error: string | null

  loadRaos: (projectId: string) => Promise<void>
  saveRaos: (projectId: string, entries: Omit<RaoEntryInsert, 'project_id'>[]) => Promise<void>
  clearRaos: () => void

  // ── Vessel RAO entries (used by Vessel Editor RAO tab) ───────────────────────
  vesselEntries: VesselRaoEntry[]
  isVesselLoading: boolean
  isVesselSaving: boolean
  vesselError: string | null

  loadVesselRaos: (vesselId: string) => Promise<void>
  saveVesselRaos: (vesselId: string, entries: Omit<VesselRaoEntryInsert, 'vessel_id'>[]) => Promise<void>
  clearVesselRaos: () => void
}

export const useRaoStore = create<RaoState>((set) => ({
  // ── Project RAO ──────────────────────────────────────────────────────────────
  entries: [],
  isLoading: false,
  isSaving: false,
  error: null,

  loadRaos: async (projectId) => {
    set({ isLoading: true, error: null })
    const { data, error } = await loadRaoEntries(projectId)
    if (error) {
      set({ isLoading: false, error })
      return
    }
    set({ entries: data ?? [], isLoading: false })
  },

  saveRaos: async (projectId, entries) => {
    set({ isSaving: true, error: null })
    const { data, error } = await persistRaoEntries(projectId, entries)
    if (error) {
      set({ isSaving: false, error })
      return
    }
    set({ entries: data ?? [], isSaving: false })
  },

  clearRaos: () => {
    set({ entries: [], error: null })
  },

  // ── Vessel RAO ───────────────────────────────────────────────────────────────
  vesselEntries: [],
  isVesselLoading: false,
  isVesselSaving: false,
  vesselError: null,

  loadVesselRaos: async (vesselId) => {
    set({ isVesselLoading: true, vesselError: null })
    const { data, error } = await loadVesselRaoEntries(vesselId)
    if (error) {
      set({ isVesselLoading: false, vesselError: error })
      return
    }
    set({ vesselEntries: data ?? [], isVesselLoading: false })
  },

  saveVesselRaos: async (vesselId, entries) => {
    set({ isVesselSaving: true, vesselError: null })
    const { data, error } = await persistVesselRaoEntries(vesselId, entries)
    if (error) {
      set({ isVesselSaving: false, vesselError: error })
      return
    }
    set({ vesselEntries: data ?? [], isVesselSaving: false })
  },

  clearVesselRaos: () => {
    set({ vesselEntries: [], vesselError: null })
  },
}))
