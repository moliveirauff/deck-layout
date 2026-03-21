import { useEffect, useRef, useState } from 'react'
import { RotateCcw, ChevronRight } from 'lucide-react'
import type { ChatEntry } from '../../stores/useChatStore'

type Props = {
  messages: ChatEntry[]
  isLoading: boolean
  onRetry: (text: string) => void
}

/**
 * Scrollable message list for the chat panel.
 * — User: right-aligned blue bubbles
 * — Assistant: left-aligned gray bubbles with minimal markdown
 * — Tool: collapsible detail row; compare_scenarios renders a styled table
 * — Error: red alert with optional retry button
 */
export function ChatMessages({ messages, isLoading, onRetry }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
      {messages.map((msg) => {
        if (msg.role === 'tool') {
          return <ToolEntry key={msg.id} entry={msg} />
        }

        if (msg.role === 'error') {
          return <ErrorEntry key={msg.id} entry={msg} onRetry={onRetry} />
        }

        const isUser = msg.role === 'user'

        return (
          <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div
              className={[
                'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                isUser
                  ? 'rounded-br-sm bg-blue-600 text-white'
                  : 'rounded-bl-sm bg-gray-100 text-gray-800',
              ].join(' ')}
            >
              <MessageContent content={msg.content} />
            </div>
          </div>
        )
      })}

      {isLoading && (
        <div className="flex justify-start">
          <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-gray-100 px-4 py-3">
            <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}

// ── Tool entry ────────────────────────────────────────────────────────────────

function ToolEntry({ entry }: { entry: ChatEntry }) {
  const [expanded, setExpanded] = useState(false)
  const isCompare = entry.toolName === 'compare_scenarios'
  const comparison = isCompare
    ? (entry.toolResult?.result as Record<string, unknown>)?.comparison as ComparisonRow[] | undefined
    : undefined
  const parameter = isCompare
    ? (entry.toolResult?.result as Record<string, unknown>)?.parameter as string | undefined
    : undefined

  return (
    <div className="mx-auto w-full max-w-[92%]">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left hover:bg-gray-50 transition-colors"
      >
        <ChevronRight
          className={`h-3 w-3 shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
        <span className="truncate text-[11px] italic text-gray-400">{entry.content}</span>
      </button>

      {expanded && (
        <div className="mt-1 rounded-md border border-gray-100 bg-gray-50 p-2">
          {comparison && comparison.length > 0 ? (
            <ComparisonTable rows={comparison} parameter={parameter ?? 'value'} />
          ) : (
            <pre className="overflow-x-auto text-[10px] text-gray-500 whitespace-pre-wrap">
              {JSON.stringify(entry.toolResult?.result, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

// ── Comparison table ──────────────────────────────────────────────────────────

type ComparisonRow = {
  [key: string]: number
  max_hs_m: number
  daf: number
  operability_pct: number
}

function ComparisonTable({ rows, parameter }: { rows: ComparisonRow[]; parameter: string }) {
  const paramKey = Object.keys(rows[0]).find((k) => k !== 'max_hs_m' && k !== 'daf' && k !== 'operability_pct') ?? parameter

  // Determine best values for coloring
  const bestHs = Math.max(...rows.map((r) => r.max_hs_m))
  const bestOp = Math.max(...rows.map((r) => r.operability_pct))
  const bestDaf = Math.min(...rows.map((r) => r.daf))

  return (
    <table className="w-full text-[11px]">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="pb-1 pr-2 text-left font-semibold text-gray-500 capitalize">
            {paramKey.replace(/_t_or_m$/, '').replace(/_/g, ' ')}
          </th>
          <th className="pb-1 pr-2 text-right font-semibold text-gray-500">Max Hs (m)</th>
          <th className="pb-1 pr-2 text-right font-semibold text-gray-500">DAF</th>
          <th className="pb-1 text-right font-semibold text-gray-500">Oper. %</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-gray-100 last:border-0">
            <td className="py-0.5 pr-2 font-medium text-gray-700">{row[paramKey]}</td>
            <td className={`py-0.5 pr-2 text-right font-medium ${row.max_hs_m === bestHs ? 'text-green-600' : row.max_hs_m < bestHs - 0.4 ? 'text-red-500' : 'text-gray-700'}`}>
              {row.max_hs_m.toFixed(1)}
            </td>
            <td className={`py-0.5 pr-2 text-right font-medium ${row.daf === bestDaf ? 'text-green-600' : row.daf > bestDaf + 0.1 ? 'text-red-500' : 'text-gray-700'}`}>
              {row.daf.toFixed(3)}
            </td>
            <td className={`py-0.5 text-right font-medium ${row.operability_pct === bestOp ? 'text-green-600' : row.operability_pct < bestOp - 5 ? 'text-red-500' : 'text-gray-700'}`}>
              {row.operability_pct.toFixed(1)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Error entry ───────────────────────────────────────────────────────────────

function ErrorEntry({
  entry,
  onRetry,
}: {
  entry: ChatEntry
  onRetry: (text: string) => void
}) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
      <p className="text-xs text-red-700">{entry.content}</p>
      {entry.isTimeout && entry.retryText && (
        <button
          onClick={() => onRetry(entry.retryText!)}
          className="mt-2 flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          Retry
        </button>
      )}
    </div>
  )
}

// ── Minimal markdown ──────────────────────────────────────────────────────────

function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(\*\*[^*]+\*\*|`[^`]+`|\n)/g)

  return (
    <>
      {parts.map((part, i) => {
        if (part === '\n') return <br key={i} />
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} className="rounded bg-black/10 px-1 py-0.5 font-mono text-xs">
              {part.slice(1, -1)}
            </code>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}
