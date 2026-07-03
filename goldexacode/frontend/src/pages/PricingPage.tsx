import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Clock } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { GoldPrice } from '@/types'
import { formatPrice } from '@/utils/helpers'

const priceLabels: Record<GoldPrice['type'], string> = {
  mizaneh: 'مظنه طلا',
  coin: 'سکه',
  ounce: 'انس جهانی',
  gold18: 'طلای ۱۸ عیار',
}

export function PricingPage() {
  const { data: prices = [], refetch } = useQuery({
    queryKey: ['gold-prices'],
    queryFn: api.getGoldPrices,
    refetchInterval: 60000,
  })
  const [selectedPrice, setSelectedPrice] = useState<GoldPrice | null>(prices[0] || null)

  useEffect(() => {
    if (!selectedPrice && prices.length) {
      setSelectedPrice(prices[0])
    }
  }, [prices, selectedPrice])

  return (
    <div className="pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-gold-600 font-bold mb-2">قیمت‌گذاری شفاف و لحظه‌ای</p>
            <h1 className="text-3xl font-black text-navy-900">قیمت‌های طلا</h1>
            <p className="text-muted-foreground mt-2">
              قیمت‌های پایه از موتور قیمت‌گذاری گلدکسا خوانده می‌شود و برای محاسبه محصول، کیف پول و سفارش استفاده می‌شود.
            </p>
          </div>
          <button onClick={() => refetch()} className="btn btn-outline">به‌روزرسانی قیمت‌ها</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {prices.map((price) => (
            <button
              key={price.type}
              onClick={() => setSelectedPrice(price)}
              className={`card p-5 text-right transition ${
                selectedPrice?.type === price.type ? 'border-gold-400 ring-2 ring-gold-200' : 'hover:border-gold-300'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{priceLabels[price.type]}</p>
                {price.change >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
              </div>
              <p className="mt-4 text-2xl font-black text-navy-900">{formatPrice(price.value)} تومان</p>
              <p className={`mt-2 text-sm ${price.change >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {price.change >= 0 ? '+' : ''}{formatPrice(price.change)} تومان ({price.changePercent}٪)
              </p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="card p-6 lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">نمای قیمت انتخاب‌شده</p>
                <h2 className="text-2xl font-black text-navy-900 mt-1">{selectedPrice ? priceLabels[selectedPrice.type] : 'انتخاب نشده'}</h2>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gold-50 flex items-center justify-center text-gold-600">
                <Clock className="h-6 w-6" />
              </div>
            </div>

            {selectedPrice && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                <div className="rounded-2xl bg-navy-900 text-white p-5">
                  <p className="text-sm text-gray-300">قیمت فعلی</p>
                  <p className="text-2xl font-black mt-2">{formatPrice(selectedPrice.value)} تومان</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-5">
                  <p className="text-sm text-muted-foreground">تغییر ریالی</p>
                  <p className="text-2xl font-black mt-2">{formatPrice(selectedPrice.change)} تومان</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-5">
                  <p className="text-sm text-muted-foreground">تغییر درصدی</p>
                  <p className="text-2xl font-black mt-2">{selectedPrice.changePercent}٪</p>
                </div>
              </div>
            )}
          </div>

          <div className="card p-6">
            <h3 className="font-black text-navy-900 mb-4">قانون MVP</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3"><span className="text-gold-600">◆</span> قیمت محصول براساس وزن، عیار، اجرت، سود، مالیات و اسپرد محاسبه می‌شود.</li>
              <li className="flex gap-3"><span className="text-gold-600">◆</span> کیف پول و سفارش باید با آخرین قیمت معتبر محاسبه شوند.</li>
              <li className="flex gap-3"><span className="text-gold-600">◆</span> تاریخچه قیمت برای شفافیت و گزارش‌گیری مالی نگهداری می‌شود.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
