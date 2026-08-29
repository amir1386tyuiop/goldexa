import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { Product } from '@/types'

export function useProduct(id?: string) {
  return useQuery<Product>({
    queryKey: ['product', id],
    queryFn: () => api.getProduct(id || ''),
    enabled: Boolean(id),
  })
}
