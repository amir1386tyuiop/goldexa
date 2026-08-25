import { AlertCircle, Inbox, RefreshCw } from 'lucide-react'
import { Button } from './Button'

export function EmptyState({ title = 'موردی برای نمایش نیست', description, action }: { title?: string; description?: string; action?: { label: string; onClick: () => void } }) {
  return <div className="card flex flex-col items-center justify-center p-10 text-center"><Inbox aria-hidden="true" className="h-10 w-10 text-amber-700" /><h2 className="mt-4 text-lg font-black">{title}</h2>{description && <p className="mt-2 max-w-md text-sm leading-7 text-stone-600">{description}</p>}{action && <Button variant="outline" onClick={action.onClick} className="mt-5">{action.label}</Button>}</div>
}

export function ErrorState({ onRetry, message = 'دریافت اطلاعات با خطا روبه‌رو شد.' }: { onRetry?: () => void; message?: string }) {
  return <div role="alert" className="card flex flex-col items-center justify-center border-red-200 bg-red-50 p-10 text-center"><AlertCircle className="h-10 w-10 text-red-700" /><p className="mt-4 font-semibold text-red-900">{message}</p>{onRetry && <Button variant="outline" onClick={onRetry} className="mt-5 gap-2 border-red-300 text-red-800"><RefreshCw className="h-4 w-4" />تلاش دوباره</Button>}</div>
}
