import { supabase } from '../supabase'
import type { RaoEntry, RaoEntryInsert, VesselRaoEntry, VesselRaoEntryInsert } from '../../types/database'

type ServiceResult<T> = Promise<{ data: T | null; error: string | null }>

// ─── Project RAO entries ──────────────────────────────────────────────────────

/**
 * Load all RAO entries for a project.
 * Ordered by wave_direction_deg then wave_period_s for consistent table display.
 */
export async function loadRaoEntries(projectId: string): ServiceResult<RaoEntry[]> {
  try {
    const { data, error } = await supabase
      .from('rao_entry')
      .select('*')
      .eq('project_id', projectId)
      .order('wave_direction_deg')
      .order('wave_period_s')
    if (error) return { data: null, error: error.message }
    return { data: data as RaoEntry[], error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/**
 * Replace all RAO entries for a project with the provided array.
 * Deletes existing entries then batch-inserts the new set.
 */
export async function saveRaoEntries(
  projectId: string,
  entries: Omit<RaoEntryInsert, 'project_id'>[],
): ServiceResult<RaoEntry[]> {
  try {
    const { error: deleteError } = await supabase
      .from('rao_entry')
      .delete()
      .eq('project_id', projectId)
    if (deleteError) return { data: null, error: deleteError.message }

    if (entries.length === 0) return { data: [], error: null }

    const rows: RaoEntryInsert[] = entries.map((e) => ({
      ...e,
      project_id: projectId,
    }))
    const { data, error } = await supabase
      .from('rao_entry')
      .insert(rows)
      .select()
    if (error) return { data: null, error: error.message }
    return { data: data as RaoEntry[], error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

// ─── Vessel RAO entries ───────────────────────────────────────────────────────

/**
 * Load all RAO entries for a vessel.
 * Ordered by wave_direction_deg then wave_period_s.
 */
export async function loadVesselRaoEntries(vesselId: string): ServiceResult<VesselRaoEntry[]> {
  try {
    const { data, error } = await supabase
      .from('vessel_rao_entry')
      .select('*')
      .eq('vessel_id', vesselId)
      .order('wave_direction_deg')
      .order('wave_period_s')
    if (error) return { data: null, error: error.message }
    return { data: data as VesselRaoEntry[], error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/**
 * Replace all RAO entries for a vessel with the provided array.
 * Deletes existing entries then batch-inserts the new set.
 */
export async function saveVesselRaoEntries(
  vesselId: string,
  entries: Omit<VesselRaoEntryInsert, 'vessel_id'>[],
): ServiceResult<VesselRaoEntry[]> {
  try {
    const { error: deleteError } = await supabase
      .from('vessel_rao_entry')
      .delete()
      .eq('vessel_id', vesselId)
    if (deleteError) return { data: null, error: deleteError.message }

    if (entries.length === 0) return { data: [], error: null }

    const rows: VesselRaoEntryInsert[] = entries.map((e) => ({
      ...e,
      vessel_id: vesselId,
    }))
    const { data, error } = await supabase
      .from('vessel_rao_entry')
      .insert(rows)
      .select()
    if (error) return { data: null, error: error.message }
    return { data: data as VesselRaoEntry[], error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/**
 * Copy all RAO entries from a vessel into a project.
 * Called automatically when a new project is created.
 * Skips silently if the vessel has no RAO entries.
 */
export async function copyVesselRaosToProject(
  vesselId: string,
  projectId: string,
): ServiceResult<RaoEntry[]> {
  try {
    const { data: vesselRaos, error: loadErr } = await loadVesselRaoEntries(vesselId)
    if (loadErr) return { data: null, error: loadErr }
    if (!vesselRaos || vesselRaos.length === 0) return { data: [], error: null }

    const entries = vesselRaos.map(({ vessel_id: _v, id: _id, created_at: _ca, ...rest }) => rest)
    return saveRaoEntries(projectId, entries)
  } catch {
    return { data: null, error: 'Network error' }
  }
}
