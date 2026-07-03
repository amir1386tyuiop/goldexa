import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ShoppingCart, Sparkles, Clock, Shield, Truck } from 'lucide-react'
import { useStore } from '@/store/store'
import { formatPrice, calculatePriceBreakdown, getCategoryName } from '@/utils/helpers'
import { useGoldPrices } from '@/hooks/useGoldPrices'
import { useProduct } from '@/hooks/useProduct'

export function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const addToCart = useStore((state) => state.addToCart)
  const showToast = useStore((state) => state.showToast)
  const { data: product, isLoading } = useProduct(id)
  const { data: goldPrices = [] } = useGoldPrices()
  const images = product?.images?.length ? product.images : ['/images/ring-1.svg']
  const [selectedImage, setSelectedImage] = useState(images[0])

  if (isLoading) {
    return (
      <div className="pt-24 pb-16 text-center">
        <p className="text-muted-foreground">در حال بارگذاری محصول...</p>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="pt-20 pb-16 text-center">
        <h1 className="text-2xl font-bold mb-4">محصول یافت نشد</h1>
        <button onClick={() => navigate('/shop')} className="btn btn-primary">
          بازگشت به فروشگاه
        </button>
      </div>
    )
  }

  const goldPrice = goldPrices.find((p) => p.type === 'gold18')

  const breakdown = calculatePriceBreakdown(
    product.weight,
    goldPrice ? goldPrice.value : 3560000,
    product.labor,
    product.profit,
    product.tax,
    0
  )

  return (
    <div className="pt-20 pb-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="card p-6">
              <div className="h-[500px] rounded-2xl bg-gradient-to-br from-gold-50 to-gray-100 flex items-center justify-center relative overflow-hidden">
                <img
                  src={selectedImage}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
                {product.isNew && (
                  <span className="absolute top-4 right-4 badge bg-green-500 text-white">جدید</span>
                )}
              </div>

              {images.length > 1 && (
                <div className="flex gap-3 mt-4 overflow-x-auto">
                  {images.map((image) => (
                    <button
                      key={image}
                      onClick={() => setSelectedImage(image)}
                      className={`flex-shrink-0 h-20 w-20 rounded-xl overflow-hidden border-2 transition-all ${
                        selectedImage === image
                          ? 'border-gold-500'
                          : 'border-transparent hover:border-gold-300'
                      }`}
                    >
                      <img src={image} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

          <div>
            <div className="mb-4">
              <p className="text-sm text-gold-600 font-bold mb-2">
                {getCategoryName(product.category)}
              </p>
              <h1 className="text-3xl font-black text-navy-900 mb-4 leading-tight">
                {product.name}
              </h1>
              <p className="text-muted-foreground leading-relaxed mb-6">
                {product.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="card p-4">
                <p className="text-xs text-muted-foreground mb-1">وزن</p>
                <p className="font-bold text-lg">{product.weight} گرم</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-muted-foreground mb-1">عیار</p>
                <p className="font-bold text-lg">{product.karat} عیار</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-muted-foreground mb-1">موجودی</p>
                <p className="font-bold text-lg">{product.stock} عدد</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-muted-foreground mb-1">امتیاز فروشنده</p>
                <p className="font-bold text-lg">⭐ {product.seller?.rating ? product.seller.rating.toFixed(1) : '۵.۰'}</p>
              </div>
            </div>

            <div className="card p-5 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-green-600" />
                <span className="text-sm font-bold text-green-600">قیمت لحظه‌ای</span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">قیمت خام طلا</span>
                  <span className="font-bold">{formatPrice(breakdown.rawGold)} تومان</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">اجرت ساخت ({product.labor}%)</span>
                  <span className="font-bold">{formatPrice(breakdown.labor)} تومان</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">سود فروشنده ({product.profit}%)</span>
                  <span className="font-bold">{formatPrice(breakdown.profit)} تومان</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">مالیات ({product.tax}%)</span>
                  <span className="font-bold">{formatPrice(breakdown.tax)} تومان</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between text-lg">
                  <span className="font-black">قیمت نهایی</span>
                  <span className="font-black text-gold-600">{formatPrice(product.finalPrice)} تومان</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-4 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                قیمت تا ۵ دقیقه رزرو می‌شود
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  addToCart(product)
                  showToast(`${product.name} به سبد خرید اضافه شد`)
                }}
                className="flex-1 py-3 rounded-xl bg-gold-500 text-white font-bold hover:bg-gold-600 transition-all flex items-center justify-center gap-2"
              >
                <ShoppingCart className="h-5 w-5" />
                افزودن به سبد
              </button>
              <button className="flex-1 py-3 rounded-xl bg-purple-100 text-purple-700 font-bold hover:bg-purple-200 transition-all flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5" />
                پرو مجازی
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="text-center p-3 rounded-xl bg-gray-50">
                <Shield className="h-6 w-6 mx-auto mb-2 text-gold-600" />
                <p className="text-xs font-medium">ضمانت اصالت</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-gray-50">
                <Truck className="h-6 w-6 mx-auto mb-2 text-gold-600" />
                <p className="text-xs font-medium">ارسال بیمه‌شده</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-gray-50">
                <Clock className="h-6 w-6 mx-auto mb-2 text-gold-600" />
                <p className="text-xs font-medium">تحویل سریع</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
