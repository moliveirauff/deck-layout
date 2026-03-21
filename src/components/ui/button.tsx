import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'ghost' | 'secondary'
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantClasses: Record<ButtonVariant, string> = {
  default:
    'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600',
  destructive:
    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600',
  outline:
    'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus-visible:ring-gray-400',
  ghost:
    'text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-400',
  secondary:
    'bg-gray-100 text-gray-800 hover:bg-gray-200 focus-visible:ring-gray-400',
}

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-9 px-4 py-2 text-sm',
  sm: 'h-7 px-3 text-xs',
  lg: 'h-11 px-6 text-base',
  icon: 'h-9 w-9',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium',
        'transition-colors focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  ),
)
Button.displayName = 'Button'
