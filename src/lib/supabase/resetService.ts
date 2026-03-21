/**
 * resetService — delete all data from every table in FK-safe order.
 */

import { supabase } from '../supabase'

type ResetResult = { ok: boolean; error?: string }

/**
 * Delete all rows from every table in the correct FK-safe order
 * (children before parents).
 */
export async function resetAllData(): Promise<ResetResult> {
  // Tables ordered from leaf → root to respect foreign key constraints.
  const TABLES_IN_DELETE_ORDER = [
    'weather_window_result',
    'sea_state_limit',
    'splash_zone_result',
    'scatter_diagram_entry',
    'rao_entry',
    'project_equipment',
    'project',
    'crane_curve_point',
    'deck_load_zone',
    'vessel_barrier',
    'vessel_rao_entry',
    'vessel',
    'equipment_library',
  ]

  try {
    for (const table of TABLES_IN_DELETE_ORDER) {
      const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) return { ok: false, error: `Failed to clear ${table}: ${error.message}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
