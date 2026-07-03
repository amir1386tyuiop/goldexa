export class CreateEscrowPaymentDto {
  listingId?: string | null
  auctionId?: string | null
  orderId?: string | null
  buyerId: string
  sellerId: string
  amount: number
  fee?: number
  authority?: string | null
  paymentUrl?: string | null
  trackingCode?: string | null
}

export class UpdateEscrowStatusDto {
  status: string
  trackingCode?: string | null
}

export class CreateMarketplaceRatingDto {
  reviewerId: string
  revieweeId: string
  listingId?: string | null
  orderId?: string | null
  rating: number
  body?: string | null
  category: string
}
