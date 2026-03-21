import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/utils'

// ─── Context-free compound component (no Radix dependency) ───────────────────
// API surface matches shadcn/ui AlertDialog so it can be swapped later.

interface AlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onOpenChange])

  if (!open) return null

  return createPortal(
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={() => onOpenChange(false)}
      />
      {/* Panel */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="relative z-10 w-full max-w-md rounded-lg bg-white shadow-xl">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}

interface AlertDialogContentProps {
  children: React.ReactNode
  className?: string
}

export function AlertDialogContent({ children, className }: AlertDialogContentProps) {
  // Trap focus inside the dialog
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])

  return (
    <div ref={ref} tabIndex={-1} className={cn('outline-none', className)}>
      {children}
    </div>
  )
}

export function AlertDialogHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('px-6 pt-6 pb-4', className)}>{children}</div>
}

export function AlertDialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn('text-lg font-semibold text-gray-900', className)}>{children}</h2>
  )
}

export function AlertDialogDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('mt-1 text-sm text-gray-600', className)}>{children}</p>
  )
}

export function AlertDialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex justify-end gap-2 border-t border-gray-100 px-6 py-4',
        className,
      )}
    >
      {children}
    </div>
  )
}

interface AlertDialogActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

export function AlertDialogAction({ children, className, ...props }: AlertDialogActionProps) {
  return (
    <button
      className={cn(
        'inline-flex h-9 items-center justify-center rounded-md bg-red-600 px-4 text-sm',
        'font-medium text-white transition-colors hover:bg-red-700',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function AlertDialogCancel({ children, className, ...props }: AlertDialogActionProps) {
  return (
    <button
      className={cn(
        'inline-flex h-9 items-center justify-center rounded-md border border-gray-300',
        'bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
