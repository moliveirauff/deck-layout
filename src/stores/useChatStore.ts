import { create } from 'zustand'
import {
  sendMessage as callChatService,
  type ChatMessage,
  type RawToolResult,
} from '../lib/chat/chatService'
import { useProjectStore } from './useProjectStore'
import { useDeckLayoutStore } from './useDeckLayoutStore'
import { useAnalysisStore } from './useAnalysisStore'

const DATA_CHANGE_KEYWORDS =
  /\b(updated|changed|moved|analysis complete|analysed|analyzed|set weight|set dimension|overboard)\b/i

export type ChatEntry = {
  id: string
  role: 'user' | 'assistant' | 'tool' | 'error'
  content: string
  timestamp: Date
  /** For tool entries: name of the tool called */
  toolName?: string
  /** Raw result — used to render compare_scenarios table */
  toolResult?: RawToolResult
  /** For error entries: whether the error was a network timeout */
  isTimeout?: boolean
  /** For timeout errors: the original user message to retry */
  retryText?: string
}

type ChatState = {
  messages: ChatEntry[]
  isOpen: boolean
  isLoading: boolean
  projectId: string | null

  setProjectId: (id: string) => void
  togglePanel: () => void
  openPanel: () => void
  closePanel: () => void
  clearChat: () => void
  /** Reload all project data from Supabase stores. */
  refreshData: () => void
  sendMessage: (text: string) => Promise<void>
}

let _idCounter = 0
function nextId() {
  return `msg-${++_idCounter}-${Date.now()}`
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isOpen: false,
  isLoading: false,
  projectId: null,

  setProjectId: (id) => set({ projectId: id }),
  togglePanel: () => set((s) => ({ isOpen: !s.isOpen })),
  openPanel: () => set({ isOpen: true }),
  closePanel: () => set({ isOpen: false }),
  clearChat: () => set({ messages: [] }),

  refreshData: () => {
    const { activeProject, loadProject } = useProjectStore.getState()
    const { loadProjectEquipment } = useDeckLayoutStore.getState()
    const { loadResults, results } = useAnalysisStore.getState()
    if (activeProject) {
      void loadProject(activeProject.id)
      void loadProjectEquipment(activeProject.id)
      for (const peId of Object.keys(results)) {
        void loadResults(peId)
      }
    }
  },

  sendMessage: async (text) => {
    const { messages, projectId } = get()
    if (!projectId) return

    const userEntry: ChatEntry = {
      id: nextId(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    }

    set((s) => ({ messages: [...s.messages, userEntry], isLoading: true }))

    // Build the API history (user/assistant only — skip tool/error display entries)
    const history: ChatMessage[] = [...messages, userEntry]
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    const { text: reply, toolNotifications, rawToolResults, isTimeout, error } =
      await callChatService(history, projectId)

    const newEntries: ChatEntry[] = []

    // Tool notification entries (one per tool call)
    for (let i = 0; i < toolNotifications.length; i++) {
      const raw = rawToolResults[i]
      newEntries.push({
        id: nextId(),
        role: 'tool',
        content: toolNotifications[i],
        timestamp: new Date(),
        toolName: raw?.name,
        toolResult: raw,
      })
    }

    if (error) {
      newEntries.push({
        id: nextId(),
        role: 'error',
        content: isTimeout
          ? 'Request timed out after 60 seconds.'
          : error.includes('unavailable') || error.includes('deployment')
            ? 'AI Assistant unavailable. Check Edge Function deployment.'
            : error,
        timestamp: new Date(),
        isTimeout,
        retryText: isTimeout ? text : undefined,
      })
    } else if (!reply) {
      newEntries.push({
        id: nextId(),
        role: 'error',
        content: 'Empty response from AI. Check browser console (F12 → Console) for Edge Function details.',
        timestamp: new Date(),
      })
    } else {
      newEntries.push({
        id: nextId(),
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      })
    }

    set((s) => ({
      messages: [...s.messages, ...newEntries],
      isLoading: false,
    }))

    // Refresh stores if the response suggests data was mutated
    if (reply && DATA_CHANGE_KEYWORDS.test(reply)) {
      get().refreshData()
    }
  },
}))
