import { supabase } from '../supabase'
import type { ProjectEquipment, ProjectEquipmentInsert } from '../../types/database'

type ServiceResult<T> = Promise<{ data: T | null; error: string | null }>

// Deck-position fields updated when the user moves equipment on the deck layout.
type DeckPositionUpdate = Pick<
  ProjectEquipment,
  | 'deck_pos_x'
  | 'deck_pos_y'
  | 'deck_rotation_deg'
  | 'crane_slew_deck_deg'
  | 'crane_boom_angle_deck_deg'
  | 'crane_radius_deck_m'
  | 'crane_capacity_deck_t'
  | 'deck_load_ok'
  | 'capacity_check_deck_ok'
>

// Overboard-position fields updated when the crane overboard position is configured.
type OverboardPositionUpdate = Pick<
  ProjectEquipment,
  | 'overboard_pos_x'
  | 'overboard_pos_y'
  | 'crane_slew_overboard_deg'
  | 'crane_boom_angle_overboard_deg'
  | 'crane_radius_overboard_m'
  | 'crane_capacity_overboard_t'
  | 'capacity_check_overboard_ok'
>

/**
 * Load all equipment placements for a project.
 * Returns items ordered by creation date so deck layout is stable across sessions.
 */
export async function loadProjectEquipment(
  projectId: string,
): ServiceResult<ProjectEquipment[]> {
  try {
    const { data, error } = await supabase
      .from('project_equipment')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at')
    if (error) return { data: null, error: error.message }
    return { data: data as ProjectEquipment[], error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/**
 * Add an equipment item from the global library to a project.
 * The caller must supply at least deck_pos_x, deck_pos_y, and deck_rotation_deg.
 */
export async function addEquipmentToProject(
  placement: ProjectEquipmentInsert,
): ServiceResult<ProjectEquipment> {
  try {
    const { data, error } = await supabase
      .from('project_equipment')
      .insert(placement)
      .select()
      .single()
    if (error) return { data: null, error: error.message }
    return { data: data as ProjectEquipment, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/**
 * Update the deck position and associated crane geometry for a placed equipment item.
 * Call this whenever the user moves or rotates equipment on the deck layout canvas.
 */
export async function updateEquipmentPosition(
  id: string,
  position: Partial<DeckPositionUpdate>,
): ServiceResult<ProjectEquipment> {
  try {
    const { data, error } = await supabase
      .from('project_equipment')
      .update(position)
      .eq('id', id)
      .select()
      .single()
    if (error) return { data: null, error: error.message }
    return { data: data as ProjectEquipment, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/**
 * Update the overboard position and associated crane geometry for a placed equipment item.
 * Call this when the user sets or adjusts the crane overboard position.
 */
export async function updateEquipmentOverboard(
  id: string,
  overboard: Partial<OverboardPositionUpdate>,
): ServiceResult<ProjectEquipment> {
  try {
    const { data, error } = await supabase
      .from('project_equipment')
      .update(overboard)
      .eq('id', id)
      .select()
      .single()
    if (error) return { data: null, error: error.message }
    return { data: data as ProjectEquipment, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/**
 * Return a map of { projectId → equipment count } for the given project IDs.
 * Single query; counts are accumulated in JS.
 */
export async function loadEquipmentCountsByProject(
  projectIds: string[],
): ServiceResult<Record<string, number>> {
  if (projectIds.length === 0) return { data: {}, error: null }
  try {
    const { data, error } = await supabase
      .from('project_equipment')
      .select('project_id')
      .in('project_id', projectIds)
    if (error) return { data: null, error: error.message }
    const counts: Record<string, number> = {}
    for (const row of data ?? []) {
      counts[row.project_id] = (counts[row.project_id] ?? 0) + 1
    }
    return { data: counts, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/** Remove an equipment placement from a project (cascades to analysis results). */
export async function removeEquipmentFromProject(id: string): ServiceResult<null> {
  try {
    const { error } = await supabase
      .from('project_equipment')
      .delete()
      .eq('id', id)
    if (error) return { data: null, error: error.message }
    return { data: null, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}
