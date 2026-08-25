import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { GoldPrice } from '@/types'
import { goldPrices as mockGoldPrices } from '@/data/mockData'
import { isMockDataEnabled } from '@/config'

export function useGoldPrices() {
  return useQuery<GoldPrice[]>({
    queryKey: ['gold-prices'],
    queryFn: api.getGoldPrices,
    refetchInterval: 60000,
    ...(isMockDataEnabled ? { initialData: mockGoldPrices } : {}),
  })
}
