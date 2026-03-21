import { supabase } from '../supabase'
import type {
  LoweringResult,
  LoweringResultInsert,
  CurrentProfileEntry,
  CurrentProfileEntryInsert,
} from '../../types/database'

type ServiceResult<T> = Promise<{ data: T | null; error: string | null }>

// ─── Lowering Results ─────────────────────────────────────────────────────────

/**
 * Load the lowering result for a specific project equipment item.
 * Returns null data (not an error) when no result exists yet.
 */
export async function loadLoweringResult(
  projectEquipmentId: string,
): ServiceResult<LoweringResult> {
  try {
    const { data, error } = await supabase
      .from('lowering_result')
      .select('*')
      .eq('project_equipment_id', projectEquipmentId)
      .maybeSingle()
    if (error) return { data: null, error: error.message }
    return { data: data as LoweringResult | null, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/**
 * Load all lowering results for all equipment items in a project.
 * Returns an array ordered by creation time.
 */
export async function loadAllLoweringResults(
  projectId: string,
): ServiceResult<LoweringResult[]> {
  try {
    const { data, error } = await supabase
      .from('lowering_result')
      .select('*, project_equipment!inner(project_id)')
      .eq('project_equipment.project_id', projectId)
      .order('created_at')
    if (error) return { data: null, error: error.message }
    return { data: data as LoweringResult[], error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/**
 * Insert or update multiple lowering results.
 * Each entry is upserted by project_equipment_id.
 */
export async function saveAllLoweringResults(
  results: LoweringResultInsert[],
): ServiceResult<LoweringResult[]> {
  try {
    if (results.length === 0) return { data: [], error: null }
    const { data, error } = await supabase
      .from('lowering_result')
      .upsert(results, { onConflict: 'project_equipment_id' })
      .select()
    if (error) return { data: null, error: error.message }
    return { data: data as LoweringResult[], error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

// ─── Current Profile ──────────────────────────────────────────────────────────

/**
 * Load all current profile entries for a project, ordered by depth ascending.
 */
export async function loadCurrentProfile(
  projectId: string,
): ServiceResult<CurrentProfileEntry[]> {
  try {
    const { data, error } = await supabase
      .from('current_profile_entry')
      .select('*')
      .eq('project_id', projectId)
      .order('depth_m')
    if (error) return { data: null, error: error.message }
    return { data: data as CurrentProfileEntry[], error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/**
 * Replace all current profile entries for a project with the provided array.
 * Deletes existing entries then batch-inserts the new set.
 */
export async function saveCurrentProfile(
  projectId: string,
  entries: Omit<CurrentProfileEntryInsert, 'project_id'>[],
): ServiceResult<CurrentProfileEntry[]> {
  try {
    const { error: deleteError } = await supabase
      .from('current_profile_entry')
      .delete()
      .eq('project_id', projectId)
    if (deleteError) return { data: null, error: deleteError.message }

    if (entries.length === 0) return { data: [], error: null }

    const rows: CurrentProfileEntryInsert[] = entries.map((e) => ({
      ...e,
      project_id: projectId,
    }))
    const { data, error } = await supabase
      .from('current_profile_entry')
      .insert(rows)
      .select()
      .order('depth_m')
    if (error) return { data: null, error: error.message }
    return { data: data as CurrentProfileEntry[], error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}
