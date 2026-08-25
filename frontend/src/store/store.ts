import { create } from 'zustand'
import type { Product } from '../types'

interface StoreCartItem {
  product: Product
  quantity: number
  reservedUntil: string
}

interface StoreState {
  cart: StoreCartItem[]
  isCartOpen: boolean
  toast: { message: string; type: 'success' | 'error' } | null
  addToCart: (product: Product, quantity?: number) => void
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  toggleCart: () => void
  showToast: (message: string, type?: 'success' | 'error') => void
  getCartTotal: () => number
  getCartCount: () => number
}

export const useStore = create<StoreState>((set, get) => ({
  cart: [],
  isCartOpen: false,
  toast: null,
  addToCart: (product, quantity = 1) => {
    set((state) => {
      const existing = state.cart.find((item) => item.product.id === product.id)
      if (existing) {
        return {
          cart: state.cart.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          ),
        }
      }
      return {
        cart: [
          ...state.cart,
          {
            product,
            quantity,
            reservedUntil: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          },
        ],
      }
    })
  },
  removeFromCart: (productId) => {
    set((state) => ({
      cart: state.cart.filter((item) => item.product.id !== productId),
    }))
  },
  updateQuantity: (productId, quantity) => {
    set((state) => ({
      cart: state.cart.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: Math.max(1, quantity) }
          : item
      ),
    }))
  },
  clearCart: () => set({ cart: [] }),
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
