import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Clock3, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StatusBadge({ status, children }: { status: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; children: ReactNode }) {
  const Icon = status === 'success' ? CheckCircle2 : status === 'warning' ? Clock3 : status === 'danger' ? AlertCircle : Info
  return <span className={cn('badge gap-1.5', status === 'success' && 'badge-success', status === 'warning' && 'badge-warning', status === 'danger' && 'badge-danger', status === 'info' && 'badge-info', status === 'neutral' && 'bg-stone-100 text-stone-700')}><Icon aria-hidden="true" className="h-3.5 w-3.5" />{children}</span>
}
