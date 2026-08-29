import { api } from './client'

/** Cart and order API facade. */
export const ordersApi = {
  getCart: api.getCart,
  addCartItem: api.addCartItem,
  updateCartItemQuantity: api.updateCartItemQuantity,
  removeCartItem: api.removeCartItem,
  getOrders: api.getOrders,
  getOrdersByUser: api.getOrdersByUser,
  createOrder: api.createOrder,
  getOrderStatusHistory: api.getOrderStatusHistory,
  getOrderShipments: api.getOrderShipments,
  getOrderInvoices: api.getOrderInvoices,
  getOrderRefunds: api.getOrderRefunds,
  getOrderCancellations: api.getOrderCancellations,
  getOrderTracking: api.getOrderTracking,
  createOrderTrackingEvent: api.createOrderTrackingEvent,
}

export type { CreateOrderInput, CreateOrderTrackingEventInput } from './client'
export type { Cart, CartItem, Order, Refund, Shipment } from '@/types'
