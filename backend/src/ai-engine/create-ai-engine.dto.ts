import { IsArray, IsBase64, IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'
import type { AiTaskKey, RunAiTaskInput } from './ai-engine.types'

const AI_TASKS: AiTaskKey[] = [
  'analysis', 'assistant', 'code', 'architecture', 'kyc_document', 'safety_check',
  'marketing_image', 'vector_asset', 'product_image', 'image_workflow', 'text',
  'image_to_text', 'notification', 'content', 'rag', 'summary', 'image_generation',
]

/** Validated boundary for every provider-backed AI request. */
export class RunAiTaskDto implements RunAiTaskInput {
  @IsOptional()
  @IsIn(AI_TASKS)
  task?: AiTaskKey

  @IsOptional()
  @IsString()
  @MaxLength(200)
  modelId?: string

  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  prompt?: string

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  systemPrompt?: string

  @IsOptional()
  @IsObject()
  context?: unknown

  @IsOptional()
  @IsArray()
  @MaxLength(20, { each: true })
  @IsString({ each: true })
  documents?: string[]

  @IsOptional()
  @IsString()
  @MaxLength(2_000_000)
  imageUrl?: string

  @IsOptional()
  @IsBase64()
  @MaxLength(12_000_000)
  imageBase64?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(8_192)
  maxTokens?: number

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  slug?: string

  @IsOptional()
  @IsBoolean()
  saveAsPage?: boolean

  @IsOptional()
  @IsString()
  @MaxLength(200)
  userId?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  negativePrompt?: string

  @IsOptional()
  @IsNumber()
  @Min(256)
  @Max(4096)
  width?: number

  @IsOptional()
  @IsNumber()
  @Min(256)
  @Max(4096)
  height?: number

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(200)
  steps?: number

  @IsOptional()
  @IsObject()
  imageConfig?: Record<string, unknown>
}

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
