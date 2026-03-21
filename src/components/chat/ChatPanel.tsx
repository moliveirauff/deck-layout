import { useEffect, useRef, useState, useCallback } from 'react'
import { MessageCircle, X, Send, RefreshCw } from 'lucide-react'
import { useChatStore } from '../../stores/useChatStore'
import { ChatMessages } from './ChatMessages'

const SUGGESTION_CHIPS = [
  "What's the status of all equipment?",
  'Compare weights: 25t, 30t, 35t for Manifold M1',
  "What's the max Hs for each equipment?",
  'Run analysis for all equipment',
]

type ChatPanelProps = {
  projectId: string
}

/**
 * Floating AI chat panel.
 * — Blue FAB (56px) in the bottom-right corner of all project pages.
 * — Clicking or pressing Ctrl+K opens a 400×600 sliding panel.
 * — Panel never overlaps other fixed elements: it sits at z-50 but uses
 *   pointer-events-none on the wrapper so the canvas / 3D viewer beneath
 *   remain interactive when the panel is closed.
 */
export function ChatPanel({ projectId }: ChatPanelProps) {
  const {
    isOpen,
    isLoading,
    messages,
    togglePanel,
    closePanel,
    setProjectId,
    sendMessage,
    clearChat,
    refreshData,
  } = useChatStore()

  const [input, setInput] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const isEmpty = messages.length === 0

  // Keep store in sync with the current project
  useEffect(() => {
    setProjectId(projectId)
    clearChat()
  }, [projectId, setProjectId, clearChat])

  // Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault()
        togglePanel()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [togglePanel])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50)
  }, [isOpen])

  const submit = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading) return
      setInput('')
      void sendMessage(trimmed)
    },
    [isLoading, sendMessage],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit(input)
    }
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    refreshData()
    // Brief visual feedback
    setTimeout(() => setIsRefreshing(false), 800)
  }

  return (
    <>
      {/* Chat panel — pointer events only active when open */}
      <div
        className={[
          'fixed bottom-20 right-6 z-50 flex h-[600px] w-[400px] flex-col overflow-hidden',
          'rounded-xl border border-gray-200 bg-white shadow-2xl',
          'transition-all duration-200',
          isOpen
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-4 opacity-0',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
              <MessageCircle className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">SubLift Assistant</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50"
              aria-label="Refresh project data"
              title="Reload all project data from database"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={closePanel}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages / suggestions */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {isEmpty ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
              <p className="text-center text-sm text-gray-500">
                Ask me anything about this project — equipment weights, sea state limits, or
                run an analysis.
              </p>
              <div className="flex w-full flex-col gap-2">
                {SUGGESTION_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => submit(chip)}
                    className="rounded-lg border border-gray-200 px-3 py-2 text-left text-xs text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ChatMessages messages={messages} isLoading={isLoading} onRetry={submit} />
          )}
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-3">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-blue-400 focus-within:bg-white transition-colors">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the assistant…"
              disabled={isLoading}
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none disabled:opacity-50"
            />
            <button
              onClick={() => submit(input)}
              disabled={!input.trim() || isLoading}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-gray-400">
            Ctrl+K to toggle · Enter to send
          </p>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={togglePanel}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-all hover:bg-blue-700 hover:scale-105 active:scale-95"
        aria-label="Toggle AI chat"
        title="SubLift Assistant (Ctrl+K)"
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>
    </>
  )
}
