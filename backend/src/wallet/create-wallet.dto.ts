import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'
import { WalletTransactionType } from './wallet-transaction.entity'

export class CreateWalletDto {
  @IsOptional()
  @IsString()
  userId: string
}

export class WalletDepositDto {
  @IsOptional()
  @IsString()
  userId: string

  @IsNotEmpty()
  @IsNumber()
  amount: number

  @IsOptional()
  @IsString()
  description?: string | null
}

export class WalletPaymentDto {
  @IsOptional()
  @IsString()
  userId: string

  @IsNotEmpty()
  @IsNumber()
  amount: number

  @IsOptional()
  @IsString()
  orderId?: string | null

  @IsOptional()
  @IsString()
  description?: string | null
}

export class WalletGoldBuyDto {
  @IsOptional()
  @IsString()
  userId: string

  @IsNotEmpty()
  @IsNumber()
  amountGrams: number

  @IsOptional()
  @IsString()
  orderId?: string | null

  @IsOptional()
  @IsString()
  description?: string | null
}

export class WalletGoldSellDto {
  @IsOptional()
  @IsString()
  userId: string

  @IsNotEmpty()
  @IsNumber()
  amountGrams: number

  @IsOptional()
  @IsString()
  orderId?: string | null

  @IsOptional()
  @IsString()
  description?: string | null
}

export class WalletTransactionDto {
  @IsOptional()
  @IsString()
  userId: string

  @IsNotEmpty()
  @IsEnum(WalletTransactionType)
  type: WalletTransactionType

  @IsNotEmpty()
  @IsNumber()
  amount: number

  @IsOptional()
  @IsString()
  orderId?: string | null

  @IsOptional()
  @IsString()
  escrowId?: string | null

  @IsOptional()
  @IsString()
  description?: string | null
}
