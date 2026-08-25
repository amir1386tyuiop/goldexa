import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'

export function useGoldPricingStatus() {
  return useQuery({
    queryKey: ['gold-pricing-status'],
    queryFn: api.getGoldPricingStatus,
    refetchInterval: 30_000,
  })
}
