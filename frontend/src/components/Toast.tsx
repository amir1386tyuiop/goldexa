import { useStore } from '@/store/store'
import { CheckCircle2, XCircle } from 'lucide-react'

export function Toast() {
  const toast = useStore((state) => state.toast)
  if (!toast) return null

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[90] -translate-x-1/2">
      <div
        className={`flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-bold shadow-2xl ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-navy-900 text-white'
        }`}
      >
        {toast.type === 'error' ? <XCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5 text-gold-300" />}
        {toast.message}
      </div>
    </div>
  )
}
