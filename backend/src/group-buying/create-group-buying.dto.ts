import { GroupBuyingPaymentMode } from './group-buying-group.entity'
import { CreateOrderAddressDto } from '../orders/create-order.dto'
import { IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Min, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateGroupBuyingGroupDto {
  @IsOptional()
  @IsUUID()
  leaderId: string
  @IsOptional()
  @IsString()
  leaderName: string
  @IsString()
  title: string
  @IsOptional()
  @IsEnum(GroupBuyingPaymentMode)
  paymentMode?: GroupBuyingPaymentMode
  @IsOptional()
  @IsNumber()
  @Min(0)
  targetAmount?: number
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountRate?: number
}

export class AddGroupBuyingItemDto {
  @IsUUID()
  productId: string
  @IsOptional()
  @IsString()
  name: string
  @IsOptional()
  @IsInt()
  @IsPositive()
  quantity?: number
  @IsNumber()
  @IsPositive()
  unitPrice: number
}

export class JoinGroupBuyingDto {
  @IsOptional()
  @IsUUID()
  userId: string
  @IsOptional()
  @IsString()
  userName: string
  @IsNumber()
  @IsPositive()
  shareAmount: number
}

export class PayGroupBuyingShareDto {
  @IsNumber()
  @IsPositive()
  paidAmount: number
}

export class FinalizeGroupBuyingDto {
  @ValidateNested()
  @Type(() => CreateOrderAddressDto)
  address: CreateOrderAddressDto
}
