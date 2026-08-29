import { api } from './client'

/** Product and catalog API facade. */
export const catalogApi = {
  getProductsPaginated: api.getProductsPaginated,
  getProductsHome: api.getProductsHome,
  getProductSuggestions: api.getProductSuggestions,
  getProducts: api.getProducts,
  getProduct: api.getProduct,
  getCategories: api.getCategories,
  getOccasions: api.getOccasions,
  getProductMedia: api.getProductMedia,
  getStones: api.getStones,
  getProductStones: api.getProductStones,
  getInventory: api.getInventory,
  getSellers: api.getSellers,
}

export type { PaginatedProducts, ProductsHomeFeed } from './client'
export type { Product, ProductCategory, ProductCategoryMaster } from '@/types'
