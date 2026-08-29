import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { GoldPrice } from '@/types'

export function useGoldPrices() {
  return useQuery<GoldPrice[]>({
    queryKey: ['gold-prices'],
    queryFn: api.getGoldPrices,
    refetchInterval: 60000,
  })
}
