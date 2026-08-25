import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Filter, Search, Sparkles } from 'lucide-react'
import { ProductCard } from '@/components/ProductCard'
import { getCategoryName } from '@/utils/helpers'
import { api } from '@/api/client'

const categories = [
  { id: '', name: 'همه' },
  { id: 'ring', name: 'انگشتر' },
  { id: 'necklace', name: 'گردنبند' },
  { id: 'bracelet', name: 'دستبند' },
  { id: 'earring', name: 'گوشواره' },
  { id: 'pendant', name: 'آویز' },
  { id: 'custom', name: 'سفارشی' },
]

const sortOptions = [
  { id: 'newest', label: 'جدیدترین' },
  { id: 'price_asc', label: 'ارزان‌ترین' },
  { id: 'price_desc', label: 'گران‌ترین' },
  { id: 'weight_desc', label: 'سنگین‌ترین' },
]

export function ShopPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [page, setPage] = useState(1)
  const [karat, setKarat] = useState('')
  const limit = 12

  const queryParams = useMemo(
    () => ({
      search: search.trim(),
      category,
      sort: sortBy,
      page: String(page),
      limit: String(limit),
      ...(karat ? { karat } : {}),
      inStock: 'true',
    }),
    [search, category, sortBy, page, karat],
  )

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['products-paginated', queryParams],
    queryFn: () => api.getProductsPaginated(queryParams),
    placeholderData: (prev) => prev,
  })

  const products = data?.items ?? []
  const total = data?.total ?? 0
  const pages = data?.pages ?? 1

  const { data: suggestions = [] } = useQuery({
    queryKey: ['product-suggestions', category],
    queryFn: () => api.getProductSuggestions(category || undefined, 8),
    enabled: !isLoading && products.length === 0,
  })

  return (
    <div className="pb-16 pt-20">
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 py-14 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(212,168,67,0.2),transparent_40%)]" />
        <div className="container relative mx-auto px-4">
          <p className="mb-2 text-sm font-bold text-gold-300">کاتالوگ گلدکسا</p>
          <h1 className="text-4xl font-black sm:text-5xl">فروشگاه طلا</h1>
          <p className="mt-3 max-w-2xl text-white/70">جستجو، فیلتر پیشرفته و قیمت شفاف — مستقیم از API زنده</p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-12">
            <div className="relative lg:col-span-5">
              <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="جستجوی محصول، دسته یا توضیحات..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="input pr-12"
              />
            </div>
            <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }} className="input lg:col-span-2">
              {categories.map((cat) => (
                <option key={cat.id || 'all'} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <select value={karat} onChange={(e) => { setKarat(e.target.value); setPage(1) }} className="input lg:col-span-2">
              <option value="">همه عیارها</option>
              <option value="18">۱۸ عیار</option>
              <option value="24">۲۴ عیار</option>
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="input lg:col-span-3">
              {sortOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            {total.toLocaleString('fa-IR')} محصول
            {category && ` در ${getCategoryName(category)}`}
            {isFetching && <span className="text-gold-600"> — در حال به‌روزرسانی...</span>}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card h-80 animate-pulse bg-gray-100" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-gray-50 py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-100 text-3xl">🔍</div>
            <h3 className="text-xl font-black text-navy-900">محصولی یافت نشد</h3>
            <p className="mt-2 text-muted-foreground">فیلترها را تغییر دهید یا پیشنهادهای زیر را ببینید</p>
            {suggestions.length > 0 && (
              <div className="mt-10 text-right">
                <p className="mb-4 flex items-center justify-center gap-2 font-bold text-gold-700">
                  <Sparkles className="h-4 w-4" /> محصولات پیشنهادی
                </p>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {suggestions.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {pages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="btn btn-outline px-4 py-2 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <span className="text-sm font-bold text-navy-900">
                  صفحه {page.toLocaleString('fa-IR')} از {pages.toLocaleString('fa-IR')}
                </span>
                <button
                  type="button"
                  disabled={page >= pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="btn btn-outline px-4 py-2 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
