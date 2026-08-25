import { TrendingUp, TrendingDown, Clock, Wifi, WifiOff } from 'lucide-react'
import { formatPrice } from '@/utils/helpers'
import { useGoldPrices } from '@/hooks/useGoldPrices'
import { useGoldPricingStatus } from '@/hooks/useGoldPricingStatus'

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
  const { data: status } = useGoldPricingStatus()
  const isLive = Boolean(status?.lastFetchAt)

  return (
    <section className="sticky top-16 z-40 border-y border-border bg-white/95 backdrop-blur-md">
      <div className="container mx-auto px-4 py-3">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-orange-500'}`} />
            <span className={`text-sm font-bold ${isLive ? 'text-green-700' : 'text-orange-700'}`}>
              {isLive ? 'قیمت لحظه‌ای' : 'آخرین قیمت معتبر'}
            </span>
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {isLive ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            منبع: {status?.source || 'mock'}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            به‌روزرسانی هر {status?.refreshIntervalSeconds || 60} ثانیه
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {goldPrices.map((price) => (
            <div
              key={price.type}
              className="flex items-center gap-3 rounded-2xl border border-border bg-gradient-to-br from-gray-50 to-white p-3 transition hover:border-gold-200 hover:shadow-soft"
            >
              <div className="text-2xl">{priceIcons[price.type]}</div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{priceLabels[price.type]}</p>
                <p className="truncate font-black text-navy-900">
                  {formatPrice(price.value)}
                  {price.type !== 'ounce' ? ' تومان' : ' دلار'}
                </p>
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold ${price.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {price.change >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {Math.abs(price.changePercent).toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
