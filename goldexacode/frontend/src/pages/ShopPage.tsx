import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { ProductCard } from '@/components/ProductCard'
import { getCategoryName } from '@/utils/helpers'
import { useProducts } from '@/hooks/useProducts'

const categories = [
  { id: 'ring', name: 'انگشتر' },
  { id: 'necklace', name: 'گردنبند' },
  { id: 'bracelet', name: 'دستبند' },
  { id: 'earring', name: 'گوشواره' },
  { id: 'pendant', name: 'آویز' },
  { id: 'custom', name: 'سفارشی' },
]

export function ShopPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [priceRange, setPriceRange] = useState('')
  const [sortBy, setSortBy] = useState('default')
  const { data: products = [] } = useProducts({ category, search })

  const filteredProducts = useMemo(() => {
    let result = [...products]

    if (search) {
      result = result.filter((product) =>
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.description.toLowerCase().includes(search.toLowerCase())
      )
    }

    if (category) {
      result = result.filter((product) => product.category === category)
    }

    if (priceRange) {
      if (priceRange === 'low') {
        result = result.filter((product) => product.finalPrice < 5000000)
      } else if (priceRange === 'mid') {
        result = result.filter(
          (product) => product.finalPrice >= 5000000 && product.finalPrice <= 20000000
        )
      } else {
        result = result.filter((product) => product.finalPrice > 20000000)
      }
    }

    if (sortBy === 'price-asc') {
      result.sort((a, b) => a.finalPrice - b.finalPrice)
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.finalPrice - a.finalPrice)
    } else if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }

    return result
  }, [search, category, priceRange, sortBy, products])

  return (
    <div className="pt-20 pb-16">
      <div className="container mx-auto px-4">
        <div className="text-right mb-8">
          <h1 className="text-3xl font-black text-navy-900 mb-2">🛍️ فروشگاه طلا</h1>
          <p className="text-muted-foreground">مجموعه کامل زیورآلات طلا با قیمت شفاف</p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="جستجوی محصول..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pr-12"
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input md:w-40"
          >
            <option value="">همه دسته‌ها</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value)}
            className="input md:w-40"
          >
            <option value="">همه قیمت‌ها</option>
            <option value="low">زیر ۵ میلیون</option>
            <option value="mid">۵ تا ۲۰ میلیون</option>
            <option value="high">بالای ۲۰ میلیون</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input md:w-40"
          >
            <option value="default">پیش‌فرض</option>
            <option value="price-asc">قیمت: کم به زیاد</option>
            <option value="price-desc">قیمت: زیاد به کم</option>
            <option value="newest">جدیدترین</option>
          </select>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold mb-2">محصولی یافت نشد</h3>
            <p className="text-muted-foreground">لطفاً فیلترهای خود را تغییر دهید</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-muted-foreground">
                {filteredProducts.length} محصول یافت شد
              </p>
              <p className="text-xs text-muted-foreground">
                دسته‌بندی: {category ? getCategoryName(category) : 'همه'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
