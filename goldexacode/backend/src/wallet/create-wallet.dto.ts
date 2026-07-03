import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'
import { WalletTransactionType } from './wallet-transaction.entity'

export class CreateWalletDto {
  @IsNotEmpty()
  @IsString()
  userId: string

  @IsOptional()
  @IsNumber()
  goldBalanceGrams?: number
}

export class WalletDepositDto {
  @IsNotEmpty()
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
  @IsNotEmpty()
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
  @IsNotEmpty()
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
  @IsNotEmpty()
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
  @IsNotEmpty()
  @IsString()
  userId: string

  @IsNotEmpty()
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
