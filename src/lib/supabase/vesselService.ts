import { supabase } from '../supabase'
import type {
  Vessel,
  VesselInsert,
  VesselUpdate,
  VesselBarrier,
  VesselBarrierInsert,
  DeckLoadZone,
  DeckLoadZoneInsert,
  CraneCurvePoint,
  CraneCurvePointInsert,
} from '../../types/database'

type ServiceResult<T> = Promise<{ data: T | null; error: string | null }>

/**
 * Vessel record with embedded crane curve points.
 * Returned by loadVesselList for the vessel list page — avoids N+1 queries.
 */
export type VesselListItem = Vessel & {
  crane_curve_point: Array<{ radius_m: number; capacity_t: number }>
}

// ─── Vessel CRUD ──────────────────────────────────────────────────────────────

/** Load all vessels from the global library, ordered by name. */
export async function loadVessels(): ServiceResult<Vessel[]> {
  try {
    const { data, error } = await supabase
      .from('vessel')
      .select('*')
      .order('name')
    if (error) return { data: null, error: error.message }
    return { data: data as Vessel[], error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/**
 * Load all vessels with their crane curve points embedded (single query).
 * Used by the vessel list page to show max crane capacity without N+1 queries.
 */
export async function loadVesselList(): ServiceResult<VesselListItem[]> {
  try {
    const { data, error } = await supabase
      .from('vessel')
      .select('*, crane_curve_point(radius_m, capacity_t)')
      .order('name')
    if (error) return { data: null, error: error.message }
    return { data: data as VesselListItem[], error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/** Load a single vessel by id. */
export async function loadVessel(id: string): ServiceResult<Vessel> {
  try {
    const { data, error } = await supabase
      .from('vessel')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return { data: null, error: error.message }
    return { data: data as Vessel, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/**
 * Insert or update a vessel.
 * Pass `id` in the payload to update an existing record; omit to create a new one.
 */
export async function saveVessel(
  vessel: VesselInsert & { id?: string },
): ServiceResult<Vessel> {
  try {
    const { data, error } = await supabase
      .from('vessel')
      .upsert(vessel)
      .select()
      .single()
    if (error) return { data: null, error: error.message }
    return { data: data as Vessel, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/** Update specific fields on an existing vessel. */
export async function updateVessel(
  id: string,
  updates: VesselUpdate,
): ServiceResult<Vessel> {
  try {
    const { data, error } = await supabase
      .from('vessel')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) return { data: null, error: error.message }
    return { data: data as Vessel, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/**
 * Delete a vessel.
 * Fails with a foreign-key error if any project references this vessel (ON DELETE RESTRICT).
 */
export async function deleteVessel(
  id: string,
): ServiceResult<null> {
  try {
    const { error } = await supabase.from('vessel').delete().eq('id', id)
    if (error) return { data: null, error: error.message }
    return { data: null, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

// ─── Vessel Barriers ──────────────────────────────────────────────────────────

/** Load all barriers for a vessel, ordered by name. */
export async function loadVesselBarriers(
  vesselId: string,
): ServiceResult<VesselBarrier[]> {
  try {
    const { data, error } = await supabase
      .from('vessel_barrier')
      .select('*')
      .eq('vessel_id', vesselId)
      .order('name')
    if (error) return { data: null, error: error.message }
    return { data: data as VesselBarrier[], error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/**
 * Replace all barriers for a vessel with the provided array.
 * Deletes existing barriers then batch-inserts the new set.
 */
export async function saveVesselBarriers(
  vesselId: string,
  barriers: Omit<VesselBarrierInsert, 'vessel_id'>[],
): ServiceResult<VesselBarrier[]> {
  try {
    const { error: deleteError } = await supabase
      .from('vessel_barrier')
      .delete()
      .eq('vessel_id', vesselId)
    if (deleteError) return { data: null, error: deleteError.message }

    if (barriers.length === 0) return { data: [], error: null }

    const rows: VesselBarrierInsert[] = barriers.map((b) => ({
      ...b,
      vessel_id: vesselId,
    }))
    const { data, error } = await supabase
      .from('vessel_barrier')
      .insert(rows)
      .select()
    if (error) return { data: null, error: error.message }
    return { data: data as VesselBarrier[], error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

// ─── Deck Load Zones ──────────────────────────────────────────────────────────

/** Load all deck load zones for a vessel, ordered by name. */
export async function loadDeckLoadZones(
  vesselId: string,
): ServiceResult<DeckLoadZone[]> {
  try {
    const { data, error } = await supabase
      .from('deck_load_zone')
      .select('*')
      .eq('vessel_id', vesselId)
      .order('name')
    if (error) return { data: null, error: error.message }
    return { data: data as DeckLoadZone[], error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/**
 * Replace all deck load zones for a vessel with the provided array.
 * Deletes existing zones then batch-inserts the new set.
 */
export async function saveDeckLoadZones(
  vesselId: string,
  zones: Omit<DeckLoadZoneInsert, 'vessel_id'>[],
): ServiceResult<DeckLoadZone[]> {
  try {
    const { error: deleteError } = await supabase
      .from('deck_load_zone')
      .delete()
      .eq('vessel_id', vesselId)
    if (deleteError) return { data: null, error: deleteError.message }

    if (zones.length === 0) return { data: [], error: null }

    const rows: DeckLoadZoneInsert[] = zones.map((z) => ({
      ...z,
      vessel_id: vesselId,
    }))
    const { data, error } = await supabase
      .from('deck_load_zone')
      .insert(rows)
      .select()
    if (error) return { data: null, error: error.message }
    return { data: data as DeckLoadZone[], error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

// ─── Crane Curve ──────────────────────────────────────────────────────────────

/**
 * Load all crane curve points for a vessel, ordered by radius ascending.
 * Use linear interpolation between adjacent points to find capacity at any radius.
 */
export async function loadCraneCurve(
  vesselId: string,
): ServiceResult<CraneCurvePoint[]> {
  try {
    const { data, error } = await supabase
      .from('crane_curve_point')
      .select('*')
      .eq('vessel_id', vesselId)
      .order('radius_m')
    if (error) return { data: null, error: error.message }
    return { data: data as CraneCurvePoint[], error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/**
 * Replace all crane curve points for a vessel with the provided array.
 * Deletes existing points then batch-inserts the new set.
 */
export async function saveCraneCurve(
  vesselId: string,
  points: Omit<CraneCurvePointInsert, 'vessel_id'>[],
): ServiceResult<CraneCurvePoint[]> {
  try {
    const { error: deleteError } = await supabase
      .from('crane_curve_point')
      .delete()
      .eq('vessel_id', vesselId)
    if (deleteError) return { data: null, error: deleteError.message }

    if (points.length === 0) return { data: [], error: null }

    const rows: CraneCurvePointInsert[] = points.map((p) => ({
      ...p,
      vessel_id: vesselId,
    }))
    const { data, error } = await supabase
      .from('crane_curve_point')
      .insert(rows)
      .select()
      .order('radius_m')
    if (error) return { data: null, error: error.message }
    return { data: data as CraneCurvePoint[], error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}
