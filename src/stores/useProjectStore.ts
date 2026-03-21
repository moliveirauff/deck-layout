import { create } from 'zustand'
import type { Project, ProjectInsert, ProjectUpdate } from '../types/database'
import {
  loadProjects as fetchProjects,
  loadProject as fetchProject,
  createProject as persistCreate,
  updateProject as persistUpdate,
  deleteProject as persistDelete,
} from '../lib/supabase/projectService'

type ProjectState = {
  projects: Project[]
  activeProject: Project | null
  isLoading: boolean
  isSaving: boolean
  error: string | null

  loadProjects: () => Promise<void>
  loadProject: (id: string) => Promise<void>
  createProject: (project: ProjectInsert) => Promise<Project | null>
  updateProject: (id: string, updates: Partial<ProjectUpdate>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
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

  updateProject: async (id, updates) => {
    set({ isSaving: true, error: null })
    const { data, error } = await persistUpdate(id, updates)
    if (error) {
      set({ isSaving: false, error })
      return
    }
    if (data) {
      set((state) => ({
        activeProject: state.activeProject?.id === id ? data : state.activeProject,
        projects: state.projects.map((p) => (p.id === id ? data : p)),
        isSaving: false,
      }))
    }
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
