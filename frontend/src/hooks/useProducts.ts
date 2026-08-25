import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { products as mockProducts } from '@/data/mockData'
import { isMockDataEnabled } from '@/config'
import type { Product } from '@/types'

interface UseProductsOptions {
  category?: string
  search?: string
}

export function useProducts(options: UseProductsOptions = {}) {
  return useQuery<Product[]>({
    queryKey: ['products', options.category || 'all', options.search || ''],
    queryFn: () => api.getProducts(options as Record<string, string>),
    ...(isMockDataEnabled ? { initialData: mockProducts } : {}),
  })
}
