import { supabase } from '../supabase'
import type { SeaFasteningResult, SeaFasteningResultInsert } from '../../types/database'

type ServiceResult<T> = Promise<{ data: T | null; error: string | null }>

// ─── Sea Fastening Results ────────────────────────────────────────────────────

/**
 * Load the sea fastening result for a specific project equipment item.
 * Returns null data (not an error) when no result exists yet.
 */
export async function loadSeaFasteningResult(
  projectEquipmentId: string,
): ServiceResult<SeaFasteningResult> {
  try {
    const { data, error } = await supabase
      .from('sea_fastening_result')
      .select('*')
      .eq('project_equipment_id', projectEquipmentId)
      .maybeSingle()
    if (error) return { data: null, error: error.message }
    return { data: data as SeaFasteningResult | null, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/**
 * Insert or update the sea fastening result for a project equipment item.
 * Upserts by project_equipment_id — only one result per equipment item is kept.
 */
export async function saveSeaFasteningResult(
  result: SeaFasteningResultInsert,
): ServiceResult<SeaFasteningResult> {
  try {
    const { data, error } = await supabase
      .from('sea_fastening_result')
      .upsert(result, { onConflict: 'project_equipment_id' })
      .select()
      .single()
    if (error) return { data: null, error: error.message }
    return { data: data as SeaFasteningResult, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/**
 * Load all sea fastening results for all equipment items in a project.
 * Returns an array ordered by creation time.
 */
export async function loadAllSeaFasteningResults(
  projectId: string,
): ServiceResult<SeaFasteningResult[]> {
  try {
    const { data, error } = await supabase
      .from('sea_fastening_result')
      .select('*, project_equipment!inner(project_id)')
      .eq('project_equipment.project_id', projectId)
      .order('created_at')
    if (error) return { data: null, error: error.message }
    return { data: data as SeaFasteningResult[], error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}
