import { createContext, useContext } from 'react'
import { cn } from '../../lib/utils'

type TabsContextValue = { value: string; onValueChange: (v: string) => void }

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabs(): TabsContextValue {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('Tabs components must be used inside <Tabs>')
  return ctx
}

type TabsProps = {
  value: string
  onValueChange: (v: string) => void
  children: React.ReactNode
  className?: string
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn('flex flex-col', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

type TabsListProps = { children: React.ReactNode; className?: string }

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div className={cn('flex border-b border-gray-200 bg-white px-4', className)}>
      {children}
    </div>
  )
}

type TabsTriggerProps = { value: string; children: React.ReactNode }

export function TabsTrigger({ value, children }: TabsTriggerProps) {
  const { value: active, onValueChange } = useTabs()
  const isActive = value === active
  return (
    <button
      type="button"
      onClick={() => onValueChange(value)}
      className={cn(
        'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
        isActive
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
      )}
    >
      {children}
    </button>
  )
}

type TabsContentProps = { value: string; children: React.ReactNode; className?: string }

export function TabsContent({ value, children, className }: TabsContentProps) {
  const { value: active } = useTabs()
  if (value !== active) return null
  return <div className={cn('flex-1', className)}>{children}</div>
}
