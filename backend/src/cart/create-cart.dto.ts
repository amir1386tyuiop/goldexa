import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator'

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
  @IsInt()
  @Min(1)
  quantity?: number

  /**
   * Legacy client fields are accepted for backwards compatibility, but the
   * service deliberately ignores them and reads the authoritative values
   * from the locked product row.
   */
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsNumber()
  unitPrice?: number

  @IsOptional()
  @IsString()
  reservedUntil?: string
}

export class UpdateCartItemQuantityDto {
  @IsInt()
  @Min(1)
  quantity: number
}
