import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator'
import {
  AuctionQualityStatus,
  AuctionShippingMethod,
  AuctionStatus,
  BidIncrementType,
} from './auction.entity'

export class CreateAuctionProductDto {
  @IsNotEmpty()
  id: string
}

export class CreateAuctionDto {
  @IsOptional()
  @IsString()
  productId?: string | null

  @IsNumber()
  @Min(0)
  startingPrice: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  reservePrice?: number | null

  @IsOptional()
  @IsEnum(BidIncrementType)
  bidIncrementType?: BidIncrementType

  @IsNumber()
  @Min(0)
  minimumBidIncrement: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  bidIncrementPercent?: number

  @IsOptional()
  @IsNumber()
  @Min(1)
  durationDays?: number

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
  @IsEnum(AuctionShippingMethod)
  shippingMethod?: AuctionShippingMethod

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCost?: number

  @IsDateString()
  startsAt: string

  @IsDateString()
  endsAt: string

  @IsOptional()
  @IsString()
  notes?: string | null
}

export class PlaceBidDto {
  @IsNumber()
  @Min(0.01)
  amount: number
}

export class SettleAuctionDto {
}

export class UpdateAuctionReviewDto {
  @IsNotEmpty()
  @IsEnum(AuctionQualityStatus)
  qualityStatus: AuctionQualityStatus

  @IsOptional()
  @IsString()
  expertName?: string | null

  @IsOptional()
  @IsString()
  expertNotes?: string | null
}

export class UpdateAuctionStatusDto {
  @IsNotEmpty()
  @IsEnum(AuctionStatus)
  status: AuctionStatus
}
