import { create } from 'zustand'
import type { Product } from '../types'

interface StoreCartItem {
  product: Product
  quantity: number
  reservedUntil: string
  backendItemId?: string
}

const CART_STORAGE_KEY = 'goldexa_cart'

function readPersistedCart(): StoreCartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const value = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function persistCart(cart: StoreCartItem[]): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
}

interface StoreState {
  cart: StoreCartItem[]
  isCartOpen: boolean
  toast: { message: string; type: 'success' | 'error' } | null
  addToCart: (product: Product, quantity?: number) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  replaceCart: (items: StoreCartItem[]) => void
  clearCart: () => void
  toggleCart: () => void
  showToast: (message: string, type?: 'success' | 'error') => void
  getCartTotal: () => number
  getCartCount: () => number
}

export const useStore = create<StoreState>((set, get) => ({
  cart: readPersistedCart(),
  isCartOpen: false,
  toast: null,
  addToCart: (product, quantity = 1) => {
    set((state) => {
      const existing = state.cart.find((item) => item.product.id === product.id)
      if (existing) {
        const cart = state.cart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        )
        persistCart(cart)
        return { cart }
      }
      const cart = [
          ...state.cart,
          {
            product,
            quantity,
            reservedUntil: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          },
        ]
      persistCart(cart)
      return { cart }
    })
  },
  removeFromCart: (productId) => {
    set((state) => {
      const cart = state.cart.filter((item) => item.product.id !== productId)
      persistCart(cart)
      return { cart }
    })
  },
  updateQuantity: (productId, quantity) => {
    set((state) => {
      const cart = state.cart.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: Math.max(1, quantity) }
          : item
      )
      persistCart(cart)
      return { cart }
    })
  },
  replaceCart: (items) => {
    persistCart(items)
    set({ cart: items })
  },
  clearCart: () => {
    persistCart([])
    set({ cart: [] })
  },
  toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),
  showToast: (message, type = 'success') => {
    set({ toast: { message, type } })
    window.setTimeout(() => set({ toast: null }), 3000)
  },
  getCartTotal: () => {
    return get().cart.reduce((total, item) => total + item.product.finalPrice * item.quantity, 0)
  },
  getCartCount: () => {
    return get().cart.reduce((total, item) => total + item.quantity, 0)
  },
}))
