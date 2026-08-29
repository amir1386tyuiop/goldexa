export { authApi } from './auth'
export { catalogApi } from './catalog'
export { ordersApi } from './orders'
export { walletApi } from './wallet'
export { pricingApi } from './pricing'
export { marketplaceApi } from './marketplace'
export { adminApi } from './admin'

// Keep the existing client as the compatibility surface for current imports.
export { api, ApiError, request } from './client'
