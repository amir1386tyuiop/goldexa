export class CreateProductCategoryDto {
  name: string
  slug?: string | null
  description?: string | null
  iconUrl?: string | null
  isActive?: boolean
}

export class CreateOccasionCategoryDto {
  name: string
  slug?: string | null
  isActive?: boolean
}

export class CreateProductMediaDto {
  productId: string
  type: string
  url: string
  alt?: string | null
  sortOrder?: number
}

export class CreateStoneDto {
  name: string
  type: string
  color?: string | null
  pricePerCarat: number
  isActive?: boolean
}

export class CreateProductStoneDto {
  productId: string
  stoneId: string
  carat?: number
  position?: string | null
}

export class CreateInventoryDto {
  productId: string
  stock?: number
  reservedStock?: number
  warehouse?: string | null
}

export class CreateSellerProfileDto {
  userId: string
  storeName: string
  description?: string | null
  location?: string | null
  rating?: number
  isVerified?: boolean
}
