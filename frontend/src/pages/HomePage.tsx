import { useQuery } from '@tanstack/react-query'
import { CategoryGrid } from '@/components/CategoryGrid'
import { Hero } from '@/components/Hero'
import { PriceTicker } from '@/components/PriceTicker'
import { ProductCard } from '@/components/ProductCard'
import { useProducts } from '@/hooks/useProducts'
import { api } from '@/api/client'
import { formatPrice } from '@/utils/helpers'
import type { Auction } from '@/types'

export function HomePage() {
  const { data: products = [] } = useProducts()
  const { data: auctions = [] } = useQuery<Auction[]>({
    queryKey: ['home-auctions'],
    queryFn: api.getActiveAuctions,
    initialData: [],
  })
  const featuredProducts = products.filter((product) => product.isFeatured).slice(0, 4)

  return (
    <div className="pb-16">
      <Hero />
      <PriceTicker />
      <CategoryGrid />

      {auctions.length > 0 && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-black text-navy-900 mb-2">
                مزایده‌های فعال طلا
              </h2>
              <p className="text-muted-foreground">پیشنهاد بدهید و طلای منتخب را با قیمت رقابتی بخرید</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {auctions.slice(0, 3).map((auction) => (
                <a key={auction.id} href={`/auctions`} className="card p-5 hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <p className="text-xs text-gold-600 font-bold mb-1">مزایده {auction.id.slice(0, 8)}</p>
                      <h3 className="font-bold text-sm leading-relaxed">{auction.product?.name}</h3>
                    </div>
                    <img
                      src={auction.product?.images?.[0] || '/images/ring-1.svg'}
                      alt={auction.product?.name}
                      className="h-16 w-16 rounded-xl object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">قیمت فعلی</span>
                    <span className="font-black text-gold-600">{formatPrice(auction.currentPrice)} تومان</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-muted-foreground">پیشنهادها</span>
                    <span className="font-bold">{auction.bidCount} بار</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black text-navy-900 mb-2">
              🔥 محصولات برتر
            </h2>
            <p className="text-muted-foreground">پرفروش‌ترین و محبوب‌ترین طلاهای هفته</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <div className="text-center mt-10">
            <a
              href="/shop"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gold-500 text-white font-bold hover:bg-gold-600 transition-all"
            >
              مشاهده همه محصولات ←
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
