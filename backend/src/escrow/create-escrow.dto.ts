import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'
import { EscrowPaymentStatus } from './escrow-payment.entity'

export class CreateEscrowPaymentDto {
  /** Internal field populated by the controller from JWT; never trust client input. */
  @IsOptional()
  @IsString()
  buyerId?: string
  @IsOptional()
  @IsString()
  listingId?: string | null
  @IsOptional()
  @IsString()
  auctionId?: string | null
  @IsOptional()
  @IsString()
  orderId?: string | null
  // sellerId is resolved from the referenced listing/auction on the server.
  // It remains optional for backwards-compatible clients, but is never trusted.
  @IsOptional()
  @IsString()
  sellerId?: string
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  fee?: number
  @IsOptional()
  @IsString()
  authority?: string | null
  @IsOptional()
  @IsString()
  paymentUrl?: string | null
  @IsOptional()
  @IsString()
  trackingCode?: string | null
}

export class UpdateEscrowStatusDto {
  @IsNotEmpty()
  @IsEnum(EscrowPaymentStatus)
  status: EscrowPaymentStatus
  @IsOptional()
  @IsString()
  trackingCode?: string | null
}

export class CreateMarketplaceRatingDto {
  /** Internal field populated by the controller from JWT; never trust client input. */
  @IsOptional()
  @IsString()
  reviewerId?: string
  // reviewerId is always taken from the verified JWT subject.
  @IsNotEmpty()
  @IsString()
  revieweeId: string
  @IsOptional()
  @IsString()
  listingId?: string | null
  @IsOptional()
  @IsString()
  orderId?: string | null
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number
  @IsOptional()
  @IsString()
  body?: string | null
  @IsNotEmpty()
  @IsString()
  category: string
}
