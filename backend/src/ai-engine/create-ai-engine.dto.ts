import { IsArray, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'

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

export class ExecuteAiPredictionDto {
  @IsNumber()
  currentPrice: number

  @IsOptional()
  @IsArray()
  historicalPrices?: number[]

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  horizonDays?: number
}

export class ExecuteAiRecommendationDto {
  @IsOptional()
  @IsArray()
  userHistory?: string[]

  @IsOptional()
  @IsNumber()
  budget?: number

  @IsOptional()
  @IsString()
  style?: string
}

export class ExecuteAiMatchDto {
  @IsString()
  buyerId: string

  @IsString()
  sellerId: string

  @IsOptional()
  @IsString()
  listingId?: string

  @IsOptional()
  buyerContext?: unknown

  @IsOptional()
  sellerContext?: unknown
}
