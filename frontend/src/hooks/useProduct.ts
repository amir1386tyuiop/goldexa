import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { products as mockProducts } from '@/data/mockData'
import { isMockDataEnabled } from '@/config'
import type { Product } from '@/types'

export function useProduct(id?: string) {
  return useQuery<Product>({
    queryKey: ['product', id],
    queryFn: () => api.getProduct(id || ''),
    enabled: Boolean(id),
    ...(isMockDataEnabled && id
      ? { initialData: mockProducts.find((product) => product.id === id) }
      : {}),
  })
}
