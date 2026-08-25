import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Flame, Sparkles, Tag } from 'lucide-react'
import { CategoryGrid } from '@/components/CategoryGrid'
import { Hero } from '@/components/Hero'
import { PriceTicker } from '@/components/PriceTicker'
import { ProductCard } from '@/components/ProductCard'
import { useHomeFeed } from '@/hooks/useHomeFeed'
import { api } from '@/api/client'
import { formatPrice } from '@/utils/helpers'
import type { Auction } from '@/types'

import type { Product } from '@/types'

function ProductSection({
  title,
  subtitle,
  icon,
  products,
}: {
  title: string
  subtitle: string
  icon: React.ReactNode
  products: Product[]
}) {
  if (!products.length) return null
  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-bold text-gold-600">{icon}{title}</p>
            <h2 className="text-3xl font-black text-navy-900">{subtitle}</h2>
          </div>
          <Link to="/shop" className="hidden items-center gap-1 text-sm font-bold text-gold-700 hover:text-gold-800 sm:flex">
            همه محصولات
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  )
}

export function HomePage() {
  const { data: feed, isLoading: isFeedLoading, isError: isFeedError } = useHomeFeed()
  const { data: auctions = [], isLoading: isAuctionsLoading, isError: isAuctionsError } = useQuery<Auction[]>({
    queryKey: ['home-auctions'],
    queryFn: api.getActiveAuctions,
  })

  return (
    <div className="pb-0">
      <Hero />
      <PriceTicker />
      <CategoryGrid />

      {auctions.length > 0 && (
        <section className="bg-gradient-to-b from-white to-gold-50/40 py-12">
          <div className="container mx-auto px-4">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-black text-navy-900">مزایده‌های فعال</h2>
              <p className="mt-2 text-muted-foreground">پیشنهاد بدهید و با قیمت رقابتی بخرید</p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {auctions.slice(0, 3).map((auction) => (
                <Link
                  key={auction.id}
                  to="/auctions"
                  className="card group overflow-hidden p-0 transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="flex h-40 items-center justify-center bg-gradient-to-br from-navy-900 to-navy-700 p-4">
                    <img
                      src={auction.product?.images?.[0] || '/images/ring-1.svg'}
                      alt=""
                      className="h-28 w-28 rounded-2xl object-cover shadow-lg transition group-hover:scale-105"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="line-clamp-2 font-black text-navy-900">{auction.product?.name}</h3>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">قیمت فعلی</span>
                      <span className="font-black text-gold-600">{formatPrice(auction.currentPrice)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {(isAuctionsLoading || isAuctionsError) && (
        <section className="page-shell py-8" aria-live="polite">
          {isAuctionsLoading ? (
            <div className="grid gap-4 md:grid-cols-3" role="status" aria-label="در حال بارگذاری مزایده‌ها">
              {[1, 2, 3].map((item) => <div key={item} className="h-56 animate-pulse rounded-3xl bg-muted" />)}
            </div>
          ) : (
            <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
              بارگذاری مزایده‌ها با مشکل روبه‌رو شد. لطفاً بعداً دوباره تلاش کنید.
            </p>
          )}
        </section>
      )}

      <ProductSection
        title="منتخب"
        subtitle="محصولات ویژه"
        icon={<Flame className="h-4 w-4" />}
        products={feed?.featured ?? []}
      />
      <ProductSection
        title="تازه"
        subtitle="جدیدترین ورودی‌ها"
        icon={<Sparkles className="h-4 w-4" />}
        products={feed?.newProducts ?? []}
      />
      <ProductSection
        title="تخفیف"
        subtitle="فرصت‌های طلایی"
        icon={<Tag className="h-4 w-4" />}
        products={feed?.discounted ?? []}
      />
      {isFeedLoading && (
        <section className="page-shell py-12" role="status" aria-label="در حال بارگذاری محصولات">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-96 animate-pulse rounded-3xl bg-muted" />)}
          </div>
        </section>
      )}
      {isFeedError && (
        <p className="page-shell py-8 text-sm text-red-800" role="alert">
          دریافت محصولات فعلاً ممکن نیست. لطفاً چند لحظه دیگر دوباره تلاش کنید.
        </p>
      )}
      {!isFeedLoading && !isFeedError && feed && !feed.featured.length && !feed.newProducts.length && !feed.discounted.length && (
        <p className="page-shell py-12 text-center text-muted-foreground" role="status">
          هنوز محصولی برای نمایش وجود ندارد.
        </p>
      )}
    </div>
  )
}
