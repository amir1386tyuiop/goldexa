export class CreateLiquidityRequestDto {
  userId: string
  assetId?: string | null
  listingId?: string | null
  expectedPrice: number
  status?: string
  notes?: string | null
}

export class CreateSellRecommendationDto {
  userId: string
  assetId?: string | null
  recommendedPrice: number
  liquidityScore: number
  reason: string
}

export class CreateBuyerRequestDto {
  userId: string
  category?: string | null
  minWeight?: number
  maxWeight?: number
  budget: number
  status?: string
}
