import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Unknown date'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return 'Unknown'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffMonths = Math.floor(diffDays / 30)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 30) return `${diffDays}d ago`
  if (diffMonths < 12) return `${diffMonths}mo ago`
  return `${Math.floor(diffMonths / 12)}y ago`
}

export const DECISION_TYPE_COLORS: Record<string, string> = {
  architecture: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  vendor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  process: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  incident: 'bg-red-500/20 text-red-300 border-red-500/30',
  product: 'bg-green-500/20 text-green-300 border-green-500/30',
  security: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
}

export const SOURCE_ICONS: Record<string, string> = {
  slack: '💬',
  github: '🐙',
  notion: '📄',
  confluence: '📑',
  gdrive: '📁',
}
