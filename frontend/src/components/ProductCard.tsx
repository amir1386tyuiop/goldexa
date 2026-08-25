import { Link } from 'react-router-dom'
import { Heart, Plus, Star } from 'lucide-react'
import type { MouseEvent } from 'react'
import { formatPrice, getCategoryName } from '@/utils/helpers'
import { useStore } from '@/store/store'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const addToCart = useStore((state) => state.addToCart)
  const showToast = useStore((state) => state.showToast)

  const handleAddToCart = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    addToCart(product)
    showToast(`${product.name} به سبد خرید اضافه شد`)
  }

  return (
    <Link to={`/product/${product.id}`} className="group block animate-fade-in">
      <article className="card overflow-hidden border-border/80 transition-all duration-300 hover:-translate-y-1.5 hover:border-gold-300 hover:shadow-gold">
        <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-gold-50 via-white to-navy-50">
          <img
            src={product.images[0] || '/images/ring-1.svg'}
            alt={product.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950/50 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
          {product.isNew && (
            <span className="absolute top-3 right-3 rounded-full bg-green-500 px-2.5 py-1 text-xs font-bold text-white shadow">
              جدید
            </span>
          )}
          {product.discount ? (
            <span className="absolute top-3 left-3 rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white shadow">
              {product.discount}% تخفیف
            </span>
          ) : null}
          <button
            type="button"
            className="absolute bottom-3 left-3 rounded-full bg-white/90 p-2 text-navy-900 opacity-0 shadow backdrop-blur transition group-hover:opacity-100"
            aria-label="علاقه‌مندی"
          >
            <Heart className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-gold-600">{getCategoryName(product.category)}</p>
            <p className="flex items-center gap-0.5 text-xs text-amber-600">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              ۵.۰
            </p>
          </div>
          <h3 className="mb-2 line-clamp-2 min-h-[2.5rem] font-black leading-snug text-navy-900">{product.name}</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            {product.weight} گرم · عیار {product.karat}
          </p>
          <div className="mb-4 flex items-baseline gap-2">
            <span className="text-xl font-black text-navy-900">{formatPrice(product.finalPrice)}</span>
            <span className="text-xs text-muted-foreground">تومان</span>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 py-2.5 text-sm font-bold text-white transition hover:bg-gold-600"
          >
            <Plus className="h-4 w-4" />
            افزودن به سبد
          </button>
        </div>
      </article>
    </Link>
  )
}
