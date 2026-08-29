import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator'

export class CreateArModelDto {
  @IsUUID() @IsOptional()
  productId?: string | null
  @IsUUID() @IsOptional()
  designId?: string | null
  @IsString()
  name: string
  @IsString()
  modelUrl: string
  @IsString() @IsOptional()
  thumbnailUrl?: string | null
  @IsBoolean() @IsOptional()
  isActive?: boolean
}

export class CreateArPreviewDto {
  @IsUUID() @IsOptional() userId?: string
  @IsUUID()
  modelId: string
  @IsString() @IsOptional()
  screenshotUrl?: string | null
  @IsString() @IsOptional()
  videoUrl?: string | null
  @IsBoolean() @IsOptional()
  isShared?: boolean
}
