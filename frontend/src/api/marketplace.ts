import { api } from './client'

/** Auctions, used-gold marketplace and escrow API facade. */
export const marketplaceApi = {
  getAuctions: api.getAuctions,
  getActiveAuctions: api.getActiveAuctions,
  getAuction: api.getAuction,
  getAuctionBids: api.getAuctionBids,
  getAuctionsByUser: api.getAuctionsByUser,
  createAuction: api.createAuction,
  placeAuctionBid: api.placeAuctionBid,
  settleAuction: api.settleAuction,
  cancelAuction: api.cancelAuction,
  getUsedGoldListings: api.getUsedGoldListings,
  getUsedGoldListing: api.getUsedGoldListing,
  createUsedGoldListing: api.createUsedGoldListing,
  getEscrowPayments: api.getEscrowPayments,
  createEscrowPayment: api.createEscrowPayment,
  getMarketplaceRatings: api.getMarketplaceRatings,
  createMarketplaceRating: api.createMarketplaceRating,
}

export type {
  CreateAuctionInput,
  CreateEscrowPaymentInput,
  CreateMarketplaceRatingInput,
  CreateUsedGoldListingInput,
  PlaceAuctionBidInput,
  SettleAuctionInput,
} from './client'
export type { Auction, AuctionBid, EscrowPayment, MarketplaceRating, UsedGoldListing } from '@/types'
