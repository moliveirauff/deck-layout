import { supabase } from '../supabase'
import type {
  ScatterDiagramEntry,
  ScatterDiagramEntryInsert,
  WeatherWindowResult,
  WeatherWindowResultInsert,
} from '../../types/database'

type ServiceResult<T> = Promise<{ data: T | null; error: string | null }>

// ─── Scatter Diagram ──────────────────────────────────────────────────────────

/**
 * Load all scatter diagram entries for a project.
 * Ordered by hs_m then tp_s for consistent grid display.
 */
export async function loadScatterDiagram(
  projectId: string,
): ServiceResult<ScatterDiagramEntry[]> {
  try {
    const { data, error } = await supabase
      .from('scatter_diagram_entry')
      .select('*')
      .eq('project_id', projectId)
      .order('hs_m')
      .order('tp_s')
    if (error) return { data: null, error: error.message }
    return { data: data as ScatterDiagramEntry[], error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/**
 * Replace all scatter diagram entries for a project with the provided array.
 * Deletes existing entries then batch-inserts the new set.
 * All entries should sum to ~100% occurrence.
 */
export async function saveScatterDiagram(
  projectId: string,
  entries: Omit<ScatterDiagramEntryInsert, 'project_id'>[],
): ServiceResult<ScatterDiagramEntry[]> {
  try {
    const { error: deleteError } = await supabase
      .from('scatter_diagram_entry')
      .delete()
      .eq('project_id', projectId)
    if (deleteError) return { data: null, error: deleteError.message }

    if (entries.length === 0) return { data: [], error: null }

    const rows: ScatterDiagramEntryInsert[] = entries.map((e) => ({
      ...e,
      project_id: projectId,
    }))
    const { data, error } = await supabase
      .from('scatter_diagram_entry')
      .insert(rows)
      .select()
    if (error) return { data: null, error: error.message }
    return { data: data as ScatterDiagramEntry[], error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

// ─── Weather Window Results ───────────────────────────────────────────────────

/**
 * Save a weather window analysis result for a project equipment item.
 * Replaces any existing result for the same project_equipment_id (1:1 relationship).
 */
export async function saveWeatherResult(
  result: WeatherWindowResultInsert,
): ServiceResult<WeatherWindowResult> {
  try {
    // Delete existing result for this equipment item before inserting the new one.
    const { error: deleteError } = await supabase
      .from('weather_window_result')
      .delete()
      .eq('project_equipment_id', result.project_equipment_id)
    if (deleteError) return { data: null, error: deleteError.message }

    const { data, error } = await supabase
      .from('weather_window_result')
      .insert(result)
      .select()
      .single()
    if (error) return { data: null, error: error.message }
    return { data: data as WeatherWindowResult, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/**
 * Load the weather window result for a project equipment item.
 * Returns null data (not an error) if no analysis has been run yet.
 */
export async function loadWeatherResult(
  projectEquipmentId: string,
): ServiceResult<WeatherWindowResult> {
  try {
    const { data, error } = await supabase
      .from('weather_window_result')
      .select('*')
      .eq('project_equipment_id', projectEquipmentId)
      .maybeSingle()
    if (error) return { data: null, error: error.message }
    return { data: (data as WeatherWindowResult) ?? null, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}
