import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useStore } from '@/store/store'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/utils/helpers'

export function CartDrawer() {
  const navigate = useNavigate()
  const {
    cart,
    isCartOpen,
    toggleCart,
    removeFromCart,
    updateQuantity,
    getCartTotal,
    getCartCount,
    toast,
  } = useStore()
  const total = getCartTotal()
  const count = getCartCount()

  const handleCheckout = () => {
    navigate('/checkout')
  }

  return (
    <>
      {toast && (
        <div
          className={cn(
            'fixed top-20 left-1/2 z-[60] -translate-x-1/2 rounded-xl px-5 py-3 shadow-xl text-sm font-bold',
            toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-600 text-white'
          )}
        >
          {toast.message}
        </div>
      )}

      {isCartOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={toggleCart}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 bottom-0 z-50 w-[420px] max-w-[90vw] bg-white shadow-2xl transform transition-transform duration-300",
          isCartOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border p-5">
            <div>
              <h2 className="text-lg font-bold">🛒 سبد خرید</h2>
              <p className="text-sm text-muted-foreground">{count} محصول</p>
            </div>
            <button onClick={toggleCart} className="p-2 hover:bg-gold-50 rounded-xl transition-all">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                <div className="text-5xl mb-4">🛒</div>
                <p className="text-lg font-medium">سبد خرید خالی است</p>
                <p className="text-sm mt-2">محصولات مورد نظر خود را اضافه کنید</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex gap-3 rounded-xl border border-border p-3"
                  >
                    <img
                      src={item.product.images[0] || '/images/ring-1.svg'}
                      alt={item.product.name}
                      className="h-16 w-16 rounded-xl bg-gold-50 object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm line-clamp-2">{item.product.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatPrice(item.product.finalPrice)} تومان
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="h-7 w-7 rounded-lg border border-border hover:bg-gold-50 transition-all"
                        >
                          -
                        </button>
                        <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="h-7 w-7 rounded-lg border border-border hover:bg-gold-50 transition-all"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium self-start"
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border p-5 bg-white">
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-lg">مجموع:</span>
              <span className="font-bold text-xl text-navy-900">{formatPrice(total)} تومان</span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="w-full py-3 rounded-xl bg-gold-500 text-white font-bold hover:bg-gold-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              تسویه حساب
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
