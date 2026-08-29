import { api } from './client'

/** Gold pricing and pricing-rule API facade. */
export const pricingApi = {
  getGoldPrices: api.getGoldPrices,
  getGoldPricingStatus: api.getGoldPricingStatus,
  getPricingRules: api.getPricingRules,
  getPricingSpreads: api.getPricingSpreads,
  getTaxRules: api.getTaxRules,
  getLaborCostRules: api.getLaborCostRules,
  calculatePrice: api.calculatePrice,
}

export type { GoldPricingStatus } from './client'
export type { GoldPrice, LaborCostRule, PricingRule, PricingSpread, TaxRule } from '@/types'
