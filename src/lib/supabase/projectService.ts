import { supabase } from '../supabase'
import type {
  Project,
  ProjectInsert,
  ProjectStatus,
  VesselSnapshot,
} from '../../types/database'
import { loadVessel } from './vesselService'
import { loadVesselBarriers, loadDeckLoadZones, loadCraneCurve } from './vesselService'

type ServiceResult<T> = Promise<{ data: T | null; error: string | null }>

/** Load all projects, ordered by creation date descending. */
export async function loadProjects(): ServiceResult<Project[]> {
  try {
    const { data, error } = await supabase
      .from('project')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return { data: null, error: error.message }
    return { data: data as Project[], error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/** Load a single project by id. */
export async function loadProject(id: string): ServiceResult<Project> {
  try {
    const { data, error } = await supabase
      .from('project')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return { data: null, error: error.message }
    return { data: data as Project, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/**
 * Create a new project.
 * Automatically builds and stores a vessel_snapshot from the live vessel record,
 * protecting the project from future edits to the master vessel.
 */
export async function createProject(
  project: ProjectInsert,
): ServiceResult<Project> {
  try {
    // Build vessel snapshot from live data
    const snapshot = await buildVesselSnapshot(project.vessel_id)

    const { data, error } = await supabase
      .from('project')
      .insert({ ...project, vessel_snapshot: snapshot })
      .select()
      .single()
    if (error) return { data: null, error: error.message }
    return { data: data as Project, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/**
 * Delete a project and all its children (cascade: equipment, RAOs, results, scatter).
 */
export async function deleteProject(id: string): ServiceResult<null> {
  try {
    const { error } = await supabase.from('project').delete().eq('id', id)
    if (error) return { data: null, error: error.message }
    return { data: null, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/** Update the status field of a project. */
export async function updateProjectStatus(
  id: string,
  status: ProjectStatus,
): ServiceResult<Project> {
  try {
    const { data, error } = await supabase
      .from('project')
      .update({ status })
      .eq('id', id)
      .select()
      .single()
    if (error) return { data: null, error: error.message }
    return { data: data as Project, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

/**
 * Refresh the vessel_snapshot on a project from the current live vessel record.
 * Call this when the user explicitly wants to pick up vessel master changes.
 */
export async function refreshVesselSnapshot(
  projectId: string,
  vesselId: string,
): ServiceResult<Project> {
  try {
    const snapshot = await buildVesselSnapshot(vesselId)
    const { data, error } = await supabase
      .from('project')
      .update({ vessel_snapshot: snapshot })
      .eq('id', projectId)
      .select()
      .single()
    if (error) return { data: null, error: error.message }
    return { data: data as Project, error: null }
  } catch {
    return { data: null, error: 'Network error' }
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Build a VesselSnapshot by loading vessel + barriers + zones + crane curve.
 * Returns null if the vessel cannot be loaded.
 */
async function buildVesselSnapshot(
  vesselId: string,
): Promise<VesselSnapshot | null> {
  const [vesselResult, barriersResult, zonesResult, curveResult] =
    await Promise.all([
      loadVessel(vesselId),
      loadVesselBarriers(vesselId),
      loadDeckLoadZones(vesselId),
      loadCraneCurve(vesselId),
    ])

  if (!vesselResult.data) return null

  return {
    vessel: vesselResult.data,
    barriers: barriersResult.data ?? [],
    deck_load_zones: zonesResult.data ?? [],
    crane_curve_points: curveResult.data ?? [],
  }
}
