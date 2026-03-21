import { create } from 'zustand'
import type {
  Vessel,
  VesselUpdate,
  VesselBarrier,
  VesselBarrierInsert,
  DeckLoadZone,
  DeckLoadZoneInsert,
  CraneCurvePoint,
  CraneCurvePointInsert,
} from '../types/database'
import {
  loadVessel as fetchVessel,
  loadVesselList,
  updateVessel as persistVesselUpdate,
  deleteVessel as persistDeleteVessel,
  saveVesselBarriers,
  loadVesselBarriers,
  saveDeckLoadZones,
  loadDeckLoadZones,
  saveCraneCurve,
  loadCraneCurve,
  type VesselListItem,
} from '../lib/supabase/vesselService'

type VesselState = {
  /** All vessels with embedded crane curve points — for the vessel list page. */
  vessels: VesselListItem[]
  /** Active vessel being edited — for the vessel editor page. */
  vessel: Vessel | null
  barriers: VesselBarrier[]
  deckLoadZones: DeckLoadZone[]
  craneCurve: CraneCurvePoint[]
  isLoading: boolean
  isSaving: boolean
  error: string | null

  /** Load all vessels with crane curve points for the vessel list page. */
  loadVessels: () => Promise<void>
  /** Load vessel, barriers, deck load zones, and crane curve in parallel. */
  loadVessel: (id: string) => Promise<void>
  /** Apply a partial update to the in-memory vessel (does not persist). */
  updateVessel: (updates: VesselUpdate) => void
  /** Persist the current in-memory vessel to Supabase. */
  saveVessel: () => Promise<void>
  /**
   * Delete a vessel by id. Removes it from the vessels list on success.
   * Returns the error string if deletion fails (e.g. FK constraint from projects).
   */
  deleteVessel: (id: string) => Promise<string | null>

  /** Add a barrier to local state and persist the full barrier list. */
  addBarrier: (barrier: Omit<VesselBarrierInsert, 'vessel_id'>) => Promise<void>
  /** Remove a barrier by id from local state and persist the updated list. */
  removeBarrier: (id: string) => Promise<void>

  /** Add a deck load zone to local state and persist the full zone list. */
  addDeckLoadZone: (zone: Omit<DeckLoadZoneInsert, 'vessel_id'>) => Promise<void>
  /** Remove a deck load zone by id from local state and persist the updated list. */
  removeDeckLoadZone: (id: string) => Promise<void>

  /**
   * Replace the entire crane curve with new points and persist.
   * Points will be sorted by radius_m on the server.
   */
  setCraneCurve: (points: Omit<CraneCurvePointInsert, 'vessel_id'>[]) => Promise<void>
}

export const useVesselStore = create<VesselState>((set, get) => ({
  vessels: [],
  vessel: null,
  barriers: [],
  deckLoadZones: [],
  craneCurve: [],
  isLoading: false,
  isSaving: false,
  error: null,

  loadVessels: async () => {
    set({ isLoading: true, error: null })
    const { data, error } = await loadVesselList()
    if (error) {
      set({ isLoading: false, error })
      return
    }
    set({ vessels: data ?? [], isLoading: false })
  },

  loadVessel: async (id) => {
    set({ isLoading: true, error: null })
    const [vesselResult, barriersResult, zonesResult, curveResult] =
      await Promise.all([
        fetchVessel(id),
        loadVesselBarriers(id),
        loadDeckLoadZones(id),
        loadCraneCurve(id),
      ])

    if (vesselResult.error) {
      set({ isLoading: false, error: vesselResult.error })
      return
    }

    set({
      vessel: vesselResult.data,
      barriers: barriersResult.data ?? [],
      deckLoadZones: zonesResult.data ?? [],
      craneCurve: curveResult.data ?? [],
      isLoading: false,
      error: null,
    })
  },

  updateVessel: (updates) => {
    const { vessel } = get()
    if (!vessel) return
    set({ vessel: { ...vessel, ...updates } })
  },

  saveVessel: async () => {
    const { vessel } = get()
    if (!vessel) return
    set({ isSaving: true, error: null })
    const { data, error } = await persistVesselUpdate(vessel.id, vessel)
    if (error) {
      set({ isSaving: false, error })
      return
    }
    set({ vessel: data, isSaving: false })
  },

  deleteVessel: async (id) => {
    const { error } = await persistDeleteVessel(id)
    if (!error) {
      set((state) => ({ vessels: state.vessels.filter((v) => v.id !== id) }))
    }
    return error
  },

  addBarrier: async (barrier) => {
    const { vessel, barriers } = get()
    if (!vessel) return
    const tempId = crypto.randomUUID()
    const optimistic: VesselBarrier = {
      ...barrier,
      vessel_id: vessel.id,
      id: tempId,
      height_m: barrier.height_m ?? 1.0,
      created_at: new Date().toISOString(),
    }
    set({ barriers: [...barriers, optimistic], isSaving: true, error: null })

    const withoutTempId = [...barriers, optimistic].map(
      ({ id: _id, created_at: _ca, ...rest }) => rest,
    )
    const { data, error } = await saveVesselBarriers(vessel.id, withoutTempId)
    if (error) {
      // Revert on failure
      set({ barriers, isSaving: false, error })
      return
    }
    set({ barriers: data ?? [], isSaving: false })
  },

  removeBarrier: async (id) => {
    const { vessel, barriers } = get()
    if (!vessel) return
    const updated = barriers.filter((b) => b.id !== id)
    set({ barriers: updated, isSaving: true, error: null })

    const rows = updated.map(({ id: _id, created_at: _ca, vessel_id: _vid, ...rest }) => rest)
    const { data, error } = await saveVesselBarriers(vessel.id, rows)
    if (error) {
      set({ barriers, isSaving: false, error })
      return
    }
    set({ barriers: data ?? [], isSaving: false })
  },

  addDeckLoadZone: async (zone) => {
    const { vessel, deckLoadZones } = get()
    if (!vessel) return
    const tempId = crypto.randomUUID()
    const optimistic: DeckLoadZone = {
      ...zone,
      vessel_id: vessel.id,
      id: tempId,
      created_at: new Date().toISOString(),
    }
    set({ deckLoadZones: [...deckLoadZones, optimistic], isSaving: true, error: null })

    const withoutTempId = [...deckLoadZones, optimistic].map(
      ({ id: _id, created_at: _ca, ...rest }) => rest,
    )
    const { data, error } = await saveDeckLoadZones(vessel.id, withoutTempId)
    if (error) {
      set({ deckLoadZones, isSaving: false, error })
      return
    }
    set({ deckLoadZones: data ?? [], isSaving: false })
  },

  removeDeckLoadZone: async (id) => {
    const { vessel, deckLoadZones } = get()
    if (!vessel) return
    const updated = deckLoadZones.filter((z) => z.id !== id)
    set({ deckLoadZones: updated, isSaving: true, error: null })

    const rows = updated.map(
      ({ id: _id, created_at: _ca, vessel_id: _vid, ...rest }) => rest,
    )
    const { data, error } = await saveDeckLoadZones(vessel.id, rows)
    if (error) {
      set({ deckLoadZones, isSaving: false, error })
      return
    }
    set({ deckLoadZones: data ?? [], isSaving: false })
  },

  setCraneCurve: async (points) => {
    const { vessel } = get()
    if (!vessel) return
    set({ isSaving: true, error: null })
    const { data, error } = await saveCraneCurve(vessel.id, points)
    if (error) {
      set({ isSaving: false, error })
      return
    }
    set({ craneCurve: data ?? [], isSaving: false })
  },
}))
