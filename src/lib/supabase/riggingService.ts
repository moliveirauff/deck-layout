import { supabase } from '../supabase'
import type {
  RiggingItem,
  RiggingItemInsert,
  RiggingItemUpdate,
  ProjectEquipmentRigging,
  ProjectEquipmentRiggingInsert,
} from '../../types/database'

type ServiceResult<T> = Promise<{ data: T | null; error: string | null }>

// ─── Rigging Item Library ─────────────────────────────────────────────────────

/** Load all rigging items from the global library, ordered by name. */
export async function loadRiggingItems(): ServiceResult<RiggingItem[]> {
  try {
    const { data, error } = await supabase
      .from('rigging_item')
      .select('*')
      .order('name')
    if (error) return { data: null, error: error.message }
    return { data: data as RiggingItem[], error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/** Load a single rigging item by id. */
export async function loadRiggingItem(id: string): ServiceResult<RiggingItem> {
  try {
    const { data, error } = await supabase
      .from('rigging_item')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return { data: null, error: error.message }
    return { data: data as RiggingItem, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/**
 * Insert or update a rigging item in the global library.
 * Pass `id` in the payload to update an existing record; omit to create a new one.
 */
export async function saveRiggingItem(
  item: RiggingItemInsert & { id?: string },
): ServiceResult<RiggingItem> {
  try {
    const { data, error } = await supabase
      .from('rigging_item')
      .upsert(item)
      .select()
      .single()
    if (error) return { data: null, error: error.message }
    return { data: data as RiggingItem, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/** Delete a rigging item from the global library. */
export async function deleteRiggingItem(id: string): ServiceResult<null> {
  try {
    const { error } = await supabase.from('rigging_item').delete().eq('id', id)
    if (error) return { data: null, error: error.message }
    return { data: null, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

// ─── Project Equipment Rigging Arrangement ────────────────────────────────────

/**
 * Load all rigging entries for a project equipment item.
 * Ordered by creation time so the arrangement is deterministic.
 */
export async function loadProjectEquipmentRigging(
  projectEquipmentId: string,
): ServiceResult<ProjectEquipmentRigging[]> {
  try {
    const { data, error } = await supabase
      .from('project_equipment_rigging')
      .select('*')
      .eq('project_equipment_id', projectEquipmentId)
      .order('created_at')
    if (error) return { data: null, error: error.message }
    return { data: data as ProjectEquipmentRigging[], error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/**
 * Replace all rigging entries for a project equipment item.
 * Deletes existing entries then batch-inserts the new set.
 */
export async function saveProjectEquipmentRigging(
  projectEquipmentId: string,
  entries: Omit<ProjectEquipmentRiggingInsert, 'project_equipment_id'>[],
): ServiceResult<ProjectEquipmentRigging[]> {
  try {
    const { error: deleteError } = await supabase
      .from('project_equipment_rigging')
      .delete()
      .eq('project_equipment_id', projectEquipmentId)
    if (deleteError) return { data: null, error: deleteError.message }

    if (entries.length === 0) return { data: [], error: null }

    const rows: ProjectEquipmentRiggingInsert[] = entries.map((e) => ({
      ...e,
      project_equipment_id: projectEquipmentId,
    }))
    const { data, error } = await supabase
      .from('project_equipment_rigging')
      .insert(rows)
      .select()
    if (error) return { data: null, error: error.message }
    return { data: data as ProjectEquipmentRigging[], error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/** Delete all rigging entries for a project equipment item. */
export async function deleteProjectEquipmentRigging(
  projectEquipmentId: string,
): ServiceResult<null> {
  try {
    const { error } = await supabase
      .from('project_equipment_rigging')
      .delete()
      .eq('project_equipment_id', projectEquipmentId)
    if (error) return { data: null, error: error.message }
    return { data: null, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/** Update specific fields on a rigging item. */
export async function updateRiggingItem(
  id: string,
  updates: RiggingItemUpdate,
): ServiceResult<RiggingItem> {
  try {
    const { data, error } = await supabase
      .from('rigging_item')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) return { data: null, error: error.message }
    return { data: data as RiggingItem, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}
