export class CreateContentPageDto {
  title: string
  slug: string
  body: string
  coverUrl?: string | null
  isPublished?: boolean
}

export class CreatePromotionDto {
  title: string
  description?: string | null
  discountValue?: number
  discountType?: string
  isActive?: boolean
}

export class CreateAdCampaignDto {
  title: string
  brandName: string
  description?: string | null
  budget?: number
  isActive?: boolean
}
