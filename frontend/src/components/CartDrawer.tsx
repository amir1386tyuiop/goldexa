import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, X } from 'lucide-react'
import { useStore } from '@/store/store'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/utils/helpers'
import { api } from '@/api/client'
import { getStoredAuth } from '@/auth'

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
    showToast,
    toast,
  } = useStore()
  const replaceCart = useStore((state) => state.replaceCart)
  const auth = getStoredAuth()
  const userId = auth?.user.id || ''
  const hydratedUser = useRef('')
  const syncing = useRef(false)

  const syncCart = useCallback(async (items: typeof cart, ownerId: string) => {
    if (syncing.current) return
    syncing.current = true
    try {
      const backendCart = (await api.getCart(ownerId)) || (await api.createCart(ownerId))
      await api.clearCart(backendCart.id)
      await Promise.all(items.map((item) => api.addCartItem({
        cartId: backendCart.id,
        productId: item.product.id,
        quantity: item.quantity,
      })))
    } finally {
      syncing.current = false
    }
  }, [])

  useEffect(() => {
    if (!userId || hydratedUser.current === userId) return
    let cancelled = false
    void (async () => {
      try {
        const backendCart = await api.getCart(userId)
        const serverItems = backendCart?.items || []
        const localItems = useStore.getState().cart
        if (!localItems.length && serverItems.length) {
          const items = await Promise.all(serverItems.map(async (item) => ({
            product: await api.getProduct(item.productId),
            quantity: item.quantity,
            reservedUntil: item.reservedUntil || new Date().toISOString(),
            backendItemId: item.id,
          })))
          if (!cancelled) replaceCart(items)
        } else if (localItems.length) {
          await syncCart(localItems, userId)
        }
        if (!cancelled) hydratedUser.current = userId
      } catch {
        if (!cancelled) showToast('همگام‌سازی سبد خرید انجام نشد.', 'error')
      }
    })()
    return () => { cancelled = true }
  }, [replaceCart, showToast, syncCart, userId])

  useEffect(() => {
    if (!userId || hydratedUser.current !== userId || syncing.current) return
    const timer = window.setTimeout(() => {
      void syncCart(cart, userId).catch(() => showToast('به‌روزرسانی رزرو سبد انجام نشد.', 'error'))
    }, 500)
    return () => window.clearTimeout(timer)
  }, [cart, showToast, syncCart, userId])
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
          aria-label="بستن سبد خرید"
          role="button"
          tabIndex={0}
          onKeyDown={(event) => { if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') toggleCart() }}
          onClick={toggleCart}
        />
      )}

      <aside
        role="dialog"
        aria-modal="true"
        aria-hidden={!isCartOpen}
        aria-labelledby="cart-drawer-title"
        className={cn(
          "fixed top-0 right-0 bottom-0 z-50 w-[420px] max-w-[92vw] bg-white shadow-2xl transform transition-transform duration-300",
          isCartOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border p-5">
            <div>
              <h2 id="cart-drawer-title" className="text-lg font-bold">سبد خرید</h2>
              <p className="text-sm text-muted-foreground">{count} محصول</p>
            </div>
            <button aria-label="بستن سبد خرید" onClick={toggleCart} className="min-h-11 min-w-11 p-2 hover:bg-gold-50 rounded-xl transition-all">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                <ShoppingCart className="mb-4 h-12 w-12 text-amber-700" aria-hidden="true" />
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
                          aria-label={`کاهش تعداد ${item.product.name}`}
                          className="h-9 w-9 rounded-lg border border-border hover:bg-gold-50 transition-all"
                        >
                          -
                        </button>
                        <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          aria-label={`افزایش تعداد ${item.product.name}`}
                          className="h-9 w-9 rounded-lg border border-border hover:bg-gold-50 transition-all"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      aria-label={`حذف ${item.product.name} از سبد`}
                      className="min-h-11 text-red-500 hover:text-red-700 text-xs font-medium self-start"
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
