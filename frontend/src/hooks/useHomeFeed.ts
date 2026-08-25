import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { Product } from '@/types'

export interface HomeFeed {
  newProducts: Product[]
  featured: Product[]
  discounted: Product[]
}

export function useHomeFeed() {
  return useQuery<HomeFeed>({
    queryKey: ['products-home'],
    queryFn: api.getProductsHome,
  })
}
