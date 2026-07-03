export class CreateJewelryDesignDto {
  userId: string
  userName: string
  title: string
  category: string
  baseType?: string
  weight: number
  karat?: number
  metalColor?: string | null
  stones?: unknown[]
  dimensions?: unknown
  imageUrl?: string | null
  modelUrl?: string | null
  preview3dUrl?: string | null
  estimatedGoldPrice?: number
  laborCost?: number
  profit?: number
  tax?: number
  totalPrice?: number
  status?: string
}

export class CreateJewelryDesignVersionDto {
  version: number
  changes: unknown
  totalPrice: number
  modelUrl?: string | null
}

export class CreateGemstoneDto {
  name: string
  type: string
  color?: string | null
  pricePerCarat: number
  stock?: number
  imageUrl?: string | null
  isActive?: boolean
}

export class CreateCustomBuilderQuoteDto {
  designId?: string | null
  userId: string
  goldPriceSnapshot: number
  goldWeight: number
  laborCost: number
  profit?: number
  tax?: number
  total: number
  expiresAt?: Date | null
  status?: string
}
