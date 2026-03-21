import { supabase } from '../supabase'
import type {
  SplashZoneResult,
  SplashZoneResultInsert,
  SeaStateLimit,
  SeaStateLimitInsert,
} from '../../types/database'

type ServiceResult<T> = Promise<{ data: T | null; error: string | null }>

// ─── Splash Zone Results ──────────────────────────────────────────────────────

/**
 * Save a DNV splash zone analysis result for a project equipment item.
 * Replaces any existing result for the same project_equipment_id (1:1 relationship).
 */
export async function saveAnalysisResult(
  result: SplashZoneResultInsert,
): ServiceResult<SplashZoneResult> {
  try {
    // Delete existing result for this equipment item before inserting the new one.
    const { error: deleteError } = await supabase
      .from('splash_zone_result')
      .delete()
      .eq('project_equipment_id', result.project_equipment_id)
    if (deleteError) return { data: null, error: deleteError.message }

    const { data, error } = await supabase
      .from('splash_zone_result')
      .insert(result)
      .select()
      .single()
    if (error) return { data: null, error: error.message }
    return { data: data as SplashZoneResult, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/**
 * Load the splash zone analysis result for a project equipment item.
 * Returns null data (not an error) if no analysis has been run yet.
 */
export async function loadAnalysisResult(
  projectEquipmentId: string,
): ServiceResult<SplashZoneResult> {
  try {
    const { data, error } = await supabase
      .from('splash_zone_result')
      .select('*')
      .eq('project_equipment_id', projectEquipmentId)
      .maybeSingle()
    if (error) return { data: null, error: error.message }
    return { data: (data as SplashZoneResult) ?? null, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/**
 * Return the subset of the given project_equipment IDs that have a splash zone result.
 * Used by the overview page to show an "Analyzed" status column without N+1 queries.
 */
export async function loadAnalyzedEquipmentIds(
  projectEquipmentIds: string[],
): ServiceResult<string[]> {
  if (projectEquipmentIds.length === 0) return { data: [], error: null }
  try {
    const { data, error } = await supabase
      .from('splash_zone_result')
      .select('project_equipment_id')
      .in('project_equipment_id', projectEquipmentIds)
    if (error) return { data: null, error: error.message }
    return { data: (data ?? []).map((r) => r.project_equipment_id), error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

// ─── Sea State Limits ─────────────────────────────────────────────────────────

/**
 * Save the operability grid (Hs/Tp feasibility table) for a splash zone result.
 * Replaces any existing rows for this result_id.
 * Typical input: ~100–200 rows (Hs × Tp grid).
 */
export async function saveSeaStateLimits(
  resultId: string,
  limits: Omit<SeaStateLimitInsert, 'splash_zone_result_id'>[],
): ServiceResult<SeaStateLimit[]> {
  try {
    const { error: deleteError } = await supabase
      .from('sea_state_limit')
      .delete()
      .eq('splash_zone_result_id', resultId)
    if (deleteError) return { data: null, error: deleteError.message }

    if (limits.length === 0) return { data: [], error: null }

    const rows: SeaStateLimitInsert[] = limits.map((l) => ({
      ...l,
      splash_zone_result_id: resultId,
    }))
    const { data, error } = await supabase
      .from('sea_state_limit')
      .insert(rows)
      .select()
    if (error) return { data: null, error: error.message }
    return { data: data as SeaStateLimit[], error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/**
 * Load all sea state limit rows for a splash zone result.
 * Ordered by hs_m then tp_s for consistent grid display.
 */
export async function loadSeaStateLimits(
  resultId: string,
): ServiceResult<SeaStateLimit[]> {
  try {
    const { data, error } = await supabase
      .from('sea_state_limit')
      .select('*')
      .eq('splash_zone_result_id', resultId)
      .order('hs_m')
      .order('tp_s')
    if (error) return { data: null, error: error.message }
    return { data: data as SeaStateLimit[], error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}
