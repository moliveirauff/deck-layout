import { create } from 'zustand'
import type { Project, ProjectInsert } from '../types/database'
import {
  loadProjects as fetchProjects,
  loadProject as fetchProject,
  createProject as persistCreate,
  deleteProject as persistDelete,
} from '../lib/supabase/projectService'

type ProjectState = {
  projects: Project[]
  activeProject: Project | null
  isLoading: boolean
  isSaving: boolean
  error: string | null

  /** Load all projects for the project list page. */
  loadProjects: () => Promise<void>
  /** Load a single project and set it as the active project. */
  loadProject: (id: string) => Promise<void>
  /**
   * Create a new project with an auto-generated vessel snapshot.
   * Adds the result to the project list and sets it as active.
   */
  createProject: (project: ProjectInsert) => Promise<Project | null>
  /** Delete a project and remove it from the local list. */
  deleteProject: (id: string) => Promise<void>
  /** Clear the active project (e.g. when navigating away from project workspace). */
  clearActiveProject: () => void
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  activeProject: null,
  isLoading: false,
  isSaving: false,
  error: null,

  loadProjects: async () => {
    set({ isLoading: true, error: null })
    const { data, error } = await fetchProjects()
    if (error) {
      set({ isLoading: false, error })
      return
    }
    set({ projects: data ?? [], isLoading: false })
  },

  loadProject: async (id) => {
    set({ isLoading: true, error: null })
    const { data, error } = await fetchProject(id)
    if (error) {
      set({ isLoading: false, error })
      return
    }
    set({ activeProject: data, isLoading: false })
  },

  createProject: async (project) => {
    set({ isSaving: true, error: null })
    const { data, error } = await persistCreate(project)
    if (error) {
      set({ isSaving: false, error })
      return null
    }
    if (data) {
      set((state) => ({
        projects: [data, ...state.projects],
        activeProject: data,
        isSaving: false,
      }))
    }
    return data
  },

  deleteProject: async (id) => {
    const previous = get().projects
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      activeProject: state.activeProject?.id === id ? null : state.activeProject,
      isSaving: true,
      error: null,
    }))
    const { error } = await persistDelete(id)
    if (error) {
      set({ projects: previous, isSaving: false, error })
      return
    }
    set({ isSaving: false })
  },

  clearActiveProject: () => {
    set({ activeProject: null })
  },
}))
