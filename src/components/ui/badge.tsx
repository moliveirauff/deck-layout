import { cn } from '../../lib/utils'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'success' | 'warning'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-blue-100 text-blue-700',
  secondary: 'bg-gray-100 text-gray-700',
  destructive: 'bg-red-100 text-red-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  )
}
