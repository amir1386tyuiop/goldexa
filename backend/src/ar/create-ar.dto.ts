import { IsBoolean, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator'

export class CreateArModelDto {
  @IsUUID() @IsOptional()
  productId?: string | null
  @IsUUID() @IsOptional()
  designId?: string | null
  @IsString()
  name: string
  @IsString() @MaxLength(2048) @Matches(/^(?:\/|https?:\/\/)/i, { message: 'آدرس مدل باید مسیر local یا http/https باشد' })
  modelUrl: string
  @IsString() @IsOptional() @MaxLength(2048) @Matches(/^(?:\/|https?:\/\/)/i, { message: 'آدرس thumbnail باید مسیر local یا http/https باشد' })
  thumbnailUrl?: string | null
  @IsBoolean() @IsOptional()
  isActive?: boolean
}

export class CreateArPreviewDto {
  @IsUUID() @IsOptional() userId?: string
  @IsUUID()
  modelId: string
  @IsString() @IsOptional() @MaxLength(2048) @Matches(/^(?:\/|https?:\/\/)/i, { message: 'آدرس تصویر باید مسیر local یا http/https باشد' })
  screenshotUrl?: string | null
  @IsString() @IsOptional() @MaxLength(2048) @Matches(/^(?:\/|https?:\/\/)/i, { message: 'آدرس ویدیو باید مسیر local یا http/https باشد' })
  videoUrl?: string | null
  @IsBoolean() @IsOptional()
  isShared?: boolean
}
