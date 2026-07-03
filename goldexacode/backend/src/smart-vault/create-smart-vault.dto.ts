import { PriceAlertTargetType } from './price-alert.entity'

export class CreateSmartVaultAssetDto {
  userId: string
  productId?: string | null
  orderId?: string | null
  name: string
  category?: string | null
  weight: number
  karat?: number
  purchasePrice: number
  purchaseDate: Date
  images?: string[]
  metadata?: unknown
}

export class CreateAssetSnapshotDto {
  assetId: string
  userId: string
  rawGoldValue: number
  totalValue: number
  profitLoss: number
  goldPrice: number
}

export class CreatePriceAlertDto {
  userId: string
  targetType: PriceAlertTargetType
  targetId?: string | null
  targetPrice: number
  triggerCondition?: string
}
