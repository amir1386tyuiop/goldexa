import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class CreatePayoutDto {
  @IsOptional()
  @IsString()
  bankAccountId?: string

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1000)
  amount: number

  @IsString()
  @MaxLength(100)
  idempotencyKey: string
}

export class ResolvePayoutDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  providerReference?: string
}
