export class CreateAiPricePredictionDto {
  targetType: string
  targetId?: string | null
  currentPrice: number
  predictedPrice: number
  confidenceScore: number
  horizonDays: number
  modelVersion: string
  features?: unknown
}

export class CreateAiDesignRecommendationDto {
  userId: string
  designId?: string | null
  productIds?: string[]
  score: number
  reason: string
  source: string
}

export class CreateAiMarketMatchDto {
  buyerId: string
  sellerId: string
  listingId?: string | null
  score: number
  reason: string
  status?: string
}

export class CreateAiServiceMetricDto {
  name: string
  value: number
  metadata?: unknown
}
