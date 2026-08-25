import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

const RESERVATION_SECONDS = 5 * 60

export function PriceReservationTimer() {
  const [secondsLeft, setSecondsLeft] = useState(RESERVATION_SECONDS)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? RESERVATION_SECONDS : prev - 1))
    }, 1000)
    return () => window.clearInterval(interval)
  }, [])

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const progress = (secondsLeft / RESERVATION_SECONDS) * 100

  return (
    <div className="rounded-2xl border border-gold-200 bg-gold-50/80 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-bold text-gold-800">
          <Clock className="h-4 w-4" />
          رزرو قیمت فعال
        </div>
        <span className="font-mono text-lg font-black text-navy-900">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gold-200">
        <div
          className="h-full rounded-full bg-gradient-to-l from-gold-500 to-gold-300 transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">قیمت نمایش‌داده‌شده تا ۵ دقیقه برای شما قفل می‌شود</p>
    </div>
  )
}
