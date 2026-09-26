import { Type } from 'class-transformer'
import { IsArray, IsBoolean, IsDate, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, Min } from 'class-validator'

const categories = ['ring', 'necklace', 'bracelet', 'earring', 'pendant']
const baseTypes = ['simple', 'half_diamond', 'full_diamond', 'stone_center']

export class CreateJewelryDesignDto {
  @IsString() @IsOptional() userId?: string
  @IsString() @IsOptional() userName?: string
  @IsString() @Min(2) title: string
  @IsIn(categories) category: string
  @IsIn(baseTypes) @IsOptional() baseType?: string
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) weight: number
  @Type(() => Number) @IsInt() @Min(1) @Max(24) @IsOptional() karat?: number
  @IsString() @IsOptional() metalColor?: string | null
  @IsArray() @IsOptional() stones?: unknown[]
  @IsOptional() dimensions?: unknown
  @IsString() @IsOptional() imageUrl?: string | null
  @IsString() @IsOptional() modelUrl?: string | null
  @IsString() @IsOptional() preview3dUrl?: string | null
  @Type(() => Number) @IsNumber() @Min(0) @IsOptional() estimatedGoldPrice?: number
  @Type(() => Number) @IsNumber() @Min(0) @IsOptional() laborCost?: number
  @Type(() => Number) @IsNumber() @Min(0) @IsOptional() profit?: number
  @Type(() => Number) @IsNumber() @Min(0) @Max(100) @IsOptional() tax?: number
  @Type(() => Number) @IsNumber() @Min(0) @IsOptional() totalPrice?: number
  @IsString() @IsOptional() status?: string
}

export class CreateJewelryDesignVersionDto {
  @Type(() => Number) @IsInt() @Min(1)
  version: number
  @IsOptional()
  changes: unknown
  @Type(() => Number) @IsNumber() @Min(0)
  totalPrice: number
  @IsString() @IsOptional()
  modelUrl?: string | null
}

export class CreateGemstoneDto {
  @IsString() @Min(2)
  name: string
  @IsString()
  type: string
  @IsString() @IsOptional()
  color?: string | null
  @Type(() => Number) @IsNumber() @Min(0)
  pricePerCarat: number
  @Type(() => Number) @IsInt() @Min(0) @IsOptional()
  stock?: number
  @IsString() @IsOptional()
  imageUrl?: string | null
  @IsBoolean() @IsOptional()
  isActive?: boolean
}

export class CreateCustomBuilderQuoteDto {
  @IsUUID() @IsOptional()
  designId?: string | null
  @IsUUID() @IsOptional() userId?: string
  @Type(() => Number) @IsNumber() @Min(0)
  goldPriceSnapshot: number
  @Type(() => Number) @IsNumber() @Min(0.01)
  goldWeight: number
  @Type(() => Number) @IsNumber() @Min(0)
  laborCost: number
  @Type(() => Number) @IsNumber() @Min(0) @IsOptional()
  profit?: number
  @Type(() => Number) @IsNumber() @Min(0) @Max(100) @IsOptional()
  tax?: number
  @Type(() => Number) @IsNumber() @Min(0)
  total: number
  @Type(() => Date) @IsDate() @IsOptional()
  expiresAt?: Date | null
  @IsString() @IsOptional()
  status?: string
}

export class UpdateJewelryDesignStatusDto {
  @IsIn(['draft', 'in_progress', 'ready_for_review', 'approved', 'rejected'])
  status: string
}

export class UpdateCustomBuilderQuoteStatusDto {
  @IsIn(['draft', 'sent', 'accepted', 'rejected', 'expired'])
  status: string
}

export class CreateJewelryDesignStageDto {
  @IsString() @Min(2) @Max(160)
  title: string

  @IsIn(['planned', 'in_progress', 'completed']) @IsOptional()
  status?: string

  @IsString() @IsOptional() @Max(4000)
  note?: string | null

  @IsString() @IsOptional() @Matches(/^(?:\/|https?:\/\/)/i, { message: 'آدرس تصویر باید مسیر local یا http/https باشد' }) @Max(2048)
  imageUrl?: string | null

  @IsString() @IsOptional() @Matches(/^(?:\/|https?:\/\/)/i, { message: 'آدرس مدل باید مسیر local یا http/https باشد' }) @Max(2048)
  modelUrl?: string | null
}

export class UpdateJewelryDesignStageDto {
  @IsString() @IsOptional() @Min(2) @Max(160)
  title?: string

  @IsIn(['planned', 'in_progress', 'completed']) @IsOptional()
  status?: string

  @IsString() @IsOptional() @Max(4000)
  note?: string | null

  @IsString() @IsOptional() @Matches(/^(?:\/|https?:\/\/)/i, { message: 'آدرس تصویر باید مسیر local یا http/https باشد' }) @Max(2048)
  imageUrl?: string | null

  @IsString() @IsOptional() @Matches(/^(?:\/|https?:\/\/)/i, { message: 'آدرس مدل باید مسیر local یا http/https باشد' }) @Max(2048)
  modelUrl?: string | null
}
