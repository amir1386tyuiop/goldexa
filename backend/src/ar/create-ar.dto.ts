export class CreateArModelDto {
  productId?: string | null
  designId?: string | null
  name: string
  modelUrl: string
  thumbnailUrl?: string | null
  isActive?: boolean
}

export class CreateArPreviewDto {
  userId: string
  modelId: string
  screenshotUrl?: string | null
  videoUrl?: string | null
  isShared?: boolean
}
