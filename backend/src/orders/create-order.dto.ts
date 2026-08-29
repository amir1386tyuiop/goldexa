import { IsArray, IsEnum, IsInt, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateOrderItemDto {
  @IsNotEmpty()
  productId: string

  @IsNumber()
  @IsInt()
  @Min(1)
  quantity: number
}

export class CreateOrderAddressDto {
  @IsNotEmpty()
  title: string

  @IsNotEmpty()
  province: string

  @IsNotEmpty()
  city: string

  @IsNotEmpty()
  street: string

  @IsNotEmpty()
  postalCode: string

  @IsNotEmpty()
  isDefault: boolean
}

export enum PaymentMethodBody {
  ONLINE = 'online',
  WALLET = 'wallet',
}

export class CreateOrderDto {
  @IsOptional()
  userId: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[]

  @IsNumber()
  @Min(0)
  shippingCost: number

  @IsObject()
  @ValidateNested()
  @Type(() => CreateOrderAddressDto)
  address: CreateOrderAddressDto

  @IsEnum(PaymentMethodBody)
  paymentMethod: PaymentMethodBody

  /** Optional five-minute server-issued pricing reservation. */
  @IsOptional()
  @IsString()
  quoteId?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  quoteIds?: string[]
}
