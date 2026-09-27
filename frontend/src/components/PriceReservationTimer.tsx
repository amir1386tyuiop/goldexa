import { Clock } from 'lucide-react'

export function PriceReservationTimer() {
  return (
    <div className="rounded-2xl border border-gold-200 bg-gold-50/80 p-4">
      <div className="flex items-start gap-2 text-sm font-bold text-gold-800">
        <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>رزرو قیمت هنگام افزودن به سبد انجام می‌شود</span>
      </div>
      <p className="mt-2 text-xs leading-6 text-muted-foreground">مدت رزرو و قیمت نهایی توسط Backend و بر اساس نرخ زنده‌ی طلا تعیین و در تسویه‌حساب دوباره بررسی می‌شود.</p>
    </div>
  )
}
