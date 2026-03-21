import { supabase } from '../supabase'
import type { StabilityResult, StabilityResultInsert } from '../../types/database'

type ServiceResult<T> = Promise<{ data: T | null; error: string | null }>

// ─── Stability Results ────────────────────────────────────────────────────────

/**
 * Load the stability result for a project.
 * Returns null data (not an error) when no result has been calculated yet.
 */
export async function loadStabilityResult(
  projectId: string,
): ServiceResult<StabilityResult> {
  try {
    const { data, error } = await supabase
      .from('stability_result')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle()
    if (error) return { data: null, error: error.message }
    return { data: data as StabilityResult | null, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/**
 * Insert or update the stability result for a project.
 * Upserts by project_id — only one stability result per project is kept.
 */
export async function saveStabilityResult(
  result: StabilityResultInsert,
): ServiceResult<StabilityResult> {
  try {
    const { data, error } = await supabase
      .from('stability_result')
      .upsert(result, { onConflict: 'project_id' })
      .select()
      .single()
    if (error) return { data: null, error: error.message }
    return { data: data as StabilityResult, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}
