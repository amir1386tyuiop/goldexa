import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import type { MouseEvent } from 'react'
import { formatPrice } from '@/utils/helpers'
import { getCategoryName } from '@/utils/helpers'
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
    <Link to={`/product/${product.id}`} className="group">
      <div className="card overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
        <div className="relative h-56 bg-gradient-to-br from-gold-50 to-gray-100 flex items-center justify-center overflow-hidden">
          <img
            src={product.images[0] || '/images/ring-1.svg'}
            alt={product.name}
            className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
          {product.isNew && (
            <span className="absolute top-3 right-3 badge bg-green-500 text-white">جدید</span>
          )}
          {product.discount && (
            <span className="absolute top-3 right-3 badge bg-red-500 text-white">
              {product.discount}% تخفیف
            </span>
          )}
        </div>

        <div className="p-4">
          <p className="text-xs text-gold-600 font-bold mb-2">
            {getCategoryName(product.category)}
          </p>
          <h3 className="font-bold text-sm leading-relaxed mb-2 line-clamp-2">
            {product.name}
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            وزن: {product.weight} گرم | عیار: {product.karat}
          </p>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="font-black text-lg text-navy-900">
              {formatPrice(product.finalPrice)}
            </span>
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(Math.round(product.finalPrice * 1.1))}
            </span>
          </div>
          <button
            onClick={handleAddToCart}
            className="w-full py-2.5 rounded-xl bg-gold-500 text-white font-bold text-sm hover:bg-gold-600 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            افزودن به سبد
          </button>
        </div>
      </div>
    </Link>
  )
}
