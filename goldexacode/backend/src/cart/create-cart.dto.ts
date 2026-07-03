import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class CreateCartDto {
  @IsString()
  @IsNotEmpty()
  userId: string
}

export class AddCartItemDto {
  @IsString()
  @IsNotEmpty()
  cartId: string

  @IsString()
  @IsNotEmpty()
  productId: string

  @IsString()
  @IsNotEmpty()
  name: string

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number

  @IsNumber()
  unitPrice: number

  @IsOptional()
  reservedUntil?: Date | null
}

export class UpdateCartItemQuantityDto {
  @IsNumber()
  @Min(1)
  quantity: number
}
