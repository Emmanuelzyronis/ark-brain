import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info'
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-primary-500/20 text-primary-300 border-primary-500/30',
    success: 'bg-success/20 text-green-300 border-success/30',
    error: 'bg-error/20 text-red-300 border-error/30',
    warning: 'bg-warning/20 text-amber-300 border-warning/30',
    info: 'bg-accent/20 text-accent border-accent/30',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
