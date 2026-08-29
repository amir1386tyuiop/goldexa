import { PriceAlertTargetType } from './price-alert.entity'
import { Type } from 'class-transformer'
import { IsArray, IsDate, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator'

export class CreateSmartVaultAssetDto {
  @IsUUID() @IsOptional() userId?: string
  @IsUUID() @IsOptional()
  productId?: string | null
  @IsUUID() @IsOptional()
  orderId?: string | null
  @IsString() @Min(2)
  name: string
  @IsString() @IsOptional()
  category?: string | null
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01)
  weight: number
  @Type(() => Number) @IsNumber() @Min(1) @Max(24) @IsOptional()
  karat?: number
  @Type(() => Number) @IsNumber() @Min(0)
  purchasePrice: number
  @Type(() => Date) @IsDate()
  purchaseDate: Date
  @IsArray() @IsOptional()
  images?: string[]
  @IsOptional()
  metadata?: unknown
}

export class CreateAssetSnapshotDto {
  @IsUUID() assetId: string
  @IsUUID() @IsOptional() userId?: string
  @Type(() => Number) @IsNumber() @Min(0)
  rawGoldValue: number
  @Type(() => Number) @IsNumber() @Min(0)
  totalValue: number
  @Type(() => Number) @IsNumber()
  profitLoss: number
  @Type(() => Number) @IsNumber() @Min(0)
  goldPrice: number
}

export class CreatePriceAlertDto {
  @IsUUID() @IsOptional() userId?: string
  @IsEnum(PriceAlertTargetType)
  targetType: PriceAlertTargetType
  @IsUUID() @IsOptional()
  targetId?: string | null
  @Type(() => Number) @IsNumber() @Min(0)
  targetPrice: number
  @IsString() @IsOptional()
  triggerCondition?: string
}
