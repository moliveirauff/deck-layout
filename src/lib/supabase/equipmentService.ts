import { supabase } from '../supabase'
import type {
  EquipmentLibrary,
  EquipmentLibraryInsert,
  EquipmentLibraryUpdate,
} from '../../types/database'

type ServiceResult<T> = Promise<{ data: T | null; error: string | null }>

/** Load all equipment items from the global library, ordered by name. */
export async function loadEquipment(): ServiceResult<EquipmentLibrary[]> {
  try {
    const { data, error } = await supabase
      .from('equipment_library')
      .select('*')
      .order('name')
    if (error) return { data: null, error: error.message }
    return { data: data as EquipmentLibrary[], error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/** Load a single equipment item by id. */
export async function loadEquipmentItem(id: string): ServiceResult<EquipmentLibrary> {
  try {
    const { data, error } = await supabase
      .from('equipment_library')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return { data: null, error: error.message }
    return { data: data as EquipmentLibrary, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/**
 * Insert or update an equipment item.
 * Pass `id` in the payload to update an existing record; omit to create a new one.
 */
export async function saveEquipment(
  equipment: EquipmentLibraryInsert & { id?: string },
): ServiceResult<EquipmentLibrary> {
  try {
    const { data, error } = await supabase
      .from('equipment_library')
      .upsert(equipment)
      .select()
      .single()
    if (error) return { data: null, error: error.message }
    return { data: data as EquipmentLibrary, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/** Update specific fields on an existing equipment item. */
export async function updateEquipment(
  id: string,
  updates: EquipmentLibraryUpdate,
): ServiceResult<EquipmentLibrary> {
  try {
    const { data, error } = await supabase
      .from('equipment_library')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) return { data: null, error: error.message }
    return { data: data as EquipmentLibrary, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/**
 * Delete an equipment item from the global library.
 * Fails with a foreign-key error if any project references this item (ON DELETE RESTRICT).
 */
export async function deleteEquipment(id: string): ServiceResult<null> {
  try {
    const { error } = await supabase
      .from('equipment_library')
      .delete()
      .eq('id', id)
    if (error) return { data: null, error: error.message }
    return { data: null, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}
