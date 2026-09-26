import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'

export class CreateLiquidityRequestDto {
  @IsOptional()
  @IsString()
  userId: string

  @IsOptional()
  @IsString()
  assetId?: string | null

  @IsOptional()
  @IsString()
  listingId?: string | null

  @IsNumber()
  @Min(0)
  @Max(999999999999)
  expectedPrice: number

  // Status is intentionally not accepted from clients. New requests always
  // start as draft and can only advance through the guarded workflow.

  @IsOptional()
  @IsString()
  @Max(2000)
  notes?: string | null
}

export class CreateSellRecommendationDto {
  @IsOptional()
  @IsString()
  userId: string

  @IsOptional()
  @IsString()
  assetId?: string | null

  @IsNumber()
  @Min(0)
  recommendedPrice: number

  @IsNumber()
  @Min(0)
  @Max(1)
  liquidityScore: number

  @IsString()
  @Max(2000)
  reason: string
}

export class CreateBuyerRequestDto {
  @IsOptional()
  @IsString()
  userId: string

  @IsOptional()
  @IsString()
  category?: string | null

  @IsOptional()
  @IsNumber()
  @Min(0)
  minWeight?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxWeight?: number

  @IsNumber()
  @Min(0)
  @Max(999999999999)
  budget: number
}
