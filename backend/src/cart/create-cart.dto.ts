import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class CreateCartDto {
  @IsOptional()
  @IsString()
  userId: string
}

export class AddCartItemDto {
  @IsString()
  @IsNotEmpty()
  cartId: string

  @IsString()
  @IsNotEmpty()
  productId: string

  @IsOptional()
  @IsString()
  name: string

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number

  @IsOptional()
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
