import { BadRequestException } from '@nestjs/common'
import { UsedGoldListingsService } from './used-gold-listings.service'
import { UsedGoldListingSaleType, UsedGoldListingStatus } from './used-gold-listing.entity'

describe('UsedGoldListingsService', () => {
  const listingRepository = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 'listing-1', ...value })),
  }
  const userRepository = {
    findOneBy: jest.fn(async () => ({ id: 'seller-1', name: 'فروشنده واقعی' })),
  }
  const service = new UsedGoldListingsService(listingRepository as never, userRepository as never)

  beforeEach(() => jest.clearAllMocks())

  it('never trusts client seller identity or publication status', async () => {
    const result = await service.createListing({
      sellerId: 'seller-1',
      sellerName: 'فروشنده جعلی',
      title: 'انگشتر',
      description: 'توضیح',
      weight: 2,
      karat: 18,
      saleType: UsedGoldListingSaleType.DIRECT,
      fixedPrice: 1000,
      status: UsedGoldListingStatus.ACTIVE,
    })

    expect(result.sellerName).toBe('فروشنده واقعی')
    expect(result.status).toBe(UsedGoldListingStatus.PENDING_REVIEW)
  })

  it('rejects incomplete direct and auction pricing', async () => {
    await expect(service.createListing({
      sellerId: 'seller-1', sellerName: 'x', title: 'x', description: 'x', weight: 1, karat: 18,
      saleType: UsedGoldListingSaleType.DIRECT,
    })).rejects.toBeInstanceOf(BadRequestException)

    await expect(service.createListing({
      sellerId: 'seller-1', sellerName: 'x', title: 'x', description: 'x', weight: 1, karat: 18,
      saleType: UsedGoldListingSaleType.AUCTION, startingPrice: 1000,
    })).rejects.toBeInstanceOf(BadRequestException)
  })
})
