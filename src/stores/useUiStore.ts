import { create } from 'zustand'

/** Top-level application panel (maps to sidebar nav items). */
export type ActivePanel =
  | 'vessel'
  | 'equipment'
  | 'project'
  | 'deck'
  | 'crane'
  | 'rao'
  | 'analysis'
  | 'weather'
  | '3d'
  | 'report'

/** Whether the deck/crane canvas is showing the 2D or 3D representation. */
export type ActiveView = '2d' | '3d'

type UiState = {
  activePanel: ActivePanel
  activeView: ActiveView
  sidebarOpen: boolean

  /** Switch the active panel (e.g. when the user clicks a sidebar nav item). */
  setActivePanel: (panel: ActivePanel) => void
  /** Switch between 2D and 3D deck views. */
  setActiveView: (view: ActiveView) => void
  /** Explicitly open or close the sidebar. */
  setSidebarOpen: (open: boolean) => void
  /** Toggle the sidebar open/closed. */
  toggleSidebar: () => void
}

export const useUiStore = create<UiState>((set) => ({
  activePanel: 'project',
  activeView: '2d',
  sidebarOpen: true,

  setActivePanel: (panel) => {
    set({ activePanel: panel })
  },

  setActiveView: (view) => {
    set({ activeView: view })
  },

  setSidebarOpen: (open) => {
    set({ sidebarOpen: open })
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }))
  },
}))
