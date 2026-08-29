import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'

export class CreatePaymentTransactionDto {
  @IsOptional()
  @IsString()
  orderId?: string | null
  @IsOptional()
  @IsString()
  auctionId?: string | null
  @IsOptional()
  @IsString()
  escrowId?: string | null
  @IsNotEmpty()
  @IsString()
  userId: string
  @IsNumber()
  amount: number
  @IsNotEmpty()
  @IsString()
  paymentMethod: string
  @IsOptional()
  @IsString()
  authority?: string | null
  @IsOptional()
  @IsString()
  referenceId?: string | null
  @IsOptional()
  @IsString()
  trackingCode?: string | null
}

export class UpdatePaymentTransactionDto {
  @IsNotEmpty()
  @IsString()
  status: string
  @IsOptional()
  @IsString()
  referenceId?: string | null
  @IsOptional()
  @IsString()
  trackingCode?: string | null
}

export class CreateOrderTrackingEventDto {
  @IsNotEmpty()
  @IsString()
  orderId: string
  @IsNotEmpty()
  @IsString()
  status: string
  @IsOptional()
  @IsString()
  location?: string | null
  @IsOptional()
  @IsString()
  description?: string | null
}

export class RequestPaymentDto {
  @IsString()
  @IsNotEmpty()
  userId: string

  @IsOptional()
  @IsString()
  orderId?: string | null

  @IsOptional()
  @IsString()
  quoteId?: string | null

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
