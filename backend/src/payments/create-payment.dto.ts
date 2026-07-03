import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'

export class CreatePaymentTransactionDto {
  orderId?: string | null
  auctionId?: string | null
  escrowId?: string | null
  userId: string
  amount: number
  paymentMethod: string
  authority?: string | null
  referenceId?: string | null
  trackingCode?: string | null
}

export class UpdatePaymentTransactionDto {
  status: string
  referenceId?: string | null
  trackingCode?: string | null
}

export class CreateOrderTrackingEventDto {
  orderId: string
  status: string
  location?: string | null
  description?: string | null
}

export class RequestPaymentDto {
  @IsString()
  @IsNotEmpty()
  userId: string

  @IsOptional()
  @IsString()
  orderId?: string | null

  @IsNumber()
  amount: number

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  callbackUrl?: string

  @IsOptional()
  @IsString()
  mobile?: string

  @IsOptional()
  @IsString()
  idempotencyKey?: string
}

export class VerifyPaymentDto {
  @IsString()
  @IsNotEmpty()
  authority: string

  @IsOptional()
  @IsString()
  status?: string
}
