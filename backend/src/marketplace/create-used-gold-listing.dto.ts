import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsObject,
  IsString,
  Min,
} from 'class-validator'
import {
  UsedGoldListingSaleType,
  UsedGoldListingStatus,
  UsedGoldQualityStatus,
  UsedGoldSource,
} from './used-gold-listing.entity'

export class CreateUsedGoldListingDto {
  @IsOptional()
  @IsString()
  productId?: string | null

  @IsOptional()
  @IsString()
  orderId?: string | null

  @IsOptional()
  @IsEnum(UsedGoldSource)
  source?: UsedGoldSource

  @IsNotEmpty()
  @IsString()
  sellerId: string

  @IsNotEmpty()
  @IsString()
  sellerName: string

  @IsNotEmpty()
  @IsString()
  title: string

  @IsNotEmpty()
  @IsString()
  description: string

  @IsNumber()
  @Min(0)
  weight: number

  @IsNumber()
  @Min(1)
  karat: number

  @IsOptional()
  @IsArray()
  stones?: unknown[] | null

  @IsOptional()
  dimensions?: unknown

  @IsOptional()
  @IsString()
  metalColor?: string | null

  @IsOptional()
  @IsString()
  lockType?: string | null

  @IsOptional()
  @IsArray()
  images?: string[]

  @IsOptional()
  @IsString()
  video?: string | null

  @IsNotEmpty()
  @IsEnum(UsedGoldListingSaleType)
  saleType: UsedGoldListingSaleType

  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedPrice?: number | null

  @IsOptional()
  @IsNumber()
  @Min(0)
  startingPrice?: number | null

  @IsOptional()
  @IsNumber()
  @Min(0)
  reservePrice?: number | null

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumBidIncrement?: number | null

  @IsOptional()
  @IsNumber()
  @Min(1)
  auctionDurationDays?: number | null

  @IsOptional()
  @IsBoolean()
  autoExtendEnabled?: boolean

  @IsOptional()
  @IsNumber()
  @Min(0)
  autoExtendMinutes?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  autoExtendSeconds?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  paymentWindowMinutes?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  commissionRate?: number

  @IsOptional()
  @IsEnum(UsedGoldListingStatus)
  status?: UsedGoldListingStatus
}

export class ReviewUsedGoldListingDto {
  @IsNotEmpty()
  @IsEnum(UsedGoldQualityStatus)
  qualityStatus: UsedGoldQualityStatus

  @IsOptional()
  @IsString()
  expertName?: string | null

  @IsOptional()
  @IsString()
  expertNotes?: string | null
}

export class UpdateUsedGoldListingStatusDto {
  @IsNotEmpty()
  @IsEnum(UsedGoldListingStatus)
  status: UsedGoldListingStatus
}

export class PurchaseUsedGoldListingDto {
  @IsNotEmpty()
  @IsObject()
  address: Record<string, unknown>

  @IsOptional()
  @IsString()
  idempotencyKey?: string
}
