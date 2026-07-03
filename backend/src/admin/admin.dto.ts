import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator'
import { OrderStatus } from '../orders/order.entity'
import { PaymentTransactionStatus } from '../payments/payment-transaction.entity'

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsNumber()
  weight?: number

  @IsOptional()
  @IsNumber()
  labor?: number

  @IsOptional()
  @IsNumber()
  profit?: number

  @IsOptional()
  @IsNumber()
  tax?: number

  @IsOptional()
  @IsNumber()
  basePrice?: number

  @IsOptional()
  @IsNumber()
  finalPrice?: number

  @IsOptional()
  @IsNumber()
  stock?: number

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean

  @IsOptional()
  @IsBoolean()
  isNew?: boolean

  @IsOptional()
  @IsNumber()
  discount?: number
}

export class UpdateSettingDto {
  @IsNotEmpty()
  @IsString()
  key: string

  @IsObject()
  value: Record<string, unknown>

  @IsOptional()
  @IsString()
  description?: string
}

export class UpdatePaymentStatusDto {
  @IsEnum(PaymentTransactionStatus)
  status: PaymentTransactionStatus
}
