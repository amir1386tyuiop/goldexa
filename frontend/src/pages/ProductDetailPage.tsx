import { useNavigate, useParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { AlertCircle, ShoppingCart, Sparkles, Shield, Truck, ChevronLeft, RotateCcw } from 'lucide-react'
import { useStore } from '@/store/store'
import { formatPrice, calculatePriceBreakdown, getCategoryName } from '@/utils/helpers'
import { useGoldPrices } from '@/hooks/useGoldPrices'
import { useProduct } from '@/hooks/useProduct'
import { ImageGallery } from '@/components/ImageGallery'
import { PriceReservationTimer } from '@/components/PriceReservationTimer'
import { useGoldPricingStatus } from '@/hooks/useGoldPricingStatus'

export function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const addToCart = useStore((state) => state.addToCart)
  const showToast = useStore((state) => state.showToast)
  const { data: product, isLoading, isError, refetch } = useProduct(id)
  const { data: goldPrices = [] } = useGoldPrices()
  const { data: feedStatus } = useGoldPricingStatus()

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 pt-28 pb-16">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="card h-[500px] animate-pulse bg-gray-100" />
          <div className="space-y-4">
            <div className="h-8 w-2/3 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
            <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 pb-16 pt-28 text-center" role="alert">
        <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-600" aria-hidden="true" />
        <h1 className="mb-2 text-2xl font-black text-navy-900">دریافت محصول با مشکل مواجه شد</h1>
        <p className="mb-6 text-muted-foreground">لطفاً دوباره تلاش کنید یا به فروشگاه برگردید.</p>
        <button type="button" onClick={() => void refetch()} className="btn btn-outline inline-flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-gold-500">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          تلاش دوباره
        </button>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="pt-28 pb-16 text-center">
        <h1 className="mb-4 text-2xl font-black">محصول یافت نشد</h1>
        <button type="button" onClick={() => navigate('/shop')} className="btn btn-primary px-6 py-3">
          بازگشت به فروشگاه
        </button>
      </div>
    )
  }

  const images = product.images?.length ? product.images : ['/images/ring-1.svg']
  const goldPrice = goldPrices.find((p) => p.type === 'gold18')
  const breakdown = calculatePriceBreakdown(
    product.weight,
    goldPrice ? goldPrice.value : 3_560_000,
    product.labor,
    product.profit,
    product.tax,
    0,
  )
  const feedLive = Boolean(feedStatus?.lastFetchAt)

  return (
    <div className="pb-16 pt-20">
      <div className="container mx-auto px-4">
        <Link to="/shop" className="mb-6 inline-flex items-center gap-1 text-sm font-bold text-gold-700 hover:text-gold-800">
          <ChevronLeft className="h-4 w-4" />
          بازگشت به فروشگاه
        </Link>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <ImageGallery
            images={images}
            alt={product.name}
            badge={
              product.isNew ? (
                <span className="absolute top-4 right-4 badge bg-green-500 text-white shadow-lg">جدید</span>
              ) : undefined
            }
          />

          <div>
            <p className="mb-2 text-sm font-bold text-gold-600">{getCategoryName(product.category)}</p>
            <h1 className="mb-4 text-3xl font-black leading-tight text-navy-900 sm:text-4xl">{product.name}</h1>
            <p className="mb-6 leading-relaxed text-muted-foreground">{product.description}</p>

            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'وزن', value: `${product.weight} گرم` },
                { label: 'عیار', value: `${product.karat} عیار` },
                { label: 'موجودی', value: `${product.stock} عدد` },
                { label: 'فروشنده', value: product.sellerName || 'گلدکسا' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-border bg-white p-4 text-center shadow-sm">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="mt-1 font-black text-navy-900">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mb-4 flex items-center gap-2" aria-live="polite">
              <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${feedLive ? 'animate-pulse bg-green-500' : 'bg-orange-500'}`} />
              <span className={`text-sm font-bold ${feedLive ? 'text-green-700' : 'text-orange-700'}`}>
                {feedLive ? 'قیمت لحظه‌ای فعال' : 'آخرین قیمت معتبر'}
              </span>
              {feedStatus?.source && (
                <span className="text-xs text-muted-foreground">منبع: {feedStatus.source}</span>
              )}
            </div>

            <div className="card mb-4 p-5">
              <h2 className="mb-4 font-black text-navy-900">شکست قیمت (شفاف)</h2>
              <div className="space-y-3 text-sm">
                {[
                  { label: 'قیمت خام طلا', value: breakdown.rawGold },
                  { label: `اجرت ساخت (${product.labor}%)`, value: breakdown.labor },
                  { label: `سود فروشنده (${product.profit}%)`, value: breakdown.profit },
                  { label: `مالیات (${product.tax}%)`, value: breakdown.tax },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-bold">{formatPrice(row.value)} تومان</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-border pt-3 text-lg">
                  <span className="font-black">قیمت نهایی</span>
                  <span className="font-black text-gold-600">{formatPrice(product.finalPrice)} تومان</span>
                </div>
              </div>
            </div>

            <PriceReservationTimer />

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={product.stock <= 0}
                onClick={() => {
                  addToCart(product)
                  showToast(`${product.name} به سبد خرید اضافه شد`)
                }}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gold-500 py-4 font-black text-white shadow-gold transition hover:bg-gold-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                {product.stock > 0 ? 'افزودن به سبد' : 'ناموجود'}
              </button>
              <Link
                to="/ar"
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-purple-200 bg-purple-50 py-4 font-black text-purple-800 transition hover:bg-purple-100"
              >
                <Sparkles className="h-5 w-5" aria-hidden="true" />
                پرو مجازی
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { icon: Shield, label: 'ضمانت اصالت' },
                { icon: Truck, label: 'ارسال بیمه‌شده' },
                { icon: ShoppingCart, label: 'پرداخت امن' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="rounded-2xl bg-gray-50 p-3 text-center">
                  <Icon className="mx-auto mb-2 h-6 w-6 text-gold-600" aria-hidden="true" />
                  <p className="text-xs font-medium">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
