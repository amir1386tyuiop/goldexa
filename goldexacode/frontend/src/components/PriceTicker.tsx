import { TrendingUp, TrendingDown, Clock } from 'lucide-react'
import { formatPrice } from '@/utils/helpers'
import { useGoldPrices } from '@/hooks/useGoldPrices'

const priceLabels: Record<string, string> = {
  mizaneh: 'مظنه',
  coin: 'سکه',
  ounce: 'انس جهانی',
  gold18: 'طلای ۱۸ عیار',
}

const priceIcons: Record<string, string> = {
  mizaneh: '📊',
  coin: '🪙',
  ounce: '🌍',
  gold18: '🏆',
}

export function PriceTicker() {
  const { data: goldPrices = [] } = useGoldPrices()

  return (
    <section className="border-y border-border bg-white/90 backdrop-blur-sm sticky top-16 z-40">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-bold text-green-600">قیمت لحظه‌ای</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            به‌روزرسانی خودکار هر دقیقه
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {goldPrices.map((price) => (
            <div
              key={price.type}
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-border"
            >
              <div className="text-2xl">{priceIcons[price.type]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{priceLabels[price.type]}</p>
                <p className="font-bold text-navy-900 truncate">
                  {formatPrice(price.value)}
                  {price.type !== 'ounce' && ' تومان'}
                  {price.type === 'ounce' && ' دلار'}
                </p>
              </div>
              <div className={`flex items-center gap-1 text-sm font-bold ${price.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {price.change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {Math.abs(price.changePercent).toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
